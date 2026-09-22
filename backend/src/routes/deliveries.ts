import { Router } from "express";
import { z } from "zod";
import { DeliveryStatus, Role } from "@prisma/client";
import { prisma } from "../config/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { asyncHandler, forbidden, notFound } from "../middleware/errorHandler";
import { applyTransition, applyTransitionInTx } from "../services/deliveryStateMachine";
import { getCurrentAssignment } from "../services/assignments";
import { predictEta } from "../services/eta";
import {
  emitToDelivery,
  emitToDispatchers,
  emitToUser,
} from "../sockets/index";

export const deliveriesRouter = Router();
deliveriesRouter.use(requireAuth);

const createSchema = z.object({
  pickupAddressId: z.string().uuid(),
  dropoffAddressId: z.string().uuid(),
  description: z.string().optional(),
  weightKg: z.number().positive().optional(),
  packageSize: z.string().optional(),
});

deliveriesRouter.post(
  "/",
  requireRole(Role.CLIENT),
  asyncHandler(async (req, res) => {
    const body = createSchema.parse(req.body);

    const [pickup, dropoff] = await Promise.all([
      prisma.address.findFirst({ where: { id: body.pickupAddressId, ownerId: req.user!.sub } }),
      prisma.address.findFirst({ where: { id: body.dropoffAddressId, ownerId: req.user!.sub } }),
    ]);
    if (!pickup) throw notFound("Адресу відправлення не знайдено");
    if (!dropoff) throw notFound("Адресу призначення не знайдено");

    const delivery = await prisma.$transaction(async (tx) => {
      const created = await tx.delivery.create({
        data: {
          clientId: req.user!.sub,
          pickupAddressId: body.pickupAddressId,
          dropoffAddressId: body.dropoffAddressId,
          description: body.description,
          weightKg: body.weightKg,
          packageSize: body.packageSize,
          status: DeliveryStatus.CREATED,
        },
      });
      await tx.statusHistory.create({
        data: {
          deliveryId: created.id,
          status: DeliveryStatus.CREATED,
          changedById: req.user!.sub,
          note: "Заявку на доставку створено",
        },
      });
      return created;
    });

    emitToDispatchers("delivery:created", { deliveryId: delivery.id });
    res.status(201).json(delivery);
  })
);

deliveriesRouter.get(
  "/",
  asyncHandler(async (req, res) => {
    const status = req.query.status as DeliveryStatus | undefined;
    const where: Record<string, unknown> = status ? { status } : {};

    if (req.user!.role === Role.CLIENT) {
      where.clientId = req.user!.sub;
    } else if (req.user!.role === Role.COURIER) {
      where.assignments = { some: { courierId: req.user!.sub } };
    }
    // DISPATCHER sees everything.

    const deliveries = await prisma.delivery.findMany({
      where,
      include: {
        pickupAddress: true,
        dropoffAddress: true,
        client: { select: { id: true, name: true, phone: true } },
        assignments: {
          orderBy: { assignedAt: "desc" },
          take: 1,
          select: {
            id: true,
            courierId: true,
            status: true,
            assignedAt: true,
            courier: { select: { id: true, name: true, phone: true } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    res.json(deliveries);
  })
);

deliveriesRouter.get(
  "/:id",
  asyncHandler(async (req, res) => {
    const delivery = await loadDeliveryForUser(req.params.id, req.user!.sub, req.user!.role);
    res.json(delivery);
  })
);

deliveriesRouter.get(
  "/:id/eta",
  asyncHandler(async (req, res) => {
    const delivery = await prisma.delivery.findUnique({
      where: { id: req.params.id },
      include: { pickupAddress: true, dropoffAddress: true },
    });
    if (!delivery) throw notFound("Доставку не знайдено");

    const assignment = await getCurrentAssignment(delivery.id);
    if (!assignment || assignment.status === "REJECTED") {
      return res.json({ etaAt: null, remainingKm: null, remainingMinutes: null });
    }

    const lastLocation = await prisma.courierLocation.findFirst({
      where: { courierId: assignment.courierId },
      orderBy: { createdAt: "desc" },
    });
    if (!lastLocation) {
      return res.json({ etaAt: null, remainingKm: null, remainingMinutes: null });
    }

    const remainingStops =
      delivery.status === DeliveryStatus.PICKED_UP || delivery.status === DeliveryStatus.IN_TRANSIT
        ? [{ lat: delivery.dropoffAddress.lat, lng: delivery.dropoffAddress.lng }]
        : [
            { lat: delivery.pickupAddress.lat, lng: delivery.pickupAddress.lng },
            { lat: delivery.dropoffAddress.lat, lng: delivery.dropoffAddress.lng },
          ];

    const eta = predictEta({ lat: lastLocation.lat, lng: lastLocation.lng }, remainingStops);
    await prisma.delivery.update({ where: { id: delivery.id }, data: { etaAt: eta.etaAt } });

    res.json(eta);
  })
);

deliveriesRouter.post(
  "/:id/cancel",
  asyncHandler(async (req, res) => {
    const delivery = await prisma.delivery.findUnique({ where: { id: req.params.id } });
    if (!delivery) throw notFound("Доставку не знайдено");

    if (req.user!.role === Role.CLIENT && delivery.clientId !== req.user!.sub) {
      throw forbidden("Це не ваша доставка");
    }
    if (req.user!.role !== Role.CLIENT && req.user!.role !== Role.DISPATCHER) {
      throw forbidden("Скасувати доставку може лише клієнт або диспетчер");
    }

    const updated = await applyTransition({
      deliveryId: delivery.id,
      to: DeliveryStatus.CANCELLED,
      changedById: req.user!.sub,
      note: "Скасовано",
    });

    emitToDispatchers("delivery:statusChanged", { deliveryId: updated.id, status: updated.status });
    emitToDelivery(updated.id, "delivery:statusChanged", { deliveryId: updated.id, status: updated.status });
    res.json(updated);
  })
);

const assignSchema = z.object({ courierId: z.string().uuid() });

deliveriesRouter.post(
  "/:id/assign",
  requireRole(Role.DISPATCHER),
  asyncHandler(async (req, res) => {
    const body = assignSchema.parse(req.body);

    const courier = await prisma.user.findFirst({ where: { id: body.courierId, role: Role.COURIER } });
    if (!courier) throw notFound("Кур'єра не знайдено");

    const updated = await prisma.$transaction(async (tx) => {
      const delivery = await tx.delivery.findUnique({ where: { id: req.params.id } });
      if (!delivery) throw notFound("Доставку не знайдено");

      const result = await applyTransitionInTx(tx, {
        deliveryId: delivery.id,
        from: delivery.status,
        to: DeliveryStatus.ASSIGNED,
        changedById: req.user!.sub,
        note: `Призначено кур'єра ${courier.name}`,
      });

      await tx.courierAssignment.create({
        data: { deliveryId: delivery.id, courierId: courier.id, status: "ASSIGNED" },
      });

      return result;
    });

    emitToUser(courier.id, "delivery:assigned", { deliveryId: updated.id });
    emitToDelivery(updated.id, "delivery:statusChanged", { deliveryId: updated.id, status: updated.status });
    emitToDispatchers("delivery:statusChanged", { deliveryId: updated.id, status: updated.status });
    res.json(updated);
  })
);

const statusActionSchema = z.object({
  action: z.enum(["accept", "reject", "pickup", "start_transit", "fail"]),
  lat: z.number().optional(),
  lng: z.number().optional(),
  note: z.string().optional(),
});

deliveriesRouter.post(
  "/:id/status",
  requireRole(Role.COURIER),
  asyncHandler(async (req, res) => {
    const body = statusActionSchema.parse(req.body);
    const deliveryId = req.params.id;

    const assignment = await getCurrentAssignment(deliveryId);
    if (!assignment || assignment.courierId !== req.user!.sub) {
      throw forbidden("Цю доставку не призначено вам");
    }

    const delivery = await prisma.delivery.findUnique({ where: { id: deliveryId } });
    if (!delivery) throw notFound("Доставку не знайдено");

    let updated;
    switch (body.action) {
      case "accept":
        await prisma.courierAssignment.update({
          where: { id: assignment.id },
          data: { status: "ACCEPTED" },
        });
        updated = delivery;
        break;

      case "reject":
        await prisma.courierAssignment.update({
          where: { id: assignment.id },
          data: { status: "REJECTED" },
        });
        updated = await applyTransition({
          deliveryId,
          to: DeliveryStatus.CREATED,
          changedById: req.user!.sub,
          note: body.note ?? "Кур'єр відхилив призначення",
        });
        emitToDispatchers("delivery:statusChanged", { deliveryId, status: updated.status });
        break;

      case "pickup":
        updated = await applyTransition({
          deliveryId,
          to: DeliveryStatus.PICKED_UP,
          changedById: req.user!.sub,
          note: body.note,
          lat: body.lat,
          lng: body.lng,
        });
        break;

      case "start_transit":
        updated = await applyTransition({
          deliveryId,
          to: DeliveryStatus.IN_TRANSIT,
          changedById: req.user!.sub,
          note: body.note,
          lat: body.lat,
          lng: body.lng,
        });
        break;

      case "fail":
        updated = await applyTransition({
          deliveryId,
          to: DeliveryStatus.FAILED,
          changedById: req.user!.sub,
          note: body.note ?? "Доставку не вдалося виконати",
          lat: body.lat,
          lng: body.lng,
        });
        break;
    }

    emitToDelivery(deliveryId, "delivery:statusChanged", { deliveryId, status: updated.status });
    emitToDispatchers("delivery:statusChanged", { deliveryId, status: updated.status });
    res.json(updated);
  })
);

const proofSchema = z.object({
  photoBase64: z.string().min(1),
  signatureBase64: z.string().min(1),
  lat: z.number(),
  lng: z.number(),
  note: z.string().optional(),
});

deliveriesRouter.post(
  "/:id/proof",
  requireRole(Role.COURIER),
  asyncHandler(async (req, res) => {
    const body = proofSchema.parse(req.body);
    const deliveryId = req.params.id;

    const assignment = await getCurrentAssignment(deliveryId);
    if (!assignment || assignment.courierId !== req.user!.sub) {
      throw forbidden("Цю доставку не призначено вам");
    }

    const updated = await prisma.$transaction(async (tx) => {
      const delivery = await tx.delivery.findUnique({ where: { id: deliveryId } });
      if (!delivery) throw notFound("Доставку не знайдено");

      await applyTransitionInTx(tx, {
        deliveryId,
        from: delivery.status,
        to: DeliveryStatus.DELIVERED,
        changedById: req.user!.sub,
        note: body.note ?? "Доставлено з підтвердженням",
        lat: body.lat,
        lng: body.lng,
      });

      return tx.delivery.update({
        where: { id: deliveryId },
        data: {
          proofPhotoUrl: body.photoBase64,
          proofSignature: body.signatureBase64,
          proofNote: body.note,
        },
      });
    });

    await prisma.courierAssignment.update({ where: { id: assignment.id }, data: { status: "COMPLETED" } });

    emitToDelivery(deliveryId, "delivery:statusChanged", { deliveryId, status: updated.status });
    emitToDispatchers("delivery:statusChanged", { deliveryId, status: updated.status });
    res.json(updated);
  })
);

async function loadDeliveryForUser(id: string, userId: string, role: Role) {
  const delivery = await prisma.delivery.findUnique({
    where: { id },
    include: {
      pickupAddress: true,
      dropoffAddress: true,
      client: { select: { id: true, name: true, phone: true } },
      assignments: {
        orderBy: { assignedAt: "desc" },
        include: { courier: { select: { id: true, name: true, phone: true } } },
      },
      statusHistory: { orderBy: { createdAt: "asc" } },
      routeStops: true,
    },
  });
  if (!delivery) throw notFound("Доставку не знайдено");

  const currentAssignment = delivery.assignments[0];
  if (role === Role.CLIENT && delivery.clientId !== userId) throw forbidden("Це не ваша доставка");
  if (role === Role.COURIER && currentAssignment?.courierId !== userId) throw forbidden("Не призначено вам");

  return delivery;
}

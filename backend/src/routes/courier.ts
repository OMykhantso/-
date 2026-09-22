import { Router } from "express";
import { z } from "zod";
import { DeliveryStatus, Role } from "@prisma/client";
import { prisma } from "../config/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { asyncHandler, notFound } from "../middleware/errorHandler";
import { predictEta } from "../services/eta";
import { emitToDelivery, emitToDispatchers } from "../sockets/index";

export const courierRouter = Router();
courierRouter.use(requireAuth);

const locationSchema = z.object({
  lat: z.number(),
  lng: z.number(),
  speedKmh: z.number().nonnegative().optional(),
});

courierRouter.post(
  "/location",
  requireRole(Role.COURIER),
  asyncHandler(async (req, res) => {
    const body = locationSchema.parse(req.body);
    const courierId = req.user!.sub;

    const location = await prisma.courierLocation.create({
      data: { courierId, lat: body.lat, lng: body.lng, speedKmh: body.speedKmh },
    });

    const payload = {
      courierId,
      lat: body.lat,
      lng: body.lng,
      speedKmh: body.speedKmh,
      at: location.createdAt,
    };
    emitToDispatchers("courier:location", payload);

    // Recompute ETA for every active delivery this courier is carrying, and
    // push the update to whoever is watching that delivery (typically the
    // client tracking their package).
    const activeDeliveries = await prisma.delivery.findMany({
      where: {
        status: { in: [DeliveryStatus.ASSIGNED, DeliveryStatus.PICKED_UP, DeliveryStatus.IN_TRANSIT] },
        assignments: { some: { courierId } },
      },
      include: { pickupAddress: true, dropoffAddress: true },
    });

    for (const delivery of activeDeliveries) {
      const remainingStops =
        delivery.status === DeliveryStatus.PICKED_UP || delivery.status === DeliveryStatus.IN_TRANSIT
          ? [{ lat: delivery.dropoffAddress.lat, lng: delivery.dropoffAddress.lng }]
          : [
              { lat: delivery.pickupAddress.lat, lng: delivery.pickupAddress.lng },
              { lat: delivery.dropoffAddress.lat, lng: delivery.dropoffAddress.lng },
            ];
      const eta = predictEta({ lat: body.lat, lng: body.lng }, remainingStops);
      await prisma.delivery.update({ where: { id: delivery.id }, data: { etaAt: eta.etaAt } });
      emitToDelivery(delivery.id, "courier:location", payload);
      emitToDelivery(delivery.id, "delivery:eta", { deliveryId: delivery.id, ...eta });
    }

    res.status(201).json(location);
  })
);

courierRouter.get(
  "/:id/location",
  asyncHandler(async (req, res) => {
    const location = await prisma.courierLocation.findFirst({
      where: { courierId: req.params.id },
      orderBy: { createdAt: "desc" },
    });
    if (!location) throw notFound("Цей кур'єр ще не передав своє місцезнаходження");
    res.json(location);
  })
);

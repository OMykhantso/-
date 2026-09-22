import { Router } from "express";
import { z } from "zod";
import { Role, StopKind } from "@prisma/client";
import { prisma } from "../config/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { asyncHandler, forbidden, notFound } from "../middleware/errorHandler";
import { optimizeRoute, OptimizerStop } from "../services/routeOptimizer";
import { haversineKm } from "../services/geo";
import { env } from "../config/env";
import { emitToUser } from "../sockets/index";

export const routesRouter = Router();
routesRouter.use(requireAuth);

const optimizeSchema = z.object({
  courierId: z.string().uuid(),
  deliveryIds: z.array(z.string().uuid()).min(1),
});

routesRouter.post(
  "/optimize",
  requireRole(Role.DISPATCHER),
  asyncHandler(async (req, res) => {
    const body = optimizeSchema.parse(req.body);

    const deliveries = await prisma.delivery.findMany({
      where: {
        id: { in: body.deliveryIds },
        assignments: { some: { courierId: body.courierId } },
      },
      include: { pickupAddress: true, dropoffAddress: true },
    });
    if (deliveries.length !== body.deliveryIds.length) {
      throw notFound("Одну або кілька доставок не призначено цьому кур'єру");
    }

    const lastLocation = await prisma.courierLocation.findFirst({
      where: { courierId: body.courierId },
      orderBy: { createdAt: "desc" },
    });
    const start = lastLocation
      ? { lat: lastLocation.lat, lng: lastLocation.lng }
      : { lat: deliveries[0].pickupAddress.lat, lng: deliveries[0].pickupAddress.lng };

    const stops: OptimizerStop[] = deliveries.flatMap((d) => [
      { deliveryId: d.id, kind: "PICKUP" as const, lat: d.pickupAddress.lat, lng: d.pickupAddress.lng },
      { deliveryId: d.id, kind: "DROPOFF" as const, lat: d.dropoffAddress.lat, lng: d.dropoffAddress.lng },
    ]);

    const { order, totalDistanceKm } = optimizeRoute(start, stops);

    const route = await prisma.$transaction(async (tx) => {
      // Superseding any route this courier currently has planned/active for
      // these deliveries keeps "the route" singular and simple for the app.
      await tx.route.updateMany({
        where: { courierId: body.courierId, status: { in: ["PLANNED", "ACTIVE"] } },
        data: { status: "COMPLETED" },
      });

      const created = await tx.route.create({
        data: { courierId: body.courierId, status: "ACTIVE", totalDistanceKm },
      });

      // Cumulative ETA per stop: elapsed travel time to *reach* that stop,
      // not the time to finish the whole remaining route from there (that
      // would make earlier stops show a later ETA than later ones).
      let cursor = start;
      let elapsedMinutes = 0;
      const now = new Date();
      for (let i = 0; i < order.length; i++) {
        const stop = order[i];
        const legKm = haversineKm(cursor, stop);
        elapsedMinutes += (legKm / env.avgSpeedKmh) * 60;
        const etaAt = new Date(now.getTime() + elapsedMinutes * 60_000);

        await tx.routeStop.create({
          data: {
            routeId: created.id,
            deliveryId: stop.deliveryId,
            sequence: i,
            kind: stop.kind as StopKind,
            lat: stop.lat,
            lng: stop.lng,
            etaAt,
          },
        });

        elapsedMinutes += env.stopHandlingMinutes;
        cursor = stop;
      }

      return tx.route.findUnique({ where: { id: created.id }, include: { stops: true } });
    });

    emitToUser(body.courierId, "route:updated", { routeId: route!.id, courierId: body.courierId });
    res.status(201).json(route);
  })
);

routesRouter.get(
  "/active/:courierId",
  asyncHandler(async (req, res) => {
    if (req.user!.role === Role.COURIER && req.user!.sub !== req.params.courierId) {
      throw forbidden("Це не ваш маршрут");
    }

    const route = await prisma.route.findFirst({
      where: { courierId: req.params.courierId, status: { in: ["PLANNED", "ACTIVE"] } },
      include: { stops: { orderBy: { sequence: "asc" }, include: { delivery: true } } },
      orderBy: { createdAt: "desc" },
    });
    if (!route) return res.json(null);
    res.json(route);
  })
);

routesRouter.post(
  "/stops/:stopId/complete",
  requireRole(Role.COURIER),
  asyncHandler(async (req, res) => {
    const stop = await prisma.routeStop.findUnique({
      where: { id: req.params.stopId },
      include: { route: true },
    });
    if (!stop) throw notFound("Зупинку не знайдено");
    if (stop.route.courierId !== req.user!.sub) throw forbidden("Це не ваш маршрут");

    const updated = await prisma.routeStop.update({
      where: { id: stop.id },
      data: { completedAt: new Date() },
    });
    res.json(updated);
  })
);

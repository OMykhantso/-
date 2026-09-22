import { Router } from "express";
import { DeliveryStatus, Role } from "@prisma/client";
import { prisma } from "../config/prisma";
import { requireAuth, requireRole } from "../middleware/auth";
import { asyncHandler } from "../middleware/errorHandler";

export const statsRouter = Router();
statsRouter.use(requireAuth, requireRole(Role.DISPATCHER));

statsRouter.get(
  "/overview",
  asyncHandler(async (_req, res) => {
    const grouped = await prisma.delivery.groupBy({
      by: ["status"],
      _count: { _all: true },
    });
    const byStatus = Object.fromEntries(
      Object.values(DeliveryStatus).map((s) => [s, 0])
    ) as Record<DeliveryStatus, number>;
    for (const row of grouped) byStatus[row.status] = row._count._all;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const createdToday = await prisma.delivery.count({
      where: { createdAt: { gte: startOfToday } },
    });

    const avgMinutes = await computeAvgDeliveryMinutes();

    res.json({
      byStatus,
      createdToday,
      totalDeliveries: grouped.reduce((sum, r) => sum + r._count._all, 0),
      avgDeliveryMinutes: avgMinutes,
    });
  })
);

statsRouter.get(
  "/couriers",
  asyncHandler(async (_req, res) => {
    const couriers = await prisma.user.findMany({ where: { role: Role.COURIER } });

    const result = await Promise.all(
      couriers.map(async (courier) => {
        const completedAssignments = await prisma.courierAssignment.count({
          where: { courierId: courier.id, status: "COMPLETED" },
        });
        const routes = await prisma.route.findMany({
          where: { courierId: courier.id },
          select: { totalDistanceKm: true },
        });
        const distanceKm = routes.reduce((sum, r) => sum + (r.totalDistanceKm ?? 0), 0);

        return {
          courierId: courier.id,
          name: courier.name,
          completedDeliveries: completedAssignments,
          distanceKm: Math.round(distanceKm * 10) / 10,
        };
      })
    );

    res.json(result);
  })
);

statsRouter.get(
  "/timeseries",
  asyncHandler(async (req, res) => {
    const days = Math.min(parseInt((req.query.days as string) ?? "7", 10) || 7, 90);
    const since = new Date();
    since.setHours(0, 0, 0, 0);
    since.setDate(since.getDate() - (days - 1));

    const [created, delivered] = await Promise.all([
      prisma.delivery.findMany({ where: { createdAt: { gte: since } }, select: { createdAt: true } }),
      prisma.statusHistory.findMany({
        where: { status: DeliveryStatus.DELIVERED, createdAt: { gte: since } },
        select: { createdAt: true },
      }),
    ]);

    const buckets: { date: string; created: number; delivered: number }[] = [];
    for (let i = 0; i < days; i++) {
      const day = new Date(since);
      day.setDate(since.getDate() + i);
      const key = day.toISOString().slice(0, 10);
      buckets.push({ date: key, created: 0, delivered: 0 });
    }
    const indexByDate = new Map(buckets.map((b, i) => [b.date, i]));

    for (const d of created) {
      const key = d.createdAt.toISOString().slice(0, 10);
      const idx = indexByDate.get(key);
      if (idx !== undefined) buckets[idx].created++;
    }
    for (const d of delivered) {
      const key = d.createdAt.toISOString().slice(0, 10);
      const idx = indexByDate.get(key);
      if (idx !== undefined) buckets[idx].delivered++;
    }

    res.json(buckets);
  })
);

async function computeAvgDeliveryMinutes(): Promise<number | null> {
  const delivered = await prisma.delivery.findMany({
    where: { status: DeliveryStatus.DELIVERED },
    select: {
      statusHistory: { orderBy: { createdAt: "asc" }, select: { status: true, createdAt: true } },
    },
    take: 500,
    orderBy: { updatedAt: "desc" },
  });

  let totalMinutes = 0;
  let durationCount = 0;

  for (const delivery of delivered) {
    const created = delivery.statusHistory.find((h) => h.status === DeliveryStatus.CREATED);
    const deliveredEvent = [...delivery.statusHistory].reverse().find((h) => h.status === DeliveryStatus.DELIVERED);
    if (created && deliveredEvent) {
      totalMinutes += (deliveredEvent.createdAt.getTime() - created.createdAt.getTime()) / 60_000;
      durationCount++;
    }
  }

  return durationCount > 0 ? Math.round((totalMinutes / durationCount) * 10) / 10 : null;
}

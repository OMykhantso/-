import { prisma } from "../config/prisma";

/** The current assignment for a delivery is its most recent one. */
export async function getCurrentAssignment(deliveryId: string) {
  return prisma.courierAssignment.findFirst({
    where: { deliveryId },
    orderBy: { assignedAt: "desc" },
  });
}

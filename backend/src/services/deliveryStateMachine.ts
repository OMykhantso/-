import { DeliveryStatus, Prisma, PrismaClient } from "@prisma/client";
import { prisma } from "../config/prisma";

type TxClient = Prisma.TransactionClient;

/**
 * The single source of truth for how a Delivery's status may change.
 *
 * This is the ONLY code path in the backend allowed to write
 * `Delivery.status`. There is deliberately no generic update endpoint that
 * lets a client PATCH a delivery's status field directly — every transition
 * goes through `applyTransition`, which always appends a StatusHistory row,
 * so a delivery's full lifecycle is reconstructable and auditable.
 */
export const ALLOWED_TRANSITIONS: Record<DeliveryStatus, DeliveryStatus[]> = {
  CREATED: ["ASSIGNED", "CANCELLED"],
  ASSIGNED: ["PICKED_UP", "CREATED", "CANCELLED"],
  PICKED_UP: ["IN_TRANSIT"],
  IN_TRANSIT: ["DELIVERED", "FAILED"],
  DELIVERED: [],
  FAILED: [],
  CANCELLED: [],
};

export class InvalidTransitionError extends Error {
  constructor(from: DeliveryStatus, to: DeliveryStatus) {
    super(`Cannot transition delivery from ${from} to ${to}`);
    this.name = "InvalidTransitionError";
  }
}

export function assertTransition(from: DeliveryStatus, to: DeliveryStatus): void {
  if (!ALLOWED_TRANSITIONS[from]?.includes(to)) {
    throw new InvalidTransitionError(from, to);
  }
}

export interface ApplyTransitionInput {
  deliveryId: string;
  to: DeliveryStatus;
  changedById: string;
  note?: string;
  lat?: number;
  lng?: number;
}

/**
 * Validates and applies a status transition atomically within an existing
 * transaction, recording a StatusHistory entry alongside the Delivery row
 * update. Use this when the transition needs to be combined with other
 * writes (e.g. creating a CourierAssignment) in a single DB transaction.
 */
export async function applyTransitionInTx(
  tx: TxClient,
  params: ApplyTransitionInput & { from: DeliveryStatus }
) {
  assertTransition(params.from, params.to);

  const updated = await tx.delivery.update({
    where: { id: params.deliveryId },
    data: { status: params.to },
  });

  await tx.statusHistory.create({
    data: {
      deliveryId: params.deliveryId,
      status: params.to,
      changedById: params.changedById,
      note: params.note,
      lat: params.lat,
      lng: params.lng,
    },
  });

  return updated;
}

/**
 * Validates and applies a status transition atomically, always recording a
 * StatusHistory entry alongside the Delivery row update.
 */
export async function applyTransition(input: ApplyTransitionInput) {
  return prisma.$transaction(async (tx) => {
    const delivery = await tx.delivery.findUnique({
      where: { id: input.deliveryId },
    });
    if (!delivery) {
      const err = new Error("Delivery not found");
      err.name = "NotFoundError";
      throw err;
    }

    return applyTransitionInTx(tx, { ...input, from: delivery.status });
  });
}

export function isTerminal(status: DeliveryStatus): boolean {
  return ALLOWED_TRANSITIONS[status].length === 0;
}

export type { PrismaClient };

import { env } from "../config/env";
import { LatLng, pathDistanceKm } from "./geo";

export interface EtaResult {
  remainingKm: number;
  remainingMinutes: number;
  etaAt: Date;
}

/**
 * ETA prediction (bonus feature) — heuristic v1.
 *
 * remainingMinutes = (remaining route distance / average urban speed) +
 *                    (number of remaining stops * fixed handling time)
 *
 * This is a transparent, explainable baseline that only needs the courier's
 * current position and the ordered remaining stops — no historical training
 * data required. It is isolated behind this one function so it can later be
 * swapped for a regression/ML model trained on StatusHistory timestamps
 * without touching any caller.
 */
export function predictEta(
  current: LatLng,
  remainingStops: LatLng[],
  now: Date = new Date()
): EtaResult {
  const remainingKm = pathDistanceKm([current, ...remainingStops]);
  const drivingMinutes = (remainingKm / env.avgSpeedKmh) * 60;
  const handlingMinutes = remainingStops.length * env.stopHandlingMinutes;
  const remainingMinutes = drivingMinutes + handlingMinutes;

  const etaAt = new Date(now.getTime() + remainingMinutes * 60_000);

  return { remainingKm, remainingMinutes, etaAt };
}

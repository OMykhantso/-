import { LatLng, haversineKm, pathDistanceKm } from "./geo";

export type StopKind = "PICKUP" | "DROPOFF";

export interface OptimizerStop extends LatLng {
  deliveryId: string;
  kind: StopKind;
}

export interface OptimizedResult {
  order: OptimizerStop[];
  totalDistanceKm: number;
}

/**
 * Multi-delivery route optimization (bonus feature).
 *
 * Builds a route over every pickup/dropoff point of the given deliveries,
 * starting from the courier's current position, subject to the constraint
 * that a delivery's PICKUP stop must come before its DROPOFF stop.
 *
 * Strategy: nearest-neighbor construction (cheap, respects the precedence
 * constraint by construction) followed by a bounded 2-opt local search that
 * rejects any swap breaking precedence. This is a standard, well-understood
 * heuristic for small/medium TSP-with-precedence instances — good enough for
 * a courier's daily stop list without needing an external solver.
 */
export function optimizeRoute(
  start: LatLng,
  stops: OptimizerStop[]
): OptimizedResult {
  if (stops.length === 0) {
    return { order: [], totalDistanceKm: 0 };
  }

  const order = nearestNeighbor(start, stops);
  const improved = twoOpt(start, order);
  const totalDistanceKm = pathDistanceKm([start, ...improved]);

  return { order: improved, totalDistanceKm };
}

function nearestNeighbor(
  start: LatLng,
  stops: OptimizerStop[]
): OptimizerStop[] {
  const remaining = [...stops];
  const pickedUp = new Set<string>();
  const route: OptimizerStop[] = [];
  let current: LatLng = start;

  while (remaining.length > 0) {
    const eligible = remaining.filter(
      (s) => s.kind === "PICKUP" || pickedUp.has(s.deliveryId)
    );
    // Should never be empty for well-formed input (every dropoff has a pickup
    // in the same batch), but fall back to "all remaining" defensively.
    const candidates = eligible.length > 0 ? eligible : remaining;

    let best = candidates[0];
    let bestDist = haversineKm(current, best);
    for (const c of candidates.slice(1)) {
      const d = haversineKm(current, c);
      if (d < bestDist) {
        best = c;
        bestDist = d;
      }
    }

    route.push(best);
    if (best.kind === "PICKUP") pickedUp.add(best.deliveryId);
    remaining.splice(remaining.indexOf(best), 1);
    current = best;
  }

  return route;
}

function respectsPrecedence(route: OptimizerStop[]): boolean {
  const pickupIndex = new Map<string, number>();
  for (let i = 0; i < route.length; i++) {
    const stop = route[i];
    if (stop.kind === "PICKUP") pickupIndex.set(stop.deliveryId, i);
  }
  for (let i = 0; i < route.length; i++) {
    const stop = route[i];
    if (stop.kind === "DROPOFF") {
      const pIdx = pickupIndex.get(stop.deliveryId);
      if (pIdx === undefined || pIdx > i) return false;
    }
  }
  return true;
}

function twoOpt(
  start: LatLng,
  initial: OptimizerStop[],
  maxIterations = 200
): OptimizerStop[] {
  let route = [...initial];
  let bestDistance = pathDistanceKm([start, ...route]);
  let improved = true;
  let iterations = 0;

  while (improved && iterations < maxIterations) {
    improved = false;
    for (let i = 0; i < route.length - 1 && !improved; i++) {
      for (let j = i + 1; j < route.length; j++) {
        iterations++;
        const candidate = twoOptSwap(route, i, j);
        if (!respectsPrecedence(candidate)) continue;

        const candidateDistance = pathDistanceKm([start, ...candidate]);
        if (candidateDistance < bestDistance - 1e-9) {
          route = candidate;
          bestDistance = candidateDistance;
          improved = true;
          break;
        }
      }
    }
  }

  return route;
}

function twoOptSwap<T>(route: T[], i: number, j: number): T[] {
  return [
    ...route.slice(0, i),
    ...route.slice(i, j + 1).reverse(),
    ...route.slice(j + 1),
  ];
}

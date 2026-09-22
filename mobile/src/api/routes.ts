import { api } from "./client";
import { CourierRoute } from "./types";

// Returns the courier's current PLANNED/ACTIVE route with ordered stops, or
// null when the dispatcher hasn't optimized a route for them yet.
export function getActiveRoute(token: string, courierId: string): Promise<CourierRoute | null> {
  return api.get<CourierRoute | null>(`/routes/active/${courierId}`, token);
}

export function completeRouteStop(token: string, stopId: string) {
  return api.post(`/routes/stops/${stopId}/complete`, undefined, token);
}

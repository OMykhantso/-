import { api } from "./client";
import { RouteData } from "../types";

export function optimizeRoute(courierId: string, deliveryIds: string[]) {
  return api.post<RouteData>("/routes/optimize", { courierId, deliveryIds });
}

export function getActiveRoute(courierId: string) {
  return api.get<RouteData | null>(`/routes/active/${courierId}`);
}

export function completeStop(stopId: string) {
  return api.post(`/routes/stops/${stopId}/complete`);
}

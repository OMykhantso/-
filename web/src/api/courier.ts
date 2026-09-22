import { api } from "./client";
import { CourierLocationPing } from "../types";

export function getCourierLocation(courierId: string) {
  return api.get<CourierLocationPing>(`/courier/${courierId}/location`);
}

export function reportLocation(input: { lat: number; lng: number; speedKmh?: number }) {
  return api.post(`/courier/location`, input);
}

// Note: the contract has no dedicated "list couriers" endpoint. The dispatcher
// UI sources the courier roster from GET /stats/couriers (dispatcher-only,
// returns every COURIER-role user with id + name), which doubles as the
// leaderboard data source for the stats dashboard.

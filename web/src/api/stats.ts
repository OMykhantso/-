import { api } from "./client";
import { CourierStat, StatsOverview, TimeseriesPoint } from "../types";

export function getOverview() {
  return api.get<StatsOverview>("/stats/overview");
}

export function getCourierStats() {
  return api.get<CourierStat[]>("/stats/couriers");
}

export function getTimeseries(days = 7) {
  return api.get<TimeseriesPoint[]>(`/stats/timeseries?days=${days}`);
}

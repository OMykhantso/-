import { api } from "./client";
import { CourierLocationPing } from "./types";

export interface PostLocationPayload {
  lat: number;
  lng: number;
  speedKmh?: number;
}

export function postCourierLocation(
  token: string,
  payload: PostLocationPayload
): Promise<CourierLocationPing> {
  return api.post<CourierLocationPing>("/courier/location", payload, token);
}

export function getCourierLocation(token: string, courierId: string): Promise<CourierLocationPing> {
  return api.get<CourierLocationPing>(`/courier/${courierId}/location`, token);
}

import { api } from "./client";
import { Delivery, DeliveryStatus, EtaResponse } from "../types";

export function listDeliveries(status?: DeliveryStatus) {
  const query = status ? `?status=${status}` : "";
  return api.get<Delivery[]>(`/deliveries${query}`);
}

export function getDelivery(id: string) {
  return api.get<Delivery>(`/deliveries/${id}`);
}

export function getEta(id: string) {
  return api.get<EtaResponse>(`/deliveries/${id}/eta`);
}

export function createDelivery(input: {
  pickupAddressId: string;
  dropoffAddressId: string;
  description?: string;
  weightKg?: number;
  packageSize?: string;
}) {
  return api.post<Delivery>("/deliveries", input);
}

export function cancelDelivery(id: string) {
  return api.post<Delivery>(`/deliveries/${id}/cancel`);
}

export function assignDelivery(id: string, courierId: string) {
  return api.post<Delivery>(`/deliveries/${id}/assign`, { courierId });
}

export type CourierAction = "accept" | "reject" | "pickup" | "start_transit" | "fail";

export function courierStatusAction(
  id: string,
  action: CourierAction,
  extra?: { lat?: number; lng?: number; note?: string }
) {
  return api.post<Delivery>(`/deliveries/${id}/status`, { action, ...extra });
}

export function submitProof(
  id: string,
  input: { photoBase64: string; signatureBase64: string; lat: number; lng: number; note?: string }
) {
  return api.post<Delivery>(`/deliveries/${id}/proof`, input);
}

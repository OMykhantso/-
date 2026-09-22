import { api } from "./client";
import { Delivery, DeliveryDetail, DeliveryStatus, EtaResponse, StatusAction } from "./types";

export function listMyDeliveries(token: string, status?: DeliveryStatus): Promise<Delivery[]> {
  const query = status ? `?status=${encodeURIComponent(status)}` : "";
  return api.get<Delivery[]>(`/deliveries${query}`, token);
}

export function getDelivery(token: string, id: string): Promise<DeliveryDetail> {
  return api.get<DeliveryDetail>(`/deliveries/${id}`, token);
}

export function getDeliveryEta(token: string, id: string): Promise<EtaResponse> {
  return api.get<EtaResponse>(`/deliveries/${id}/eta`, token);
}

export interface StatusActionPayload {
  action: StatusAction;
  lat?: number;
  lng?: number;
  note?: string;
}

export function updateDeliveryStatus(
  token: string,
  id: string,
  payload: StatusActionPayload
): Promise<Delivery> {
  return api.post<Delivery>(`/deliveries/${id}/status`, payload, token);
}

export interface SubmitProofPayload {
  photoBase64: string;
  signatureBase64: string;
  lat: number;
  lng: number;
  note?: string;
}

export function submitProofOfDelivery(
  token: string,
  id: string,
  payload: SubmitProofPayload
): Promise<Delivery> {
  return api.post<Delivery>(`/deliveries/${id}/proof`, payload, token);
}

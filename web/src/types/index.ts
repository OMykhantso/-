export type Role = "CLIENT" | "COURIER" | "DISPATCHER";

export type DeliveryStatus =
  | "CREATED"
  | "ASSIGNED"
  | "PICKED_UP"
  | "IN_TRANSIT"
  | "DELIVERED"
  | "FAILED"
  | "CANCELLED";

export type AssignmentStatus = "ASSIGNED" | "ACCEPTED" | "REJECTED" | "COMPLETED";

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  createdAt: string;
}

export interface Address {
  id: string;
  ownerId: string;
  label: string;
  street: string;
  city: string;
  lat: number;
  lng: number;
}

export interface CourierSummary {
  id: string;
  name: string;
  phone: string | null;
}

export interface Assignment {
  id: string;
  deliveryId?: string;
  courierId: string;
  status: AssignmentStatus;
  assignedAt: string;
  courier?: CourierSummary;
}

export interface StatusHistoryEntry {
  id: string;
  deliveryId: string;
  status: DeliveryStatus;
  changedById: string;
  note: string | null;
  lat: number | null;
  lng: number | null;
  createdAt: string;
}

export interface RouteStop {
  id: string;
  routeId: string;
  deliveryId: string;
  sequence: number;
  kind: "PICKUP" | "DROPOFF";
  lat: number;
  lng: number;
  etaAt: string | null;
  completedAt: string | null;
  delivery?: Delivery;
}

export interface RouteData {
  id: string;
  courierId: string;
  status: "PLANNED" | "ACTIVE" | "COMPLETED";
  totalDistanceKm: number | null;
  createdAt: string;
  stops: RouteStop[];
}

export interface Delivery {
  id: string;
  clientId: string;
  client?: CourierSummary;
  pickupAddressId: string;
  pickupAddress: Address;
  dropoffAddressId: string;
  dropoffAddress: Address;
  description: string | null;
  weightKg: number | null;
  packageSize: string | null;
  status: DeliveryStatus;
  etaAt: string | null;
  proofPhotoUrl: string | null;
  proofSignature: string | null;
  proofNote: string | null;
  createdAt: string;
  updatedAt: string;
  assignments?: Assignment[];
  statusHistory?: StatusHistoryEntry[];
  routeStops?: RouteStop[];
}

export interface EtaResponse {
  etaAt: string | null;
  remainingKm: number | null;
  remainingMinutes: number | null;
}

export interface CourierLocationPing {
  courierId: string;
  lat: number;
  lng: number;
  speedKmh?: number | null;
  at: string;
}

export interface StatsOverview {
  byStatus: Record<DeliveryStatus, number>;
  createdToday: number;
  totalDeliveries: number;
  avgDeliveryMinutes: number | null;
}

export interface CourierStat {
  courierId: string;
  name: string;
  completedDeliveries: number;
  distanceKm: number;
}

export interface TimeseriesPoint {
  date: string;
  created: number;
  delivered: number;
}

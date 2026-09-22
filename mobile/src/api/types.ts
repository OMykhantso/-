// Shapes mirrored from backend/prisma/schema.prisma and docs/CONTRACT.md.
// Keep in sync with the backend — there is no code generation between the two.

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

export type RouteStatus = "PLANNED" | "ACTIVE" | "COMPLETED";

export type StopKind = "PICKUP" | "DROPOFF";

export type StatusAction = "accept" | "reject" | "pickup" | "start_transit" | "fail";

export interface PublicUser {
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

export interface CourierAssignment {
  id: string;
  deliveryId: string;
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
  kind: StopKind;
  lat: number;
  lng: number;
  etaAt: string | null;
  completedAt: string | null;
  delivery?: Delivery;
}

export interface CourierRoute {
  id: string;
  courierId: string;
  status: RouteStatus;
  totalDistanceKm: number | null;
  createdAt: string;
  stops: RouteStop[];
}

// Shape returned by GET /deliveries (list) — includes only the most recent assignment.
export interface Delivery {
  id: string;
  clientId: string;
  pickupAddressId: string;
  dropoffAddressId: string;
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
  pickupAddress: Address;
  dropoffAddress: Address;
  client: CourierSummary;
  assignments: CourierAssignment[];
}

// Shape returned by GET /deliveries/:id — full detail.
export interface DeliveryDetail extends Delivery {
  statusHistory: StatusHistoryEntry[];
  routeStops: RouteStop[];
}

export interface EtaResponse {
  etaAt: string | null;
  remainingKm: number | null;
  remainingMinutes: number | null;
}

export interface CourierLocationPing {
  id: string;
  courierId: string;
  lat: number;
  lng: number;
  speedKmh: number | null;
  createdAt: string;
}

export const ACTIVE_DELIVERY_STATUSES: DeliveryStatus[] = ["ASSIGNED", "PICKED_UP", "IN_TRANSIT"];

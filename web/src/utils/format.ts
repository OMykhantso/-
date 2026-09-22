import { DeliveryStatus } from "../types";

export const STATUS_LABEL: Record<DeliveryStatus, string> = {
  CREATED: "Created",
  ASSIGNED: "Assigned",
  PICKED_UP: "Picked up",
  IN_TRANSIT: "In transit",
  DELIVERED: "Delivered",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
};

export const STATUS_COLOR: Record<DeliveryStatus, string> = {
  CREATED: "#64748b",
  ASSIGNED: "#2563eb",
  PICKED_UP: "#7c3aed",
  IN_TRANSIT: "#d97706",
  DELIVERED: "#16a34a",
  FAILED: "#dc2626",
  CANCELLED: "#94a3b8",
};

export function formatDate(input: string | null | undefined): string {
  if (!input) return "—";
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatMinutes(mins: number | null | undefined): string {
  if (mins === null || mins === undefined) return "—";
  if (mins < 60) return `${Math.round(mins)} min`;
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return `${h}h ${m}m`;
}

export function formatKm(km: number | null | undefined): string {
  if (km === null || km === undefined) return "—";
  return `${km.toFixed(1)} km`;
}

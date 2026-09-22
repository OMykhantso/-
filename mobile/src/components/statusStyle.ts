import { DeliveryStatus } from "../api/types";

export const STATUS_LABELS: Record<DeliveryStatus, string> = {
  CREATED: "Awaiting assignment",
  ASSIGNED: "Assigned",
  PICKED_UP: "Picked up",
  IN_TRANSIT: "In transit",
  DELIVERED: "Delivered",
  FAILED: "Failed",
  CANCELLED: "Cancelled",
};

export const STATUS_COLORS: Record<DeliveryStatus, string> = {
  CREATED: "#6B7280",
  ASSIGNED: "#B45309",
  PICKED_UP: "#1D4ED8",
  IN_TRANSIT: "#7C3AED",
  DELIVERED: "#15803D",
  FAILED: "#B91C1C",
  CANCELLED: "#4B5563",
};

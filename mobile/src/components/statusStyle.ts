import { DeliveryStatus } from "../api/types";

export const STATUS_LABELS: Record<DeliveryStatus, string> = {
  CREATED: "Нове",
  ASSIGNED: "Призначено",
  PICKED_UP: "Забрано",
  IN_TRANSIT: "В дорозі",
  DELIVERED: "Доставлено",
  FAILED: "Не вдалося",
  CANCELLED: "Скасовано",
};

// Status colors per the shared design spec: CREATED/ASSIGNED = primary blue,
// PICKED_UP/IN_TRANSIT = amber, DELIVERED = emerald, FAILED/CANCELLED = red.
export const STATUS_COLORS: Record<DeliveryStatus, string> = {
  CREATED: "#2563EB",
  ASSIGNED: "#2563EB",
  PICKED_UP: "#F59E0B",
  IN_TRANSIT: "#F59E0B",
  DELIVERED: "#10B981",
  FAILED: "#EF4444",
  CANCELLED: "#EF4444",
};

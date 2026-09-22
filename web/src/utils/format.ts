import { DeliveryStatus, Role } from "../types";

export const ROLE_LABEL: Record<Role, string> = {
  CLIENT: "Клієнт",
  COURIER: "Кур'єр",
  DISPATCHER: "Диспетчер",
};

export const STATUS_LABEL: Record<DeliveryStatus, string> = {
  CREATED: "Нове",
  ASSIGNED: "Призначено",
  PICKED_UP: "Забрано",
  IN_TRANSIT: "В дорозі",
  DELIVERED: "Доставлено",
  FAILED: "Не вдалося",
  CANCELLED: "Скасовано",
};

export const STATUS_COLOR: Record<DeliveryStatus, string> = {
  CREATED: "#2563eb",
  ASSIGNED: "#2563eb",
  PICKED_UP: "#f59e0b",
  IN_TRANSIT: "#f59e0b",
  DELIVERED: "#10b981",
  FAILED: "#ef4444",
  CANCELLED: "#ef4444",
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
  if (mins < 60) return `${Math.round(mins)} хв`;
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  return `${h} год ${m} хв`;
}

export function formatKm(km: number | null | undefined): string {
  if (km === null || km === undefined) return "—";
  return `${km.toFixed(1)} км`;
}

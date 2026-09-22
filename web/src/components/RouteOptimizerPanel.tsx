import { useMemo, useState } from "react";
import { CourierStat, Delivery, RouteData } from "../types";
import { optimizeRoute } from "../api/routes";
import { ApiError } from "../api/client";
import { formatDate, formatKm } from "../utils/format";

export default function RouteOptimizerPanel({
  deliveries,
  couriers,
}: {
  deliveries: Delivery[];
  couriers: CourierStat[];
}) {
  const [courierId, setCourierId] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [route, setRoute] = useState<RouteData | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const eligibleDeliveries = useMemo(() => {
    if (!courierId) return [];
    return deliveries.filter((d) => {
      const assignment = d.assignments?.[0];
      return (
        assignment?.courierId === courierId &&
        ["ASSIGNED", "PICKED_UP", "IN_TRANSIT"].includes(d.status)
      );
    });
  }, [deliveries, courierId]);

  function toggle(id: string) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleOptimize() {
    if (!courierId || selectedIds.length === 0) {
      setError("Оберіть кур'єра та хоча б одну з його доставок.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const result = await optimizeRoute(courierId, selectedIds);
      setRoute(result);
    } catch (err) {
      setError(err instanceof ApiError ? `Помилка: ${err.message}` : "Не вдалося оптимізувати маршрут");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="panel">
      <h3>Оптимізація маршруту</h3>
      <p className="muted small">
        Оберіть кур'єра та доставки, які він виконує, щоб розрахувати оптимальний порядок забору й доставки.
      </p>
      <label className="field">
        <span>Кур'єр</span>
        <select
          value={courierId}
          onChange={(e) => {
            setCourierId(e.target.value);
            setSelectedIds([]);
            setRoute(null);
          }}
        >
          <option value="">Оберіть кур'єра…</option>
          {couriers.map((c) => (
            <option key={c.courierId} value={c.courierId}>
              {c.name}
            </option>
          ))}
        </select>
      </label>

      {courierId && (
        <div className="checklist">
          {eligibleDeliveries.length === 0 ? (
            <p className="muted small">У цього кур'єра немає активних доставок для оптимізації.</p>
          ) : (
            eligibleDeliveries.map((d) => (
              <label key={d.id} className="checklist-item">
                <input
                  type="checkbox"
                  checked={selectedIds.includes(d.id)}
                  onChange={() => toggle(d.id)}
                />
                #{d.id.slice(0, 8)} · {d.pickupAddress.label} → {d.dropoffAddress.label}
              </label>
            ))
          )}
        </div>
      )}

      {error && <div className="alert alert-error">{error}</div>}

      <button
        className="btn btn-primary"
        onClick={handleOptimize}
        disabled={submitting || eligibleDeliveries.length === 0}
      >
        {submitting ? "Оптимізація…" : "Оптимізувати маршрут"}
      </button>

      {route && (
        <div className="route-result">
          <h4>
            Оптимізований маршрут{" "}
            <span className="muted small">(загалом {formatKm(route.totalDistanceKm)})</span>
          </h4>
          <ol className="stop-list">
            {route.stops
              .slice()
              .sort((a, b) => a.sequence - b.sequence)
              .map((stop) => (
                <li key={stop.id} className="stop-item">
                  <span className={`stop-kind ${stop.kind.toLowerCase()}`}>
                    {stop.kind === "PICKUP" ? "Забір" : "Доставка"}
                  </span>
                  <span className="mono">#{stop.deliveryId.slice(0, 8)}</span>
                  <span className="muted small">{stop.etaAt ? formatDate(stop.etaAt) : ""}</span>
                </li>
              ))}
          </ol>
        </div>
      )}
    </div>
  );
}

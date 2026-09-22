import { useState } from "react";
import { Delivery, CourierStat } from "../types";
import { assignDelivery } from "../api/deliveries";
import { ApiError } from "../api/client";

export default function AssignPanel({
  deliveries,
  couriers,
  onAssigned,
}: {
  deliveries: Delivery[];
  couriers: CourierStat[];
  onAssigned: () => void;
}) {
  const unassigned = deliveries.filter((d) => d.status === "CREATED");
  const [deliveryId, setDeliveryId] = useState("");
  const [courierId, setCourierId] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAssign() {
    if (!deliveryId || !courierId) {
      setError("Оберіть доставку та кур'єра.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await assignDelivery(deliveryId, courierId);
      setDeliveryId("");
      setCourierId("");
      onAssigned();
    } catch (err) {
      setError(err instanceof ApiError ? `Помилка: ${err.message}` : "Не вдалося призначити доставку");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="panel">
      <h3>Призначити кур'єра</h3>
      {unassigned.length === 0 ? (
        <p className="muted">Наразі немає непризначених доставок.</p>
      ) : (
        <div className="assign-form">
          <label className="field">
            <span>Непризначена доставка</span>
            <select value={deliveryId} onChange={(e) => setDeliveryId(e.target.value)}>
              <option value="" disabled>
                Оберіть доставку…
              </option>
              {unassigned.map((d) => (
                <option key={d.id} value={d.id}>
                  #{d.id.slice(0, 8)} · {d.pickupAddress.label} → {d.dropoffAddress.label}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span>Кур'єр</span>
            <select value={courierId} onChange={(e) => setCourierId(e.target.value)}>
              <option value="" disabled>
                Оберіть кур'єра…
              </option>
              {couriers.map((c) => (
                <option key={c.courierId} value={c.courierId}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          {error && <div className="alert alert-error">{error}</div>}
          <button className="btn btn-primary" onClick={handleAssign} disabled={submitting}>
            {submitting ? "Призначення…" : "Призначити"}
          </button>
        </div>
      )}
    </div>
  );
}

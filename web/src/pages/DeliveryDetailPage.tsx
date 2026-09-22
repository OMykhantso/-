import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Delivery, EtaResponse } from "../types";
import { cancelDelivery, getDelivery, getEta } from "../api/deliveries";
import { useSocket } from "../context/SocketContext";
import StatusBadge from "../components/StatusBadge";
import StatusTimeline from "../components/StatusTimeline";
import DeliveryTrackingMap from "../components/DeliveryTrackingMap";
import { formatDate, formatKm, formatMinutes } from "../utils/format";
import { ApiError } from "../api/client";

export default function DeliveryDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { socket } = useSocket();
  const [delivery, setDelivery] = useState<Delivery | null>(null);
  const [eta, setEta] = useState<EtaResponse | null>(null);
  const [courierPos, setCourierPos] = useState<{ lat: number; lng: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    const d = await getDelivery(id);
    setDelivery(d);
    try {
      const e = await getEta(id);
      setEta(e);
    } catch {
      setEta(null);
    }
  }, [id]);

  useEffect(() => {
    load().finally(() => setLoading(false));
  }, [load]);

  useEffect(() => {
    if (!socket || !id) return;
    socket.emit("delivery:watch", id);

    const onStatusChanged = (payload: { deliveryId: string }) => {
      if (payload.deliveryId === id) load();
    };
    const onLocation = (payload: { courierId: string; lat: number; lng: number }) => {
      setCourierPos({ lat: payload.lat, lng: payload.lng });
    };
    const onEta = (payload: { deliveryId: string } & EtaResponse) => {
      if (payload.deliveryId === id) {
        setEta({ etaAt: payload.etaAt, remainingKm: payload.remainingKm, remainingMinutes: payload.remainingMinutes });
      }
    };

    socket.on("delivery:statusChanged", onStatusChanged);
    socket.on("delivery:assigned", onStatusChanged);
    socket.on("courier:location", onLocation);
    socket.on("delivery:eta", onEta);

    return () => {
      socket.emit("delivery:unwatch", id);
      socket.off("delivery:statusChanged", onStatusChanged);
      socket.off("delivery:assigned", onStatusChanged);
      socket.off("courier:location", onLocation);
      socket.off("delivery:eta", onEta);
    };
  }, [socket, id, load]);

  async function handleCancel() {
    if (!delivery) return;
    setCancelling(true);
    setError(null);
    try {
      const updated = await cancelDelivery(delivery.id);
      setDelivery((prev) => (prev ? { ...prev, status: updated.status } : prev));
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not cancel delivery");
    } finally {
      setCancelling(false);
    }
  }

  if (loading) {
    return (
      <div className="center-screen">
        <div className="spinner" />
      </div>
    );
  }

  if (!delivery) {
    return (
      <div className="page">
        <p>Delivery not found.</p>
        <Link to="/client">Back to deliveries</Link>
      </div>
    );
  }

  const canCancel = delivery.status === "CREATED" || delivery.status === "ASSIGNED";
  const currentAssignment = delivery.assignments?.[0];

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <Link to="/client" className="back-link">
            ← My deliveries
          </Link>
          <h1>Delivery #{delivery.id.slice(0, 8)}</h1>
        </div>
        <StatusBadge status={delivery.status} />
      </div>

      <div className="detail-grid">
        <div className="panel map-panel">
          <DeliveryTrackingMap
            pickup={delivery.pickupAddress}
            dropoff={delivery.dropoffAddress}
            courierPosition={courierPos}
          />
        </div>

        <div className="panel">
          <h3>Delivery info</h3>
          <dl className="kv">
            <dt>Pickup</dt>
            <dd>
              {delivery.pickupAddress.label} — {delivery.pickupAddress.street}, {delivery.pickupAddress.city}
            </dd>
            <dt>Dropoff</dt>
            <dd>
              {delivery.dropoffAddress.label} — {delivery.dropoffAddress.street}, {delivery.dropoffAddress.city}
            </dd>
            {delivery.description && (
              <>
                <dt>Description</dt>
                <dd>{delivery.description}</dd>
              </>
            )}
            {currentAssignment?.courier && (
              <>
                <dt>Courier</dt>
                <dd>
                  {currentAssignment.courier.name}
                  {currentAssignment.courier.phone ? ` · ${currentAssignment.courier.phone}` : ""}
                </dd>
              </>
            )}
            <dt>Created</dt>
            <dd>{formatDate(delivery.createdAt)}</dd>
          </dl>

          <div className="eta-box">
            <span className="eta-label">Estimated arrival</span>
            <span className="eta-value">{eta?.etaAt ? formatDate(eta.etaAt) : "Not available yet"}</span>
            {eta?.remainingKm != null && (
              <span className="muted small">
                {formatKm(eta.remainingKm)} · {formatMinutes(eta.remainingMinutes)} remaining
              </span>
            )}
          </div>

          {error && <div className="alert alert-error">{error}</div>}

          <button className="btn btn-danger btn-block" disabled={!canCancel || cancelling} onClick={handleCancel}>
            {cancelling ? "Cancelling…" : "Cancel delivery"}
          </button>
        </div>

        <div className="panel">
          <h3>Status history</h3>
          <StatusTimeline history={delivery.statusHistory ?? []} />
        </div>
      </div>
    </div>
  );
}

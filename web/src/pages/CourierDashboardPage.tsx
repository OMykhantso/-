import { useEffect, useState } from "react";
import { Delivery } from "../types";
import { listDeliveries } from "../api/deliveries";
import { useSocket } from "../context/SocketContext";
import StatusBadge from "../components/StatusBadge";
import { formatDate } from "../utils/format";

export default function CourierDashboardPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const { socket } = useSocket();

  async function refresh() {
    const d = await listDeliveries();
    setDeliveries(d);
  }

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!socket) return;
    const onChange = () => refresh();
    socket.on("delivery:assigned", onChange);
    socket.on("delivery:statusChanged", onChange);
    return () => {
      socket.off("delivery:assigned", onChange);
      socket.off("delivery:statusChanged", onChange);
    };
  }, [socket]);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Мої доставки</h1>
          <p className="muted">
            Огляд лише для перегляду. Використовуйте мобільний застосунок кур'єра, щоб приймати, оновлювати та
            завершувати доставки.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="center-screen small">
          <div className="spinner" />
        </div>
      ) : deliveries.length === 0 ? (
        <div className="empty-state">
          <p>Вам ще не призначено жодної доставки.</p>
        </div>
      ) : (
        <div className="card-grid">
          {deliveries.map((d) => (
            <div key={d.id} className="delivery-card no-hover">
              <div className="delivery-card-top">
                <StatusBadge status={d.status} />
                <span className="muted small">{formatDate(d.createdAt)}</span>
              </div>
              <div className="delivery-route">
                <div className="route-point">
                  <span className="dot green" />
                  {d.pickupAddress.label}
                </div>
                <div className="route-line" />
                <div className="route-point">
                  <span className="dot red" />
                  {d.dropoffAddress.label}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

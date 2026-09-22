import { useEffect, useState } from "react";
import { CourierStat, Delivery, DeliveryStatus } from "../types";
import { listDeliveries } from "../api/deliveries";
import { getCourierStats } from "../api/stats";
import { useSocket } from "../context/SocketContext";
import DeliveryTable from "../components/DeliveryTable";
import AssignPanel from "../components/AssignPanel";
import RouteOptimizerPanel from "../components/RouteOptimizerPanel";
import StatsPanel from "../components/StatsPanel";
import FleetMap, { FleetPosition } from "../components/FleetMap";

type Tab = "deliveries" | "map" | "routes" | "stats";

export default function DispatcherDashboardPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [couriers, setCouriers] = useState<CourierStat[]>([]);
  const [filter, setFilter] = useState<DeliveryStatus | "ALL">("ALL");
  const [tab, setTab] = useState<Tab>("deliveries");
  const [loading, setLoading] = useState(true);
  const [positions, setPositions] = useState<Record<string, FleetPosition>>({});
  const { socket } = useSocket();

  async function refresh() {
    const [d, c] = await Promise.all([listDeliveries(), getCourierStats()]);
    setDeliveries(d);
    setCouriers(c);
  }

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!socket) return;
    const onChange = () => refresh();
    const onLocation = (payload: FleetPosition) => {
      setPositions((prev) => ({ ...prev, [payload.courierId]: payload }));
    };
    socket.on("delivery:created", onChange);
    socket.on("delivery:statusChanged", onChange);
    socket.on("delivery:assigned", onChange);
    socket.on("courier:location", onLocation);
    return () => {
      socket.off("delivery:created", onChange);
      socket.off("delivery:statusChanged", onChange);
      socket.off("delivery:assigned", onChange);
      socket.off("courier:location", onLocation);
    };
  }, [socket]);

  // Enrich fleet positions with courier names once we know them.
  const courierNameById = Object.fromEntries(couriers.map((c) => [c.courierId, c.name]));
  const fleetPositions = Object.values(positions).map((p) => ({
    ...p,
    courierName: courierNameById[p.courierId],
  }));

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>Панель диспетчера</h1>
          <p className="muted">Призначайте кур'єрів, оптимізуйте маршрути та стежте за операціями в реальному часі.</p>
        </div>
      </div>

      <div className="tabs">
        {(["deliveries", "map", "routes", "stats"] as Tab[]).map((t) => (
          <button key={t} className={tab === t ? "tab-btn active" : "tab-btn"} onClick={() => setTab(t)}>
            {t === "deliveries" && "Доставки"}
            {t === "map" && "Карта в реальному часі"}
            {t === "routes" && "Маршрути"}
            {t === "stats" && "Статистика"}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="center-screen small">
          <div className="spinner" />
        </div>
      ) : (
        <>
          {tab === "deliveries" && (
            <div className="stack">
              <AssignPanel deliveries={deliveries} couriers={couriers} onAssigned={refresh} />
              <DeliveryTable deliveries={deliveries} filter={filter} onFilterChange={setFilter} />
            </div>
          )}

          {tab === "map" && (
            <div className="panel map-panel large">
              {fleetPositions.length === 0 ? (
                <div className="empty-state">
                  <p>Ще немає даних про місцезнаходження кур'єрів.</p>
                </div>
              ) : (
                <FleetMap positions={fleetPositions} />
              )}
            </div>
          )}

          {tab === "routes" && <RouteOptimizerPanel deliveries={deliveries} couriers={couriers} />}

          {tab === "stats" && <StatsPanel couriers={couriers} />}
        </>
      )}
    </div>
  );
}

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { CourierStat, DeliveryStatus, StatsOverview, TimeseriesPoint } from "../types";
import { getOverview, getTimeseries } from "../api/stats";
import { formatKm, formatMinutes } from "../utils/format";

const CAT = {
  blue: "#2a78d6",
  orange: "#eb6834",
  aqua: "#1baf7a",
  yellow: "#eda100",
  magenta: "#e87ba4",
  green: "#008300",
  violet: "#4a3aa7",
  red: "#e34948",
};

const STATUS_ORDER: DeliveryStatus[] = [
  "CREATED",
  "ASSIGNED",
  "PICKED_UP",
  "IN_TRANSIT",
  "DELIVERED",
  "FAILED",
  "CANCELLED",
];

const STATUS_BAR_COLOR: Record<DeliveryStatus, string> = {
  CREATED: CAT.violet,
  ASSIGNED: CAT.blue,
  PICKED_UP: CAT.aqua,
  IN_TRANSIT: CAT.orange,
  DELIVERED: CAT.green,
  FAILED: CAT.red,
  CANCELLED: CAT.yellow,
};

export default function StatsPanel({ couriers }: { couriers: CourierStat[] }) {
  const [overview, setOverview] = useState<StatsOverview | null>(null);
  const [series, setSeries] = useState<TimeseriesPoint[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      const [ov, ts] = await Promise.all([getOverview(), getTimeseries(7)]);
      if (cancelled) return;
      setOverview(ov);
      setSeries(ts);
      setLoading(false);
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  if (loading || !overview) {
    return (
      <div className="center-screen small">
        <div className="spinner" />
      </div>
    );
  }

  const statusData = STATUS_ORDER.map((s) => ({ status: s, count: overview.byStatus[s] ?? 0 }));

  return (
    <div className="stats-grid">
      <div className="stat-tiles">
        <div className="stat-tile">
          <span className="stat-tile-label">Total deliveries</span>
          <span className="stat-tile-value">{overview.totalDeliveries}</span>
        </div>
        <div className="stat-tile">
          <span className="stat-tile-label">Created today</span>
          <span className="stat-tile-value">{overview.createdToday}</span>
        </div>
        <div className="stat-tile">
          <span className="stat-tile-label">Avg. delivery time</span>
          <span className="stat-tile-value">{formatMinutes(overview.avgDeliveryMinutes)}</span>
        </div>
        <div className="stat-tile">
          <span className="stat-tile-label">Active couriers</span>
          <span className="stat-tile-value">{couriers.length}</span>
        </div>
      </div>

      <div className="panel">
        <h3>Deliveries by status</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={statusData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }} barCategoryGap="28%">
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e1e0d9" />
            <XAxis dataKey="status" tick={{ fontSize: 11, fill: "#898781" }} tickLine={false} axisLine={{ stroke: "#c3c2b7" }} />
            <YAxis tick={{ fontSize: 11, fill: "#898781" }} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{ borderRadius: 8, border: "1px solid #e1e0d9", fontSize: 13 }}
              cursor={{ fill: "rgba(0,0,0,0.03)" }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {statusData.map((entry) => (
                <Cell key={entry.status} fill={STATUS_BAR_COLOR[entry.status]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        <div className="legend-row">
          {statusData.map((s) => (
            <span key={s.status} className="legend-chip">
              <span className="legend-dot" style={{ backgroundColor: STATUS_BAR_COLOR[s.status] }} />
              {s.status.replace("_", " ")}
            </span>
          ))}
        </div>
      </div>

      <div className="panel">
        <h3>Created vs. delivered (last 7 days)</h3>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={series} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e1e0d9" />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: "#898781" }}
              tickLine={false}
              axisLine={{ stroke: "#c3c2b7" }}
              tickFormatter={(d: string) => d.slice(5)}
            />
            <YAxis tick={{ fontSize: 11, fill: "#898781" }} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip contentStyle={{ borderRadius: 8, border: "1px solid #e1e0d9", fontSize: 13 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="created" name="Created" stroke={CAT.blue} strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="delivered" name="Delivered" stroke={CAT.orange} strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="panel">
        <h3>Courier leaderboard</h3>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Courier</th>
                <th>Completed</th>
                <th>Distance covered</th>
              </tr>
            </thead>
            <tbody>
              {couriers.length === 0 && (
                <tr>
                  <td colSpan={3} className="muted center">
                    No couriers yet.
                  </td>
                </tr>
              )}
              {couriers
                .slice()
                .sort((a, b) => b.completedDeliveries - a.completedDeliveries)
                .map((c) => (
                  <tr key={c.courierId}>
                    <td>{c.name}</td>
                    <td>{c.completedDeliveries}</td>
                    <td>{formatKm(c.distanceKm)}</td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

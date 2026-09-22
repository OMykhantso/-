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
import { formatKm, formatMinutes, STATUS_COLOR, STATUS_LABEL } from "../utils/format";

const CAT = {
  blue: "#2563eb",
  amber: "#f59e0b",
};

const AXIS_COLOR = "#64748b";
const GRID_COLOR = "#e2e8f0";

const STATUS_ORDER: DeliveryStatus[] = [
  "CREATED",
  "ASSIGNED",
  "PICKED_UP",
  "IN_TRANSIT",
  "DELIVERED",
  "FAILED",
  "CANCELLED",
];

const STATUS_BAR_COLOR = STATUS_COLOR;

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
          <span className="stat-tile-label">Усього доставок</span>
          <span className="stat-tile-value">{overview.totalDeliveries}</span>
        </div>
        <div className="stat-tile">
          <span className="stat-tile-label">Створено сьогодні</span>
          <span className="stat-tile-value">{overview.createdToday}</span>
        </div>
        <div className="stat-tile">
          <span className="stat-tile-label">Середній час доставки</span>
          <span className="stat-tile-value">{formatMinutes(overview.avgDeliveryMinutes)}</span>
        </div>
        <div className="stat-tile">
          <span className="stat-tile-label">Активні кур'єри</span>
          <span className="stat-tile-value">{couriers.length}</span>
        </div>
      </div>

      <div className="panel">
        <h3>Доставки за статусом</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={statusData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }} barCategoryGap="28%">
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID_COLOR} />
            <XAxis
              dataKey="status"
              tickFormatter={(s: DeliveryStatus) => STATUS_LABEL[s]}
              tick={{ fontSize: 11, fill: AXIS_COLOR }}
              tickLine={false}
              axisLine={{ stroke: GRID_COLOR }}
            />
            <YAxis tick={{ fontSize: 11, fill: AXIS_COLOR }} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 13, boxShadow: "0 8px 24px rgba(15,23,42,.08)" }}
              cursor={{ fill: "rgba(37,99,235,0.06)" }}
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
              {STATUS_LABEL[s.status]}
            </span>
          ))}
        </div>
      </div>

      <div className="panel">
        <h3>Створено проти доставлено (останні 7 днів)</h3>
        <ResponsiveContainer width="100%" height={260}>
          <LineChart data={series} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={GRID_COLOR} />
            <XAxis
              dataKey="date"
              tick={{ fontSize: 11, fill: AXIS_COLOR }}
              tickLine={false}
              axisLine={{ stroke: GRID_COLOR }}
              tickFormatter={(d: string) => d.slice(5)}
            />
            <YAxis tick={{ fontSize: 11, fill: AXIS_COLOR }} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #e2e8f0", fontSize: 13, boxShadow: "0 8px 24px rgba(15,23,42,.08)" }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line type="monotone" dataKey="created" name="Створено" stroke={CAT.blue} strokeWidth={2} dot={{ r: 3 }} />
            <Line type="monotone" dataKey="delivered" name="Доставлено" stroke={CAT.amber} strokeWidth={2} dot={{ r: 3 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="panel">
        <h3>Рейтинг кур'єрів</h3>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Кур'єр</th>
                <th>Виконано</th>
                <th>Пройдено відстань</th>
              </tr>
            </thead>
            <tbody>
              {couriers.length === 0 && (
                <tr>
                  <td colSpan={3} className="muted center">
                    Кур'єрів ще немає.
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

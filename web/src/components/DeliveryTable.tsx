import { useNavigate } from "react-router-dom";
import { Delivery, DeliveryStatus } from "../types";
import StatusBadge from "./StatusBadge";
import { formatDate } from "../utils/format";

const STATUS_OPTIONS: (DeliveryStatus | "ALL")[] = [
  "ALL",
  "CREATED",
  "ASSIGNED",
  "PICKED_UP",
  "IN_TRANSIT",
  "DELIVERED",
  "FAILED",
  "CANCELLED",
];

export default function DeliveryTable({
  deliveries,
  filter,
  onFilterChange,
}: {
  deliveries: Delivery[];
  filter: DeliveryStatus | "ALL";
  onFilterChange: (status: DeliveryStatus | "ALL") => void;
}) {
  const navigate = useNavigate();
  const filtered = filter === "ALL" ? deliveries : deliveries.filter((d) => d.status === filter);

  return (
    <div className="panel">
      <div className="panel-head">
        <h3>All deliveries</h3>
        <select value={filter} onChange={(e) => onFilterChange(e.target.value as DeliveryStatus | "ALL")}>
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s === "ALL" ? "All statuses" : s.replace("_", " ")}
            </option>
          ))}
        </select>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Client</th>
              <th>Pickup</th>
              <th>Dropoff</th>
              <th>Courier</th>
              <th>Status</th>
              <th>Created</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={7} className="muted center">
                  No deliveries match this filter.
                </td>
              </tr>
            )}
            {filtered.map((d) => {
              const assignment = d.assignments?.[0];
              return (
                <tr
                  key={d.id}
                  className="table-row-clickable"
                  onClick={() => navigate(`/dispatcher/deliveries/${d.id}`)}
                >
                  <td className="mono">{d.id.slice(0, 8)}</td>
                  <td>{d.client?.name ?? "—"}</td>
                  <td>{d.pickupAddress.label}</td>
                  <td>{d.dropoffAddress.label}</td>
                  <td>{assignment?.courier?.name ?? <span className="muted">Unassigned</span>}</td>
                  <td>
                    <StatusBadge status={d.status} />
                  </td>
                  <td className="muted small">{formatDate(d.createdAt)}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

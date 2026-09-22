import { DeliveryStatus } from "../types";
import { STATUS_COLOR, STATUS_LABEL } from "../utils/format";

export default function StatusBadge({ status }: { status: DeliveryStatus }) {
  const color = STATUS_COLOR[status];
  return (
    <span
      className="badge"
      style={{
        backgroundColor: `${color}1a`,
        color,
        border: `1px solid ${color}55`,
      }}
    >
      <span className="badge-dot" style={{ backgroundColor: color }} />
      {STATUS_LABEL[status]}
    </span>
  );
}

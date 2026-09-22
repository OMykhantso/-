import { StatusHistoryEntry } from "../types";
import { STATUS_LABEL, formatDate } from "../utils/format";

export default function StatusTimeline({ history }: { history: StatusHistoryEntry[] }) {
  if (history.length === 0) {
    return <p className="muted">No history yet.</p>;
  }
  return (
    <ol className="timeline">
      {history.map((entry, idx) => (
        <li key={entry.id} className={idx === history.length - 1 ? "timeline-item current" : "timeline-item"}>
          <div className="timeline-dot" />
          <div className="timeline-body">
            <div className="timeline-top">
              <strong>{STATUS_LABEL[entry.status]}</strong>
              <span className="muted">{formatDate(entry.createdAt)}</span>
            </div>
            {entry.note && <div className="timeline-note">{entry.note}</div>}
          </div>
        </li>
      ))}
    </ol>
  );
}

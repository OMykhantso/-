import { FormEvent, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Address, Delivery } from "../types";
import { listAddresses } from "../api/addresses";
import { createDelivery, listDeliveries } from "../api/deliveries";
import { useSocket } from "../context/SocketContext";
import StatusBadge from "../components/StatusBadge";
import AddressField from "../components/AddressField";
import { formatDate } from "../utils/format";
import { ApiError } from "../api/client";

export default function ClientDashboardPage() {
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const { socket } = useSocket();

  async function refresh() {
    const [d, a] = await Promise.all([listDeliveries(), listAddresses()]);
    setDeliveries(d);
    setAddresses(a);
  }

  useEffect(() => {
    refresh().finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!socket) return;
    const onChange = () => refresh();
    socket.on("delivery:statusChanged", onChange);
    socket.on("delivery:assigned", onChange);
    return () => {
      socket.off("delivery:statusChanged", onChange);
      socket.off("delivery:assigned", onChange);
    };
  }, [socket]);

  return (
    <div className="page">
      <div className="page-header">
        <div>
          <h1>My deliveries</h1>
          <p className="muted">Request a delivery and track it in real time.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowForm((s) => !s)}>
          {showForm ? "Close" : "New delivery"}
        </button>
      </div>

      {showForm && (
        <NewDeliveryForm
          addresses={addresses}
          onAddress={(a) => setAddresses((prev) => [...prev, a])}
          onCreated={() => {
            setShowForm(false);
            refresh();
          }}
        />
      )}

      {loading ? (
        <div className="center-screen small">
          <div className="spinner" />
        </div>
      ) : deliveries.length === 0 ? (
        <div className="empty-state">
          <p>No deliveries yet.</p>
        </div>
      ) : (
        <div className="card-grid">
          {deliveries.map((d) => (
            <Link to={`/client/deliveries/${d.id}`} key={d.id} className="delivery-card">
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
              {d.description && <p className="muted small">{d.description}</p>}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

function NewDeliveryForm({
  addresses,
  onAddress,
  onCreated,
}: {
  addresses: Address[];
  onAddress: (a: Address) => void;
  onCreated: () => void;
}) {
  const [pickupAddressId, setPickupAddressId] = useState<string | null>(null);
  const [dropoffAddressId, setDropoffAddressId] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [weightKg, setWeightKg] = useState("");
  const [packageSize, setPackageSize] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!pickupAddressId || !dropoffAddressId) {
      setError("Choose both a pickup and a dropoff address.");
      return;
    }
    if (pickupAddressId === dropoffAddressId) {
      setError("Pickup and dropoff must be different addresses.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      await createDelivery({
        pickupAddressId,
        dropoffAddressId,
        description: description || undefined,
        weightKg: weightKg ? parseFloat(weightKg) : undefined,
        packageSize: packageSize || undefined,
      });
      onCreated();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create delivery");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="panel form" onSubmit={handleSubmit}>
      <div className="grid-2">
        <AddressField
          title="Pickup address"
          color="green"
          addresses={addresses}
          value={pickupAddressId}
          onSelect={setPickupAddressId}
          onCreated={(a) => {
            onAddress(a);
            setPickupAddressId(a.id);
          }}
        />
        <AddressField
          title="Dropoff address"
          color="red"
          addresses={addresses}
          value={dropoffAddressId}
          onSelect={setDropoffAddressId}
          onCreated={(a) => {
            onAddress(a);
            setDropoffAddressId(a.id);
          }}
        />
      </div>
      <div className="grid-3">
        <label className="field">
          <span>Description</span>
          <input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Box of books" />
        </label>
        <label className="field">
          <span>Weight (kg)</span>
          <input type="number" step="any" value={weightKg} onChange={(e) => setWeightKg(e.target.value)} />
        </label>
        <label className="field">
          <span>Package size</span>
          <select value={packageSize} onChange={(e) => setPackageSize(e.target.value)}>
            <option value="">—</option>
            <option value="SMALL">Small</option>
            <option value="MEDIUM">Medium</option>
            <option value="LARGE">Large</option>
          </select>
        </label>
      </div>
      {error && <div className="alert alert-error">{error}</div>}
      <button className="btn btn-primary" type="submit" disabled={submitting}>
        {submitting ? "Requesting…" : "Request delivery"}
      </button>
    </form>
  );
}

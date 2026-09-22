import { useState } from "react";
import { Address } from "../types";
import { createAddress } from "../api/addresses";
import MapPicker from "./MapPicker";

interface Props {
  title: string;
  color: "green" | "red" | "blue";
  addresses: Address[];
  value: string | null;
  onSelect: (addressId: string) => void;
  onCreated: (address: Address) => void;
}

const DEFAULT_LAT = 37.7749;
const DEFAULT_LNG = -122.4194;

export default function AddressField({ title, color, addresses, value, onSelect, onCreated }: Props) {
  const [mode, setMode] = useState<"existing" | "new">(addresses.length > 0 ? "existing" : "new");
  const [label, setLabel] = useState("");
  const [street, setStreet] = useState("");
  const [city, setCity] = useState("");
  const [lat, setLat] = useState(DEFAULT_LAT);
  const [lng, setLng] = useState(DEFAULT_LNG);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    if (!label || !street || !city) {
      setError("Fill in label, street and city.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const address = await createAddress({ label, street, city, lat, lng });
      onCreated(address);
      setLabel("");
      setStreet("");
      setCity("");
      setMode("existing");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save address");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="address-field">
      <div className="address-field-head">
        <h4>{title}</h4>
        <div className="segmented">
          <button
            type="button"
            className={mode === "existing" ? "seg-btn active" : "seg-btn"}
            onClick={() => setMode("existing")}
            disabled={addresses.length === 0}
          >
            Saved
          </button>
          <button
            type="button"
            className={mode === "new" ? "seg-btn active" : "seg-btn"}
            onClick={() => setMode("new")}
          >
            New
          </button>
        </div>
      </div>

      {mode === "existing" ? (
        <select value={value ?? ""} onChange={(e) => onSelect(e.target.value)}>
          <option value="" disabled>
            Select an address…
          </option>
          {addresses.map((a) => (
            <option key={a.id} value={a.id}>
              {a.label} — {a.street}, {a.city}
            </option>
          ))}
        </select>
      ) : (
        <div className="address-new">
          <div className="grid-2">
            <label className="field">
              <span>Label</span>
              <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Warehouse" />
            </label>
            <label className="field">
              <span>City</span>
              <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="San Francisco" />
            </label>
          </div>
          <label className="field">
            <span>Street</span>
            <input value={street} onChange={(e) => setStreet(e.target.value)} placeholder="123 Main St" />
          </label>
          <div className="grid-2">
            <label className="field">
              <span>Latitude</span>
              <input
                type="number"
                step="any"
                value={lat}
                onChange={(e) => setLat(parseFloat(e.target.value))}
              />
            </label>
            <label className="field">
              <span>Longitude</span>
              <input
                type="number"
                step="any"
                value={lng}
                onChange={(e) => setLng(parseFloat(e.target.value))}
              />
            </label>
          </div>
          <p className="hint">Click or drag the pin to set the exact location.</p>
          <MapPicker lat={lat} lng={lng} color={color} onChange={(newLat, newLng) => { setLat(newLat); setLng(newLng); }} />
          {error && <div className="alert alert-error">{error}</div>}
          <button type="button" className="btn btn-secondary" onClick={handleCreate} disabled={saving}>
            {saving ? "Saving…" : "Save address"}
          </button>
        </div>
      )}
    </div>
  );
}

import { MapContainer, Marker, Popup, TileLayer } from "react-leaflet";
import { coloredIcon } from "../utils/leafletIcons";

export interface FleetPosition {
  courierId: string;
  courierName?: string;
  lat: number;
  lng: number;
  speedKmh?: number | null;
  at: string;
}

export default function FleetMap({ positions }: { positions: FleetPosition[] }) {
  const center: [number, number] =
    positions.length > 0 ? [positions[0].lat, positions[0].lng] : [37.7749, -122.4194];

  return (
    <MapContainer
      center={center}
      zoom={12}
      style={{ height: "100%", width: "100%", borderRadius: "12px" }}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {positions.map((p) => (
        <Marker key={p.courierId} position={[p.lat, p.lng]} icon={coloredIcon("blue")}>
          <Popup>
            <strong>{p.courierName || p.courierId}</strong>
            <br />
            {p.speedKmh != null ? `${p.speedKmh.toFixed(0)} km/h` : "speed n/a"}
            <br />
            {new Date(p.at).toLocaleTimeString()}
          </Popup>
        </Marker>
      ))}
    </MapContainer>
  );
}

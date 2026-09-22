import { useEffect } from "react";
import { MapContainer, Marker, Polyline, Popup, TileLayer, useMap } from "react-leaflet";
import { coloredIcon } from "../utils/leafletIcons";
import { Address } from "../types";

interface Props {
  pickup: Address;
  dropoff: Address;
  courierPosition: { lat: number; lng: number } | null;
}

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 13);
      return;
    }
    map.fitBounds(points, { padding: [40, 40] });
  }, [JSON.stringify(points)]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

export default function DeliveryTrackingMap({ pickup, dropoff, courierPosition }: Props) {
  const points: [number, number][] = [
    [pickup.lat, pickup.lng],
    [dropoff.lat, dropoff.lng],
    ...(courierPosition ? [[courierPosition.lat, courierPosition.lng] as [number, number]] : []),
  ];

  return (
    <MapContainer
      center={[pickup.lat, pickup.lng]}
      zoom={13}
      style={{ height: "100%", width: "100%", borderRadius: "12px" }}
      scrollWheelZoom
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker position={[pickup.lat, pickup.lng]} icon={coloredIcon("green")}>
        <Popup>Звідки — {pickup.label}</Popup>
      </Marker>
      <Marker position={[dropoff.lat, dropoff.lng]} icon={coloredIcon("red")}>
        <Popup>Куди — {dropoff.label}</Popup>
      </Marker>
      {courierPosition && (
        <Marker position={[courierPosition.lat, courierPosition.lng]} icon={coloredIcon("blue")}>
          <Popup>Поточне місцезнаходження кур'єра</Popup>
        </Marker>
      )}
      <Polyline
        positions={[
          [pickup.lat, pickup.lng],
          [dropoff.lat, dropoff.lng],
        ]}
        pathOptions={{ color: "#94a3b8", dashArray: "6 8", weight: 2 }}
      />
      <FitBounds points={points} />
    </MapContainer>
  );
}

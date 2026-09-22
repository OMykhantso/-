import { useCallback } from "react";
import L from "leaflet";
import { MapContainer, Marker, TileLayer, useMapEvents } from "react-leaflet";
import { coloredIcon } from "../utils/leafletIcons";

interface Props {
  lat: number;
  lng: number;
  onChange: (lat: number, lng: number) => void;
  color?: "green" | "red" | "blue";
}

function ClickHandler({ onChange }: { onChange: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onChange(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function MapPicker({ lat, lng, onChange, color = "blue" }: Props) {
  const handleDrag = useCallback(
    (e: L.DragEndEvent) => {
      const marker = e.target as L.Marker;
      const pos = marker.getLatLng();
      onChange(pos.lat, pos.lng);
    },
    [onChange]
  );

  return (
    <MapContainer
      center={[lat, lng]}
      zoom={12}
      style={{ height: "220px", width: "100%", borderRadius: "10px" }}
      scrollWheelZoom={false}
    >
      <TileLayer
        attribution='&copy; OpenStreetMap contributors'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <Marker
        position={[lat, lng]}
        draggable
        icon={coloredIcon(color)}
        eventHandlers={{ dragend: handleDrag }}
      />
      <ClickHandler onChange={onChange} />
    </MapContainer>
  );
}

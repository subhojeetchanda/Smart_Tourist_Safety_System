"use client";

import { useEffect, useState } from "react";
import { MapContainer, TileLayer, Marker, Popup } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix for default marker icons in React-Leaflet
const DefaultIcon = L.icon({
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
});
L.Marker.prototype.options.icon = DefaultIcon;

// Custom red icon for incidents
const IncidentIcon = L.icon({
  iconUrl: "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

interface MiniMapProps {
  lat: number;
  lon: number;
}

export default function MiniMap({ lat, lon }: MiniMapProps) {
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return <div className="h-full w-full bg-slate-800 animate-pulse rounded-lg flex items-center justify-center text-slate-500">Loading Map...</div>;
  }

  // Ensure lat/lon are valid numbers to prevent crashes
  if (isNaN(lat) || isNaN(lon) || lat === undefined || lon === undefined) {
    return <div className="h-full w-full bg-slate-800 rounded-lg flex items-center justify-center text-slate-500 border border-slate-700">Invalid Location Data</div>;
  }

  return (
    <>
      <style dangerouslySetInnerHTML={{__html: `
        .map-tiles {
          filter: invert(100%) hue-rotate(180deg) brightness(95%) contrast(90%);
        }
      `}} />
      <MapContainer 
        center={[lat, lon]} 
        zoom={15} 
        style={{ height: "100%", width: "100%", borderRadius: "0.5rem", zIndex: 10 }}
        zoomControl={false}
        dragging={false}
        scrollWheelZoom={false}
        doubleClickZoom={false}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          className="map-tiles"
        />
        <Marker position={[lat, lon]} icon={IncidentIcon}>
          <Popup>Last Known Location</Popup>
        </Marker>
      </MapContainer>
    </>
  );
}

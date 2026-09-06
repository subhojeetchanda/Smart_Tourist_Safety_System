"use client";

import {
  MapContainer,
  TileLayer,
  Circle,
  Tooltip,
  Marker,
  Polyline,
  useMap,
} from "react-leaflet";
import L from 'leaflet';
import "leaflet/dist/leaflet.css";
import { LatLngExpression } from "leaflet";
import { useEffect, useState } from "react";

// Import heatmap library
import 'leaflet.heat';

// Fix for default markers in react-leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface TouristData {
  lat: number;
  lon: number;
  status: "normal" | "anomaly" | "sos";
}

type TouristsResponse = Record<string, TouristData>;

interface MapProps {
  tourists: TouristsResponse;
  showHeatmap: boolean;
  heatmapData: [number, number, number][]; // [lat, lng, intensity]
}

// Custom Google Maps-like icon
const createCustomIcon = (status: string) => {
  const color = status === "sos" ? "red" : status === "anomaly" ? "orange" : "blue";
  
  return L.divIcon({
    className: 'custom-marker',
    html: `
      <div style="
        background-color: ${color};
        width: 20px;
        height: 20px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        position: relative;
        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
      ">
        <div style="
          content: '';
          width: 8px;
          height: 8px;
          background: white;
          border-radius: 50%;
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%) rotate(45deg);
        "></div>
      </div>
    `,
    iconSize: [20, 20],
    iconAnchor: [10, 20],
  });
};

// Enhanced Ripple effect component for anomalies and SOS
const RippleEffect = ({ center, color }: { center: LatLngExpression; color: string }) => {
  const [ripples, setRipples] = useState<Array<{ radius: number; opacity: number }>>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      setRipples(prev => {
        // Add new ripple
        const newRipples = [...prev, { radius: 30, opacity: 1.0 }];
        
        // Update existing ripples - make them expand faster and fade slower
        return newRipples
          .map(ripple => ({
            radius: ripple.radius + 25, // Increased expansion rate
            opacity: ripple.opacity - 0.03 // Slower fade
          }))
          .filter(ripple => ripple.opacity > 0 && ripple.radius < 2000); // Larger max radius
      });
    }, 200); // Faster interval for more dramatic effect

    return () => clearInterval(interval);
  }, []);

  return (
    <>
      {ripples.map((ripple, index) => (
        <Circle
          key={index}
          center={center}
          radius={ripple.radius}
          pathOptions={{
            color,
            fillColor: color,
            fillOpacity: ripple.opacity * 0.15, // Increased fill opacity
            weight: ripple.opacity > 0.4 ? 4 : 3, // Thicker stroke
            opacity: ripple.opacity,
            dashArray: ripple.opacity > 0.5 ? "10, 10" : "5, 15" // More varied radar effect
          }}
        />
      ))}
    </>
  );
};

// Heatmap Layer Component
const HeatmapLayer = ({ heatmapData, showHeatmap }: { heatmapData: [number, number, number][]; showHeatmap: boolean }) => {
  const map = useMap();
  
  useEffect(() => {
    if (!showHeatmap || !heatmapData.length) return;
    
    // Generate additional points for regional coverage
    const regionalHeatmapData = generateRegionalHeatmapData(heatmapData);
    
    // @ts-ignore: leaflet.heat doesn't have proper TypeScript definitions
    const heat = (L as any).heatLayer(regionalHeatmapData, {
      radius: 35,
      blur: 20,
      maxZoom: 15,
      gradient: {
        0.2: 'blue',    // Low risk
        0.4: 'cyan',    // Medium-low risk
        0.6: 'lime',    // Medium risk
        0.8: 'yellow',  // Medium-high risk
        1.0: 'red'      // High risk
      }
    }).addTo(map);
    
    // Adjust view to show the entire heatmap area when toggled
    if (showHeatmap && regionalHeatmapData.length > 0) {
      const group = new L.FeatureGroup();
      regionalHeatmapData.forEach(point => {
        group.addLayer(L.marker([point[0], point[1]]));
      });
      map.fitBounds(group.getBounds().pad(0.1));
    }
    
    return () => {
      map.removeLayer(heat);
    };
  }, [showHeatmap, heatmapData, map]);
  
  return null;
};

// Function to generate regional heatmap data around incident points
const generateRegionalHeatmapData = (incidentData: [number, number, number][]) => {
  const regionalData: [number, number, number][] = [];
  const spreadFactor = 0.02; // Spread incidents to create regional effect
  
  incidentData.forEach(([lat, lng, intensity]) => {
    // Add the original point
    regionalData.push([lat, lng, intensity]);
    
    // Add surrounding points to create a regional effect
    for (let i = 0; i < 15; i++) {
      const randomLat = lat + (Math.random() - 0.5) * spreadFactor;
      const randomLng = lng + (Math.random() - 0.5) * spreadFactor;
      // Decrease intensity as we move away from the center
      const newIntensity = intensity * (0.7 + Math.random() * 0.3) * (1 - (i / 20));
      regionalData.push([randomLat, randomLng, newIntensity]);
    }
  });
  
  return regionalData;
};

export default function Map({ tourists, showHeatmap, heatmapData }: MapProps) {
  const defaultCenter: LatLngExpression = [27.53, 88.51];
  const [paths, setPaths] = useState<Record<string, LatLngExpression[]>>({});

  useEffect(() => {
    // Update paths with new positions
    const newPaths = { ...paths };
    
    Object.entries(tourists).forEach(([id, data]) => {
      const newPosition: LatLngExpression = [data.lat, data.lon];
      
      if (!newPaths[id]) {
        newPaths[id] = [newPosition];
      } else {
        // Add new position to existing path
        newPaths[id] = [...newPaths[id], newPosition];
        
        // Limit path length to avoid performance issues
        if (newPaths[id].length > 50) {
          newPaths[id] = newPaths[id].slice(-50);
        }
      }
    });
    
    setPaths(newPaths);
  }, [tourists]); // This effect runs whenever tourists data changes

  return (
    <MapContainer
      center={defaultCenter}
      zoom={9}
      className="h-full w-full"
      scrollWheelZoom={true}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />

      {/* Heatmap Layer */}
      <HeatmapLayer heatmapData={heatmapData} showHeatmap={showHeatmap} />

      {Object.entries(tourists).map(([id, data]) => (
        <div key={id}>
          {/* Movement path */}
          {paths[id] && paths[id].length > 1 && (
            <Polyline
              positions={paths[id]}
              pathOptions={{
                color: data.status === "sos" ? "red" : 
                       data.status === "anomaly" ? "orange" : "blue",
                weight: 3,
                opacity: 0.7,
                lineCap: 'round',
                lineJoin: 'round'
              }}
            />
          )}

          {/* Google Maps-like marker */}
          <Marker
            position={[data.lat, data.lon]}
            icon={createCustomIcon(data.status)}
          >
            <Tooltip direction="top" offset={[0, -8]} opacity={0.9}>
              <div className="text-sm">
                <b>ID:</b> {id}
                <br />
                <b>Status:</b> {data.status}
                <br />
                <b>Path points:</b> {paths[id] ? paths[id].length : 0}
              </div>
            </Tooltip>
          </Marker>

          {/* Enhanced Ripple effect for anomalies and SOS */}
          {data.status !== "normal" && (
            <RippleEffect 
              center={[data.lat, data.lon]} 
              color={data.status === "sos" ? "red" : "orange"} 
            />
          )}

          {/* Highlight circle only for SOS or anomaly - made bigger */}
          {data.status !== "normal" && (
            <Circle
              center={[data.lat, data.lon]}
              radius={1200} // Further increased radius
              pathOptions={{ 
                color: data.status === "sos" ? "red" : "orange",
                fillOpacity: 0.08, // Slightly increased fill opacity
                weight: 3, // Thicker border
                dashArray: "8, 8" // More pronounced dash pattern
              }}
            />
          )}
        </div>
      ))}
    </MapContainer>
  );
}
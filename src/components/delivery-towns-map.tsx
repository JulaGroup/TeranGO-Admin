import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

// Fix Leaflet default marker icon issue
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png",
  iconUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png",
  shadowUrl: "https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png",
});

interface DeliveryTown {
  id: string;
  name: string;
  area: string;
  latitude: number;
  longitude: number;
  deliveryZone: string;
  isActive: boolean;
}

interface DeliveryTownsMapProps {
  towns: DeliveryTown[];
  onMapClick?: (lat: number, lng: number) => void;
  clickable?: boolean;
  selectedLocation?: { lat: number; lng: number } | null;
}

const getZoneColor = (zone: string) => {
  switch (zone) {
    case "zone1":
      return "#10b981"; // green
    case "zone2":
      return "#3b82f6"; // blue
    case "zone3":
      return "#f59e0b"; // amber
    default:
      return "#6b7280";
  }
};

const getZoneLabel = (zone: string) => {
  switch (zone) {
    case "zone1":
      return "Zone 1";
    case "zone2":
      return "Zone 2";
    case "zone3":
      return "Zone 3";
    default:
      return zone;
  }
};

export function DeliveryTownsMap({ towns, onMapClick, clickable = false, selectedLocation = null }: DeliveryTownsMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const selectedMarkerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Initialize map
    const map = L.map(mapContainerRef.current).setView([13.4549, -16.579], 11);
    mapRef.current = map;

    // Add tile layer
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    }).addTo(map);

    // Add click handler if clickable
    if (clickable && onMapClick) {
      map.on("click", (e: L.LeafletMouseEvent) => {
        onMapClick(e.latlng.lat, e.latlng.lng);
      });
      
      // Change cursor to crosshair when clickable
      map.getContainer().style.cursor = "crosshair";
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      if (selectedMarkerRef.current) {
        selectedMarkerRef.current.remove();
        selectedMarkerRef.current = null;
      }
    };
  }, [clickable, onMapClick]);

  useEffect(() => {
    if (!mapRef.current || !towns.length) return;

    const map = mapRef.current;

    // Clear existing markers
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        map.removeLayer(layer);
      }
    });

    const bounds: [number, number][] = [];

    // Add markers for each town
    towns.forEach((town) => {
      const color = getZoneColor(town.deliveryZone);
      const zoneNumber = town.deliveryZone.replace("zone", "");

      // Create custom marker with town name
      const icon = L.divIcon({
        className: "custom-marker",
        html: `
          <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
            <div style="background-color: ${color}; width: 32px; height: 32px; border-radius: 50%; border: 3px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.4); display: flex; align-items: center; justify-content: center;">
              <span style="color: white; font-size: 12px; font-weight: bold;">${zoneNumber}</span>
            </div>
            <div style="background-color: white; padding: 2px 6px; border-radius: 4px; box-shadow: 0 1px 4px rgba(0,0,0,0.3); margin-top: 4px; white-space: nowrap; border: 1px solid ${color};">
              <span style="color: ${color}; font-size: 11px; font-weight: 600;">${town.name}</span>
            </div>
          </div>
        `,
        iconSize: [100, 60],
        iconAnchor: [50, 32],
      });

      const marker = L.marker([town.latitude, town.longitude], { icon }).addTo(map);

      const statusBadge = town.isActive
        ? '<span style="background: #dcfce7; color: #166534; padding: 2px 8px; border-radius: 4px; font-size: 11px; border: 1px solid #86efac;">Active</span>'
        : '<span style="background: #f3f4f6; color: #6b7280; padding: 2px 8px; border-radius: 4px; font-size: 11px; border: 1px solid #d1d5db;">Inactive</span>';

      const zoneBadge = `<span style="background: ${color}20; color: ${color}; padding: 2px 8px; border-radius: 4px; font-size: 11px; border: 1px solid ${color}40;">${getZoneLabel(town.deliveryZone)}</span>`;

      marker.bindPopup(`
        <div style="font-family: system-ui, -apple-system, sans-serif;">
          <h3 style="margin: 0 0 4px 0; font-size: 16px; font-weight: 600;">${town.name}</h3>
          <p style="margin: 0 0 8px 0; font-size: 13px; color: #6b7280;">${town.area}</p>
          <div style="display: flex; gap: 6px; margin-bottom: 8px;">
            ${zoneBadge}
            ${statusBadge}
          </div>
          <p style="margin: 0; font-size: 11px; color: #9ca3af;">
            ${town.latitude.toFixed(6)}, ${town.longitude.toFixed(6)}
          </p>
        </div>
      `);

      bounds.push([town.latitude, town.longitude]);
    });

    // Fit map to show all markers
    if (bounds.length > 0) {
      map.fitBounds(bounds, { padding: [50, 50] });
    }
  }, [towns]);
  // Handle selected location marker
  useEffect(() => {
    if (!mapRef.current) return;

    const map = mapRef.current;

    // Remove existing selected marker
    if (selectedMarkerRef.current) {
      map.removeLayer(selectedMarkerRef.current);
      selectedMarkerRef.current = null;
    }

    // Add new selected marker if location is set
    if (selectedLocation) {
      const icon = L.divIcon({
        className: "selected-location-marker",
        html: `
          <style>
            @keyframes pulse-marker {
              0%, 100% { transform: scale(1); opacity: 1; }
              50% { transform: scale(1.1); opacity: 0.8; }
            }
          </style>
          <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
            <div style="background-color: #ef4444; width: 40px; height: 40px; border-radius: 50%; border: 4px solid white; box-shadow: 0 3px 8px rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; animation: pulse-marker 2s infinite;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="white" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
              </svg>
            </div>
            <div style="background-color: #ef4444; color: white; padding: 4px 8px; border-radius: 4px; box-shadow: 0 2px 6px rgba(0,0,0,0.4); margin-top: 6px; white-space: nowrap; font-weight: 600; font-size: 11px;">
              Selected Location
            </div>
          </div>
        `,
        iconSize: [120, 70],
        iconAnchor: [60, 40],
      });

      const marker = L.marker([selectedLocation.lat, selectedLocation.lng], { icon });
      marker.addTo(map);
      selectedMarkerRef.current = marker;

      // Pan to the selected location
      map.panTo([selectedLocation.lat, selectedLocation.lng]);
    }
  }, [selectedLocation]);
  return <div ref={mapContainerRef} style={{ height: "100%", width: "100%" }} />;
}

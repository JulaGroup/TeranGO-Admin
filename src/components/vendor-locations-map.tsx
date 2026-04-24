/**
 * Vendor Locations Map Component
 *
 * Displays vendor businesses (restaurants, shops, pharmacies) on an interactive Leaflet map.
 * Supports clicking to set/update business coordinates.
 */

import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { UtensilsCrossed, Package, Pill } from "lucide-react";

// Fix Leaflet default marker icon paths
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

export interface VendorBusiness {
  id: string;
  name: string;
  type: "Restaurant" | "Shop" | "Pharmacy";
  latitude?: number | null;
  longitude?: number | null;
  address?: string | null;
  vendorName?: string;
}

interface VendorLocationsMapProps {
  businesses: VendorBusiness[];
  onMapClick?: (lat: number, lng: number) => void;
  clickable?: boolean;
  selectedLocation?: { lat: number; lng: number } | null;
  highlightedBusinessId?: string | null;
}

export function VendorLocationsMap({
  businesses,
  onMapClick,
  clickable = false,
  selectedLocation,
  highlightedBusinessId,
}: VendorLocationsMapProps) {
  const mapRef = useRef<L.Map | null>(null);
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const markersRef = useRef<L.Marker[]>([]);
  const selectedMarkerRef = useRef<L.Marker | null>(null);

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    // Create map centered on The Gambia
    const map = L.map(mapContainerRef.current).setView([13.4549, -16.5790], 11);

    // Add OpenStreetMap tiles
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19,
    }).addTo(map);

    mapRef.current = map;

    // Cleanup on unmount
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Handle map clicks
  useEffect(() => {
    if (!mapRef.current) return;

    const handleClick = (e: L.LeafletMouseEvent) => {
      if (clickable && onMapClick) {
        onMapClick(e.latlng.lat, e.latlng.lng);
      }
    };

    if (clickable) {
      mapRef.current.on("click", handleClick);
      mapRef.current.getContainer().style.cursor = "crosshair";
    } else {
      mapRef.current.off("click");
      mapRef.current.getContainer().style.cursor = "";
    }

    return () => {
      if (mapRef.current) {
        mapRef.current.off("click", handleClick);
      }
    };
  }, [clickable, onMapClick]);

  // Update business markers
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove existing markers
    markersRef.current.forEach((marker) => marker.remove());
    markersRef.current = [];

    // Get business type color
    const getBusinessColor = (type: string) => {
      switch (type) {
        case "Restaurant":
          return "#f97316"; // orange
        case "Shop":
          return "#3b82f6"; // blue
        case "Pharmacy":
          return "#ef4444"; // red
        default:
          return "#6b7280"; // gray
      }
    };

    // Get business icon HTML
    const getBusinessIcon = (type: string) => {
      switch (type) {
        case "Restaurant":
          return "🍽️";
        case "Shop":
          return "🏪";
        case "Pharmacy":
          return "💊";
        default:
          return "📍";
      }
    };

    // Filter businesses with valid coordinates
    const validBusinesses = businesses.filter(
      (b) =>
        b.latitude !== null &&
        b.latitude !== undefined &&
        b.longitude !== null &&
        b.longitude !== undefined,
    );

    // Add markers for each business
    validBusinesses.forEach((business) => {
      const color = getBusinessColor(business.type);
      const icon = getBusinessIcon(business.type);
      const isHighlighted = business.id === highlightedBusinessId;

      // Create custom icon
      const customIcon = L.divIcon({
        className: "custom-div-icon",
        html: `
          <div style="
            display: flex;
            flex-direction: column;
            align-items: center;
            ${isHighlighted ? "filter: drop-shadow(0 0 8px " + color + ");" : ""}
          ">
            <div style="
              background-color: ${color};
              color: white;
              padding: 4px 8px;
              border-radius: 4px;
              font-size: 11px;
              font-weight: 600;
              white-space: nowrap;
              margin-bottom: 2px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.2);
              border: ${isHighlighted ? "2px solid white" : "none"};
            ">
              ${icon} ${business.name}
            </div>
            <div style="
              width: 0;
              height: 0;
              border-left: 6px solid transparent;
              border-right: 6px solid transparent;
              border-top: 8px solid ${color};
            "></div>
          </div>
        `,
        iconSize: [120, 40],
        iconAnchor: [60, 40],
      });

      const marker = L.marker([business.latitude!, business.longitude!], {
        icon: customIcon,
      }).addTo(mapRef.current!);

      // Add popup with business details
      const popupContent = `
        <div style="min-width: 200px;">
          <strong style="font-size: 14px;">${business.name}</strong>
          <br/>
          <span style="color: ${color}; font-size: 12px; font-weight: 600;">
            ${business.type}
          </span>
          ${business.vendorName ? `<br/><span style="font-size: 11px; color: #6b7280;">Vendor: ${business.vendorName}</span>` : ""}
          ${business.address ? `<br/><span style="font-size: 11px;">${business.address}</span>` : ""}
          <br/>
          <span style="font-size: 11px; color: #6b7280;">
            ${business.latitude?.toFixed(6)}, ${business.longitude?.toFixed(6)}
          </span>
        </div>
      `;

      marker.bindPopup(popupContent);

      markersRef.current.push(marker);
    });

    // Auto-fit bounds if businesses exist
    if (validBusinesses.length > 0) {
      const group = L.featureGroup(markersRef.current);
      mapRef.current.fitBounds(group.getBounds().pad(0.1), {
        maxZoom: 15,
      });
    }
  }, [businesses, highlightedBusinessId]);

  // Handle selected location marker (for setting new coordinates)
  useEffect(() => {
    if (!mapRef.current) return;

    // Remove previous selected marker
    if (selectedMarkerRef.current) {
      selectedMarkerRef.current.remove();
      selectedMarkerRef.current = null;
    }

    // Add new selected marker if location provided
    if (selectedLocation) {
      const redIcon = L.divIcon({
        className: "custom-div-icon",
        html: `
          <div style="
            display: flex;
            flex-direction: column;
            align-items: center;
          ">
            <div style="
              background-color: #dc2626;
              color: white;
              padding: 4px 8px;
              border-radius: 4px;
              font-size: 11px;
              font-weight: 600;
              white-space: nowrap;
              margin-bottom: 2px;
              box-shadow: 0 2px 4px rgba(0,0,0,0.2);
              border: 2px solid white;
              animation: pulse 1.5s infinite;
            ">
              📍 New Location
            </div>
            <div style="
              width: 0;
              height: 0;
              border-left: 6px solid transparent;
              border-right: 6px solid transparent;
              border-top: 8px solid #dc2626;
            "></div>
          </div>
          <style>
            @keyframes pulse {
              0%, 100% { opacity: 1; }
              50% { opacity: 0.6; }
            }
          </style>
        `,
        iconSize: [120, 40],
        iconAnchor: [60, 40],
      });

      selectedMarkerRef.current = L.marker(
        [selectedLocation.lat, selectedLocation.lng],
        { icon: redIcon },
      ).addTo(mapRef.current);

      selectedMarkerRef.current.bindPopup(
        `<strong>Selected Location</strong><br/>${selectedLocation.lat.toFixed(6)}, ${selectedLocation.lng.toFixed(6)}`,
      );
    }
  }, [selectedLocation]);

  return (
    <div
      ref={mapContainerRef}
      className="w-full h-[400px] rounded-lg border shadow-sm"
      style={{ zIndex: 0 }}
    />
  );
}

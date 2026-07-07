/**
 * Vendor Locations Map Component
 *
 * Displays vendor businesses (restaurants, shops, pharmacies) on an interactive
 * Google Map (consistent with the mobile apps). Supports clicking to set/update
 * business coordinates.
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { GoogleMap, Marker, InfoWindow } from "@react-google-maps/api";
import { useGoogleMaps, GAMBIA_CENTER } from "@/lib/googleMaps";

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

const BUSINESS_COLOR: Record<string, string> = {
  Restaurant: "#f97316", // orange
  Shop: "#3b82f6", // blue
  Pharmacy: "#ef4444", // red
};

const BUSINESS_EMOJI: Record<string, string> = {
  Restaurant: "🍽️",
  Shop: "🏪",
  Pharmacy: "💊",
};

function getBusinessColor(type: string) {
  return BUSINESS_COLOR[type] || "#6b7280";
}

function getBusinessEmoji(type: string) {
  return BUSINESS_EMOJI[type] || "📍";
}

export function VendorLocationsMap({
  businesses,
  onMapClick,
  clickable = false,
  selectedLocation,
  highlightedBusinessId,
}: VendorLocationsMapProps) {
  const { isLoaded, loadError, hasKey } = useGoogleMaps();
  const mapRef = useRef<google.maps.Map | null>(null);
  const [activeBusinessId, setActiveBusinessId] = useState<string | null>(null);

  const validBusinesses = businesses.filter(
    (b) =>
      b.latitude !== null &&
      b.latitude !== undefined &&
      b.longitude !== null &&
      b.longitude !== undefined,
  );

  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
  }, []);

  // Auto-fit bounds to all business markers (+ selected location if present)
  useEffect(() => {
    if (!mapRef.current) return;
    if (validBusinesses.length === 0 && !selectedLocation) return;

    const bounds = new google.maps.LatLngBounds();
    validBusinesses.forEach((b) =>
      bounds.extend({ lat: b.latitude!, lng: b.longitude! }),
    );
    if (selectedLocation) {
      bounds.extend({ lat: selectedLocation.lat, lng: selectedLocation.lng });
    }

    if (validBusinesses.length + (selectedLocation ? 1 : 0) === 1) {
      // Single point — fitBounds would zoom in too far
      mapRef.current.setCenter(bounds.getCenter());
      mapRef.current.setZoom(15);
    } else {
      mapRef.current.fitBounds(bounds, 40);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [businesses, selectedLocation, highlightedBusinessId, isLoaded]);

  const handleClick = (e: google.maps.MapMouseEvent) => {
    if (clickable && onMapClick && e.latLng) {
      onMapClick(e.latLng.lat(), e.latLng.lng());
    }
  };

  if (!hasKey) {
    return (
      <div className="w-full h-[400px] rounded-lg border shadow-sm flex items-center justify-center bg-muted text-sm text-muted-foreground p-4 text-center">
        Google Maps API key not configured (VITE_GOOGLE_MAPS_API_KEY).
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="w-full h-[400px] rounded-lg border shadow-sm flex items-center justify-center bg-muted text-sm text-destructive p-4 text-center">
        Failed to load Google Maps.
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="w-full h-[400px] rounded-lg border shadow-sm flex items-center justify-center bg-muted text-sm text-muted-foreground">
        Loading map…
      </div>
    );
  }

  return (
    <div className="w-full h-[400px] rounded-lg border shadow-sm overflow-hidden">
      <GoogleMap
        mapContainerStyle={{ height: "100%", width: "100%" }}
        center={GAMBIA_CENTER}
        zoom={11}
        onLoad={onMapLoad}
        onClick={handleClick}
        options={{
          streetViewControl: false,
          mapTypeControl: false,
          draggableCursor: clickable ? "crosshair" : undefined,
        }}
      >
        {validBusinesses.map((business) => {
          const color = getBusinessColor(business.type);
          const isHighlighted = business.id === highlightedBusinessId;
          return (
            <Marker
              key={business.id}
              position={{ lat: business.latitude!, lng: business.longitude! }}
              label={{
                text: getBusinessEmoji(business.type),
                fontSize: "16px",
              }}
              icon={{
                path: google.maps.SymbolPath.CIRCLE,
                scale: isHighlighted ? 18 : 14,
                fillColor: color,
                fillOpacity: 1,
                strokeColor: "#fff",
                strokeWeight: isHighlighted ? 4 : 2,
              }}
              onClick={() => setActiveBusinessId(business.id)}
            />
          );
        })}

        {activeBusinessId &&
          (() => {
            const business = validBusinesses.find(
              (b) => b.id === activeBusinessId,
            );
            if (!business) return null;
            const color = getBusinessColor(business.type);
            return (
              <InfoWindow
                position={{
                  lat: business.latitude!,
                  lng: business.longitude!,
                }}
                onCloseClick={() => setActiveBusinessId(null)}
              >
                <div className="min-w-50">
                  <strong className="text-sm">{business.name}</strong>
                  <br />
                  <span
                    className="text-xs font-semibold"
                    style={{ color }}
                  >
                    {business.type}
                  </span>
                  {business.vendorName && (
                    <>
                      <br />
                      <span className="text-[11px] text-gray-500">
                        Vendor: {business.vendorName}
                      </span>
                    </>
                  )}
                  {business.address && (
                    <>
                      <br />
                      <span className="text-[11px]">{business.address}</span>
                    </>
                  )}
                  <br />
                  <span className="text-[11px] text-gray-500 font-mono">
                    {business.latitude?.toFixed(6)},{" "}
                    {business.longitude?.toFixed(6)}
                  </span>
                </div>
              </InfoWindow>
            );
          })()}

        {selectedLocation && (
          <Marker
            position={{ lat: selectedLocation.lat, lng: selectedLocation.lng }}
            label={{ text: "📍", fontSize: "16px" }}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 16,
              fillColor: "#dc2626",
              fillOpacity: 1,
              strokeColor: "#fff",
              strokeWeight: 3,
            }}
          />
        )}
      </GoogleMap>
    </div>
  );
}

import { useCallback, useRef, useState } from "react";
import { GoogleMap, Marker, InfoWindow } from "@react-google-maps/api";
import { useGoogleMaps, GAMBIA_CENTER } from "@/lib/googleMaps";

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

export function DeliveryTownsMap({
  towns,
  onMapClick,
  clickable = false,
  selectedLocation = null,
}: DeliveryTownsMapProps) {
  const { isLoaded, loadError, hasKey } = useGoogleMaps();
  const mapRef = useRef<google.maps.Map | null>(null);
  const [activeTown, setActiveTown] = useState<DeliveryTown | null>(null);

  const onLoad = useCallback(
    (map: google.maps.Map) => {
      mapRef.current = map;
      if (towns.length > 0) {
        const bounds = new google.maps.LatLngBounds();
        towns.forEach((t) => bounds.extend({ lat: t.latitude, lng: t.longitude }));
        map.fitBounds(bounds, 50);
      }
    },
    [towns],
  );

  const handleMapClick = (e: google.maps.MapMouseEvent) => {
    if (!clickable || !onMapClick || !e.latLng) return;
    onMapClick(e.latLng.lat(), e.latLng.lng());
  };

  if (!hasKey) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-muted text-sm text-muted-foreground p-4 text-center">
        Google Maps API key not configured (VITE_GOOGLE_MAPS_API_KEY).
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-muted text-sm text-destructive p-4 text-center">
        Failed to load Google Maps.
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-muted text-sm text-muted-foreground">
        Loading map…
      </div>
    );
  }

  return (
    <GoogleMap
      mapContainerStyle={{ height: "100%", width: "100%" }}
      center={GAMBIA_CENTER}
      zoom={11}
      onLoad={onLoad}
      onClick={handleMapClick}
      options={{
        streetViewControl: false,
        mapTypeControl: false,
        draggableCursor: clickable ? "crosshair" : undefined,
      }}
    >
      {towns.map((town) => {
        const color = getZoneColor(town.deliveryZone);
        const zoneNumber = town.deliveryZone.replace("zone", "");
        return (
          <Marker
            key={town.id}
            position={{ lat: town.latitude, lng: town.longitude }}
            label={{ text: zoneNumber, color: "#fff", fontSize: "12px", fontWeight: "bold" }}
            icon={{
              path: google.maps.SymbolPath.CIRCLE,
              scale: 14,
              fillColor: color,
              fillOpacity: 1,
              strokeColor: "#fff",
              strokeWeight: 3,
            }}
            onClick={() => setActiveTown(town)}
          />
        );
      })}

      {activeTown && (
        <InfoWindow
          position={{ lat: activeTown.latitude, lng: activeTown.longitude }}
          onCloseClick={() => setActiveTown(null)}
        >
          <div style={{ fontFamily: "system-ui, -apple-system, sans-serif" }}>
            <h3 style={{ margin: "0 0 4px 0", fontSize: 16, fontWeight: 600 }}>
              {activeTown.name}
            </h3>
            <p style={{ margin: "0 0 8px 0", fontSize: 13, color: "#6b7280" }}>
              {activeTown.area}
            </p>
            <div style={{ display: "flex", gap: 6, marginBottom: 8 }}>
              <span
                style={{
                  background: `${getZoneColor(activeTown.deliveryZone)}20`,
                  color: getZoneColor(activeTown.deliveryZone),
                  padding: "2px 8px",
                  borderRadius: 4,
                  fontSize: 11,
                  border: `1px solid ${getZoneColor(activeTown.deliveryZone)}40`,
                }}
              >
                {getZoneLabel(activeTown.deliveryZone)}
              </span>
              <span
                style={{
                  background: activeTown.isActive ? "#dcfce7" : "#f3f4f6",
                  color: activeTown.isActive ? "#166534" : "#6b7280",
                  padding: "2px 8px",
                  borderRadius: 4,
                  fontSize: 11,
                  border: `1px solid ${activeTown.isActive ? "#86efac" : "#d1d5db"}`,
                }}
              >
                {activeTown.isActive ? "Active" : "Inactive"}
              </span>
            </div>
            <p style={{ margin: 0, fontSize: 11, color: "#9ca3af" }}>
              {activeTown.latitude.toFixed(6)}, {activeTown.longitude.toFixed(6)}
            </p>
          </div>
        </InfoWindow>
      )}

      {selectedLocation && (
        <Marker
          position={selectedLocation}
          animation={google.maps.Animation.BOUNCE}
          icon={{
            path: google.maps.SymbolPath.BACKWARD_CLOSED_ARROW,
            scale: 8,
            fillColor: "#ef4444",
            fillOpacity: 1,
            strokeColor: "#fff",
            strokeWeight: 2,
            rotation: 180,
          }}
          title="Selected Location"
        />
      )}
    </GoogleMap>
  );
}

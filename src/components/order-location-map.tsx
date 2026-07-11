/**
 * Small embedded Google Map for an order. Shows the customer's delivery
 * location, and — when vendor coordinates are provided — the vendor (origin)
 * marker too, with the viewport fitted around both points. Renders nothing
 * when the order has no coordinates; shows a friendly placeholder when the
 * Maps key is not configured.
 */

import { useCallback, useMemo } from "react";
import { GoogleMap, Marker, Polyline } from "@react-google-maps/api";
import { useGoogleMaps } from "@/lib/googleMaps";

interface OrderLocationMapProps {
  latitude?: number | null;
  longitude?: number | null;
  label?: string;
  height?: number;
  originLatitude?: number | null;
  originLongitude?: number | null;
  originLabel?: string;
  originMarkerText?: string;
}

export function OrderLocationMap({
  latitude,
  longitude,
  label = "Delivery location",
  height = 220,
  originLatitude,
  originLongitude,
  originLabel = "Vendor location",
  originMarkerText = "V",
}: OrderLocationMapProps) {
  const { isLoaded, loadError, hasKey } = useGoogleMaps();

  const hasDestination = latitude != null && longitude != null;
  const hasOrigin = originLatitude != null && originLongitude != null;

  // Memoize by value: a new object identity on every parent re-render (e.g.
  // pages polling for fresh data) would make GoogleMap call setCenter and
  // yank the viewport away from the user's zoom/pan.
  const destination = useMemo(
    () => (hasDestination ? { lat: latitude!, lng: longitude! } : null),
    [hasDestination, latitude, longitude],
  );
  const origin = useMemo(
    () =>
      hasOrigin ? { lat: originLatitude!, lng: originLongitude! } : null,
    [hasOrigin, originLatitude, originLongitude],
  );

  const onLoad = useCallback(
    (map: google.maps.Map) => {
      if (origin && destination) {
        const bounds = new google.maps.LatLngBounds();
        bounds.extend(origin);
        bounds.extend(destination);
        map.fitBounds(bounds, 48);
      }
    },
    [origin?.lat, origin?.lng, destination?.lat, destination?.lng],
  );

  if (!hasDestination && !hasOrigin) {
    return null;
  }

  const center = destination || origin!;

  return (
    <div
      className="overflow-hidden rounded-lg border"
      style={{ height }}
      aria-label={label}
    >
      {!hasKey ? (
        <div className="flex h-full w-full items-center justify-center bg-muted p-4 text-center text-sm text-muted-foreground">
          Google Maps API key not configured (VITE_GOOGLE_MAPS_API_KEY).
        </div>
      ) : loadError ? (
        <div className="flex h-full w-full items-center justify-center bg-muted p-4 text-center text-sm text-destructive">
          Failed to load Google Maps.
        </div>
      ) : !isLoaded ? (
        <div className="flex h-full w-full items-center justify-center bg-muted text-sm text-muted-foreground">
          Loading map…
        </div>
      ) : (
        <GoogleMap
          mapContainerStyle={{ height: "100%", width: "100%" }}
          center={center}
          zoom={15}
          onLoad={onLoad}
          options={{
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: true,
          }}
        >
          {origin && (
            <Marker
              position={origin}
              title={originLabel}
              label={{
                text: originMarkerText,
                color: "#ffffff",
                fontSize: "12px",
                fontWeight: "bold",
              }}
            />
          )}
          {destination && <Marker position={destination} title={label} />}
          {origin && destination && (
            <Polyline
              path={[origin, destination]}
              options={{
                strokeColor: "#7c3aed",
                strokeOpacity: 0.8,
                strokeWeight: 3,
              }}
            />
          )}
        </GoogleMap>
      )}
    </div>
  );
}

/**
 * Small embedded Google Map for an order. Shows the customer's delivery
 * location, and — when vendor coordinates are provided — the vendor (origin)
 * marker too, with the viewport fitted around both points. Renders nothing
 * when the order has no coordinates; shows a friendly placeholder when the
 * Maps key is not configured.
 *
 * The connecting line follows real roads via Google's DirectionsService,
 * falling back to a straight line while directions are loading or if the
 * request fails (no through-route, quota, etc).
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  GoogleMap,
  Marker,
  Polyline,
  DirectionsRenderer,
} from "@react-google-maps/api";
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

  // Road-following route between origin and destination, when both are set.
  const [directions, setDirections] =
    useState<google.maps.DirectionsResult | null>(null);

  useEffect(() => {
    setDirections(null);
    if (!isLoaded || !origin || !destination) return;

    let cancelled = false;
    const directionsService = new google.maps.DirectionsService();
    directionsService.route(
      {
        origin,
        destination,
        travelMode: google.maps.TravelMode.DRIVING,
      },
      (result, status) => {
        if (cancelled) return;
        if (status === google.maps.DirectionsStatus.OK && result) {
          setDirections(result);
        } else {
          // Falls back to the straight-line Polyline rendered below.
          setDirections(null);
        }
      },
    );

    return () => {
      cancelled = true;
    };
  }, [isLoaded, origin?.lat, origin?.lng, destination?.lat, destination?.lng]);

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
          {origin && destination && directions ? (
            <DirectionsRenderer
              directions={directions}
              options={{
                suppressMarkers: true,
                polylineOptions: {
                  strokeColor: "#7c3aed",
                  strokeOpacity: 0.8,
                  strokeWeight: 4,
                },
              }}
            />
          ) : (
            origin &&
            destination && (
              <Polyline
                path={[origin, destination]}
                options={{
                  strokeColor: "#7c3aed",
                  strokeOpacity: 0.5,
                  strokeWeight: 3,
                  icons: [
                    {
                      icon: { path: "M 0,-1 0,1", strokeOpacity: 0.6, scale: 3 },
                      offset: "0",
                      repeat: "12px",
                    },
                  ],
                }}
              />
            )
          )}
        </GoogleMap>
      )}
    </div>
  );
}

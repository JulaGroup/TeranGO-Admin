import { useCallback } from "react";
import { GoogleMap, Marker } from "@react-google-maps/api";
import { useGoogleMaps, GAMBIA_CENTER } from "@/lib/googleMaps";

// Tap-the-map venue picker for events. Sets lat/lng and reverse-geocodes to a
// readable address so an admin doesn't have to type coordinates by hand.
export function EventLocationPicker({
  lat,
  lng,
  onPick,
}: {
  lat?: number | null;
  lng?: number | null;
  onPick: (p: { lat: number; lng: number; address?: string }) => void;
}) {
  const { isLoaded, hasKey } = useGoogleMaps();

  const handleClick = useCallback(
    (e: google.maps.MapMouseEvent) => {
      if (!e.latLng) return;
      const p = { lat: e.latLng.lat(), lng: e.latLng.lng() };
      try {
        const geocoder = new google.maps.Geocoder();
        geocoder.geocode({ location: p }, (results, status) => {
          const address =
            status === "OK" && results?.[0]
              ? results[0].formatted_address
              : undefined;
          onPick({ ...p, address });
        });
      } catch {
        onPick(p);
      }
    },
    [onPick],
  );

  if (!hasKey) {
    return (
      <div className="rounded-lg border p-3 text-xs text-muted-foreground">
        Map unavailable (VITE_GOOGLE_MAPS_API_KEY not set). Enter the address
        manually below.
      </div>
    );
  }
  if (!isLoaded) {
    return (
      <div className="flex h-60 items-center justify-center rounded-lg border text-sm text-muted-foreground">
        Loading map…
      </div>
    );
  }

  const center =
    lat != null && lng != null ? { lat, lng } : GAMBIA_CENTER;
  return (
    <div className="overflow-hidden rounded-lg border">
      <GoogleMap
        mapContainerStyle={{ width: "100%", height: 240 }}
        center={center}
        zoom={lat != null ? 14 : 11}
        onClick={handleClick}
        options={{
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false,
          draggableCursor: "crosshair",
        }}
      >
        {lat != null && lng != null && (
          <Marker position={{ lat, lng }} />
        )}
      </GoogleMap>
      <div className="px-3 py-2 text-xs text-muted-foreground">
        {lat != null && lng != null
          ? `📍 Pinned at ${lat.toFixed(5)}, ${lng.toFixed(5)}`
          : "Tap the map to set the venue location."}
      </div>
    </div>
  );
}

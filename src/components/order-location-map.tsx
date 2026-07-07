/**
 * Small embedded Google Map showing where an order is being delivered
 * (customer's coordinates captured at checkout). Renders nothing when the
 * order has no coordinates; shows a friendly placeholder when the Maps key
 * is not configured.
 */

import { GoogleMap, Marker } from "@react-google-maps/api";
import { useGoogleMaps } from "@/lib/googleMaps";

interface OrderLocationMapProps {
  latitude?: number | null;
  longitude?: number | null;
  label?: string;
  height?: number;
}

export function OrderLocationMap({
  latitude,
  longitude,
  label = "Delivery location",
  height = 220,
}: OrderLocationMapProps) {
  const { isLoaded, loadError, hasKey } = useGoogleMaps();

  if (latitude == null || longitude == null) {
    return null;
  }

  const position = { lat: latitude, lng: longitude };

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
          center={position}
          zoom={15}
          options={{
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: true,
          }}
        >
          <Marker position={position} title={label} />
        </GoogleMap>
      )}
    </div>
  );
}

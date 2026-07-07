import { useJsApiLoader } from "@react-google-maps/api";

// Stable reference — must not be re-created on every render or
// @react-google-maps/api will warn about reloading the script.
export const GOOGLE_MAPS_LIBRARIES: "places"[] = ["places"];

export const GOOGLE_MAPS_API_KEY = import.meta.env
  .VITE_GOOGLE_MAPS_API_KEY as string | undefined;

export const GAMBIA_CENTER = { lat: 13.4549, lng: -16.579 };

/**
 * Shared loader for the Google Maps JS SDK. Safe to call from multiple
 * components — @react-google-maps/api de-dupes the underlying <script> load.
 */
export function useGoogleMaps() {
  const { isLoaded, loadError } = useJsApiLoader({
    id: "terango-admin-google-maps",
    googleMapsApiKey: GOOGLE_MAPS_API_KEY || "",
    libraries: GOOGLE_MAPS_LIBRARIES,
  });

  return {
    isLoaded: isLoaded && Boolean(GOOGLE_MAPS_API_KEY),
    loadError,
    hasKey: Boolean(GOOGLE_MAPS_API_KEY),
  };
}

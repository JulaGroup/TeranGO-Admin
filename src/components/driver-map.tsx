/**
 * Real-Time Driver Map Component
 * Shows all active drivers on a map with live location updates
 * Using Google Maps (consistent with the mobile apps)
 */

import { useCallback, useEffect, useRef, useState } from "react";
import { GoogleMap, Marker, InfoWindow } from "@react-google-maps/api";
import { useGoogleMaps, GAMBIA_CENTER } from "@/lib/googleMaps";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  MapPin,
  Navigation,
  Bike,
  Car,
  Truck,
  Clock,
  RefreshCw,
  Maximize2,
  Minimize2,
} from "lucide-react";

interface Driver {
  id: string;
  name: string;
  phone: string;
  vehicleType: "BIKE" | "CAR" | "VAN" | "LORRY";
  vehicleNumber: string | null;
  isAvailable: boolean;
  currentLatitude: number;
  currentLongitude: number;
  lastLocationUpdate: Date;
}

interface DriverMapProps {
  className?: string;
  showControls?: boolean;
  height?: string;
}

const VEHICLE_EMOJI: Record<string, string> = {
  BIKE: "🏍️",
  CAR: "🚗",
  VAN: "🚙",
  LORRY: "🚛",
};

export function DriverMap({
  className = "",
  showControls = true,
  height = "600px",
}: DriverMapProps) {
  const { isLoaded, loadError, hasKey } = useGoogleMaps();
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [filterAvailable, setFilterAvailable] = useState(false);
  const mapRef = useRef<google.maps.Map | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchDriverLocations = async () => {
    try {
      const response = await api.get("/api/admin/drivers");
      const data = response.data;

      if (!Array.isArray(data)) {
        console.warn("Driver data is not an array:", data);
        setDrivers([]);
        setIsLoading(false);
        return;
      }

      const driversWithLocation = data.filter(
        (d: any) =>
          d.currentLatitude &&
          d.currentLongitude &&
          d.lastLocationUpdate &&
          new Date(d.lastLocationUpdate).getTime() >
            Date.now() - 12 * 60 * 60 * 1000,
      );

      setDrivers(driversWithLocation);
      setIsLoading(false);
    } catch (error) {
      console.error("Failed to fetch driver locations:", error);
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchDriverLocations();
    intervalRef.current = setInterval(fetchDriverLocations, 10000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  const filteredDrivers = filterAvailable
    ? drivers.filter((d) => d.isAvailable)
    : drivers;

  const filteredDriversRef = useRef(filteredDrivers);
  filteredDriversRef.current = filteredDrivers;

  // Auto-fit the viewport around the drivers only once per view (and again
  // when the availability filter changes) — refitting on every 10s location
  // poll would throw away the user's manual zoom/pan.
  const didAutoFitRef = useRef(false);

  useEffect(() => {
    didAutoFitRef.current = false;
  }, [filterAvailable]);

  const fitToDrivers = useCallback((driversToFit: Driver[]) => {
    if (!mapRef.current || driversToFit.length === 0) return;
    const bounds = new google.maps.LatLngBounds();
    driversToFit.forEach((d) =>
      bounds.extend({ lat: d.currentLatitude, lng: d.currentLongitude }),
    );
    mapRef.current.fitBounds(bounds, 50);
    didAutoFitRef.current = true;
  }, []);

  useEffect(() => {
    if (didAutoFitRef.current) return;
    fitToDrivers(filteredDrivers);
  }, [filteredDrivers, fitToDrivers]);

  const onMapLoad = useCallback(
    (map: google.maps.Map) => {
      mapRef.current = map;
      if (!didAutoFitRef.current) {
        fitToDrivers(filteredDriversRef.current);
      }
    },
    [fitToDrivers],
  );

  const getVehicleIcon = (type: string) => {
    switch (type) {
      case "BIKE":
        return <Bike className="h-4 w-4" />;
      case "CAR":
        return <Car className="h-4 w-4" />;
      case "VAN":
        return <Car className="h-5 w-5" />;
      case "LORRY":
        return <Truck className="h-5 w-5" />;
      default:
        return <MapPin className="h-4 w-4" />;
    }
  };

  const getTimeSinceUpdate = (lastUpdate: Date) => {
    const seconds = Math.floor(
      (Date.now() - new Date(lastUpdate).getTime()) / 1000,
    );
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent
          className="flex items-center justify-center"
          style={{ height }}
        >
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              Loading driver locations...
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-2">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Navigation className="h-5 w-5 text-primary" />
            Live Driver Map
            <Badge variant="secondary" className="ml-2">
              {filteredDrivers.length} Online
            </Badge>
          </CardTitle>
          <p className="text-sm text-muted-foreground mt-1">
            Real-time driver locations • Updates every 10s
          </p>
        </div>
        {showControls && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setFilterAvailable(!filterAvailable)}
            >
              {filterAvailable ? "Show All" : "Available Only"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => fetchDriverLocations()}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <div
          className="relative"
          style={{
            height: isFullscreen ? "calc(100vh - 180px)" : height,
          }}
        >
          {filteredDrivers.length === 0 ? (
            <div className="h-full flex items-center justify-center bg-slate-50 dark:bg-slate-900">
              <div className="text-center p-8">
                <MapPin className="h-16 w-16 mx-auto mb-4 text-blue-500 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">
                  No Active Drivers
                </h3>
                <p className="text-sm text-muted-foreground">
                  {filterAvailable
                    ? "No available drivers with recent location updates"
                    : "No drivers with recent location updates"}
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Drivers will appear here once they go online
                </p>
              </div>
            </div>
          ) : !hasKey ? (
            <div className="h-full flex items-center justify-center bg-muted text-sm text-muted-foreground p-4 text-center">
              Google Maps API key not configured (VITE_GOOGLE_MAPS_API_KEY).
            </div>
          ) : loadError ? (
            <div className="h-full flex items-center justify-center bg-muted text-sm text-destructive p-4 text-center">
              Failed to load Google Maps.
            </div>
          ) : !isLoaded ? (
            <div className="h-full flex items-center justify-center bg-muted text-sm text-muted-foreground">
              Loading map…
            </div>
          ) : (
            <GoogleMap
              mapContainerStyle={{ height: "100%", width: "100%" }}
              center={GAMBIA_CENTER}
              zoom={13}
              onLoad={onMapLoad}
              options={{ streetViewControl: false, mapTypeControl: false }}
            >
              {filteredDrivers.map((driver) => (
                <Marker
                  key={driver.id}
                  position={{
                    lat: driver.currentLatitude,
                    lng: driver.currentLongitude,
                  }}
                  label={{
                    text: VEHICLE_EMOJI[driver.vehicleType] || "📍",
                    fontSize: "16px",
                  }}
                  icon={{
                    path: google.maps.SymbolPath.CIRCLE,
                    scale: 16,
                    fillColor: driver.isAvailable ? "#16a34a" : "#6b7280",
                    fillOpacity: 1,
                    strokeColor: "#fff",
                    strokeWeight: 3,
                  }}
                  onClick={() => setSelectedDriver(driver)}
                />
              ))}

              {selectedDriver && (
                <InfoWindow
                  position={{
                    lat: selectedDriver.currentLatitude,
                    lng: selectedDriver.currentLongitude,
                  }}
                  onCloseClick={() => setSelectedDriver(null)}
                >
                  <div className="min-w-50">
                    <div className="flex items-center gap-2 mb-2">
                      <div
                        className={`p-1.5 rounded ${selectedDriver.isAvailable ? "bg-green-100" : "bg-gray-100"}`}
                      >
                        {getVehicleIcon(selectedDriver.vehicleType)}
                      </div>
                      <div>
                        <p className="font-semibold text-sm">
                          {selectedDriver.name}
                        </p>
                        <p className="text-xs text-gray-600">
                          {selectedDriver.phone}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-1 text-xs">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Vehicle:</span>
                        <span className="font-medium">
                          {selectedDriver.vehicleType}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Plate:</span>
                        <span className="font-medium">
                          {selectedDriver.vehicleNumber || "N/A"}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-600">Status:</span>
                        <Badge
                          variant={
                            selectedDriver.isAvailable ? "default" : "secondary"
                          }
                          className={`text-[10px] ${selectedDriver.isAvailable ? "bg-green-600" : ""}`}
                        >
                          {selectedDriver.isAvailable ? "AVAILABLE" : "BUSY"}
                        </Badge>
                      </div>
                      <div className="flex justify-between items-center pt-1 border-t">
                        <span className="text-gray-600">Last Update:</span>
                        <span className="text-[10px] text-gray-500 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {getTimeSinceUpdate(selectedDriver.lastLocationUpdate)}
                        </span>
                      </div>
                      <div className="text-[10px] text-gray-400 font-mono pt-1">
                        {selectedDriver.currentLatitude.toFixed(5)},{" "}
                        {selectedDriver.currentLongitude.toFixed(5)}
                      </div>
                    </div>
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

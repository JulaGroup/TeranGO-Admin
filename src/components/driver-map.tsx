/**
 * Real-Time Driver Map Component
 * Shows all active drivers on a map with live location updates
 * Using Leaflet + OpenStreetMap (100% Free, No Credit Card Required!)
 */

import { useEffect, useState, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
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
  Minimize2
} from "lucide-react";
import { toast } from "sonner";

// Fix for default marker icons in Leaflet
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

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

export function DriverMap({ 
  className = "", 
  showControls = true,
  height = "600px"
}: DriverMapProps) {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [filterAvailable, setFilterAvailable] = useState(false);
  const mapRef = useRef<any>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch drivers with location data
  const fetchDriverLocations = async () => {
    try {
      const token = localStorage.getItem('auth_token');
      const response = await fetch("/api/admin/drivers", {
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });
      
      // Check if response is ok
      if (!response.ok) {
        if (response.status === 401) {
          console.warn("Unauthorized access to driver locations. Please log in.");
          setIsLoading(false);
          return;
        }
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      
      // Ensure data is an array before filtering
      if (!Array.isArray(data)) {
        console.warn("Driver data is not an array:", data);
        setDrivers([]);
        setIsLoading(false);
        return;
      }
      
      // Filter drivers with valid location data
      const driversWithLocation = data.filter(
        (d: any) => 
          d.currentLatitude && 
          d.currentLongitude &&
          d.lastLocationUpdate &&
          // Only show drivers with location updated in last 15 minutes
          new Date(d.lastLocationUpdate).getTime() > Date.now() - 15 * 60 * 1000
      );

      setDrivers(driversWithLocation);
      setIsLoading(false);
    } catch (error) {
      console.error("Failed to fetch driver locations:", error);
      setIsLoading(false);
    }
  };

  // Initial load and refresh every 10 seconds
  useEffect(() => {
    fetchDriverLocations();
    intervalRef.current = setInterval(fetchDriverLocations, 10000);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  // Filter drivers based on availability
  const filteredDrivers = filterAvailable
    ? drivers.filter((d) => d.isAvailable)
    : drivers;

  const getVehicleIcon = (type: string) => {
    switch (type) {
      case "BIKE": return <Bike className="h-4 w-4" />;
      case "CAR": return <Car className="h-4 w-4" />;
      case "VAN": return <Car className="h-5 w-5" />;
      case "LORRY": return <Truck className="h-5 w-5" />;
      default: return <MapPin className="h-4 w-4" />;
    }
  };

  const getTimeSinceUpdate = (lastUpdate: Date) => {
    const seconds = Math.floor((Date.now() - new Date(lastUpdate).getTime()) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  // Custom marker icons for different vehicle types
  const getMarkerIcon = (vehicleType: string, isAvailable: boolean) => {
    const color = isAvailable ? "green" : "gray";
    const iconHtml = `
      <div style="
        background-color: ${color};
        width: 32px;
        height: 32px;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        border: 3px solid white;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <span style="transform: rotate(45deg); color: white; font-size: 16px; font-weight: bold;">
          ${vehicleType === "BIKE" ? "🏍️" : vehicleType === "CAR" ? "🚗" : vehicleType === "VAN" ? "🚙" : "🚛"}
        </span>
      </div>
    `;
    
    return L.divIcon({
      html: iconHtml,
      className: "custom-marker-icon",
      iconSize: [32, 32],
      iconAnchor: [16, 32],
      popupAnchor: [0, -32],
    });
  };

  // Component to auto-fit map bounds to show all drivers
  function MapBoundsHandler({ drivers }: { drivers: Driver[] }) {
    const map = useMap();
    
    useEffect(() => {
      if (drivers.length > 0) {
        const bounds = L.latLngBounds(
          drivers.map(d => [d.currentLatitude, d.currentLongitude] as [number, number])
        );
        map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
      }
    }, [drivers, map]);
    
    return null;
  }

  // Default center (Banjul, The Gambia) for empty map
  const defaultCenter: [number, number] = [13.4549, -16.5790];

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center" style={{ height }}>
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-2 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">Loading driver locations...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
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
          <div className="flex items-center gap-2">
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
              {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
            </Button>
          </div>
        )}
      </CardHeader>
      <CardContent className="p-0">
        <div 
          className="relative"
          style={{ 
            height: isFullscreen ? "calc(100vh - 180px)" : height 
          }}
        >
          {filteredDrivers.length === 0 ? (
            // Empty state
            <div className="h-full flex items-center justify-center bg-slate-50 dark:bg-slate-900">
              <div className="text-center p-8">
                <MapPin className="h-16 w-16 mx-auto mb-4 text-blue-500 opacity-50" />
                <h3 className="text-lg font-semibold mb-2">No Active Drivers</h3>
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
          ) : (
            // Actual interactive map with Leaflet + OpenStreetMap
            <MapContainer
              center={defaultCenter}
              zoom={13}
              style={{ height: "100%", width: "100%", zIndex: 0 }}
              ref={mapRef}
            >
              {/* OpenStreetMap tiles - 100% FREE, no credit card needed! */}
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              
              {/* Auto-fit bounds to show all drivers */}
              <MapBoundsHandler drivers={filteredDrivers} />
              
              {/* Markers for each driver */}
              {filteredDrivers.map((driver) => (
                <Marker
                  key={driver.id}
                  position={[driver.currentLatitude, driver.currentLongitude]}
                  icon={getMarkerIcon(driver.vehicleType, driver.isAvailable)}
                  eventHandlers={{
                    click: () => setSelectedDriver(driver),
                  }}
                >
                  <Popup>
                    <div className="min-w-50">
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`p-1.5 rounded ${driver.isAvailable ? 'bg-green-100' : 'bg-gray-100'}`}>
                          {getVehicleIcon(driver.vehicleType)}
                        </div>
                        <div>
                          <p className="font-semibold text-sm">{driver.name}</p>
                          <p className="text-xs text-gray-600">{driver.phone}</p>
                        </div>
                      </div>
                      <div className="space-y-1 text-xs">
                        <div className="flex justify-between">
                          <span className="text-gray-600">Vehicle:</span>
                          <span className="font-medium">{driver.vehicleType}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Plate:</span>
                          <span className="font-medium">{driver.vehicleNumber || "N/A"}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-600">Status:</span>
                          <Badge 
                            variant={driver.isAvailable ? "default" : "secondary"}
                            className={`text-[10px] ${driver.isAvailable ? 'bg-green-600' : ''}`}
                          >
                            {driver.isAvailable ? "AVAILABLE" : "BUSY"}
                          </Badge>
                        </div>
                        <div className="flex justify-between items-center pt-1 border-t">
                          <span className="text-gray-600">Last Update:</span>
                          <span className="text-[10px] text-gray-500 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {getTimeSinceUpdate(driver.lastLocationUpdate)}
                          </span>
                        </div>
                        <div className="text-[10px] text-gray-400 font-mono pt-1">
                          {driver.currentLatitude.toFixed(5)}, {driver.currentLongitude.toFixed(5)}
                        </div>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          )}
          
          {/* Mini driver info overlay when driver is selected */}
          {filteredDrivers.length > 0 && selectedDriver && (
            <div className="absolute top-4 right-4 w-64 bg-white/95 dark:bg-slate-900/95 backdrop-blur-sm rounded-lg shadow-lg border p-3 z-[1000]">
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-semibold text-sm">Selected Driver</h4>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-6 w-6 p-0"
                  onClick={() => setSelectedDriver(null)}
                >
                  ✕
                </Button>
              </div>
              <div className="flex items-center gap-2">
                <div className={`p-2 rounded ${selectedDriver.isAvailable ? 'bg-green-100' : 'bg-gray-100'}`}>
                  {getVehicleIcon(selectedDriver.vehicleType)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-sm truncate">{selectedDriver.name}</p>
                  <p className="text-xs text-muted-foreground">{selectedDriver.vehicleType}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// @ts-nocheck
import {
  MapPin,
  Package,
  Pill,
  RefreshCw,
  Save,
  Store,
  UtensilsCrossed,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { VendorLocationsMap } from "@/components/vendor-locations-map";

export function EditBusinessLocationDialog({
  business,
  isOpen,
  onClose,
  onSave,
  isSaving,
  selectedLocation,
  onMapClick,
  editedName,
  onNameChange,
}: any) {
  if (!business) return null;

  const getBusinessIcon = (type: string) => {
    switch (type) {
      case "Restaurant":
        return <UtensilsCrossed className="h-5 w-5 text-orange-500" />;
      case "Shop":
        return <Package className="h-5 w-5 text-blue-500" />;
      case "Pharmacy":
        return <Pill className="h-5 w-5 text-red-500" />;
      default:
        return <Store className="h-5 w-5" />;
    }
  };

  const hasCoordinates =
    selectedLocation || (business.latitude && business.longitude);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getBusinessIcon(business.type)}
            Edit Location for {business.name}
          </DialogTitle>
          <DialogDescription>
            {business.vendorName && `Vendor: ${business.vendorName}`}
            <br />
            Click on the map to automatically fetch address, city, and
            coordinates
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Business name input */}
          <div className="space-y-2">
            <label htmlFor="businessName" className="text-sm font-medium">
              Business Name
            </label>
            <input
              id="businessName"
              type="text"
              value={editedName}
              onChange={(e) => onNameChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter business name"
            />
          </div>

          {/* Location details display */}
          {hasCoordinates && (
            <div className="p-3 bg-muted rounded-lg space-y-2">
              <div className="text-sm font-medium">Location Details:</div>

              {selectedLocation?.address && (
                <div className="text-sm">
                  <span className="font-medium">Address:</span>{" "}
                  <span className="text-muted-foreground">
                    {selectedLocation.address}
                  </span>
                </div>
              )}

              {selectedLocation?.city && (
                <div className="text-sm">
                  <span className="font-medium">City:</span>{" "}
                  <span className="text-muted-foreground">
                    {selectedLocation.city}
                  </span>
                </div>
              )}

              <div className="text-sm font-mono text-muted-foreground">
                Latitude:{" "}
                {selectedLocation?.lat?.toFixed(6) ||
                  business.latitude?.toFixed(6)}
                <br />
                Longitude:{" "}
                {selectedLocation?.lng?.toFixed(6) ||
                  business.longitude?.toFixed(6)}
              </div>
            </div>
          )}

          {/* Interactive map */}
          <VendorLocationsMap
            businesses={[business]}
            onMapClick={onMapClick}
            clickable={true}
            selectedLocation={selectedLocation}
          />

          {/* Instructions */}
          <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <MapPin className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <strong>How to set location:</strong>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Update the business name in the field above</li>
                <li>Click anywhere on the map to set coordinates</li>
                <li>Address and city will be automatically fetched</li>
                <li>A red marker will appear at the selected location</li>
                <li>Click "Save Changes" to confirm</li>
              </ul>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={onSave}
            disabled={isSaving || !selectedLocation || !editedName.trim()}
          >
            {isSaving ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

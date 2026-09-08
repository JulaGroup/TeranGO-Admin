import { useMemo } from "react";
import { MapPin } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import {
  VendorLocationsMap,
  type VendorBusiness,
} from "@/components/vendor-locations-map";
import { BUSINESS_TYPE_META } from "../-lib/vendor-utils";
import type { FlatBusiness, VendorRow } from "../-lib/vendor-types";

export function BusinessLocationsPanel({
  vendors,
  isLoading,
  onSetLocation,
}: {
  vendors: VendorRow[];
  isLoading: boolean;
  onSetLocation: (business: FlatBusiness) => void;
}) {
  const businesses = useMemo<VendorBusiness[]>(
    () =>
      vendors.flatMap((vendor) =>
        vendor.businesses.map((business) => ({
          id: business.id,
          name: business.name,
          type: business.type,
          latitude: business.latitude,
          longitude: business.longitude,
          address: business.address,
          vendorName: vendor.name,
        })),
      ),
    [vendors],
  );

  const missing = useMemo(
    () => businesses.filter((b) => !b.latitude || !b.longitude),
    [businesses],
  );
  const placed = businesses.length - missing.length;

  if (isLoading) {
    return <Skeleton className="h-[520px] w-full rounded-md" />;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-lg bg-muted/40 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <MapPin className="h-5 w-5 text-primary" />
          <div>
            <h3 className="font-semibold">Business Locations</h3>
            <p className="text-sm text-muted-foreground">
              Businesses without coordinates are listed below — set one to place
              it on the map.
            </p>
          </div>
        </div>
        <Badge variant="outline" className="w-fit">
          {placed} / {businesses.length} with coordinates
        </Badge>
      </div>

      <VendorLocationsMap
        key={businesses.length}
        businesses={businesses}
        clickable={false}
      />

      <div>
        <h4 className="mb-2 text-sm font-semibold">
          Businesses Missing Coordinates
        </h4>
        {missing.length === 0 ? (
          <p className="py-4 text-center text-sm text-muted-foreground">
            Every business has coordinates.
          </p>
        ) : (
          <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
            {missing.map((business) => {
              const meta =
                BUSINESS_TYPE_META[
                  business.type as keyof typeof BUSINESS_TYPE_META
                ];
              const Icon = meta?.icon ?? MapPin;
              return (
                <Card key={business.id} className="p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-2">
                      <Icon
                        className={cn(
                          "mt-0.5 h-4 w-4",
                          meta?.className ?? "text-muted-foreground",
                        )}
                      />
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {business.name}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {business.vendorName}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => onSetLocation(business as FlatBusiness)}
                    >
                      <MapPin className="mr-1 h-3 w-3" />
                      Set Location
                    </Button>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

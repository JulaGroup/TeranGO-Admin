// @ts-nocheck
import {
  Ban,
  CheckCircle,
  CreditCard,
  Crown,
  Mail,
  Package,
  Phone,
  Pill,
  Store,
  UtensilsCrossed,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

export function VendorDetailsDialog({ vendor, isOpen, onClose }: any) {
  if (!vendor) return null;

  const allBusinesses = [
    ...(vendor.restaurants?.map((r: any) => ({ ...r, type: "Restaurant" })) ||
      []),
    ...(vendor.shops?.map((s: any) => ({ ...s, type: "Shop" })) || []),
    ...(vendor.pharmacies?.map((p: any) => ({ ...p, type: "Pharmacy" })) || []),
  ];

  const businessImage =
    vendor.restaurants?.[0]?.imageUrl ||
    vendor.shops?.[0]?.imageUrl ||
    vendor.pharmacies?.[0]?.imageUrl ||
    null;

  const getBusinessIcon = (type: string) => {
    switch (type) {
      case "Restaurant":
        return <UtensilsCrossed className="h-4 w-4 text-orange-500" />;
      case "Shop":
        return <Package className="h-4 w-4 text-blue-500" />;
      case "Pharmacy":
        return <Pill className="h-4 w-4 text-red-500" />;
      default:
        return <Store className="h-4 w-4 text-muted-foreground" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <div className="flex items-start gap-4">
            <Avatar className="h-16 w-16">
              <AvatarImage
                src={businessImage || vendor.user?.avatarUrl || ""}
                alt={vendor.user?.fullName}
              />
              <AvatarFallback className="text-2xl">
                {vendor.user?.fullName
                  ?.split(" ")
                  .map((n: string) => n[0])
                  .join("")}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <DialogTitle className="text-2xl">
                {vendor.user?.fullName}
              </DialogTitle>
              <DialogDescription>
                Vendor ID: {vendor.id.slice(0, 8)}
              </DialogDescription>
              <div className="mt-2 flex items-center gap-2">
                {vendor.isActive ? (
                  <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm">
                    <CheckCircle2 className="mr-1 h-3 w-3" />
                    Active
                  </Badge>
                ) : (
                  <Badge variant="destructive">
                    <Ban className="mr-1 h-3 w-3" />
                    Inactive
                  </Badge>
                )}
              </div>
            </div>
          </div>
        </DialogHeader>
        <div className="grid max-h-[60vh] grid-cols-1 gap-6 overflow-y-auto p-1 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span>{vendor.user?.email || "Not provided"}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span>{vendor.user?.phone || "Not provided"}</span>
              </div>
              <div className="flex items-center gap-3">
                <CreditCard className="h-4 w-4 text-muted-foreground" />
                <span>{vendor.waveNumber || "Not provided"}</span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Subscription</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              {vendor.subscription ? (
                <>
                  <div className="flex items-center gap-3">
                    <Crown className="h-4 w-4 text-yellow-500" />
                    <span className="font-semibold">
                      {vendor.subscription.packageName}
                    </span>
                    {vendor.subscription.isTrial && (
                      <Badge
                        variant="outline"
                        className="border-blue-400 text-blue-600 bg-blue-50 dark:bg-blue-950/20"
                      >
                        Trial
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "h-2 w-2 rounded-full",
                        vendor.subscription.status === "ACTIVE"
                          ? "bg-green-500"
                          : "bg-red-500",
                      )}
                    />
                    <span>Status: {vendor.subscription.status}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground">End Date:</span>
                    <span>
                      {new Date(
                        vendor.subscription.endDate,
                      ).toLocaleDateString()}
                    </span>
                  </div>
                </>
              ) : (
                <p className="text-muted-foreground">No active subscription.</p>
              )}
            </CardContent>
          </Card>

          <div className="md:col-span-2">
            <h3 className="mb-2 font-semibold">
              Businesses ({allBusinesses.length})
            </h3>
            <div className="space-y-2">
              {allBusinesses.length > 0 ? (
                allBusinesses.map((business: any) => (
                  <div
                    key={business.id}
                    className="flex items-center gap-3 rounded-md border p-3"
                  >
                    {getBusinessIcon(business.type)}
                    <div className="flex-1">
                      <p className="font-medium">{business.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {business.type}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No businesses registered
                </p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

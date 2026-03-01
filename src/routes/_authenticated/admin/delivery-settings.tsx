/**
 * Delivery Settings Page
 *
 * Admin can configure:
 * - Gift order zone-based delivery fees
 * - Distance-based delivery fee tiers
 * - Free delivery thresholds
 * - Service fees
 * - Driver commission
 */

import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Main } from "@/components/layout/main";
import { Header } from "@/components/layout/header";
import { ProfileDropdown } from "@/components/profile-dropdown";
import { Search } from "@/components/search";
import { ThemeSwitch } from "@/components/theme-switch";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  MapPin,
  Truck,
  Gift,
  DollarSign,
  Save,
  RefreshCw,
  Info,
  Users,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/delivery-settings")(
  {
    component: DeliverySettingsPage,
  },
);

interface SystemSettings {
  id: string;
  giftZone1Fee: number;
  giftZone2Fee: number;
  giftZone3Fee: number;
  deliveryFee0to5km: number;
  deliveryFee5to10km: number;
  deliveryFee10to20km: number;
  deliveryFee20to30km: number;
  deliveryFeeAbove30km: number;
  freeDeliveryMinAmount: number;
  freeDeliveryMaxKm: number;
  serviceFeePercent: number;
  driverCommissionPercent: number;

  // Vehicle-specific delivery pricing
  bikeDeliveryFee: number;
  kekeCargoDeliveryFee: number;
  carDeliveryFee: number;
  vanDeliveryFee: number;
  lorryDeliveryFee: number;

  // Weight-based pricing configuration
  weightPricingEnabled: boolean;
  distancePricingEnabled: boolean;

  // deliveryFee5to10km: number;
  // deliveryFee10to20km: number;
  // deliveryFee20to30km: number;
  // deliveryFeeAbove30km: number;
  // freeDeliveryMinAmount: number;
  // freeDeliveryMaxKm: number;
  // serviceFeePercent: number;
  // driverCommissionPercent: number;
}

function DeliverySettingsPage() {
  const queryClient = useQueryClient();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState<Partial<SystemSettings>>({});

  // Fetch current settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ["system-settings"],
    queryFn: async () => {
      const response = await api.get("/api/admin/system-settings");
      return response.data.data as SystemSettings;
    },
  });

  // Update settings mutation
  const updateMutation = useMutation({
    mutationFn: async (data: Partial<SystemSettings>) => {
      const response = await api.put("/api/admin/system-settings", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-settings"] });
      toast.success("Settings saved successfully");
      setIsEditing(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to save settings");
    },
  });

  const handleEdit = () => {
    setFormData(settings || {});
    setIsEditing(true);
  };

  const handleCancel = () => {
    setFormData({});
    setIsEditing(false);
  };

  const handleSave = () => {
    updateMutation.mutate(formData);
  };

  const handleInputChange = (field: keyof SystemSettings, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: parseFloat(value) || 0,
    }));
  };

  const getValue = (field: keyof SystemSettings): number => {
    if (isEditing && formData[field] !== undefined) {
      return formData[field] as number;
    }
    return (settings?.[field] as number) || 0;
  };

  if (isLoading) {
    return (
      <>
        <Header>
          <Search />
          <div className="ml-auto flex items-center space-x-4">
            <ThemeSwitch />
            <ProfileDropdown />
          </div>
        </Header>
        <Main>
          <div className="flex items-center justify-center h-64">
            <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </Main>
      </>
    );
  }

  return (
    <>
      <Header>
        <Search />
        <div className="ml-auto flex items-center space-x-4">
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Delivery Settings
            </h1>
            <p className="text-muted-foreground">
              Configure delivery fees, service charges, and driver commissions
            </p>
          </div>
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={handleCancel}>
                  Cancel
                </Button>
                <Button
                  onClick={handleSave}
                  disabled={updateMutation.isPending}
                >
                  {updateMutation.isPending ? (
                    <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  Save Changes
                </Button>
              </>
            ) : (
              <Button onClick={handleEdit}>Edit Settings</Button>
            )}
          </div>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Gift Order Zone Fees */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-pink-500" />
                <CardTitle>Gift Order Delivery Zones</CardTitle>
              </div>
              <CardDescription>
                Flat delivery fees for "Buy for Others" orders based on
                town/area
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
                  <Info className="h-4 w-4" />
                  <span>Beta: West Coast Region Only</span>
                </div>
              </div>

              {/* Zone 1 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Zone 1 - Central</Label>
                  <Badge
                    variant="outline"
                    className="bg-green-50 text-green-700"
                  >
                    Serrekunda, Kanifing, Pipeline
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">D</span>
                  <Input
                    type="number"
                    value={getValue("giftZone1Fee")}
                    onChange={(e) =>
                      handleInputChange("giftZone1Fee", e.target.value)
                    }
                    disabled={!isEditing}
                    className="w-24"
                  />
                </div>
              </div>

              <Separator />

              {/* Zone 2 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Zone 2 - Greater Banjul</Label>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700">
                    Bakau, Fajara, Kotu, Kololi
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">D</span>
                  <Input
                    type="number"
                    value={getValue("giftZone2Fee")}
                    onChange={(e) =>
                      handleInputChange("giftZone2Fee", e.target.value)
                    }
                    disabled={!isEditing}
                    className="w-24"
                  />
                </div>
              </div>

              <Separator />

              {/* Zone 3 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Zone 3 - West Coast</Label>
                  <Badge
                    variant="outline"
                    className="bg-orange-50 text-orange-700"
                  >
                    Brusubi, Brufut, Sukuta
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">D</span>
                  <Input
                    type="number"
                    value={getValue("giftZone3Fee")}
                    onChange={(e) =>
                      handleInputChange("giftZone3Fee", e.target.value)
                    }
                    disabled={!isEditing}
                    className="w-24"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Distance-based Delivery Fees */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-blue-500" />
                <CardTitle>Distance-Based Delivery Fees</CardTitle>
              </div>
              <CardDescription>
                Tiered delivery fees based on distance from vendor to customer
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Tier 1: 0-5km */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <Label>0 - 5 km</Label>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">D</span>
                  <Input
                    type="number"
                    value={getValue("deliveryFee0to5km")}
                    onChange={(e) =>
                      handleInputChange("deliveryFee0to5km", e.target.value)
                    }
                    disabled={!isEditing}
                    className="w-24"
                  />
                </div>
              </div>

              <Separator />

              {/* Tier 2: 5-10km */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <Label>5 - 10 km</Label>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">D</span>
                  <Input
                    type="number"
                    value={getValue("deliveryFee5to10km")}
                    onChange={(e) =>
                      handleInputChange("deliveryFee5to10km", e.target.value)
                    }
                    disabled={!isEditing}
                    className="w-24"
                  />
                </div>
              </div>

              <Separator />

              {/* Tier 3: 10-20km */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <Label>10 - 20 km</Label>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">D</span>
                  <Input
                    type="number"
                    value={getValue("deliveryFee10to20km")}
                    onChange={(e) =>
                      handleInputChange("deliveryFee10to20km", e.target.value)
                    }
                    disabled={!isEditing}
                    className="w-24"
                  />
                </div>
              </div>

              <Separator />

              {/* Tier 4: 20-30km */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <Label>20 - 30 km</Label>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">D</span>
                  <Input
                    type="number"
                    value={getValue("deliveryFee20to30km")}
                    onChange={(e) =>
                      handleInputChange("deliveryFee20to30km", e.target.value)
                    }
                    disabled={!isEditing}
                    className="w-24"
                  />
                </div>
              </div>

              <Separator />

              {/* Tier 5: >30km */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-muted-foreground" />
                  <Label>&gt; 30 km</Label>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">D</span>
                  <Input
                    type="number"
                    value={getValue("deliveryFeeAbove30km")}
                    onChange={(e) =>
                      handleInputChange("deliveryFeeAbove30km", e.target.value)
                    }
                    disabled={!isEditing}
                    className="w-24"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Free Delivery Settings */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Gift className="h-5 w-5 text-green-500" />
                <CardTitle>Free Delivery Threshold</CardTitle>
              </div>
              <CardDescription>
                Configure when customers qualify for free delivery
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Minimum Order Amount (GMD)</Label>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">D</span>
                  <Input
                    type="number"
                    value={getValue("freeDeliveryMinAmount")}
                    onChange={(e) =>
                      handleInputChange("freeDeliveryMinAmount", e.target.value)
                    }
                    disabled={!isEditing}
                    className="w-32"
                  />
                </div>
                <p className="text-sm text-muted-foreground">
                  Orders above this amount may qualify for free delivery
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>Maximum Distance (km)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={getValue("freeDeliveryMaxKm")}
                    onChange={(e) =>
                      handleInputChange("freeDeliveryMaxKm", e.target.value)
                    }
                    disabled={!isEditing}
                    className="w-24"
                  />
                  <span className="text-muted-foreground">km</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Free delivery only applies within this distance
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Vehicle-Specific Pricing */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 justify-between">
                <div className="flex items-center gap-2">
                  <Truck className="h-5 w-5 text-purple-500" />
                  <CardTitle>Vehicle-Based Pricing</CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm text-muted-foreground">
                    Enable Weight-Based Pricing
                  </label>
                  <input
                    title="Enable Weight-Based Pricing"
                    type="checkbox"
                    checked={Boolean(getValue("weightPricingEnabled"))}
                    onChange={(e) =>
                      handleInputChange(
                        "weightPricingEnabled",
                        e.target.checked ? "1" : "0",
                      )
                    }
                    disabled={!isEditing}
                    className="rounded"
                  />
                </div>
              </div>
              <CardDescription>
                Set delivery fees based on vehicle type required for order
                weight. Bikes for light items, Keke Cargo for bulk, Vans for
                heavy freight.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Bike Pricing */}
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">🏍️</div>
                  <div>
                    <div className="font-medium">Motorbike</div>
                    <div className="text-sm text-muted-foreground">
                      0-25kg • Fast food delivery
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">D</span>
                  <Input
                    type="number"
                    value={getValue("bikeDeliveryFee")}
                    onChange={(e) =>
                      handleInputChange("bikeDeliveryFee", e.target.value)
                    }
                    disabled={!isEditing}
                    className="w-20"
                  />
                </div>
              </div>

              {/* Keke Cargo Pricing */}
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">🛺</div>
                  <div>
                    <div className="font-medium">Keke Cargo</div>
                    <div className="text-sm text-muted-foreground">
                      25-250kg • Perfect for rice bags
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">D</span>
                  <Input
                    type="number"
                    value={getValue("kekeCargoDeliveryFee")}
                    onChange={(e) =>
                      handleInputChange("kekeCargoDeliveryFee", e.target.value)
                    }
                    disabled={!isEditing}
                    className="w-20"
                  />
                </div>
              </div>

              {/* Car Pricing */}
              <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">🚗</div>
                  <div>
                    <div className="font-medium">Car</div>
                    <div className="text-sm text-muted-foreground">
                      25-200kg • Premium medium loads
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">D</span>
                  <Input
                    type="number"
                    value={getValue("carDeliveryFee")}
                    onChange={(e) =>
                      handleInputChange("carDeliveryFee", e.target.value)
                    }
                    disabled={!isEditing}
                    className="w-20"
                  />
                </div>
              </div>

              {/* Van Pricing */}
              <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">🚐</div>
                  <div>
                    <div className="font-medium">Van</div>
                    <div className="text-sm text-muted-foreground">
                      250-700kg • Heavy cargo
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">D</span>
                  <Input
                    type="number"
                    value={getValue("vanDeliveryFee")}
                    onChange={(e) =>
                      handleInputChange("vanDeliveryFee", e.target.value)
                    }
                    disabled={!isEditing}
                    className="w-20"
                  />
                </div>
              </div>

              {/* Lorry Pricing */}
              <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className="text-2xl">🚚</div>
                  <div>
                    <div className="font-medium">Mini Truck</div>
                    <div className="text-sm text-muted-foreground">
                      700kg+ • Industrial freight
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">D</span>
                  <Input
                    type="number"
                    value={getValue("lorryDeliveryFee")}
                    onChange={(e) =>
                      handleInputChange("lorryDeliveryFee", e.target.value)
                    }
                    disabled={!isEditing}
                    className="w-20"
                  />
                </div>
              </div>

              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Info className="h-4 w-4" />
                  <span>
                    Vehicle type is automatically selected based on order
                    weight. Distance multipliers still apply on top of base
                    vehicle fees.
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Service Fee & Driver Commission */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-yellow-500" />
                <CardTitle>Fees & Commission</CardTitle>
              </div>
              <CardDescription>
                Platform service fee and driver commission rates
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Service Fee (%)</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={getValue("serviceFeePercent")}
                    onChange={(e) =>
                      handleInputChange("serviceFeePercent", e.target.value)
                    }
                    disabled={!isEditing}
                    className="w-24"
                    step="0.1"
                  />
                  <span className="text-muted-foreground">%</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Applied to each order subtotal
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <Label>Driver Commission (%)</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={getValue("driverCommissionPercent")}
                    onChange={(e) =>
                      handleInputChange(
                        "driverCommissionPercent",
                        e.target.value,
                      )
                    }
                    disabled={!isEditing}
                    className="w-24"
                    step="1"
                  />
                  <span className="text-muted-foreground">%</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Percentage of delivery fee paid to driver
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Summary Card */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Current Configuration Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Gift Order Zones
                </p>
                <p className="text-lg font-semibold">
                  D{getValue("giftZone1Fee")} / D{getValue("giftZone2Fee")} / D
                  {getValue("giftZone3Fee")}
                </p>
                <p className="text-xs text-muted-foreground">
                  Zone 1 / Zone 2 / Zone 3
                </p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Free Delivery</p>
                <p className="text-lg font-semibold">
                  Orders &gt; D{getValue("freeDeliveryMinAmount")}
                </p>
                <p className="text-xs text-muted-foreground">
                  Within {getValue("freeDeliveryMaxKm")} km
                </p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Service Fee</p>
                <p className="text-lg font-semibold">
                  {getValue("serviceFeePercent")}%
                </p>
                <p className="text-xs text-muted-foreground">
                  Driver gets {getValue("driverCommissionPercent")}% of delivery
                  fee
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </Main>
    </>
  );
}

/**
 * Delivery Settings Page
 *
 * Admin can configure:
 * - Gift order zone-based delivery fees
 * - Fallback delivery fee tiers (used when vehicle-based pricing is off/unavailable)
 * - Vehicle-based pricing (base fee + per-km rate)
 * - Hub-based distance calculation
 * - Express delivery service fee
 * - Third-party driver split rate
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
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  MapPin,
  Truck,
  Gift,
  DollarSign,
  Save,
  RefreshCw,
  Info,
  Users,
  Weight,
  Zap,
  Moon,
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
  serviceFeePercent: number;

  // Vehicle-specific delivery pricing (Base fees)
  bikeDeliveryFee: number;
  kekeCargoDeliveryFee: number;
  carDeliveryFee: number;
  vanDeliveryFee: number;
  lorryDeliveryFee: number;

  // Vehicle-specific per-kilometer pricing
  bikePerKmFee: number;
  kekeCargoPerKmFee: number;
  carPerKmFee: number;
  vanPerKmFee: number;
  lorryPerKmFee: number;

  // Weight-based pricing configuration
  weightPricingEnabled: boolean;

  // Express delivery pricing
  expressLightBaseFee: number;
  expressMediumBaseFee: number;
  expressHeavyBaseFee: number;
  expressBikeMultiplier: number;
  expressKekeCargoMultiplier: number;
  expressCarMultiplier: number;
  expressVanMultiplier: number;
  expressLorryMultiplier: number;
  expressBikePerKmFee: number;
  expressKekeCargoPerKmFee: number;
  expressCarPerKmFee: number;
  expressVanPerKmFee: number;
  expressLorryPerKmFee: number;
  expressPriorityMultiplier: number;
  urgentPriorityMultiplier: number;
  expressBookingFee: number;
  standardBookingFee: number;

  // Central hub coordinates for driver dispatch
  hubLatitude: number;
  hubLongitude: number;
  hubName: string;
  useHubBasedDistance: boolean;

  // Third-party driver split rate
  thirdPartyDriverRate: number;

  // No-Drivers Hours (e.g. overnight)
  noDriversModeEnabled: boolean;
  noDriversStartHour: number;
  noDriversEndHour: number;
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

  const handleInputChange = (
    field: keyof SystemSettings,
    value: string | boolean,
  ) => {
    setFormData((prev) => ({
      ...prev,
      [field]:
        typeof value === "boolean" 
          ? value 
          : field === "hubName"
            ? value
            : parseFloat(value as string) || 0,
    }));
  };

  const getValue = (field: keyof SystemSettings): number | boolean => {
    if (isEditing && formData[field] !== undefined) {
      return formData[field] as number | boolean;
    }
    // Handle boolean fields
    if (
      field === "weightPricingEnabled" ||
      field === "useHubBasedDistance" ||
      field === "noDriversModeEnabled"
    ) {
      return Boolean(settings?.[field]) || false;
    }
    return (settings?.[field] as number) || 0;
  };

  const getNumericValue = (field: keyof SystemSettings): number => {
    return getValue(field) as number;
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
                "Buy for Others" delivery pricing — zone fees are fallback only
                when Weight-Based Pricing is <strong>off</strong>. When
                Weight-Based Pricing is <strong>on</strong>, vehicle base fees +
                per-km rates apply automatically.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Weight-based pricing notice */}
              <div
                className={`rounded-lg p-3 text-sm ${
                  getValue("weightPricingEnabled")
                    ? "border border-green-200 bg-green-50 text-green-800"
                    : "border border-yellow-200 bg-yellow-50 text-yellow-800"
                }`}
              >
                <div className="flex items-center gap-2 font-medium">
                  <Weight className="h-4 w-4" />
                  {getValue("weightPricingEnabled") ? (
                    <span>
                      ✅ Weight-Based Pricing is ON — gift order fees vary by
                      vehicle type (🏍️ bike / 🛺 keke / 🚗 car…). Zone fees
                      below are fallback only.
                    </span>
                  ) : (
                    <span>
                      ⚠️ Weight-Based Pricing is OFF — flat zone fees below are
                      used for all gift orders regardless of vehicle. Enable it
                      in "Vehicle-Based Pricing" to charge correctly per vehicle
                      type.
                    </span>
                  )}
                </div>
              </div>

              {/* Reference table: zone × vehicle */}
              {getValue("weightPricingEnabled") && (
                <div className="rounded-lg border bg-muted/40 p-3">
                  <p className="mb-2 text-xs font-semibold text-muted-foreground">
                    REPRESENTATIVE FEES PER ZONE (Base Fee shown · actual = base
                    + distance × per-km rate)
                  </p>
                  <div className="overflow-x-auto">
                    <Table className="text-xs">
                      <TableHeader>
                        <TableRow className="text-muted-foreground">
                          <TableHead className="text-left font-medium">Zone</TableHead>
                          <TableHead className="text-center font-medium">
                            🏍️ Bike
                          </TableHead>
                          <TableHead className="text-center font-medium">
                            🛺 Keke
                          </TableHead>
                          <TableHead className="text-center font-medium">
                            🚗 Car
                          </TableHead>
                          <TableHead className="text-center font-medium">
                            🚐 Van
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[
                          {
                            label: "Zone 1 · Central",
                            color: "text-green-700",
                            extraKm: 3,
                          },
                          {
                            label: "Zone 2 · Banjul",
                            color: "text-blue-700",
                            extraKm: 6,
                          },
                          {
                            label: "Zone 3 · West Coast",
                            color: "text-orange-700",
                            extraKm: 12,
                          },
                        ].map(({ label, color, extraKm }) => (
                          <TableRow key={label}>
                            <TableCell className={`font-medium ${color}`}>
                              {label}
                            </TableCell>
                            {(
                              [
                                "bikeDeliveryFee",
                                "kekeCargoDeliveryFee",
                                "carDeliveryFee",
                                "vanDeliveryFee",
                              ] as const
                            ).map((field) => {
                              const perKmField = field.replace(
                                "DeliveryFee",
                                "PerKmFee",
                              ) as keyof SystemSettings;
                              const est = Math.round(
                                getNumericValue(field) +
                                  extraKm * getNumericValue(perKmField),
                              );
                              return (
                                <TableCell
                                  key={field}
                                  className="text-center font-mono"
                                >
                                  ~D{est}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">
                    Estimates based on ≈3 km / 6 km / 12 km typical distances.
                    Actual fee calculated at order time.
                  </p>
                </div>
              )}

              <Separator />

              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                Fallback Flat Fees (used when Weight-Based Pricing is off)
              </p>

              {/* Zone 1 */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Zone 1</Label>
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
                    value={getNumericValue("giftZone1Fee")}
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
                  <Label>Zone 2</Label>
                  <Badge variant="outline" className="bg-blue-50 text-blue-700">
                    Bakau, Fajara, Kotu, Kololi
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">D</span>
                  <Input
                    type="number"
                    value={getNumericValue("giftZone2Fee")}
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
                  <Label>Zone 3</Label>
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
                    value={getNumericValue("giftZone3Fee")}
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
                  <Switch
                    checked={Boolean(getValue("weightPricingEnabled"))}
                    onCheckedChange={(checked) =>
                      handleInputChange("weightPricingEnabled", checked)
                    }
                    disabled={!isEditing}
                  />
                </div>
              </div>
              <CardDescription>
                Set base fees and per-kilometer rates for each vehicle type.
                Applies to{" "}
                <strong>both regular delivery and gift orders</strong>
                when Weight-Based Pricing is enabled. Formula: Base Fee +
                (Distance × Per-km Rate)
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Bike Pricing */}
              <div className="p-4 bg-green-50 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <div className="text-2xl">🏍️</div>
                  <div>
                    <div className="font-medium">Motorbike</div>
                    <div className="text-sm text-muted-foreground">
                      0-25kg • Fast food delivery
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">Base Fee:</label>
                    <span className="text-muted-foreground">D</span>
                    <Input
                      type="number"
                      value={getNumericValue("bikeDeliveryFee")}
                      onChange={(e) =>
                        handleInputChange("bikeDeliveryFee", e.target.value)
                      }
                      disabled={!isEditing}
                      className="w-20"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">Per km:</label>
                    <span className="text-muted-foreground">D</span>
                    <Input
                      type="number"
                      value={getNumericValue("bikePerKmFee")}
                      onChange={(e) =>
                        handleInputChange("bikePerKmFee", e.target.value)
                      }
                      disabled={!isEditing}
                      className="w-20"
                    />
                  </div>
                </div>
              </div>

              {/* Keke Cargo Pricing */}
              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <div className="text-2xl">🛺</div>
                  <div>
                    <div className="font-medium">Keke Cargo</div>
                    <div className="text-sm text-muted-foreground">
                      25-250kg • Perfect for rice bags
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">Base Fee:</label>
                    <span className="text-muted-foreground">D</span>
                    <Input
                      type="number"
                      value={getNumericValue("kekeCargoDeliveryFee")}
                      onChange={(e) =>
                        handleInputChange(
                          "kekeCargoDeliveryFee",
                          e.target.value,
                        )
                      }
                      disabled={!isEditing}
                      className="w-20"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">Per km:</label>
                    <span className="text-muted-foreground">D</span>
                    <Input
                      type="number"
                      value={getNumericValue("kekeCargoPerKmFee")}
                      onChange={(e) =>
                        handleInputChange("kekeCargoPerKmFee", e.target.value)
                      }
                      disabled={!isEditing}
                      className="w-20"
                    />
                  </div>
                </div>
              </div>

              {/* Car Pricing */}
              <div className="p-4 bg-orange-50 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <div className="text-2xl">🚗</div>
                  <div>
                    <div className="font-medium">Car</div>
                    <div className="text-sm text-muted-foreground">
                      25-200kg • Premium medium loads
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">Base Fee:</label>
                    <span className="text-muted-foreground">D</span>
                    <Input
                      type="number"
                      value={getNumericValue("carDeliveryFee")}
                      onChange={(e) =>
                        handleInputChange("carDeliveryFee", e.target.value)
                      }
                      disabled={!isEditing}
                      className="w-20"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">Per km:</label>
                    <span className="text-muted-foreground">D</span>
                    <Input
                      type="number"
                      value={getNumericValue("carPerKmFee")}
                      onChange={(e) =>
                        handleInputChange("carPerKmFee", e.target.value)
                      }
                      disabled={!isEditing}
                      className="w-20"
                    />
                  </div>
                </div>
              </div>

              {/* Van Pricing */}
              <div className="p-4 bg-red-50 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <div className="text-2xl">🚐</div>
                  <div>
                    <div className="font-medium">Van</div>
                    <div className="text-sm text-muted-foreground">
                      250-700kg • Heavy cargo
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">Base Fee:</label>
                    <span className="text-muted-foreground">D</span>
                    <Input
                      type="number"
                      value={getNumericValue("vanDeliveryFee")}
                      onChange={(e) =>
                        handleInputChange("vanDeliveryFee", e.target.value)
                      }
                      disabled={!isEditing}
                      className="w-20"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">Per km:</label>
                    <span className="text-muted-foreground">D</span>
                    <Input
                      type="number"
                      value={getNumericValue("vanPerKmFee")}
                      onChange={(e) =>
                        handleInputChange("vanPerKmFee", e.target.value)
                      }
                      disabled={!isEditing}
                      className="w-20"
                    />
                  </div>
                </div>
              </div>

              {/* Lorry Pricing */}
              <div className="p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3 mb-3">
                  <div className="text-2xl">🚚</div>
                  <div>
                    <div className="font-medium">Mini Truck</div>
                    <div className="text-sm text-muted-foreground">
                      700kg+ • Industrial freight
                    </div>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">Base Fee:</label>
                    <span className="text-muted-foreground">D</span>
                    <Input
                      type="number"
                      value={getNumericValue("lorryDeliveryFee")}
                      onChange={(e) =>
                        handleInputChange("lorryDeliveryFee", e.target.value)
                      }
                      disabled={!isEditing}
                      className="w-20"
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-sm font-medium">Per km:</label>
                    <span className="text-muted-foreground">D</span>
                    <Input
                      type="number"
                      value={getNumericValue("lorryPerKmFee")}
                      onChange={(e) =>
                        handleInputChange("lorryPerKmFee", e.target.value)
                      }
                      disabled={!isEditing}
                      className="w-20"
                    />
                  </div>
                </div>
              </div>

              <div className="p-3 bg-muted rounded-lg">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Info className="h-4 w-4" />
                  <span>
                    Total delivery fee = Base Fee + (Distance × Per-km Rate).
                    Vehicle type is automatically selected based on order
                    weight. <strong>This also applies to gift orders</strong>{" "}
                    when Weight-Based Pricing is enabled above.
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Hub-Based Distance Calculation */}
          <Card className="md:col-span-2">
            <CardHeader>
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-purple-500" />
                <CardTitle>Hub-Based Distance Calculation</CardTitle>
              </div>
              <CardDescription>
                Configure central hub location for accurate driver distance calculations. 
                When enabled, delivery fees are calculated as: Hub → Vendor → Customer (two-leg journey).
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Hub coordinates */}
              <div className="grid gap-6 md:grid-cols-2">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="hubName">Hub Name</Label>
                    <Input
                      id="hubName"
                      type="text"
                      value={isEditing && formData.hubName !== undefined ? formData.hubName : settings?.hubName || ""}
                      onChange={(e) => handleInputChange("hubName" as any, e.target.value)}
                      disabled={!isEditing}
                      placeholder="TeranGO Central Hub"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="hubLatitude">Hub Latitude</Label>
                    <Input
                      id="hubLatitude"
                      type="number"
                      step="0.000001"
                      value={getNumericValue("hubLatitude" as keyof SystemSettings)}
                      onChange={(e) => handleInputChange("hubLatitude" as any, e.target.value)}
                      disabled={!isEditing}
                      placeholder="13.406444"
                      className="mt-1"
                    />
                  </div>

                  <div>
                    <Label htmlFor="hubLongitude">Hub Longitude</Label>
                    <Input
                      id="hubLongitude"
                      type="number"
                      step="0.000001"
                      value={getNumericValue("hubLongitude" as keyof SystemSettings)}
                      onChange={(e) => handleInputChange("hubLongitude" as any, e.target.value)}
                      disabled={!isEditing}
                      placeholder="-16.729975"
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-lg border bg-purple-50 p-4">
                    <div className="flex items-start gap-3">
                      <Info className="h-5 w-5 text-purple-600 mt-0.5" />
                      <div className="space-y-2 text-sm">
                        <p className="font-semibold text-purple-900">How Hub-Based Distance Works:</p>
                        <ul className="space-y-1 text-purple-800 list-disc list-inside">
                          <li><strong>Enabled:</strong> Distance = (Hub → Vendor) + (Vendor → Customer)</li>
                          <li><strong>Disabled:</strong> Distance = Vendor → Customer only</li>
                        </ul>
                        <p className="text-purple-700 mt-2">
                          Enable this because drivers start from the hub, pick up orders at vendors, then deliver to customers.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg border bg-muted/40">
                    <div>
                      <Label htmlFor="useHubBasedDistance" className="text-base font-medium">
                        Use Hub-Based Distance
                      </Label>
                      <p className="text-sm text-muted-foreground mt-1">
                        Calculate delivery distance from hub instead of vendor
                      </p>
                    </div>
                    <Switch
                      id="useHubBasedDistance"
                      checked={
                        isEditing && formData.useHubBasedDistance !== undefined
                          ? Boolean(formData.useHubBasedDistance)
                          : Boolean(settings?.useHubBasedDistance)
                      }
                      onCheckedChange={(checked) =>
                        handleInputChange("useHubBasedDistance" as any, checked)
                      }
                      disabled={!isEditing}
                    />
                  </div>

                  {(isEditing ? formData.useHubBasedDistance : settings?.useHubBasedDistance) && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded-lg">
                      <div className="flex items-center gap-2 text-sm text-green-800">
                        <span className="font-semibold">✅ Hub-based distance is active</span>
                      </div>
                      <p className="text-xs text-green-700 mt-1">
                        All delivery fees now include: Hub ({getNumericValue("hubLatitude" as keyof SystemSettings).toFixed(6)}, {getNumericValue("hubLongitude" as keyof SystemSettings).toFixed(6)}) → Vendor → Customer
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Express Delivery Pricing */}
          <Card className="md:col-span-2">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-amber-500" />
                <CardTitle>Express Delivery Pricing</CardTitle>
              </div>
              <CardDescription>
                Pricing for TeranGO Express (custom package deliveries).
                Formula: (Weight Base Fee + Distance × Per-km Rate) × Vehicle
                Multiplier × Priority Multiplier + Booking Fee + Service Fee %
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-6 md:grid-cols-2">
                {/* Weight base fees */}
                <div className="space-y-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Package Weight Base Fees
                  </p>
                  {(
                    [
                      {
                        field: "expressLightBaseFee",
                        label: "Light (0-25kg)",
                        icon: "📦",
                      },
                      {
                        field: "expressMediumBaseFee",
                        label: "Medium (25-100kg)",
                        icon: "📦📦",
                      },
                      {
                        field: "expressHeavyBaseFee",
                        label: "Heavy (100kg+)",
                        icon: "🏋️",
                      },
                    ] as const
                  ).map(({ field, label, icon }) => (
                    <div
                      key={field}
                      className="flex items-center justify-between"
                    >
                      <Label>
                        {icon} {label}
                      </Label>
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">D</span>
                        <Input
                          type="number"
                          value={getNumericValue(field)}
                          onChange={(e) =>
                            handleInputChange(field, e.target.value)
                          }
                          disabled={!isEditing}
                          className="w-24"
                        />
                      </div>
                    </div>
                  ))}

                  <Separator />

                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Priority Multipliers
                  </p>
                  <div className="flex items-center justify-between">
                    <Label>⚡ Express (e.g. 1.5 = 150%)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step="0.1"
                        value={getNumericValue("expressPriorityMultiplier")}
                        onChange={(e) =>
                          handleInputChange(
                            "expressPriorityMultiplier",
                            e.target.value,
                          )
                        }
                        disabled={!isEditing}
                        className="w-24"
                      />
                      <span className="text-muted-foreground">×</span>
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>🚨 Urgent (e.g. 2 = 200%)</Label>
                    <div className="flex items-center gap-2">
                      <Input
                        type="number"
                        step="0.1"
                        value={getNumericValue("urgentPriorityMultiplier")}
                        onChange={(e) =>
                          handleInputChange(
                            "urgentPriorityMultiplier",
                            e.target.value,
                          )
                        }
                        disabled={!isEditing}
                        className="w-24"
                      />
                      <span className="text-muted-foreground">×</span>
                    </div>
                  </div>

                  <Separator />

                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Booking Fees
                  </p>
                  <div className="flex items-center justify-between">
                    <Label>Standard delivery booking fee</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">D</span>
                      <Input
                        type="number"
                        value={getNumericValue("standardBookingFee")}
                        onChange={(e) =>
                          handleInputChange("standardBookingFee", e.target.value)
                        }
                        disabled={!isEditing}
                        className="w-24"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label>Express delivery booking fee</Label>
                    <div className="flex items-center gap-2">
                      <span className="text-muted-foreground">D</span>
                      <Input
                        type="number"
                        value={getNumericValue("expressBookingFee")}
                        onChange={(e) =>
                          handleInputChange("expressBookingFee", e.target.value)
                        }
                        disabled={!isEditing}
                        className="w-24"
                      />
                    </div>
                  </div>
                </div>

                {/* Vehicle rates */}
                <div className="space-y-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Express Vehicle Rates
                  </p>
                  <div className="overflow-x-auto">
                    <Table className="text-sm">
                      <TableHeader>
                        <TableRow className="text-muted-foreground">
                          <TableHead className="text-left font-medium">
                            Vehicle
                          </TableHead>
                          <TableHead className="text-center font-medium">
                            Per km (D)
                          </TableHead>
                          <TableHead className="text-center font-medium">
                            Multiplier (×)
                          </TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {(
                          [
                            {
                              label: "🏍️ Bike",
                              perKm: "expressBikePerKmFee",
                              mult: "expressBikeMultiplier",
                            },
                            {
                              label: "🛺 Keke Cargo",
                              perKm: "expressKekeCargoPerKmFee",
                              mult: "expressKekeCargoMultiplier",
                            },
                            {
                              label: "🚗 Car",
                              perKm: "expressCarPerKmFee",
                              mult: "expressCarMultiplier",
                            },
                            {
                              label: "🚐 Van",
                              perKm: "expressVanPerKmFee",
                              mult: "expressVanMultiplier",
                            },
                            {
                              label: "🚚 Lorry",
                              perKm: "expressLorryPerKmFee",
                              mult: "expressLorryMultiplier",
                            },
                          ] as const
                        ).map(({ label, perKm, mult }) => (
                          <TableRow key={perKm}>
                            <TableCell className="font-medium">
                              {label}
                            </TableCell>
                            <TableCell className="text-center">
                              <Input
                                type="number"
                                value={getNumericValue(perKm)}
                                onChange={(e) =>
                                  handleInputChange(perKm, e.target.value)
                                }
                                disabled={!isEditing}
                                className="w-20 mx-auto"
                              />
                            </TableCell>
                            <TableCell className="text-center">
                              <Input
                                type="number"
                                step="0.1"
                                value={getNumericValue(mult)}
                                onChange={(e) =>
                                  handleInputChange(mult, e.target.value)
                                }
                                disabled={!isEditing}
                                className="w-20 mx-auto"
                              />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>

                  <div className="p-3 bg-muted rounded-lg">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Info className="h-4 w-4 shrink-0" />
                      <span>
                        Example: Medium package, Car, 8 km, Express = (D
                        {getNumericValue("expressMediumBaseFee")} + 8 × D
                        {getNumericValue("expressCarPerKmFee")}) ×{" "}
                        {getNumericValue("expressCarMultiplier")} ×{" "}
                        {getNumericValue("expressPriorityMultiplier")} + D
                        {getNumericValue("expressBookingFee")} booking + {" "}
                        {getNumericValue("serviceFeePercent")}% service fee ={" "}
                        <strong>
                          D
                          {Math.ceil(
                            ((getNumericValue("expressMediumBaseFee") +
                              8 * getNumericValue("expressCarPerKmFee")) *
                              getNumericValue("expressCarMultiplier") *
                              getNumericValue("expressPriorityMultiplier") +
                              getNumericValue("expressBookingFee")) *
                              (1 + getNumericValue("serviceFeePercent") / 100),
                          )}
                        </strong>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Fallback Delivery Fees */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <Truck className="h-5 w-5 text-blue-500" />
                <CardTitle>Fallback Delivery Fees</CardTitle>
              </div>
              <CardDescription>
                Used when vehicle-based pricing is disabled or unavailable.
                Tiered by distance from vendor to customer.
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
                    value={getNumericValue("deliveryFee0to5km")}
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
                    value={getNumericValue("deliveryFee5to10km")}
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
                    value={getNumericValue("deliveryFee10to20km")}
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
                    value={getNumericValue("deliveryFee20to30km")}
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
                    value={getNumericValue("deliveryFeeAbove30km")}
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

          {/* Service Fee & Driver Split */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-yellow-500" />
                <CardTitle>Fees & Driver Split</CardTitle>
              </div>
              <CardDescription>
                Express delivery service fee and driver payout split
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Zap className="h-4 w-4 text-muted-foreground" />
                  <Label>Express Delivery Service Fee (%)</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={getNumericValue("serviceFeePercent")}
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
                  Applied only to Express/custom delivery order subtotals —
                  regular restaurant/shop orders do not use this fee.
                </p>
              </div>

              <Separator />

              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-orange-500" />
                  <Label>Third-Party Driver Split Rate</Label>
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min="0.1"
                    max="1"
                    step="0.05"
                    value={getNumericValue("thirdPartyDriverRate")}
                    onChange={(e) =>
                      handleInputChange("thirdPartyDriverRate", e.target.value)
                    }
                    disabled={!isEditing}
                    className="w-24"
                  />
                  <span className="text-muted-foreground text-sm">
                    (e.g. 0.70 = 70% to driver, 30% to platform)
                  </span>
                </div>
                <p className="text-sm text-muted-foreground">
                  Default split for all third-party drivers. Can be overridden
                  per driver.
                </p>
                {!isEditing && (
                  <div className="rounded-md border border-orange-200 bg-orange-50 p-3 text-sm text-orange-800">
                    Current: Driver gets{" "}
                    <strong>
                      {Math.round(
                        getNumericValue("thirdPartyDriverRate") * 100,
                      )}
                      %
                    </strong>{" "}
                    · Platform keeps{" "}
                    <strong>
                      {Math.round(
                        (1 - getNumericValue("thirdPartyDriverRate")) * 100,
                      )}
                      %
                    </strong>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* No-Drivers Hours */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2 justify-between">
                <div className="flex items-center gap-2">
                  <Moon className="h-5 w-5 text-indigo-500" />
                  <CardTitle>Driver Availability Hours</CardTitle>
                </div>
                <Switch
                  checked={Boolean(getValue("noDriversModeEnabled"))}
                  onCheckedChange={(checked) =>
                    handleInputChange("noDriversModeEnabled", checked)
                  }
                  disabled={!isEditing}
                />
              </div>
              <CardDescription>
                When enabled, delivery and express booking will show "No
                drivers available" during the hours below (e.g. overnight).
                Useful while running with a limited driver pool.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label>Unavailable from</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                    value={getNumericValue("noDriversStartHour")}
                    onChange={(e) =>
                      handleInputChange("noDriversStartHour", e.target.value)
                    }
                    disabled={!isEditing}
                  >
                    {Array.from({ length: 24 }, (_, hour) => (
                      <option key={hour} value={hour}>
                        {hour === 0
                          ? "12:00 AM"
                          : hour < 12
                            ? `${hour}:00 AM`
                            : hour === 12
                              ? "12:00 PM"
                              : `${hour - 12}:00 PM`}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="space-y-1.5">
                  <Label>Until</Label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
                    value={getNumericValue("noDriversEndHour")}
                    onChange={(e) =>
                      handleInputChange("noDriversEndHour", e.target.value)
                    }
                    disabled={!isEditing}
                  >
                    {Array.from({ length: 24 }, (_, hour) => (
                      <option key={hour} value={hour}>
                        {hour === 0
                          ? "12:00 AM"
                          : hour < 12
                            ? `${hour}:00 AM`
                            : hour === 12
                              ? "12:00 PM"
                              : `${hour - 12}:00 PM`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              {getValue("noDriversModeEnabled") ? (
                <div className="rounded-md border border-indigo-200 bg-indigo-50 p-3 text-sm text-indigo-800">
                  Drivers will show as unavailable every day between the
                  selected hours.
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Currently off — drivers are shown as available at all hours.
                </p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Summary Card */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Current Configuration Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Gift Order Pricing
                </p>
                {getValue("weightPricingEnabled") ? (
                  <>
                    <p className="text-lg font-semibold text-green-700">
                      Vehicle-Based ✅
                    </p>
                    <p className="text-xs text-muted-foreground">
                      🏍️ D{getNumericValue("bikeDeliveryFee")} / 🛺 D
                      {getNumericValue("kekeCargoDeliveryFee")} / 🚗 D
                      {getNumericValue("carDeliveryFee")} base fees
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-lg font-semibold text-yellow-600">
                      Flat Zones ⚠️
                    </p>
                    <p className="text-xs text-muted-foreground">
                      D{getNumericValue("giftZone1Fee")} / D
                      {getNumericValue("giftZone2Fee")} / D
                      {getNumericValue("giftZone3Fee")} (Z1/Z2/Z3)
                    </p>
                  </>
                )}
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Express Service Fee
                </p>
                <p className="text-lg font-semibold">
                  {getValue("serviceFeePercent")}%
                </p>
                <p className="text-xs text-muted-foreground">
                  Express/custom delivery orders only
                </p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">
                  Third-Party Driver Split
                </p>
                <p className="text-lg font-semibold">
                  {Math.round(getNumericValue("thirdPartyDriverRate") * 100)}%
                  to driver
                </p>
                <p className="text-xs text-muted-foreground">
                  {Math.round(
                    (1 - getNumericValue("thirdPartyDriverRate")) * 100,
                  )}
                  % to platform
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </Main>
    </>
  );
}

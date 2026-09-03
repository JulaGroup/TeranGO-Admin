/**
 * Delivery Settings Page
 *
 * Admin can configure:
 * - Gift order zone-based delivery fees
 * - Fallback delivery fee tiers (used when vehicle-based pricing is off/unavailable)
 * - Vehicle-based pricing (base fee + per-km rate)
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
  Bike,
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

  // Unified driver-first rate card
  driverBaseFeeBike: number;
  driverBaseFeeKekeCargo: number;
  driverBaseFeeCar: number;
  driverBaseFeeVan: number;
  driverBaseFeeLorry: number;
  driverPerKmFeeBike: number;
  driverPerKmFeeKekeCargo: number;
  driverPerKmFeeCar: number;
  driverPerKmFeeVan: number;
  driverPerKmFeeLorry: number;

  // Express-only overrides. Null/0 means "use the standard value above".
  expressDriverBaseFeeBike: number | null;
  expressDriverBaseFeeKekeCargo: number | null;
  expressDriverBaseFeeCar: number | null;
  expressDriverBaseFeeVan: number | null;
  expressDriverBaseFeeLorry: number | null;
  expressDriverPerKmFeeBike: number | null;
  expressDriverPerKmFeeKekeCargo: number | null;
  expressDriverPerKmFeeCar: number | null;
  expressDriverPerKmFeeVan: number | null;
  expressDriverPerKmFeeLorry: number | null;

  // Long-distance taper and the platform take cap. Null/0 = off.
  driverTaperAfterKm: number | null;
  driverLongPerKmFeeBike: number | null;
  driverLongPerKmFeeKekeCargo: number | null;
  driverLongPerKmFeeCar: number | null;
  driverLongPerKmFeeVan: number | null;
  driverLongPerKmFeeLorry: number | null;
  platformTakeCap: number | null;
  driverMinEarning: number;
  platformMarginPercent: number;
  unifiedPricingEnabled: boolean;

  // Third-party driver split rate
  thirdPartyDriverRate: number;

  // No-Drivers Hours (e.g. overnight)
  noDriversModeEnabled: boolean;
  noDriversStartHour: number;
  noDriversEndHour: number;
}

const RATE_CARD_VEHICLES = [
  { key: "BIKE", emoji: "🏍️", label: "Motorbike", baseField: "driverBaseFeeBike", perKmField: "driverPerKmFeeBike", longPerKmField: "driverLongPerKmFeeBike", expressBaseField: "expressDriverBaseFeeBike", expressPerKmField: "expressDriverPerKmFeeBike" },
  { key: "KEKE_CARGO", emoji: "🛺", label: "Keke Cargo", baseField: "driverBaseFeeKekeCargo", perKmField: "driverPerKmFeeKekeCargo", longPerKmField: "driverLongPerKmFeeKekeCargo", expressBaseField: "expressDriverBaseFeeKekeCargo", expressPerKmField: "expressDriverPerKmFeeKekeCargo" },
  { key: "CAR", emoji: "🚗", label: "Car", baseField: "driverBaseFeeCar", perKmField: "driverPerKmFeeCar", longPerKmField: "driverLongPerKmFeeCar", expressBaseField: "expressDriverBaseFeeCar", expressPerKmField: "expressDriverPerKmFeeCar" },
  { key: "VAN", emoji: "🚙", label: "Van", baseField: "driverBaseFeeVan", perKmField: "driverPerKmFeeVan", longPerKmField: "driverLongPerKmFeeVan", expressBaseField: "expressDriverBaseFeeVan", expressPerKmField: "expressDriverPerKmFeeVan" },
  { key: "LORRY", emoji: "🚛", label: "Mini Truck", baseField: "driverBaseFeeLorry", perKmField: "driverPerKmFeeLorry", longPerKmField: "driverLongPerKmFeeLorry", expressBaseField: "expressDriverBaseFeeLorry", expressPerKmField: "expressDriverPerKmFeeLorry" },
] as const;

const PREVIEW_KMS = [2, 5, 10, 20] as const;

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
      field === "noDriversModeEnabled" ||
      field === "unifiedPricingEnabled"
    ) {
      return Boolean(settings?.[field]) || false;
    }
    return (settings?.[field] as number) || 0;
  };

  const getNumericValue = (field: keyof SystemSettings): number => {
    return getValue(field) as number;
  };

  // Mirrors server/src/services/deliveryPricing.service.ts. Kept deliberately
  // simple and in one place: an admin editing rates with no idea of the effect
  // is how urgentPriorityMultiplier reached 0 and stayed there.
  const marginPercent = getNumericValue("platformMarginPercent");
  /**
   * `express` mirrors the server: an Express override is used only when it is
   * a real positive number, otherwise the standard value applies. Keeping the
   * same rule here is what makes the preview trustworthy.
   */
  const previewFor = (
    km: number,
    v: (typeof RATE_CARD_VEHICLES)[number],
    express = false,
  ) => {
    const stdBase = getNumericValue(v.baseField as keyof SystemSettings);
    const stdPerKm = getNumericValue(v.perKmField as keyof SystemSettings);
    const xBase = getNumericValue(v.expressBaseField as keyof SystemSettings);
    const xPerKm = getNumericValue(v.expressPerKmField as keyof SystemSettings);

    const base = express && xBase > 0 ? xBase : stdBase;
    const perKm = express && xPerKm > 0 ? xPerKm : stdPerKm;
    const min = getNumericValue("driverMinEarning");
    const booking = getNumericValue("expressBookingFee");

    // Taper and cap are standard-order only, exactly as in the engine.
    const taperAfter = express ? 0 : getNumericValue("driverTaperAfterKm");
    const longPerKm = express
      ? 0
      : getNumericValue(v.longPerKmField as keyof SystemSettings);
    const takeCap = express ? 0 : getNumericValue("platformTakeCap");

    const distanceFee =
      taperAfter > 0 && longPerKm > 0 && km > taperAfter
        ? taperAfter * perKm + (km - taperAfter) * longPerKm
        : km * perKm;

    const pay = Math.max(base + distanceFee, min);
    const uncapped = pay * marginPercent;
    const platform =
      takeCap > 0 && uncapped + booking > takeCap
        ? Math.max(0, takeCap - booking)
        : uncapped;

    return {
      driver: Math.round(pay),
      platform: Math.round(platform),
      customer: Math.ceil(pay + platform) + booking,
      capped: platform !== uncapped,
    };
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
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Delivery Settings
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
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
          {/* ─── Driver Rate Card (the one that actually prices deliveries) ─── */}
          <Card className="md:col-span-2 shadow-sm border-l-4 border-l-primary">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bike className="h-5 w-5 text-primary" />
                <CardTitle>Driver Rate Card</CardTitle>
              </div>
              <CardDescription>
                The rate card food and shop deliveries are priced from — and
                Express too, for any vehicle without an override in the card
                below. You
                set what the <strong>rider earns</strong>; the customer price is
                derived from it, so nobody has to reverse-engineer a percentage
                split. Weight is not priced here — it picks the vehicle, and the
                vehicle already carries the cost.
                <br />
                <code className="text-xs">
                  pay = max(minimum, base + km x per-km) &nbsp;·&nbsp; customer =
                  pay + (pay x margin) + booking fee
                </code>
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {RATE_CARD_VEHICLES.map((v) => (
                  <div
                    key={v.key}
                    className="p-4 border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="text-2xl">{v.emoji}</div>
                      <div className="font-medium">{v.label}</div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <label className="text-sm font-medium w-16">Base:</label>
                        <span className="text-muted-foreground">D</span>
                        <Input
                          type="number"
                          value={getNumericValue(v.baseField as any)}
                          onChange={(e) =>
                            handleInputChange(v.baseField as any, e.target.value)
                          }
                          disabled={!isEditing}
                          className="w-24"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-sm font-medium w-16">
                          Per km:
                        </label>
                        <span className="text-muted-foreground">D</span>
                        <Input
                          type="number"
                          value={getNumericValue(v.perKmField as any)}
                          onChange={(e) =>
                            handleInputChange(v.perKmField as any, e.target.value)
                          }
                          disabled={!isEditing}
                          className="w-24"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-sm font-medium w-16">
                          Long km:
                        </label>
                        <span className="text-muted-foreground">D</span>
                        <Input
                          type="number"
                          value={getNumericValue(v.longPerKmField as any)}
                          onChange={(e) =>
                            handleInputChange(
                              v.longPerKmField as any,
                              e.target.value,
                            )
                          }
                          disabled={!isEditing}
                          className="w-24"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid gap-4 sm:grid-cols-3">
                <div className="p-4 border rounded-lg">
                  <label className="text-sm font-medium block mb-2">
                    Driver minimum per delivery
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">D</span>
                    <Input
                      type="number"
                      value={getNumericValue("driverMinEarning" as any)}
                      onChange={(e) =>
                        handleInputChange("driverMinEarning" as any, e.target.value)
                      }
                      disabled={!isEditing}
                      className="w-24"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    No third-party rider is paid less than this on any single
                    delivery. Salaried SYSTEM drivers are unaffected.
                  </p>
                </div>

                <div className="p-4 border rounded-lg">
                  <label className="text-sm font-medium block mb-2">
                    Platform margin
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      step="0.01"
                      value={getNumericValue("platformMarginPercent" as any)}
                      onChange={(e) =>
                        handleInputChange(
                          "platformMarginPercent" as any,
                          e.target.value,
                        )
                      }
                      disabled={!isEditing}
                      className="w-24"
                    />
                    <span className="text-muted-foreground text-sm">
                      = {Math.round(marginPercent * 100)}%
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    A fraction, not a percentage: 0.25 means the app adds 25% on
                    top of driver pay. Riders keep{" "}
                    {Math.round((1 / (1 + marginPercent)) * 100)}% of transport.
                  </p>
                </div>

                <div className="p-4 border rounded-lg">
                  <label className="text-sm font-medium block mb-2">
                    Long-distance starts after
                  </label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={getNumericValue("driverTaperAfterKm" as any)}
                      onChange={(e) =>
                        handleInputChange(
                          "driverTaperAfterKm" as any,
                          e.target.value,
                        )
                      }
                      disabled={!isEditing}
                      className="w-24"
                    />
                    <span className="text-muted-foreground text-sm">km</span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Past this point each km bills at the vehicle's{" "}
                    <strong>Long km</strong> rate instead of Per km. Set either
                    to 0 to switch the taper off. A flat rate that suits a hop
                    to a nearby vendor priced a 22km run at D681.
                  </p>
                </div>

                <div className="p-4 border rounded-lg">
                  <label className="text-sm font-medium block mb-2">
                    Most TeranGO keeps per delivery
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">D</span>
                    <Input
                      type="number"
                      value={getNumericValue("platformTakeCap" as any)}
                      onChange={(e) =>
                        handleInputChange("platformTakeCap" as any, e.target.value)
                      }
                      disabled={!isEditing}
                      className="w-24"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-2">
                    Margin and booking fee together — this is what the business
                    actually earns on a job. 0 = no cap. Below it the split is
                    exactly {Math.round((1 / (1 + marginPercent)) * 100)}/
                    {Math.round((marginPercent / (1 + marginPercent)) * 100)};
                    above it the rider keeps the rest, which is how a long run
                    can pay a rider D450 while TeranGO takes D100.
                  </p>
                </div>

                <div className="p-4 border rounded-lg">
                  <label className="text-sm font-medium block mb-2">
                    Use this card for normal orders too
                  </label>
                  <Switch
                    checked={
                      (formData.unifiedPricingEnabled ??
                        settings?.unifiedPricingEnabled) ||
                      false
                    }
                    onCheckedChange={(checked) =>
                      handleInputChange("unifiedPricingEnabled" as any, checked)
                    }
                    disabled={!isEditing}
                  />
                  <p className="text-xs text-muted-foreground mt-2">
                    Off: food and shop orders still use the legacy weight-based
                    fees below. On: everything is priced from this card. Turning
                    it on <strong>will change normal-order prices</strong> —
                    check the preview first.
                  </p>
                </div>
              </div>

              {/* Live preview — the thing that stops a setting like
                  urgentPriorityMultiplier quietly reaching 0 */}
              <div className="rounded-lg border overflow-hidden">
                <div className="bg-muted/50 px-4 py-2 border-b">
                  <p className="text-sm font-medium">
                    Preview — what these numbers actually produce
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Updates as you type, before you save.
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/20">
                        <th className="text-left px-4 py-2 font-medium">
                          Vehicle
                        </th>
                        {PREVIEW_KMS.map((km) => (
                          <th
                            key={km}
                            className="text-right px-4 py-2 font-medium"
                          >
                            {km} km
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {RATE_CARD_VEHICLES.map((v) => (
                        <tr key={v.key} className="border-b last:border-0">
                          <td className="px-4 py-2 whitespace-nowrap">
                            {v.emoji} {v.label}
                          </td>
                          {PREVIEW_KMS.map((km) => {
                            const p = previewFor(km, v);
                            return (
                              <td
                                key={km}
                                className="px-4 py-2 text-right tabular-nums"
                              >
                                <div className="font-semibold">
                                  D{p.customer}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  rider D{p.driver} · app D{p.platform}
                                  {p.capped ? " (capped)" : ""}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-4 py-2 border-t bg-muted/20">
                  <p className="text-xs text-muted-foreground">
                    Customer figures include the D
                    {getNumericValue("expressBookingFee" as any) || 0} express
                    booking fee and exclude the {""}
                    {getNumericValue("serviceFeePercent" as any) || 0}% service
                    fee, which is added at checkout.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* ─── Express override card ───
              Express is a long point-to-point courier run, not a hop from a
              nearby vendor, so the food curve priced a 12.7km job at D471. A
              higher base with a lower per-km is a distance taper written as
              two numbers. */}
          <Card className="md:col-span-2 shadow-sm border-l-4 border-l-orange-500">
            <CardHeader>
              <div className="flex items-center gap-2">
                <Bike className="h-5 w-5 text-orange-500" />
                <CardTitle>Express Rate Card</CardTitle>
              </div>
              <CardDescription>
                Express only. Leave a field at <strong>0</strong> and that
                vehicle falls back to the standard card above. Food and shop
                orders are never affected by anything here.
                <br />
                Express wants a <strong>higher base and a lower per-km</strong>
                {" "}than food delivery: these are long point-to-point runs, and
                the food curve reached D471 on a 12.7km job. A high base with a
                low per-km is a distance taper, in two numbers.
                <br />
                <strong>
                  The platform margin is shared and is not set here.
                </strong>{" "}
                It is {Math.round(marginPercent * 100)}% because that makes 75%
                of transport exactly equal rider pay — the split the earnings
                service actually pays out. Change one without the other and a
                rider is quoted one figure and paid another.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {RATE_CARD_VEHICLES.map((v) => (
                  <div
                    key={v.key}
                    className="p-4 border rounded-lg bg-orange-50/40 hover:bg-orange-50/70 transition-colors"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="text-2xl">{v.emoji}</div>
                      <div className="font-medium">{v.label}</div>
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <label className="text-sm font-medium w-16">Base:</label>
                        <span className="text-muted-foreground">D</span>
                        <Input
                          type="number"
                          value={getNumericValue(v.expressBaseField as any)}
                          onChange={(e) =>
                            handleInputChange(
                              v.expressBaseField as any,
                              e.target.value,
                            )
                          }
                          disabled={!isEditing}
                          className="w-24"
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-sm font-medium w-16">
                          Per km:
                        </label>
                        <span className="text-muted-foreground">D</span>
                        <Input
                          type="number"
                          value={getNumericValue(v.expressPerKmField as any)}
                          onChange={(e) =>
                            handleInputChange(
                              v.expressPerKmField as any,
                              e.target.value,
                            )
                          }
                          disabled={!isEditing}
                          className="w-24"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="rounded-lg border overflow-hidden">
                <div className="bg-orange-50/60 px-4 py-2 border-b">
                  <p className="text-sm font-medium">
                    Express preview — what a customer is actually quoted
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Updates as you type, before you save.
                  </p>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b bg-muted/20">
                        <th className="text-left px-4 py-2 font-medium">
                          Vehicle
                        </th>
                        {PREVIEW_KMS.map((km) => (
                          <th
                            key={km}
                            className="text-right px-4 py-2 font-medium"
                          >
                            {km} km
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {RATE_CARD_VEHICLES.map((v) => (
                        <tr key={v.key} className="border-b last:border-0">
                          <td className="px-4 py-2 whitespace-nowrap">
                            {v.emoji} {v.label}
                          </td>
                          {PREVIEW_KMS.map((km) => {
                            const p = previewFor(km, v, true);
                            return (
                              <td
                                key={km}
                                className="px-4 py-2 text-right tabular-nums"
                              >
                                <div className="font-semibold">
                                  D{p.customer}
                                </div>
                                <div className="text-xs text-muted-foreground">
                                  rider D{p.driver} · app D{p.platform}
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="px-4 py-2 border-t bg-muted/20">
                  <p className="text-xs text-muted-foreground">
                    Includes the D
                    {getNumericValue("expressBookingFee" as any) || 0} express
                    booking fee, excludes the{" "}
                    {getNumericValue("serviceFeePercent" as any) || 0}% service
                    fee added at checkout.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Gift Order Zone Fees */}
          <Card className="shadow-sm">
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
          <Card className="shadow-sm">
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
              <div className="p-4 border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
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
              <div className="p-4 border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
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
              <div className="p-4 border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
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
              <div className="p-4 border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
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
              <div className="p-4 border rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors">
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

          {/* Express Delivery Pricing */}
          <Card className="md:col-span-2 shadow-sm">
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
          <Card className="shadow-sm">
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
          <Card className="shadow-sm">
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
          <Card className="shadow-sm">
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
        <Card className="mt-6 shadow-sm">
          <CardHeader>
            <CardTitle>Current Configuration Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <div className="p-4 border rounded-lg hover:bg-muted/30 transition-colors">
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
              <div className="p-4 border rounded-lg hover:bg-muted/30 transition-colors">
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
              <div className="p-4 border rounded-lg hover:bg-muted/30 transition-colors">
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

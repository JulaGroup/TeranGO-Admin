/**
 * Maintenance Mode Management Page
 *
 * Admins toggle maintenance mode per service.
 * The mobile app polls /api/app-status on launch and shows a maintenance
 * screen whenever a service (or the whole app) is flagged.
 *
 * Industry pattern: feature flags stored in DB, served from a public
 * health/status endpoint — no deploy required to toggle maintenance.
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
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Wrench,
  RefreshCw,
  AlertTriangle,
  Save,
  ShieldAlert,
  Crown,
  Zap,
  Building2,
  Briefcase,
  Sofa,
  UtensilsCrossed,
  ShoppingBag,
} from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/maintenance/")({
  component: MaintenancePage,
});

interface MaintenanceSettings {
  appMaintenanceMode: boolean;
  storeMaintenanceMode: boolean;
  expressDeliveryMaintenance: boolean;
  kerspaceMaintenanceMode: boolean;
  teranproMaintenanceMode: boolean;
  furnitureMaintenanceMode: boolean;
  restaurantMaintenanceMode: boolean;
  shopMaintenanceMode: boolean;
  maintenanceMessage: string;
}

const SERVICE_CONFIG: {
  key: keyof Omit<MaintenanceSettings, "maintenanceMessage">;
  label: string;
  description: string;
  icon: React.ElementType;
}[] = [
  {
    key: "storeMaintenanceMode",
    label: "TeranGO Official Store",
    description: "Online store for TeranGO curated products",
    icon: Crown,
  },
  {
    key: "expressDeliveryMaintenance",
    label: "Express Delivery",
    description: "On-demand courier and parcel delivery service",
    icon: Zap,
  },
  {
    key: "restaurantMaintenanceMode",
    label: "Restaurant Ordering",
    description: "Food ordering from partner restaurants",
    icon: UtensilsCrossed,
  },
  {
    key: "shopMaintenanceMode",
    label: "Shop Ordering",
    description: "Ordering from partner retail shops",
    icon: ShoppingBag,
  },
  {
    key: "kerspaceMaintenanceMode",
    label: "KërSpace Real Estate",
    description: "Property listings and rental marketplace",
    icon: Building2,
  },
  {
    key: "teranproMaintenanceMode",
    label: "TeranPro Services",
    description: "Professional and skilled services marketplace",
    icon: Briefcase,
  },
  {
    key: "furnitureMaintenanceMode",
    label: "Furniture Marketplace",
    description: "Buy and sell furniture listings",
    icon: Sofa,
  },
];

function MaintenancePage() {
  const queryClient = useQueryClient();
  const [localSettings, setLocalSettings] = useState<
    Partial<MaintenanceSettings>
  >({});
  const [isDirty, setIsDirty] = useState(false);

  // Fetch current settings
  const { data: settings, isLoading } = useQuery({
    queryKey: ["system-settings"],
    queryFn: async () => {
      const response = await api.get("/api/admin/system-settings");
      return response.data.data as MaintenanceSettings;
    },
  });

  // Persist all maintenance settings
  const saveMutation = useMutation({
    mutationFn: async (data: Partial<MaintenanceSettings>) => {
      const response = await api.put("/api/admin/system-settings", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["system-settings"] });
      toast.success("Maintenance settings saved");
      setIsDirty(false);
    },
    onError: (error: unknown) => {
      const msg = (error as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      toast.error(msg || "Failed to save maintenance settings");
    },
  });

  // Toggle a single boolean field and save immediately (UX: instant toggle)
  const toggleMutation = useMutation({
    mutationFn: async ({
      field,
      value,
    }: {
      field: keyof Omit<MaintenanceSettings, "maintenanceMessage">;
      value: boolean;
    }) => {
      const response = await api.put("/api/admin/system-settings", {
        [field]: value,
      });
      return response.data;
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ["system-settings"] });
      const isOn = variables.value;
      toast.success(
        isOn ? "Maintenance mode enabled" : "Maintenance mode disabled",
        {
          description: isOn
            ? "Users will see the maintenance screen."
            : "Service is back online.",
        },
      );
    },
    onError: (error: unknown) => {
      // Revert optimistic local state
      setLocalSettings((prev) => ({ ...prev }));
      const msg = (error as { response?: { data?: { message?: string } } })
        ?.response?.data?.message;
      toast.error(msg || "Failed to update");
    },
  });

  const getVal = (
    field: keyof Omit<MaintenanceSettings, "maintenanceMessage">,
  ): boolean => {
    if (localSettings[field] !== undefined) {
      return localSettings[field] as boolean;
    }
    return (settings?.[field] as boolean) ?? false;
  };

  const getMessage = (): string => {
    return (
      (localSettings?.maintenanceMessage as string) ??
      settings?.maintenanceMessage ??
      ""
    );
  };

  const handleToggle = (
    field: keyof Omit<MaintenanceSettings, "maintenanceMessage">,
    value: boolean,
  ) => {
    // Optimistic update
    setLocalSettings((prev) => ({ ...prev, [field]: value }));
    toggleMutation.mutate({ field, value });
  };

  const handleMessageChange = (value: string) => {
    setLocalSettings((prev) => ({ ...prev, maintenanceMessage: value }));
    setIsDirty(true);
  };

  const handleSaveMessage = () => {
    saveMutation.mutate({ maintenanceMessage: getMessage() });
  };

  const activeServiceCount = SERVICE_CONFIG.filter((s) => getVal(s.key)).length;

  const isGlobalOn = getVal("appMaintenanceMode");

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
        <div className="space-y-6 max-w-3xl">
          {/* Page header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Maintenance Mode
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                Toggle maintenance mode per service. Changes take effect
                immediately — no deploy required.
              </p>
            </div>
            <div className="flex items-center gap-2">
              {activeServiceCount > 0 && (
                <Badge variant="destructive">
                  {activeServiceCount} service
                  {activeServiceCount !== 1 ? "s" : ""} down
                </Badge>
              )}
              {isGlobalOn && (
                <Badge variant="destructive" className="animate-pulse">
                  App offline
                </Badge>
              )}
            </div>
          </div>

          {/* Global kill switch */}
          <Card className={`shadow-sm ${isGlobalOn ? "border-destructive" : ""}`}>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldAlert
                    className={`h-5 w-5 ${isGlobalOn ? "text-destructive" : "text-muted-foreground"}`}
                  />
                  <CardTitle className="text-base">
                    Global App Maintenance
                  </CardTitle>
                </div>
                <Switch
                  checked={isGlobalOn}
                  onCheckedChange={(v) => handleToggle("appMaintenanceMode", v)}
                  disabled={toggleMutation.isPending}
                  className="data-[state=checked]:bg-destructive"
                />
              </div>
              <CardDescription>
                Takes the entire app offline. Users see a full-screen
                maintenance page regardless of which section they open.
                <span className="block mt-1 font-medium text-destructive">
                  Use with caution — this affects all users immediately.
                </span>
              </CardDescription>
            </CardHeader>
          </Card>

          {isGlobalOn && (
            <div className="flex items-center gap-2 rounded-md border border-destructive/50 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Global maintenance is active. All app features are currently
              unavailable to users.
            </div>
          )}

          {/* Per-service toggles */}
          <Card className="shadow-sm">
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-base font-semibold">Service Maintenance</CardTitle>
              <CardDescription>
                Toggle individual services. Users see an in-app banner or
                maintenance screen for the affected service only.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-2 pb-2">
              {SERVICE_CONFIG.map((service, index) => {
                const Icon = service.icon;
                const isActive = getVal(service.key);
                return (
                  <div
                    key={service.key}
                    className={`flex items-center justify-between py-3 ${index < SERVICE_CONFIG.length - 1 ? "border-b" : ""}`}
                  >
                    <div className="flex items-start gap-3">
                      <Icon
                        className={`h-5 w-5 mt-0.5 shrink-0 ${isActive ? "text-destructive" : "text-muted-foreground"}`}
                      />
                      <div>
                        <p className="font-medium text-sm">{service.label}</p>
                        <p className="text-xs text-muted-foreground mt-0.5">
                          {service.description}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0 ml-4">
                      {isActive && (
                        <Badge
                          variant="destructive"
                          className="text-xs hidden sm:flex"
                        >
                          Maintenance
                        </Badge>
                      )}
                      <Switch
                        checked={isActive}
                        onCheckedChange={(v) => handleToggle(service.key, v)}
                        disabled={toggleMutation.isPending}
                      />
                    </div>
                  </div>
                );
              })}
            </CardContent>
          </Card>

          {/* Maintenance message */}
          <Card className="shadow-sm">
            <CardHeader className="border-b pb-4">
              <CardTitle className="text-base font-semibold">Maintenance Message</CardTitle>
              <CardDescription>
                This message is shown to users when any service is in
                maintenance mode.
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-3">
              <Textarea
                value={getMessage()}
                onChange={(e) => handleMessageChange(e.target.value)}
                rows={3}
                placeholder="Enter a user-friendly maintenance message..."
                className="resize-none"
              />
              <Button
                size="sm"
                onClick={handleSaveMessage}
                disabled={!isDirty || saveMutation.isPending}
              >
                {saveMutation.isPending ? (
                  <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save Message
              </Button>
            </CardContent>
          </Card>

          {/* How it works */}
          <Card className="shadow-sm bg-muted/30 border-dashed">
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
                How It Works
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 pt-0">
              {[
                <>The mobile app polls <code className="bg-muted px-1 py-0.5 rounded text-xs">GET /api/app-status</code> on launch and navigation.</>,
                "When a service toggle is on, users see an in-app maintenance screen for that service.",
                "The global toggle overrides all service toggles and shows a full-screen message.",
                "No redeployment is needed — changes are persisted to the database and served in real time.",
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                  <span className="shrink-0 mt-0.5 h-4 w-4 rounded-full bg-muted-foreground/20 flex items-center justify-center text-[10px] font-medium text-muted-foreground">{i + 1}</span>
                  <span>{item}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </Main>
    </>
  );
}

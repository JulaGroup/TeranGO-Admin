import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, MapPin, Plus, RefreshCw, Store } from "lucide-react";
import { toast } from "sonner";
import { adminApi, api } from "@/lib/api";
import { DataTable } from "@/components/data-table";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { ProfileDropdown } from "@/components/profile-dropdown";
import { ThemeSwitch } from "@/components/theme-switch";
import { cn } from "@/lib/utils";
import { BUSINESS_TYPES, exportVendorsCsv, toVendorRow } from "./-lib/vendor-utils";
import type {
  FlatBusiness,
  VendorRow,
  VendorWithSubscription,
} from "./-lib/vendor-types";
import { makeVendorColumns } from "./-components/vendors-columns";
import {
  VendorsStats,
  computeVendorStats,
} from "./-components/vendors-stats";
import { VendorsEmptyState } from "./-components/vendors-empty-state";
import { BusinessLocationsPanel } from "./-components/business-locations-panel";
import { CreateVendorDialog } from "./-components/create-vendor-dialog";
import { VendorDetailsDialog } from "./-components/vendor-details-dialog";
import { EditVendorDialog } from "./-components/edit-vendor-dialog";
import { SubscriptionDialog } from "./-components/subscription-dialog";
import { EditBusinessLocationDialog } from "./-components/edit-business-location-dialog";

type TabValue = "vendors" | "locations";

export const Route = createFileRoute("/_authenticated/admin/vendors/")({
  component: VendorsPage,
  // Keeps the active tab in the URL so a refresh or a shared link lands back
  // on the same view. Optional on purpose — a bare /admin/vendors link must
  // still typecheck everywhere else in the app.
  validateSearch: (search: Record<string, unknown>): { tab?: TabValue } =>
    search.tab === "locations" ? { tab: "locations" } : {},
});

/** One dialog is open at a time — a union beats eight independent booleans. */
type DialogState =
  | { type: "none" }
  | { type: "create" }
  | { type: "details"; vendor: VendorRow }
  | { type: "edit"; vendor: VendorRow }
  | { type: "subscription"; vendor: VendorRow }
  | { type: "toggleStatus"; vendor: VendorRow }
  | { type: "delete"; vendor: VendorRow }
  | { type: "location"; business: FlatBusiness };

function VendorsPage() {
  const { tab } = Route.useSearch();
  const activeTab: TabValue = tab ?? "vendors";
  const navigate = Route.useNavigate();
  const queryClient = useQueryClient();

  const [dialog, setDialog] = useState<DialogState>({ type: "none" });
  const [createKey, setCreateKey] = useState(0);
  const [selectedLocation, setSelectedLocation] = useState<{
    lat: number;
    lng: number;
    address?: string;
    city?: string;
  } | null>(null);
  const [editedBusinessName, setEditedBusinessName] = useState("");

  const closeDialog = () => setDialog({ type: "none" });

  const {
    data: vendorsResponse,
    isLoading,
    isError,
    error,
    isFetching,
    refetch,
  } = useQuery({
    queryKey: ["vendors-all"],
    queryFn: async () => {
      const response = await adminApi.getVendors({ limit: 500 });
      return (response.data.vendors ||
        response.data ||
        []) as VendorWithSubscription[];
    },
  });

  // Packages are only needed once the subscription dialog opens.
  const { data: subscriptionPackages = [] } = useQuery({
    queryKey: ["subscription-packages"],
    queryFn: async () => {
      const response = await api.get("/api/subscriptions/packages");
      return response.data.packages || [];
    },
    enabled: dialog.type === "subscription",
  });

  const rows = useMemo(
    () =>
      Array.isArray(vendorsResponse) ? vendorsResponse.map(toVendorRow) : [],
    [vendorsResponse],
  );
  const stats = useMemo(() => computeVendorStats(rows), [rows]);

  const invalidateVendors = () =>
    queryClient.invalidateQueries({ queryKey: ["vendors-all"] });

  const toggleVendorStatusMutation = useMutation({
    mutationFn: async ({
      vendorId,
      isActive,
    }: {
      vendorId: string;
      isActive: boolean;
    }) => {
      const response = await api.patch(`/api/admin/vendors/${vendorId}/status`, {
        isActive,
      });
      return response.data;
    },
    onSuccess: () => {
      invalidateVendors();
      toast.success("Vendor status updated");
      closeDialog();
    },
    onError: (err: any) =>
      toast.error(
        err.response?.data?.message || "Failed to update vendor status",
      ),
  });

  const updateVendorMutation = useMutation({
    mutationFn: async ({ vendorId, data }: { vendorId: string; data: any }) => {
      const response = await adminApi.updateVendor(vendorId, data);
      return response.data;
    },
    onSuccess: () => {
      invalidateVendors();
      toast.success("Vendor details updated");
      closeDialog();
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.message || "Failed to update vendor"),
  });

  const assignSubscriptionMutation = useMutation({
    mutationFn: async ({
      vendorId,
      packageId,
      durationDays,
    }: {
      vendorId: string;
      packageId: string;
      durationDays: number;
    }) => {
      const response = await api.post("/api/subscriptions/admin/activate", {
        vendorId,
        packageId,
        durationDays,
      });
      return response.data;
    },
    onSuccess: () => {
      invalidateVendors();
      toast.success("Subscription assigned");
      closeDialog();
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.message || "Failed to assign subscription"),
  });

  const deleteVendorMutation = useMutation({
    mutationFn: (vendorId: string) => adminApi.deleteVendor(vendorId),
    onSuccess: () => {
      invalidateVendors();
      toast.success("Vendor deleted");
      closeDialog();
    },
    onError: (err: any) =>
      toast.error(err.response?.data?.message || "Failed to delete vendor"),
  });

  const updateBusinessLocationMutation = useMutation({
    mutationFn: async (payload: {
      businessType: string;
      businessId: string;
      businessName: string;
      latitude: number;
      longitude: number;
      address?: string;
      city?: string;
    }) => {
      const endpoint =
        payload.businessType === "Restaurant"
          ? "/api/restaurants"
          : payload.businessType === "Shop"
            ? "/api/shops"
            : "/api/pharmacies";

      const response = await api.put(
        `${endpoint}/${payload.businessId}/details`,
        {
          name: payload.businessName,
          latitude: payload.latitude,
          longitude: payload.longitude,
          address: payload.address || "",
          city: payload.city || "",
        },
      );
      return response.data;
    },
    onSuccess: () => {
      invalidateVendors();
      toast.success("Business location updated");
      closeLocationDialog();
    },
    onError: (err: any) =>
      toast.error(
        err.response?.data?.message || "Failed to update business location",
      ),
  });

  const closeLocationDialog = () => {
    closeDialog();
    setSelectedLocation(null);
    setEditedBusinessName("");
  };

  const openLocationDialog = (business: FlatBusiness) => {
    setEditedBusinessName(business.name);
    setSelectedLocation(
      business.latitude && business.longitude
        ? { lat: business.latitude, lng: business.longitude }
        : null,
    );
    setDialog({ type: "location", business });
  };

  const handleMapClick = async (lat: number, lng: number) => {
    setSelectedLocation({ lat, lng });
    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
        { headers: { "User-Agent": "TeranGO Admin Panel" } },
      );
      if (response.ok) {
        const data = await response.json();
        setSelectedLocation({
          lat,
          lng,
          address: data.display_name || "",
          city:
            data.address?.city ||
            data.address?.town ||
            data.address?.village ||
            data.address?.county ||
            data.address?.state ||
            "",
        });
        toast.success("Location details fetched");
      }
    } catch {
      toast.warning(
        "Could not fetch the address automatically — you can still save the coordinates.",
      );
    }
  };

  const columns = useMemo(
    () =>
      makeVendorColumns({
        onViewDetails: (vendor) => setDialog({ type: "details", vendor }),
        onEdit: (vendor) => setDialog({ type: "edit", vendor }),
        onManageSubscription: (vendor) =>
          setDialog({ type: "subscription", vendor }),
        onSetLocation: (vendor) => {
          const business = vendor.businesses[0];
          if (business) openLocationDialog(business);
        },
        onToggleStatus: (vendor) => setDialog({ type: "toggleStatus", vendor }),
        onDelete: (vendor) => setDialog({ type: "delete", vendor }),
      }),
    [],
  );

  const openCreate = () => {
    setCreateKey((k) => k + 1); // remount => fresh form
    setDialog({ type: "create" });
  };

  return (
    <TooltipProvider>
      <Header fixed>
        <div className="ms-auto flex items-center space-x-4">
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className="space-y-6">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
                <Store className="h-6 w-6" />
                Vendors
              </h1>
              <p className="text-sm text-muted-foreground">
                {isLoading
                  ? "Loading vendors…"
                  : `${stats.total} vendor${stats.total === 1 ? "" : "s"} · ${stats.businesses} business${stats.businesses === 1 ? "" : "es"}`}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isFetching}
              >
                <RefreshCw
                  className={cn("mr-2 h-4 w-4", isFetching && "animate-spin")}
                />
                Refresh
              </Button>
              <Button size="sm" onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Create Vendor
              </Button>
            </div>
          </div>

          <VendorsStats stats={stats} isLoading={isLoading} />

          {isError ? (
            <Card className="border-destructive/40">
              <CardContent className="flex flex-col items-center gap-3 py-12 text-center">
                <AlertTriangle className="h-10 w-10 text-destructive" />
                <div>
                  <p className="text-lg font-medium">Couldn't load vendors</p>
                  <p className="text-sm text-muted-foreground">
                    {(error as any)?.response?.data?.message ||
                      (error as any)?.message ||
                      "Something went wrong."}
                  </p>
                </div>
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Try again
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Tabs
              value={activeTab}
              onValueChange={(value) =>
                navigate({ search: { tab: value as TabValue } })
              }
            >
              <TabsList>
                <TabsTrigger value="vendors">
                  <Store className="mr-2 h-4 w-4" />
                  Vendors
                </TabsTrigger>
                <TabsTrigger value="locations">
                  <MapPin className="mr-2 h-4 w-4" />
                  Locations
                </TabsTrigger>
              </TabsList>

              <TabsContent value="vendors" className="mt-4">
                <DataTable
                  columns={columns}
                  data={rows}
                  isLoading={isLoading}
                  loadingRowCount={8}
                  pageSize={25}
                  searchPlaceholder="Search vendors, businesses, phone or Wave number…"
                  filters={[
                    {
                      columnId: "status",
                      title: "Status",
                      options: [
                        { label: "Active", value: "Active" },
                        { label: "Inactive", value: "Inactive" },
                      ],
                    },
                    {
                      columnId: "payoutMode",
                      title: "Payout",
                      options: [
                        { label: "Auto", value: "Auto" },
                        { label: "Manual", value: "Manual" },
                      ],
                    },
                    {
                      columnId: "businessTypes",
                      title: "Business type",
                      options: BUSINESS_TYPES.map((type) => ({
                        label: type,
                        value: type,
                      })),
                    },
                  ]}
                  enableExport
                  onExportCSV={(data) => exportVendorsCsv(data as VendorRow[])}
                  emptyState={
                    <VendorsEmptyState
                      hasVendors={rows.length > 0}
                      onCreate={openCreate}
                    />
                  }
                  onRowClick={(vendor) =>
                    setDialog({ type: "details", vendor: vendor as VendorRow })
                  }
                />
              </TabsContent>

              <TabsContent value="locations" className="mt-4">
                <BusinessLocationsPanel
                  vendors={rows}
                  isLoading={isLoading}
                  onSetLocation={openLocationDialog}
                />
              </TabsContent>
            </Tabs>
          )}
        </div>
      </Main>

      <CreateVendorDialog
        key={createKey}
        open={dialog.type === "create"}
        onOpenChange={(open) => (open ? openCreate() : closeDialog())}
      />

      <VendorDetailsDialog
        vendor={dialog.type === "details" ? dialog.vendor.raw : null}
        isOpen={dialog.type === "details"}
        onClose={closeDialog}
      />

      <EditVendorDialog
        vendor={dialog.type === "edit" ? dialog.vendor.raw : null}
        isOpen={dialog.type === "edit"}
        onClose={closeDialog}
        isSaving={updateVendorMutation.isPending}
        onSave={(data: any) => {
          if (dialog.type !== "edit") return;
          updateVendorMutation.mutate({ vendorId: dialog.vendor.id, data });
        }}
      />

      <SubscriptionDialog
        vendor={dialog.type === "subscription" ? dialog.vendor.raw : null}
        packages={subscriptionPackages}
        isOpen={dialog.type === "subscription"}
        onClose={closeDialog}
        isAssigning={assignSubscriptionMutation.isPending}
        onAssign={(packageId: string, durationDays: number) => {
          if (dialog.type !== "subscription") return;
          assignSubscriptionMutation.mutate({
            vendorId: dialog.vendor.id,
            packageId,
            durationDays,
          });
        }}
      />

      <EditBusinessLocationDialog
        business={dialog.type === "location" ? dialog.business : null}
        isOpen={dialog.type === "location"}
        onClose={closeLocationDialog}
        isSaving={updateBusinessLocationMutation.isPending}
        selectedLocation={selectedLocation}
        onMapClick={handleMapClick}
        editedName={editedBusinessName}
        onNameChange={setEditedBusinessName}
        onSave={() => {
          if (dialog.type !== "location" || !selectedLocation) return;
          if (!editedBusinessName.trim()) {
            toast.error("Business name is required");
            return;
          }
          updateBusinessLocationMutation.mutate({
            businessType: dialog.business.type,
            businessId: dialog.business.id,
            businessName: editedBusinessName.trim(),
            latitude: selectedLocation.lat,
            longitude: selectedLocation.lng,
            address: selectedLocation.address,
            city: selectedLocation.city,
          });
        }}
      />

      <ConfirmDialog
        open={dialog.type === "toggleStatus"}
        onOpenChange={(open) => !open && closeDialog()}
        title={
          dialog.type === "toggleStatus" && dialog.vendor.isActive
            ? "Deactivate vendor?"
            : "Activate vendor?"
        }
        desc={
          dialog.type === "toggleStatus"
            ? dialog.vendor.isActive
              ? `${dialog.vendor.name} will stop appearing to customers and cannot accept new orders.`
              : `${dialog.vendor.name} will appear to customers again and can accept orders.`
            : ""
        }
        confirmText={
          dialog.type === "toggleStatus" && dialog.vendor.isActive
            ? "Deactivate"
            : "Activate"
        }
        destructive={dialog.type === "toggleStatus" && dialog.vendor.isActive}
        isLoading={toggleVendorStatusMutation.isPending}
        handleConfirm={() => {
          if (dialog.type !== "toggleStatus") return;
          toggleVendorStatusMutation.mutate({
            vendorId: dialog.vendor.id,
            isActive: !dialog.vendor.isActive,
          });
        }}
      />

      <ConfirmDialog
        open={dialog.type === "delete"}
        onOpenChange={(open) => !open && closeDialog()}
        title="Delete vendor?"
        desc={
          dialog.type === "delete"
            ? `This permanently removes ${dialog.vendor.name} and their ${dialog.vendor.businessCount} business${dialog.vendor.businessCount === 1 ? "" : "es"}. This cannot be undone.`
            : ""
        }
        confirmText="Delete"
        destructive
        isLoading={deleteVendorMutation.isPending}
        handleConfirm={() => {
          if (dialog.type !== "delete") return;
          deleteVendorMutation.mutate(dialog.vendor.id);
        }}
      />
    </TooltipProvider>
  );
}

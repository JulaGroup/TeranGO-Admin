import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  Search,
  MoreHorizontal,
  Eye,
  Store,
  Phone,
  Mail,
  RefreshCw,
  Building2,
  UtensilsCrossed,
  Package,
  Pill,
  CheckCircle,
  Crown,
  Edit,
  Ban,
  CheckCircle2,
  Trash2,
  CreditCard,
  Filter,
  List,
  LayoutGrid,
} from "lucide-react";
import { toast } from "sonner";
import { adminApi, api } from "@/lib/api";
import { Vendor } from "@/lib/types";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { TopNav } from "@/components/layout/top-nav";
import { ProfileDropdown } from "@/components/profile-dropdown";
import { ThemeSwitch } from "@/components/theme-switch";
import { cn } from "@/lib/utils";

const topNav = [
  { title: "Overview", href: "/admin", isActive: false },
  { title: "Vendors", href: "/admin/vendors", isActive: true },
  { title: "Drivers", href: "/admin/drivers", isActive: false },
  { title: "Settings", href: "#", isActive: false },
];

export const Route = createFileRoute("/_authenticated/admin/vendors/")({
  component: VendorsPage,
});

interface VendorWithSubscription extends Vendor {
  subscription?: {
    status: string;
    packageName: string;
    endDate: string;
    isTrial: boolean;
  } | null;
}

function VendorsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [viewMode, setViewMode] = useState("grid"); // 'grid' or 'list'
  const [allVendors, setAllVendors] = useState<VendorWithSubscription[]>([]);
  const [filteredVendors, setFilteredVendors] = useState<
    VendorWithSubscription[]
  >([]);
  const [selectedVendor, setSelectedVendor] =
    useState<VendorWithSubscription | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isSubscriptionOpen, setIsSubscriptionOpen] = useState(false);
  const [isDeactivateOpen, setIsDeactivateOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [subscriptionPackages, setSubscriptionPackages] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalVendors: 0,
    activeVendors: 0,
    totalRestaurants: 0,
    totalShops: 0,
    totalPharmacies: 0,
  });

  const queryClient = useQueryClient();

  const {
    data: vendorsResponse,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["vendors-all"],
    queryFn: async () => {
      const response = await adminApi.getVendors({});
      return response.data.vendors || response.data || [];
    },
  });

  useEffect(() => {
    if (Array.isArray(vendorsResponse)) {
      setAllVendors(vendorsResponse);
      const activeCount = vendorsResponse.filter((v) => v.isActive).length;
      let totalRestaurants = 0;
      let totalShops = 0;
      let totalPharmacies = 0;

      vendorsResponse.forEach((vendor) => {
        totalRestaurants += vendor.restaurants?.length || 0;
        totalShops += vendor.shops?.length || 0;
        totalPharmacies += vendor.pharmacies?.length || 0;
      });

      setStats({
        totalVendors: vendorsResponse.length,
        activeVendors: activeCount,
        totalRestaurants,
        totalShops,
        totalPharmacies,
      });
    }
  }, [vendorsResponse]);

  useEffect(() => {
    let vendors = allVendors;

    if (filterStatus !== "all") {
      vendors = vendors.filter(
        (v) => v.isActive === (filterStatus === "active"),
      );
    }

    if (searchQuery.trim()) {
      const searchLower = searchQuery.toLowerCase();
      vendors = vendors.filter((vendor) => {
        const fullName = vendor.user?.fullName?.toLowerCase() || "";
        const email = vendor.user?.email?.toLowerCase() || "";
        const phone = vendor.user?.phone?.toLowerCase() || "";
        const wave = vendor.waveNumber?.toLowerCase() || "";
        const businessNames = [
          ...(vendor.restaurants?.map((r) => r.name.toLowerCase()) || []),
          ...(vendor.shops?.map((s) => s.name.toLowerCase()) || []),
          ...(vendor.pharmacies?.map((p) => p.name.toLowerCase()) || []),
        ];
        return (
          fullName.includes(searchLower) ||
          email.includes(searchLower) ||
          phone.includes(searchLower) ||
          wave.includes(searchLower) ||
          businessNames.some((name) => name.includes(searchLower))
        );
      });
    }

    setFilteredVendors(vendors);
  }, [searchQuery, allVendors, filterStatus]);

  useEffect(() => {
    const fetchPackages = async () => {
      try {
        const response = await api.get("/api/subscriptions/packages");
        setSubscriptionPackages(response.data.packages || []);
      } catch (error) {
        console.error("Failed to fetch packages:", error);
      }
    };
    fetchPackages();
  }, []);

  const toggleVendorStatusMutation = useMutation({
    mutationFn: async ({
      vendorId,
      isActive,
    }: {
      vendorId: string;
      isActive: boolean;
    }) => {
      const response = await api.patch(
        `/api/admin/vendors/${vendorId}/status`,
        { isActive },
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors-all"] });
      toast.success("Vendor status updated successfully");
      setIsDeactivateOpen(false);
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to update vendor status",
      );
    },
  });

  const updateVendorMutation = useMutation({
    mutationFn: async ({ vendorId, data }: { vendorId: string; data: any }) => {
      const response = await adminApi.updateVendor(vendorId, data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors-all"] });
      toast.success("Vendor details updated successfully");
      setIsEditOpen(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update vendor");
    },
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
      queryClient.invalidateQueries({ queryKey: ["vendors-all"] });
      toast.success("Subscription assigned successfully");
      setIsSubscriptionOpen(false);
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to assign subscription",
      );
    },
  });

  const deleteVendorMutation = useMutation({
    mutationFn: async (vendorId: string) => {
      await adminApi.deleteVendor(vendorId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors-all"] });
      toast.success("Vendor deleted successfully");
      setIsDeleteOpen(false);
      setSelectedVendor(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to delete vendor");
    },
  });

  const handleViewDetails = (vendor: Vendor) => {
    setSelectedVendor(vendor);
    setIsDetailsOpen(true);
  };

  const handleEditVendor = (vendor: VendorWithSubscription) => {
    setSelectedVendor(vendor);
    setIsEditOpen(true);
  };

  const handleManageSubscription = (vendor: VendorWithSubscription) => {
    setSelectedVendor(vendor);
    setIsSubscriptionOpen(true);
  };

  const handleToggleStatus = (vendor: VendorWithSubscription) => {
    setSelectedVendor(vendor);
    setIsDeactivateOpen(true);
  };

  const handleDeleteVendor = (vendor: VendorWithSubscription) => {
    setSelectedVendor(vendor);
    setIsDeleteOpen(true);
  };

  const confirmToggleStatus = () => {
    if (selectedVendor) {
      toggleVendorStatusMutation.mutate({
        vendorId: selectedVendor.id,
        isActive: !selectedVendor.isActive,
      });
    }
  };

  const confirmDelete = () => {
    if (selectedVendor) {
      deleteVendorMutation.mutate(selectedVendor.id);
    }
  };

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <Badge variant="default" className="bg-green-600 hover:bg-green-700">
        Active
      </Badge>
    ) : (
      <Badge variant="destructive">Inactive</Badge>
    );
  };

  const getTotalBusinesses = (vendor: VendorWithSubscription) => {
    return (
      (vendor.restaurants?.length || 0) +
      (vendor.shops?.length || 0) +
      (vendor.pharmacies?.length || 0)
    );
  };

  const getBusinessNames = (vendor: VendorWithSubscription) => {
    return [
      ...(vendor.restaurants?.map((r) => r.name) || []),
      ...(vendor.shops?.map((s) => s.name) || []),
      ...(vendor.pharmacies?.map((p) => p.name) || []),
    ];
  };

  const VendorCard = ({ vendor }: { vendor: VendorWithSubscription }) => (
    <Card className="flex flex-col transition-all hover:shadow-lg">
      <CardHeader className="flex flex-row items-start gap-4 space-y-0">
        <Avatar className="h-12 w-12">
          <AvatarImage
            src={vendor.user?.avatarUrl || ""}
            alt={vendor.user?.fullName}
          />
          <AvatarFallback>
            {vendor.user?.fullName
              ?.split(" ")
              .map((n) => n[0])
              .join("")}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <CardTitle className="text-lg">{vendor.user?.fullName}</CardTitle>
          <CardDescription>{vendor.user?.email}</CardDescription>
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => handleViewDetails(vendor)}>
              <Eye className="mr-2 h-4 w-4" /> View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleEditVendor(vendor)}>
              <Edit className="mr-2 h-4 w-4" /> Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => handleManageSubscription(vendor)}>
              <Crown className="mr-2 h-4 w-4" /> Manage Subscription
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleToggleStatus(vendor)}>
              {vendor.isActive ? (
                <Ban className="mr-2 h-4 w-4" />
              ) : (
                <CheckCircle2 className="mr-2 h-4 w-4" />
              )}
              {vendor.isActive ? "Deactivate" : "Activate"}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-600"
              onClick={() => handleDeleteVendor(vendor)}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </CardHeader>
      <CardContent className="flex-grow space-y-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Phone className="h-4 w-4" />
          <span>{vendor.user?.phone || "No phone"}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <CreditCard className="h-4 w-4" />
          <span>{vendor.waveNumber || "No Wave number"}</span>
        </div>
        <div className="flex items-center gap-2">
          {getStatusBadge(vendor.isActive)}
          {vendor.subscription?.isTrial && (
            <Badge variant="outline" className="border-blue-500 text-blue-500">
              Trial
            </Badge>
          )}
        </div>
        <div className="mt-2 space-y-1">
          {getBusinessNames(vendor)
            .slice(0, 2)
            .map((name) => (
              <div
                key={name}
                className="flex items-center gap-2 text-xs text-muted-foreground"
              >
                <Store className="h-3 w-3 flex-shrink-0" />
                <span className="truncate">{name}</span>
              </div>
            ))}
          {getBusinessNames(vendor).length > 2 && (
            <p className="text-xs text-muted-foreground">
              + {getBusinessNames(vendor).length - 2} more
            </p>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between text-sm text-muted-foreground">
        <span>Businesses</span>
        <div className="flex items-center gap-2">
          <TooltipProvider>
            {vendor.restaurants?.length > 0 && (
              <Tooltip>
                <TooltipTrigger>
                  <UtensilsCrossed className="h-4 w-4" />
                </TooltipTrigger>
                <TooltipContent>
                  {vendor.restaurants.length} Restaurant(s)
                </TooltipContent>
              </Tooltip>
            )}
            {vendor.shops?.length > 0 && (
              <Tooltip>
                <TooltipTrigger>
                  <Package className="h-4 w-4" />
                </TooltipTrigger>
                <TooltipContent>{vendor.shops.length} Shop(s)</TooltipContent>
              </Tooltip>
            )}
            {vendor.pharmacies?.length > 0 && (
              <Tooltip>
                <TooltipTrigger>
                  <Pill className="h-4 w-4" />
                </TooltipTrigger>
                <TooltipContent>
                  {vendor.pharmacies.length} Pharmac(y/ies)
                </TooltipContent>
              </Tooltip>
            )}
          </TooltipProvider>
          <Badge variant="secondary">{getTotalBusinesses(vendor)}</Badge>
        </div>
      </CardFooter>
    </Card>
  );

  return (
    <>
      <Header>
        <TopNav links={topNav} />
        <div className="ms-auto flex items-center space-x-2">
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className="space-y-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Vendors</h1>
              <p className="text-muted-foreground">
                Manage all vendors and their businesses
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetch()}
                disabled={isLoading}
              >
                <RefreshCw
                  className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")}
                />
                Refresh
              </Button>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
            <StatCard
              title="Total Vendors"
              value={stats.totalVendors}
              icon={Building2}
            />
            <StatCard
              title="Active Vendors"
              value={stats.activeVendors}
              icon={CheckCircle}
              iconColor="text-green-600"
            />
            <StatCard
              title="Restaurants"
              value={stats.totalRestaurants}
              icon={UtensilsCrossed}
              iconColor="text-orange-600"
            />
            <StatCard
              title="Shops"
              value={stats.totalShops}
              icon={Package}
              iconColor="text-blue-600"
            />
            <StatCard
              title="Pharmacies"
              value={stats.totalPharmacies}
              icon={Pill}
              iconColor="text-red-600"
            />
          </div>

          <Card>
            <CardHeader>
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="relative flex-1">
                  <Search className="text-muted-foreground absolute top-3 left-3 h-4 w-4" />
                  <Input
                    placeholder="Search by name, email, phone, business..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="outline" className="w-full md:w-auto">
                        <Filter className="mr-2 h-4 w-4" />
                        Filter:{" "}
                        {filterStatus.charAt(0).toUpperCase() +
                          filterStatus.slice(1)}
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => setFilterStatus("all")}>
                        All
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setFilterStatus("active")}
                      >
                        Active
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => setFilterStatus("inactive")}
                      >
                        Inactive
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <div className="flex items-center rounded-md bg-secondary p-1">
                    <Button
                      variant={viewMode === "grid" ? "primary" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode("grid")}
                    >
                      <LayoutGrid className="h-4 w-4" />
                    </Button>
                    <Button
                      variant={viewMode === "list" ? "primary" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode("list")}
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex h-64 items-center justify-center">
                  <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : viewMode === "grid" ? (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  {filteredVendors.map((vendor) => (
                    <VendorCard key={vendor.id} vendor={vendor} />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Businesses</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Subscription</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredVendors.map((vendor) => (
                      <TableRow key={vendor.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage src={vendor.user?.avatarUrl || ""} />
                              <AvatarFallback>
                                {vendor.user?.fullName
                                  ?.split(" ")
                                  .map((n) => n[0])
                                  .join("")}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <div className="font-medium">
                                {vendor.user?.fullName}
                              </div>
                              <div className="text-sm text-muted-foreground">
                                {vendor.id.slice(0, 8)}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div>{vendor.user?.phone}</div>
                          <div className="text-sm text-muted-foreground">
                            {vendor.user?.email}
                          </div>
                        </TableCell>
                        <TableCell>{getTotalBusinesses(vendor)}</TableCell>
                        <TableCell>{getStatusBadge(vendor.isActive)}</TableCell>
                        <TableCell>
                          {vendor.subscription ? (
                            <div className="flex flex-col">
                              <span
                                className={cn(
                                  "font-semibold",
                                  vendor.subscription.status === "ACTIVE"
                                    ? "text-green-600"
                                    : "text-red-600",
                                )}
                              >
                                {vendor.subscription.packageName}
                              </span>
                              <span className="text-xs text-muted-foreground">
                                Ends:{" "}
                                {new Date(
                                  vendor.subscription.endDate,
                                ).toLocaleDateString()}
                              </span>
                            </div>
                          ) : (
                            <Badge variant="outline">No Subscription</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => handleViewDetails(vendor)}
                              >
                                <Eye className="mr-2 h-4 w-4" /> View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleEditVendor(vendor)}
                              >
                                <Edit className="mr-2 h-4 w-4" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleManageSubscription(vendor)}
                              >
                                <Crown className="mr-2 h-4 w-4" /> Manage
                                Subscription
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleToggleStatus(vendor)}
                              >
                                {vendor.isActive ? (
                                  <Ban className="mr-2 h-4 w-4" />
                                ) : (
                                  <CheckCircle2 className="mr-2 h-4 w-4" />
                                )}
                                {vendor.isActive ? "Deactivate" : "Activate"}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-red-600"
                                onClick={() => handleDeleteVendor(vendor)}
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
              {filteredVendors.length === 0 && !isLoading && (
                <div className="py-16 text-center text-muted-foreground">
                  No vendors found.
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </Main>

      {/* Dialogs and Modals */}
      <VendorDetailsDialog
        vendor={selectedVendor}
        isOpen={isDetailsOpen}
        onClose={() => setIsDetailsOpen(false)}
      />
      <EditVendorDialog
        vendor={selectedVendor}
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSave={(data) =>
          selectedVendor &&
          updateVendorMutation.mutate({ vendorId: selectedVendor.id, data })
        }
        isSaving={updateVendorMutation.isPending}
      />
      <SubscriptionDialog
        vendor={selectedVendor}
        packages={subscriptionPackages}
        isOpen={isSubscriptionOpen}
        onClose={() => setIsSubscriptionOpen(false)}
        onAssign={(data) =>
          selectedVendor &&
          assignSubscriptionMutation.mutate({
            vendorId: selectedVendor.id,
            ...data,
          })
        }
        isAssigning={assignSubscriptionMutation.isPending}
      />
      <DeactivateVendorDialog
        isOpen={isDeactivateOpen}
        onClose={() => setIsDeactivateOpen(false)}
        onConfirm={confirmToggleStatus}
        vendorName={selectedVendor?.user?.fullName || "this vendor"}
        isActive={selectedVendor?.isActive || false}
      />
      <DeleteVendorDialog
        isOpen={isDeleteOpen}
        onClose={() => setIsDeleteOpen(false)}
        onConfirm={confirmDelete}
        vendorName={selectedVendor?.user?.fullName || "this vendor"}
      />
    </>
  );
}

const StatCard = ({ title, value, icon: Icon, iconColor }: any) => (
  <Card>
    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
      <CardTitle className="text-sm font-medium">{title}</CardTitle>
      <Icon className={cn("h-4 w-4 text-muted-foreground", iconColor)} />
    </CardHeader>
    <CardContent>
      <div className="text-2xl font-bold">{value}</div>
    </CardContent>
  </Card>
);

function VendorDetailsDialog({ vendor, isOpen, onClose }: any) {
  if (!vendor) return null;

  const allBusinesses = [
    ...(vendor.restaurants?.map((r: any) => ({ ...r, type: "Restaurant" })) ||
      []),
    ...(vendor.shops?.map((s: any) => ({ ...s, type: "Shop" })) || []),
    ...(vendor.pharmacies?.map((p: any) => ({ ...p, type: "Pharmacy" })) || []),
  ];

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
                src={vendor.user?.avatarUrl || ""}
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
                  <Badge className="bg-green-600 hover:bg-green-700">
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
                        className="border-blue-500 text-blue-500"
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
                    <Badge variant="secondary">
                      {business.isActive ? "Open" : "Closed"}
                    </Badge>
                  </div>
                ))
              ) : (
                <p className="text-center text-sm text-muted-foreground">
                  This vendor has not created any businesses yet.
                </p>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function EditVendorDialog({ vendor, isOpen, onClose, onSave, isSaving }: any) {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    waveNumber: "",
  });

  useEffect(() => {
    if (vendor) {
      setFormData({
        fullName: vendor.user?.fullName || "",
        email: vendor.user?.email || "",
        phone: vendor.user?.phone || "",
        waveNumber: vendor.waveNumber || "",
      });
    }
  }, [vendor]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(formData);
  };

  if (!vendor) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit {vendor.user?.fullName}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <Label htmlFor="fullName">Full Name</Label>
            <Input
              id="fullName"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
            />
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
            />
          </div>
          <div>
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
            />
          </div>
          <div>
            <Label htmlFor="waveNumber">Wave Number</Label>
            <Input
              id="waveNumber"
              name="waveNumber"
              value={formData.waveNumber}
              onChange={handleChange}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Changes"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function SubscriptionDialog({
  vendor,
  packages,
  isOpen,
  onClose,
  onAssign,
  isAssigning,
}: any) {
  const [selectedPackage, setSelectedPackage] = useState("");
  const [duration, setDuration] = useState(30);

  const handleSubmit = () => {
    if (selectedPackage) {
      onAssign({ packageId: selectedPackage, durationDays: duration });
    }
  };

  if (!vendor) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage Subscription</DialogTitle>
          <DialogDescription>For {vendor.user?.fullName}</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <Select onValueChange={setSelectedPackage} value={selectedPackage}>
            <SelectTrigger>
              <SelectValue placeholder="Select a package" />
            </SelectTrigger>
            <SelectContent>
              {packages.map((p: any) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name} - D{p.price} / {p.durationDays} days
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Input
            type="number"
            value={duration}
            onChange={(e) => setDuration(Number(e.target.value))}
            placeholder="Duration in days"
          />
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={isAssigning || !selectedPackage}
          >
            {isAssigning ? "Assigning..." : "Assign Subscription"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DeactivateVendorDialog({
  isOpen,
  onClose,
  onConfirm,
  vendorName,
  isActive,
}: any) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Are you sure you want to {isActive ? "deactivate" : "activate"}{" "}
            {vendorName}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This will {isActive ? "prevent" : "allow"} the vendor from receiving
            orders.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={onConfirm}>Confirm</AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

function DeleteVendorDialog({ isOpen, onClose, onConfirm, vendorName }: any) {
  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            Are you sure you want to delete {vendorName}?
          </AlertDialogTitle>
          <AlertDialogDescription>
            This action cannot be undone. This will permanently delete the
            vendor and all associated data.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className="bg-red-600 hover:bg-red-700"
          >
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

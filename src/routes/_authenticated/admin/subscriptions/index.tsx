import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { 
  Search, 
  TrendingUp, 
  Users, 
  DollarSign, 
  Package,
  Crown,
  Gift,
  Filter,
  RefreshCw,
  CheckCircle,
  Edit,
  Plus,
  Trash2,
  XCircle,
  AlertTriangle,
  Eye,
} from "lucide-react";
import { api } from "@/lib/api";
import { useState } from "react";
import { toast } from "sonner";

interface VendorSubscription {
  id: string;
  vendorId: string;
  status: string;
  startDate: string;
  endDate: string;
  isTrial: boolean;
  autoRenew: boolean;
  vendor: {
    id: string;
    businessName: string;
    email: string;
  };
  package: {
    name: string;
    displayName: string;
    price: number;
    currency: string;
  };
}

interface SubscriptionPackage {
  id: string;
  name: string;
  displayName: string;
  price: number;
  currency: string;
  durationDays: number;
  maxProducts: number | null;
  priorityListing: boolean;
  featuredBadge: boolean;
  topPlacement: boolean;
  supportLevel: string;
  dedicatedManager: boolean;
  socialPostsPerMonth: number;
  storiesPerWeek: number;
  promoVideosPerMonth: number;
  bannerAdsPerMonth: number;
  deliveryFeeDiscount: number;
  customerFeeDiscount: boolean;
  advancedAnalytics: boolean;
  fasterPayouts: boolean;
  earlyFeatureAccess: boolean;
  displayOrder: number;
  isActive: boolean;
}

type PackageDraft = {
  name: string;
  displayName: string;
  price: string;
  currency: string;
  durationDays: string;
  maxProducts: string;
  supportLevel: string;
  displayOrder: string;
  isActive: boolean;
  priorityListing: boolean;
  featuredBadge: boolean;
  topPlacement: boolean;
  dedicatedManager: boolean;
  customerFeeDiscount: boolean;
  advancedAnalytics: boolean;
  fasterPayouts: boolean;
  earlyFeatureAccess: boolean;
};

const emptyPackageDraft: PackageDraft = {
  name: "",
  displayName: "",
  price: "",
  currency: "GMD",
  durationDays: "30",
  maxProducts: "",
  supportLevel: "Basic",
  displayOrder: "0",
  isActive: true,
  priorityListing: false,
  featuredBadge: false,
  topPlacement: false,
  dedicatedManager: false,
  customerFeeDiscount: false,
  advancedAnalytics: false,
  fasterPayouts: false,
  earlyFeatureAccess: false,
};

export const Route = createFileRoute("/_authenticated/admin/subscriptions/")({
  component: AdminSubscriptionsPage,
});

function AdminSubscriptionsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedSubscription, setSelectedSubscription] = useState<VendorSubscription | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [packageDialogOpen, setPackageDialogOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<SubscriptionPackage | null>(null);
  const [packageDraft, setPackageDraft] = useState<PackageDraft>(emptyPackageDraft);
  const queryClient = useQueryClient();

  const { data: packagesData, isLoading: loadingPackages } = useQuery({
    queryKey: ["admin-subscription-packages"],
    queryFn: async () => {
      const response = await api.get(`/api/subscriptions/admin/packages`);
      return response.data.packages as SubscriptionPackage[];
    },
  });

  const createPackageMutation = useMutation({
    mutationFn: async (draft: PackageDraft) => {
      const payload = {
        name: draft.name.trim(),
        displayName: draft.displayName.trim(),
        supportLevel: draft.supportLevel,
        currency: draft.currency.trim() || "GMD",
        price: Number(draft.price),
        durationDays: Number(draft.durationDays),
        displayOrder: Number(draft.displayOrder),
        maxProducts: draft.maxProducts.trim() === "" ? null : Number(draft.maxProducts),
        isActive: draft.isActive,
        priorityListing: draft.priorityListing,
        featuredBadge: draft.featuredBadge,
        topPlacement: draft.topPlacement,
        dedicatedManager: draft.dedicatedManager,
        customerFeeDiscount: draft.customerFeeDiscount,
        advancedAnalytics: draft.advancedAnalytics,
        fasterPayouts: draft.fasterPayouts,
        earlyFeatureAccess: draft.earlyFeatureAccess,
      };
      const response = await api.post(`/api/subscriptions/admin/packages`, payload);
      return response.data.package as SubscriptionPackage;
    },
    onSuccess: () => {
      toast.success("Package created");
      queryClient.invalidateQueries({ queryKey: ["admin-subscription-packages"] });
      setPackageDialogOpen(false);
      setEditingPackage(null);
      setPackageDraft(emptyPackageDraft);
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || "Failed to create package");
    },
  });

  const updatePackageMutation = useMutation({
    mutationFn: async ({ id, draft }: { id: string; draft: PackageDraft }) => {
      const payload: Record<string, unknown> = {
        name: draft.name.trim(),
        displayName: draft.displayName.trim(),
        supportLevel: draft.supportLevel,
        currency: draft.currency.trim() || "GMD",
        price: draft.price === "" ? undefined : Number(draft.price),
        durationDays: draft.durationDays === "" ? undefined : Number(draft.durationDays),
        displayOrder: draft.displayOrder === "" ? undefined : Number(draft.displayOrder),
        maxProducts: draft.maxProducts.trim() === "" ? null : Number(draft.maxProducts),
        isActive: draft.isActive,
        priorityListing: draft.priorityListing,
        featuredBadge: draft.featuredBadge,
        topPlacement: draft.topPlacement,
        dedicatedManager: draft.dedicatedManager,
        customerFeeDiscount: draft.customerFeeDiscount,
        advancedAnalytics: draft.advancedAnalytics,
        fasterPayouts: draft.fasterPayouts,
        earlyFeatureAccess: draft.earlyFeatureAccess,
      };
      const response = await api.patch(`/api/subscriptions/admin/packages/${id}`, payload);
      return response.data.package as SubscriptionPackage;
    },
    onSuccess: () => {
      toast.success("Package updated");
      queryClient.invalidateQueries({ queryKey: ["admin-subscription-packages"] });
      setPackageDialogOpen(false);
      setEditingPackage(null);
      setPackageDraft(emptyPackageDraft);
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || "Failed to update package");
    },
  });

  const deletePackageMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.delete(`/api/subscriptions/admin/packages/${id}`);
      return response.data;
    },
    onSuccess: (data) => {
      const archived = Boolean(data?.result?.archived);
      toast.success(archived ? "Package disabled" : "Package deleted");
      queryClient.invalidateQueries({ queryKey: ["admin-subscription-packages"] });
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || "Failed to delete package");
    },
  });

  const forceTrialAllMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post(`/api/subscriptions/admin/force-trial-all`, { days: 30 });
      return response.data;
    },
    onSuccess: (data) => {
      const updatedCount = data?.result?.vendorsUpdated ?? 0;
      toast.success(`Forced trial for ${updatedCount} vendors`);
      queryClient.invalidateQueries({ queryKey: ["admin-subscriptions"] });
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || "Failed to force trials");
    },
  });

  const openCreatePackage = () => {
    setEditingPackage(null);
    setPackageDraft(emptyPackageDraft);
    setPackageDialogOpen(true);
  };

  const openEditPackage = (pkg: SubscriptionPackage) => {
    setEditingPackage(pkg);
    setPackageDraft({
      name: pkg.name,
      displayName: pkg.displayName,
      price: String(pkg.price ?? ""),
      currency: pkg.currency || "GMD",
      durationDays: String(pkg.durationDays ?? 30),
      maxProducts: pkg.maxProducts === null ? "" : String(pkg.maxProducts),
      supportLevel: pkg.supportLevel || "Basic",
      displayOrder: String(pkg.displayOrder ?? 0),
      isActive: Boolean(pkg.isActive),
      priorityListing: Boolean(pkg.priorityListing),
      featuredBadge: Boolean(pkg.featuredBadge),
      topPlacement: Boolean(pkg.topPlacement),
      dedicatedManager: Boolean(pkg.dedicatedManager),
      customerFeeDiscount: Boolean(pkg.customerFeeDiscount),
      advancedAnalytics: Boolean(pkg.advancedAnalytics),
      fasterPayouts: Boolean(pkg.fasterPayouts),
      earlyFeatureAccess: Boolean(pkg.earlyFeatureAccess),
    });
    setPackageDialogOpen(true);
  };

  const { data: subscriptionsData, isLoading, refetch } = useQuery({
    queryKey: ["admin-subscriptions"],
    queryFn: async () => {
      const response = await api.get(`/api/subscriptions/admin/all`);
      return response.data.subscriptions as VendorSubscription[];
    },
  });

  const stats = {
    total: subscriptionsData?.length || 0,
    active: subscriptionsData?.filter((s) => s.status === "ACTIVE").length || 0,
    trial: subscriptionsData?.filter((s) => s.isTrial && (s.status === "ACTIVE" || s.status === "TRIAL")).length || 0,
    expired: subscriptionsData?.filter((s) => s.status === "EXPIRED").length || 0,
    revenue: subscriptionsData
      ?.filter((s) => s.status === "ACTIVE" && !s.isTrial)
      .reduce((sum, s) => sum + s.package.price, 0) || 0,
  };

  const filteredSubscriptions = subscriptionsData?.filter((sub) => {
    const matchesSearch = 
      sub.vendor.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.vendor.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      sub.package.displayName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || sub.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getDaysRemaining = (endDate: string) => {
    const end = new Date(endDate);
    const now = new Date();
    const diff = end.getTime() - now.getTime();
    return Math.ceil(diff / (1000 * 60 * 60 * 24));
  };

  const getPackageIcon = (name: string) => {
    switch (name) {
      case 'Bantaba':
        return Package;
      case 'Kaira':
        return TrendingUp;
      case 'Toubab':
        return Crown;
      default:
        return Package;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading subscriptions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Subscription Management</h1>
          <p className="text-muted-foreground">
            Monitor and manage all vendor subscriptions
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={() => forceTrialAllMutation.mutate()}
            variant="outline"
            disabled={forceTrialAllMutation.isPending}
          >
            <Gift className="h-4 w-4 mr-2" />
            Force Trial For All
          </Button>
          <Button onClick={() => refetch()} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Subscription Packages */}
      <Card>
        <CardHeader>
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <CardTitle>Subscription Packages</CardTitle>
              <CardDescription>Manage packages shown to vendors</CardDescription>
            </div>
            <Dialog open={packageDialogOpen} onOpenChange={setPackageDialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={openCreatePackage}>
                  <Plus className="h-4 w-4 mr-2" />
                  New Package
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>
                    {editingPackage ? "Edit Package" : "Create Package"}
                  </DialogTitle>
                  <DialogDescription>
                    Configure pricing, limits, and visibility.
                  </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="pkg-name">Name</Label>
                    <Input
                      id="pkg-name"
                      value={packageDraft.name}
                      onChange={(e) =>
                        setPackageDraft((p) => ({ ...p, name: e.target.value }))
                      }
                      placeholder="Kaira"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pkg-display">Display Name</Label>
                    <Input
                      id="pkg-display"
                      value={packageDraft.displayName}
                      onChange={(e) =>
                        setPackageDraft((p) => ({ ...p, displayName: e.target.value }))
                      }
                      placeholder="Kaira Plan"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pkg-price">Price</Label>
                    <Input
                      id="pkg-price"
                      inputMode="decimal"
                      value={packageDraft.price}
                      onChange={(e) =>
                        setPackageDraft((p) => ({ ...p, price: e.target.value }))
                      }
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pkg-currency">Currency</Label>
                    <Input
                      id="pkg-currency"
                      value={packageDraft.currency}
                      onChange={(e) =>
                        setPackageDraft((p) => ({ ...p, currency: e.target.value }))
                      }
                      placeholder="GMD"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pkg-duration">Duration (days)</Label>
                    <Input
                      id="pkg-duration"
                      inputMode="numeric"
                      value={packageDraft.durationDays}
                      onChange={(e) =>
                        setPackageDraft((p) => ({ ...p, durationDays: e.target.value }))
                      }
                      placeholder="30"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pkg-max-products">Max Products (blank = unlimited)</Label>
                    <Input
                      id="pkg-max-products"
                      inputMode="numeric"
                      value={packageDraft.maxProducts}
                      onChange={(e) =>
                        setPackageDraft((p) => ({ ...p, maxProducts: e.target.value }))
                      }
                      placeholder=""
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="pkg-support">Support Level</Label>
                    <Input
                      id="pkg-support"
                      value={packageDraft.supportLevel}
                      onChange={(e) =>
                        setPackageDraft((p) => ({ ...p, supportLevel: e.target.value }))
                      }
                      placeholder="Basic"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="pkg-order">Display Order</Label>
                    <Input
                      id="pkg-order"
                      inputMode="numeric"
                      value={packageDraft.displayOrder}
                      onChange={(e) =>
                        setPackageDraft((p) => ({ ...p, displayOrder: e.target.value }))
                      }
                      placeholder="0"
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-md border p-3 md:col-span-2">
                    <div>
                      <p className="text-sm font-medium">Active</p>
                      <p className="text-xs text-muted-foreground">Visible to vendors</p>
                    </div>
                    <Switch
                      checked={packageDraft.isActive}
                      onCheckedChange={(checked) =>
                        setPackageDraft((p) => ({ ...p, isActive: checked }))
                      }
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:col-span-2">
                    <div className="flex items-center justify-between rounded-md border p-3">
                      <div>
                        <p className="text-sm font-medium">Priority Listing</p>
                        <p className="text-xs text-muted-foreground">Boost in results</p>
                      </div>
                      <Switch
                        checked={packageDraft.priorityListing}
                        onCheckedChange={(checked) =>
                          setPackageDraft((p) => ({ ...p, priorityListing: checked }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between rounded-md border p-3">
                      <div>
                        <p className="text-sm font-medium">Featured Badge</p>
                        <p className="text-xs text-muted-foreground">Show badge</p>
                      </div>
                      <Switch
                        checked={packageDraft.featuredBadge}
                        onCheckedChange={(checked) =>
                          setPackageDraft((p) => ({ ...p, featuredBadge: checked }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between rounded-md border p-3">
                      <div>
                        <p className="text-sm font-medium">Top Placement</p>
                        <p className="text-xs text-muted-foreground">Pin near top</p>
                      </div>
                      <Switch
                        checked={packageDraft.topPlacement}
                        onCheckedChange={(checked) =>
                          setPackageDraft((p) => ({ ...p, topPlacement: checked }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between rounded-md border p-3">
                      <div>
                        <p className="text-sm font-medium">Dedicated Manager</p>
                        <p className="text-xs text-muted-foreground">Account support</p>
                      </div>
                      <Switch
                        checked={packageDraft.dedicatedManager}
                        onCheckedChange={(checked) =>
                          setPackageDraft((p) => ({ ...p, dedicatedManager: checked }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between rounded-md border p-3">
                      <div>
                        <p className="text-sm font-medium">Advanced Analytics</p>
                        <p className="text-xs text-muted-foreground">Insights</p>
                      </div>
                      <Switch
                        checked={packageDraft.advancedAnalytics}
                        onCheckedChange={(checked) =>
                          setPackageDraft((p) => ({ ...p, advancedAnalytics: checked }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between rounded-md border p-3">
                      <div>
                        <p className="text-sm font-medium">Faster Payouts</p>
                        <p className="text-xs text-muted-foreground">Speed up payouts</p>
                      </div>
                      <Switch
                        checked={packageDraft.fasterPayouts}
                        onCheckedChange={(checked) =>
                          setPackageDraft((p) => ({ ...p, fasterPayouts: checked }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between rounded-md border p-3">
                      <div>
                        <p className="text-sm font-medium">Early Feature Access</p>
                        <p className="text-xs text-muted-foreground">Beta features</p>
                      </div>
                      <Switch
                        checked={packageDraft.earlyFeatureAccess}
                        onCheckedChange={(checked) =>
                          setPackageDraft((p) => ({ ...p, earlyFeatureAccess: checked }))
                        }
                      />
                    </div>
                    <div className="flex items-center justify-between rounded-md border p-3">
                      <div>
                        <p className="text-sm font-medium">Customer Fee Discount</p>
                        <p className="text-xs text-muted-foreground">Reduce customer fees</p>
                      </div>
                      <Switch
                        checked={packageDraft.customerFeeDiscount}
                        onCheckedChange={(checked) =>
                          setPackageDraft((p) => ({ ...p, customerFeeDiscount: checked }))
                        }
                      />
                    </div>
                  </div>
                </div>

                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => {
                      setPackageDialogOpen(false);
                      setEditingPackage(null);
                      setPackageDraft(emptyPackageDraft);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={() => {
                      const name = packageDraft.name.trim();
                      const displayName = packageDraft.displayName.trim();
                      const price = Number(packageDraft.price);
                      const durationDays = Number(packageDraft.durationDays);
                      const displayOrder = Number(packageDraft.displayOrder);

                      if (!name || !displayName) {
                        toast.error("Name and display name are required");
                        return;
                      }
                      if (!Number.isFinite(price)) {
                        toast.error("Price must be a valid number");
                        return;
                      }
                      if (!Number.isFinite(durationDays) || durationDays <= 0) {
                        toast.error("Duration must be a valid number of days");
                        return;
                      }
                      if (!Number.isFinite(displayOrder)) {
                        toast.error("Display order must be a number");
                        return;
                      }

                      if (editingPackage) {
                        updatePackageMutation.mutate({
                          id: editingPackage.id,
                          draft: packageDraft,
                        });
                      } else {
                        createPackageMutation.mutate(packageDraft);
                      }
                    }}
                    disabled={
                      createPackageMutation.isPending ||
                      updatePackageMutation.isPending
                    }
                  >
                    {editingPackage ? "Save Changes" : "Create Package"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        <CardContent>
          {loadingPackages ? (
            <div className="text-muted-foreground">Loading packages...</div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Package</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Duration</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {packagesData && packagesData.length > 0 ? (
                    packagesData.map((pkg) => (
                      <TableRow key={pkg.id} className="hover:bg-muted/50">
                        <TableCell className="text-muted-foreground">
                          {pkg.displayOrder}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">{pkg.displayName}</div>
                            <div className="text-sm text-muted-foreground">{pkg.name}</div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {pkg.isActive ? (
                            <Badge variant="default" className="bg-green-100 text-green-700">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="outline">Inactive</Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {pkg.durationDays} days
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {pkg.price === 0 ? "Free" : `${pkg.currency} ${pkg.price.toLocaleString()}`}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => openEditPackage(pkg)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => deletePackageMutation.mutate(pkg.id)}
                              disabled={deletePackageMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10">
                        <div className="text-muted-foreground">
                          <Package className="h-10 w-10 mx-auto mb-3 opacity-20" />
                          <p>No packages found</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="hover:shadow-lg transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Subscriptions
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">
              All active and inactive
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow border-green-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Subscriptions
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
            <p className="text-xs text-muted-foreground mt-1">
              Currently paying
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow border-blue-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Free Trials
            </CardTitle>
            <Gift className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.trial}</div>
            <p className="text-xs text-muted-foreground mt-1">
              30-day trials
            </p>
          </CardContent>
        </Card>

        <Card className="hover:shadow-lg transition-shadow border-purple-200">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Monthly Revenue
            </CardTitle>
            <DollarSign className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              GMD {stats.revenue.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              From paid plans
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
            <div className="flex items-center gap-2 flex-1 max-w-md">
              <Search className="h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search by vendor, email, or package..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="flex-1"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="ACTIVE">Active</SelectItem>
                  <SelectItem value="TRIAL">Trial</SelectItem>
                  <SelectItem value="EXPIRED">Expired</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Package</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Days Left</TableHead>
                  <TableHead>End Date</TableHead>
                  <TableHead className="text-right">Price</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSubscriptions && filteredSubscriptions.length > 0 ? (
                  filteredSubscriptions.map((sub) => {
                    const PackageIcon = getPackageIcon(sub.package.name);
                    const daysLeft = getDaysRemaining(sub.endDate);
                    const isExpiringSoon = daysLeft < 7 && daysLeft > 0;
                    
                    return (
                      <TableRow key={sub.id} className="hover:bg-muted/50">
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">{sub.vendor.businessName}</div>
                            <div className="text-sm text-muted-foreground">
                              {sub.vendor.email}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <PackageIcon className="h-4 w-4 text-muted-foreground" />
                            <Badge variant="outline">{sub.package.displayName}</Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              sub.status === "ACTIVE"
                                ? "default"
                                : sub.status === "TRIAL"
                                ? "secondary"
                                : sub.status === "EXPIRED"
                                ? "destructive"
                                : "outline"
                            }
                            className="flex items-center gap-1 w-fit"
                          >
                            {sub.status === "ACTIVE" && <CheckCircle className="h-3 w-3" />}
                            {sub.status === "EXPIRED" && <XCircle className="h-3 w-3" />}
                            {sub.status === "TRIAL" && <Gift className="h-3 w-3" />}
                            {sub.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {sub.isTrial ? (
                            <Badge variant="secondary" className="bg-blue-100 text-blue-700">
                              Trial
                            </Badge>
                          ) : (
                            <Badge variant="default" className="bg-green-100 text-green-700">
                              Paid
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {isExpiringSoon ? (
                            <div className="flex items-center gap-1 text-orange-600">
                              <AlertTriangle className="h-4 w-4" />
                              <span className="font-medium">{daysLeft} days</span>
                            </div>
                          ) : daysLeft > 0 ? (
                            <span className="text-muted-foreground">{daysLeft} days</span>
                          ) : (
                            <span className="text-red-600 font-medium">Expired</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {new Date(sub.endDate).toLocaleDateString()}
                          </span>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {sub.isTrial ? (
                            <span className="text-muted-foreground">Free</span>
                          ) : (
                            `${sub.package.currency} ${sub.package.price.toLocaleString()}`
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedSubscription(sub);
                              setShowDetailsDialog(true);
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={8} className="text-center py-12">
                      <div className="text-muted-foreground">
                        {searchQuery || statusFilter !== "all" ? (
                          <>
                            <Search className="h-12 w-12 mx-auto mb-4 opacity-20" />
                            <p>No subscriptions found matching your criteria</p>
                          </>
                        ) : (
                          <>
                            <Package className="h-12 w-12 mx-auto mb-4 opacity-20" />
                            <p>No subscriptions found</p>
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Subscription Details Dialog */}
      <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
        <DialogContent className="max-w-2xl">
          {selectedSubscription && (
            <>
              <DialogHeader>
                <DialogTitle className="text-2xl">Subscription Details</DialogTitle>
                <DialogDescription>
                  Complete information about this vendor's subscription
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-6">
                {/* Vendor Info */}
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">Vendor Information</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Business Name</p>
                      <p className="font-medium">{selectedSubscription.vendor.businessName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Email</p>
                      <p className="font-medium">{selectedSubscription.vendor.email}</p>
                    </div>
                  </div>
                </div>

                {/* Package Info */}
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">Package Details</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Package</p>
                      <p className="font-medium">{selectedSubscription.package.displayName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Price</p>
                      <p className="font-medium">
                        {selectedSubscription.package.currency} {selectedSubscription.package.price}/month
                      </p>
                    </div>
                  </div>
                </div>

                {/* Subscription Info */}
                <div className="space-y-2">
                  <h3 className="font-semibold text-lg">Subscription Status</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Status</p>
                      <Badge variant={selectedSubscription.status === "ACTIVE" ? "default" : "secondary"}>
                        {selectedSubscription.status}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Type</p>
                      <Badge variant={selectedSubscription.isTrial ? "secondary" : "default"}>
                        {selectedSubscription.isTrial ? "Trial" : "Paid"}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Start Date</p>
                      <p className="font-medium">
                        {new Date(selectedSubscription.startDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">End Date</p>
                      <p className="font-medium">
                        {new Date(selectedSubscription.endDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Days Remaining</p>
                      <p className="font-medium text-lg">
                        {getDaysRemaining(selectedSubscription.endDate)} days
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Auto Renew</p>
                      <p className="font-medium">
                        {selectedSubscription.autoRenew ? "Yes" : "No"}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

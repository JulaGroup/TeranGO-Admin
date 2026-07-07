import { useEffect, useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  AlertCircle,
  Building2,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Crown,
  DollarSign,
  Edit,
  Image as ImageIcon,
  Loader2,
  Mail,
  MapPin,
  Package,
  Phone,
  Pill,
  Plus,
  Store,
  Trash2,
  UtensilsCrossed,
  Wallet,
} from "lucide-react";
import { toast } from "sonner";
import { adminApi, api } from "@/lib/api";
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
} from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { StatCard, StatsGrid } from "@/components/ui/stat-card";
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { TopNav } from "@/components/layout/top-nav";
import { ProfileDropdown } from "@/components/profile-dropdown";
import { ThemeSwitch } from "@/components/theme-switch";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/vendors/$vendorId")(
  {
    component: VendorDetailPage,
  },
);

const topNav = [
  { title: "Overview", href: "/admin", isActive: false },
  { title: "Vendors", href: "/admin/vendors", isActive: true },
  { title: "Drivers", href: "/admin/drivers", isActive: false },
];

// ─── Types ────────────────────────────────────────────────────────────────────

type BusinessType = "RESTAURANT" | "SHOP" | "PHARMACY";

interface BusinessRow {
  id: string;
  name: string;
  description?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  imageUrl?: string | null;
  isActive?: boolean;
  latitude?: number | null;
  longitude?: number | null;
}

interface BusinessWithType extends BusinessRow {
  type: BusinessType;
}

interface VendorDetail {
  id: string;
  isActive: boolean;
  waveNumber?: string | null;
  businessLicense?: string | null;
  user?: {
    fullName?: string;
    phone?: string;
    email?: string;
    avatarUrl?: string;
    createdAt?: string;
  };
  restaurants?: BusinessRow[];
  shops?: BusinessRow[];
  pharmacies?: BusinessRow[];
  subscription?: {
    status: string;
    packageName: string;
    endDate: string;
    isTrial: boolean;
  } | null;
}

interface CatalogItem {
  id: string;
  name: string;
  price: number;
  imageUrl?: string | null;
  isAvailable?: boolean;
  description?: string | null;
  dosage?: string | null;
}

interface EarningsSummary {
  allTime: { total: number; orders: number };
  today: { total: number; orders: number };
  thisWeek: { total: number; orders: number };
  thisMonth: { total: number; orders: number };
  pendingUnsettled: { total: number; count: number };
  totalOrders: number;
  pendingSettlementRequest: {
    id: string;
    amount: number;
    requestedAt: string;
  } | null;
  lastSettlement: {
    id: string;
    amount: number;
    status: string;
    paidAt: string | null;
  } | null;
}

interface EarningRow {
  id: string;
  vendorShare: number;
  totalAmount: number;
  status: string;
  createdAt: string;
  order?: {
    id: string;
    createdAt: string;
    paymentStatus?: string | null;
    paymentMethod?: string | null;
  } | null;
}

interface EarningsHistory {
  earnings: EarningRow[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatGMD(amount: number) {
  return `D${(amount ?? 0).toFixed(2)}`;
}

function formatDate(dateStr?: string | null) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

const businessTypeMeta: Record<
  BusinessType,
  { label: string; itemLabel: string; icon: typeof Store; color: string }
> = {
  RESTAURANT: {
    label: "Restaurant",
    itemLabel: "Meal",
    icon: UtensilsCrossed,
    color: "text-orange-500",
  },
  SHOP: {
    label: "Shop",
    itemLabel: "Product",
    icon: Package,
    color: "text-blue-500",
  },
  PHARMACY: {
    label: "Pharmacy",
    itemLabel: "Medicine",
    icon: Pill,
    color: "text-red-500",
  },
};

function itemsEndpoint(business: BusinessWithType) {
  switch (business.type) {
    case "RESTAURANT":
      return `/api/admin/menuItems/restaurant/${business.id}?limit=200`;
    case "SHOP":
      return `/api/admin/products/shop/${business.id}?limit=200`;
    case "PHARMACY":
      return `/api/admin/medicines/pharmacy/${business.id}?limit=200`;
  }
}

// Resolve (or lazily create) the menu a restaurant meal must be attached to —
// the admin createMenuItem endpoint requires a menuId, not a restaurantId.
async function resolveMenuId(restaurantId: string): Promise<string> {
  const res = await api.get(`/api/menus/${restaurantId}`);
  const menus = Array.isArray(res.data) ? res.data : (res.data?.menus ?? []);
  if (menus.length > 0 && menus[0]?.id) return menus[0].id as string;
  const created = await api.post("/api/menus", {
    title: "Main Menu",
    restaurantId,
  });
  const menuId = created.data?.id || created.data?.menu?.id;
  if (!menuId) throw new Error("Could not create a menu for this restaurant");
  return menuId as string;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function VendorDetailPage() {
  const { vendorId } = Route.useParams();
  const queryClient = useQueryClient();

  // ── Vendor profile ──────────────────────────────────────────────────────────
  const {
    data: vendor,
    isLoading: vendorLoading,
    isError: vendorError,
  } = useQuery<VendorDetail | null>({
    queryKey: ["admin-vendor", vendorId],
    queryFn: async () => {
      const res = await adminApi.getVendorById(vendorId);
      return (res.data?.vendor ?? null) as VendorDetail | null;
    },
  });

  // ── Earnings summary ────────────────────────────────────────────────────────
  const { data: summary } = useQuery<EarningsSummary>({
    queryKey: ["vendor-earnings-summary", vendorId],
    queryFn: async () => {
      const res = await api.get(
        `/api/vendor/earnings/admin/vendor/${vendorId}/summary`,
      );
      return res.data as EarningsSummary;
    },
  });

  // ── Earnings history ────────────────────────────────────────────────────────
  const [earningsPage, setEarningsPage] = useState(1);
  const { data: history, isLoading: historyLoading } =
    useQuery<EarningsHistory>({
      queryKey: ["vendor-earnings-history", vendorId, earningsPage],
      queryFn: async () => {
        const res = await api.get(
          `/api/vendor/earnings/admin/vendor/${vendorId}/history?page=${earningsPage}&pageSize=20`,
        );
        return res.data as EarningsHistory;
      },
    });

  // ── Businesses ──────────────────────────────────────────────────────────────
  const businesses = useMemo<BusinessWithType[]>(() => {
    if (!vendor) return [];
    return [
      ...(vendor.restaurants?.map((r) => ({
        ...r,
        type: "RESTAURANT" as const,
      })) || []),
      ...(vendor.shops?.map((s) => ({ ...s, type: "SHOP" as const })) || []),
      ...(vendor.pharmacies?.map((p) => ({
        ...p,
        type: "PHARMACY" as const,
      })) || []),
    ];
  }, [vendor]);

  // ── Catalog (Menu & Products tab) ───────────────────────────────────────────
  const [selectedBusinessId, setSelectedBusinessId] = useState("");
  useEffect(() => {
    if (businesses.length > 0 && !selectedBusinessId) {
      setSelectedBusinessId(businesses[0].id);
    }
  }, [businesses, selectedBusinessId]);

  const selectedBusiness = useMemo(
    () => businesses.find((b) => b.id === selectedBusinessId),
    [businesses, selectedBusinessId],
  );

  const itemsQueryKey = [
    "vendor-business-items",
    selectedBusiness?.type,
    selectedBusiness?.id,
  ];

  const { data: items, isLoading: itemsLoading } = useQuery<CatalogItem[]>({
    queryKey: itemsQueryKey,
    enabled: !!selectedBusiness,
    queryFn: async () => {
      if (!selectedBusiness) return [];
      const res = await api.get(itemsEndpoint(selectedBusiness));
      return (res.data?.menuItems ||
        res.data?.products ||
        res.data?.medicines ||
        []) as CatalogItem[];
    },
  });

  // ── Vendor status toggle ────────────────────────────────────────────────────
  const toggleStatusMutation = useMutation({
    mutationFn: async (isActive: boolean) => {
      const res = await api.patch(`/api/admin/vendors/${vendorId}/status`, {
        isActive,
      });
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-vendor", vendorId] });
      queryClient.invalidateQueries({ queryKey: ["vendors-all"] });
      toast.success("Vendor status updated");
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.message || "Failed to update vendor status",
      );
    },
  });

  // ── Edit vendor dialog ──────────────────────────────────────────────────────
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    waveNumber: "",
  });

  const updateVendorMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const res = await adminApi.updateVendor(vendorId, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-vendor", vendorId] });
      queryClient.invalidateQueries({ queryKey: ["vendors-all"] });
      toast.success("Vendor details updated");
      setIsEditOpen(false);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.message || "Failed to update vendor");
    },
  });

  const openEditDialog = () => {
    setEditForm({
      fullName: vendor?.user?.fullName || "",
      phone: vendor?.user?.phone || "",
      email: vendor?.user?.email || "",
      waveNumber: vendor?.waveNumber || "",
    });
    setIsEditOpen(true);
  };

  // ── Item create/edit dialog ─────────────────────────────────────────────────
  const [isItemDialogOpen, setIsItemDialogOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<CatalogItem | null>(null);
  const [itemForm, setItemForm] = useState({
    name: "",
    description: "",
    dosage: "",
    price: "",
  });
  const [itemImageFile, setItemImageFile] = useState<File | null>(null);
  const [itemImagePreview, setItemImagePreview] = useState("");

  const openItemDialog = (item: CatalogItem | null) => {
    setEditingItem(item);
    setItemForm({
      name: item?.name || "",
      description: item?.description || "",
      dosage: item?.dosage || "",
      price: item != null ? String(item.price) : "",
    });
    setItemImageFile(null);
    setItemImagePreview(item?.imageUrl || "");
    setIsItemDialogOpen(true);
  };

  const saveItemMutation = useMutation({
    mutationFn: async () => {
      if (!selectedBusiness) throw new Error("No business selected");

      const formData = new FormData();
      formData.append("name", itemForm.name.trim());
      formData.append("price", itemForm.price);
      if (itemForm.description.trim()) {
        formData.append("description", itemForm.description.trim());
      }
      if (selectedBusiness.type === "PHARMACY" && itemForm.dosage.trim()) {
        formData.append("dosage", itemForm.dosage.trim());
      }
      if (itemImageFile) {
        formData.append("image", itemImageFile);
      }

      const multipart = {
        headers: { "Content-Type": "multipart/form-data" },
      };

      if (editingItem) {
        // Update existing item
        const endpoint =
          selectedBusiness.type === "RESTAURANT"
            ? `/api/admin/menuItem/${editingItem.id}`
            : selectedBusiness.type === "SHOP"
              ? `/api/admin/product/${editingItem.id}`
              : `/api/admin/medicine/${editingItem.id}`;
        const res = await api.put(endpoint, formData, multipart);
        return res.data;
      }

      // Create new item — each type needs its parent id
      if (selectedBusiness.type === "RESTAURANT") {
        const menuId = await resolveMenuId(selectedBusiness.id);
        formData.append("menuId", menuId);
        const res = await api.post("/api/admin/menuItem", formData, multipart);
        return res.data;
      }
      if (selectedBusiness.type === "SHOP") {
        formData.append("shopId", selectedBusiness.id);
        const res = await api.post("/api/admin/product", formData, multipart);
        return res.data;
      }
      formData.append("pharmacyId", selectedBusiness.id);
      const res = await api.post("/api/admin/medicine", formData, multipart);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: itemsQueryKey });
      toast.success(editingItem ? "Item updated" : "Item created");
      setIsItemDialogOpen(false);
      setEditingItem(null);
      setItemImageFile(null);
      setItemImagePreview("");
    },
    onError: (error: any) => {
      toast.error(
        error?.response?.data?.error ||
          error?.message ||
          "Failed to save item",
      );
    },
  });

  // ── Item delete ─────────────────────────────────────────────────────────────
  const [deletingItem, setDeletingItem] = useState<CatalogItem | null>(null);

  const deleteItemMutation = useMutation({
    mutationFn: async (item: CatalogItem) => {
      if (!selectedBusiness) throw new Error("No business selected");
      const endpoint =
        selectedBusiness.type === "RESTAURANT"
          ? `/api/admin/menuItem/${item.id}`
          : selectedBusiness.type === "SHOP"
            ? `/api/admin/product/${item.id}`
            : `/api/admin/medicine/${item.id}`;
      await api.delete(endpoint);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: itemsQueryKey });
      toast.success("Item deleted");
      setDeletingItem(null);
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || "Failed to delete item");
    },
  });

  // ── Render helpers ──────────────────────────────────────────────────────────
  const vendorName = vendor?.user?.fullName || "Unknown Vendor";
  const initials =
    vendor?.user?.fullName
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "V";

  const earningStatusBadge = (status: string) => {
    switch (status) {
      case "SETTLED":
        return <Badge className="bg-green-600 hover:bg-green-700">Settled</Badge>;
      case "PENDING":
        return (
          <Badge variant="outline" className="border-orange-500 text-orange-600">
            Pending
          </Badge>
        );
      case "CANCELLED":
        return <Badge variant="destructive">Cancelled</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  // ── Loading state ───────────────────────────────────────────────────────────
  if (vendorLoading) {
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
            <Skeleton className="h-9 w-40" />
            <Skeleton className="h-32 w-full" />
            <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-28 w-full" />
              ))}
            </div>
            <Skeleton className="h-64 w-full" />
          </div>
        </Main>
      </>
    );
  }

  // ── Error / not-found state ─────────────────────────────────────────────────
  if (vendorError || !vendor) {
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
          <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
            <AlertCircle className="h-12 w-12 text-muted-foreground" />
            <div>
              <h2 className="text-xl font-semibold">Vendor not found</h2>
              <p className="text-muted-foreground text-sm">
                This vendor may have been deleted or the link is invalid.
              </p>
            </div>
            <Link to="/admin/vendors">
              <Button variant="outline">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Vendors
              </Button>
            </Link>
          </div>
        </Main>
      </>
    );
  }

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
          {/* Back */}
          <div className="flex items-center gap-3">
            <Link to="/admin/vendors">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Vendors
              </Button>
            </Link>
          </div>

          {/* Header card */}
          <Card>
            <CardContent className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage
                    src={
                      vendor.restaurants?.[0]?.imageUrl ||
                      vendor.shops?.[0]?.imageUrl ||
                      vendor.pharmacies?.[0]?.imageUrl ||
                      vendor.user?.avatarUrl ||
                      ""
                    }
                    alt={vendorName}
                  />
                  <AvatarFallback className="text-xl">{initials}</AvatarFallback>
                </Avatar>
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="text-2xl font-bold tracking-tight">
                      {vendorName}
                    </h1>
                    {vendor.isActive ? (
                      <Badge className="bg-green-600 hover:bg-green-700">
                        Active
                      </Badge>
                    ) : (
                      <Badge variant="destructive">Inactive</Badge>
                    )}
                    {vendor.subscription && (
                      <Badge
                        variant="outline"
                        className="border-yellow-500 text-yellow-600"
                      >
                        <Crown className="mr-1 h-3 w-3" />
                        {vendor.subscription.packageName}
                        {vendor.subscription.isTrial ? " · TRIAL" : ""}
                      </Badge>
                    )}
                  </div>
                  <div className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                    <span className="flex items-center gap-1.5">
                      <Phone className="h-3.5 w-3.5" />
                      {vendor.user?.phone || "No phone"}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Mail className="h-3.5 w-3.5" />
                      {vendor.user?.email || "No email"}
                    </span>
                    <span className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5" />
                      Joined {formatDate(vendor.user?.createdAt)}
                    </span>
                  </div>
                  {vendor.subscription && (
                    <p className="text-muted-foreground text-xs">
                      Subscription {vendor.subscription.status} — ends{" "}
                      {formatDate(vendor.subscription.endDate)}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Switch
                    checked={vendor.isActive}
                    disabled={toggleStatusMutation.isPending}
                    onCheckedChange={(checked) =>
                      toggleStatusMutation.mutate(checked)
                    }
                  />
                  <span className="text-sm font-medium">
                    {vendor.isActive ? "Active" : "Inactive"}
                  </span>
                </div>
                <Button variant="outline" size="sm" onClick={openEditDialog}>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Stat cards */}
          <StatsGrid columns={4}>
            <StatCard
              title="Total Businesses"
              value={businesses.length}
              icon={Building2}
              description={`${vendor.restaurants?.length || 0} restaurants · ${vendor.shops?.length || 0} shops · ${vendor.pharmacies?.length || 0} pharmacies`}
            />
            <StatCard
              title="Total Earnings"
              value={summary ? formatGMD(summary.allTime.total) : "—"}
              icon={DollarSign}
              color="green"
              description={
                summary ? `${summary.allTime.orders} completed orders` : ""
              }
              loading={!summary}
            />
            <StatCard
              title="Pending Settlement"
              value={summary ? formatGMD(summary.pendingUnsettled.total) : "—"}
              icon={Wallet}
              color="yellow"
              description={
                summary
                  ? `${summary.pendingUnsettled.count} unsettled earnings`
                  : ""
              }
              loading={!summary}
            />
            <StatCard
              title="Subscription"
              value={vendor.subscription?.packageName || "None"}
              icon={Crown}
              color={vendor.subscription ? "purple" : "default"}
              description={
                vendor.subscription
                  ? `${vendor.subscription.status}${vendor.subscription.isTrial ? " (Trial)" : ""} · ends ${formatDate(vendor.subscription.endDate)}`
                  : "No active subscription"
              }
            />
          </StatsGrid>

          {/* Tabs */}
          <Tabs defaultValue="businesses">
            <TabsList>
              <TabsTrigger value="businesses">Businesses</TabsTrigger>
              <TabsTrigger value="catalog">Menu &amp; Products</TabsTrigger>
              <TabsTrigger value="earnings">Earnings</TabsTrigger>
            </TabsList>

            {/* ─── Businesses tab ──────────────────────────────────────── */}
            <TabsContent value="businesses" className="space-y-4">
              {businesses.length === 0 ? (
                <Card>
                  <CardContent className="py-16 text-center">
                    <Store className="text-muted-foreground mx-auto mb-3 h-12 w-12" />
                    <p className="text-muted-foreground font-medium">
                      No businesses registered
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {businesses.map((business) => {
                    const meta = businessTypeMeta[business.type];
                    const Icon = meta.icon;
                    return (
                      <Card key={business.id} className="overflow-hidden pt-0">
                        <div className="bg-muted flex h-36 w-full items-center justify-center overflow-hidden">
                          {business.imageUrl ? (
                            <img
                              src={business.imageUrl}
                              alt={business.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <ImageIcon className="text-muted-foreground h-10 w-10" />
                          )}
                        </div>
                        <CardHeader>
                          <div className="flex items-center justify-between gap-2">
                            <CardTitle className="truncate text-base">
                              {business.name}
                            </CardTitle>
                            {business.isActive === false ? (
                              <Badge variant="destructive">Inactive</Badge>
                            ) : (
                              <Badge className="bg-green-600 hover:bg-green-700">
                                Active
                              </Badge>
                            )}
                          </div>
                          <CardDescription className="flex items-center gap-1.5">
                            <Icon className={cn("h-4 w-4", meta.color)} />
                            {meta.label}
                          </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-2 text-sm">
                          <div className="text-muted-foreground flex items-center gap-2">
                            <MapPin className="h-4 w-4 flex-shrink-0" />
                            <span className="truncate">
                              {business.address || "No address"}
                            </span>
                          </div>
                          <div className="text-muted-foreground flex items-center gap-2">
                            <Phone className="h-4 w-4 flex-shrink-0" />
                            <span>{business.phone || "No phone"}</span>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </TabsContent>

            {/* ─── Menu & Products tab ─────────────────────────────────── */}
            <TabsContent value="catalog" className="space-y-4">
              {businesses.length === 0 ? (
                <Card>
                  <CardContent className="py-16 text-center">
                    <Store className="text-muted-foreground mx-auto mb-3 h-12 w-12" />
                    <p className="text-muted-foreground font-medium">
                      No businesses to manage items for
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <Card>
                  <CardHeader>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="w-full sm:max-w-xs">
                        <Select
                          value={selectedBusinessId}
                          onValueChange={setSelectedBusinessId}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select a business" />
                          </SelectTrigger>
                          <SelectContent>
                            {businesses.map((business) => {
                              const meta = businessTypeMeta[business.type];
                              const Icon = meta.icon;
                              return (
                                <SelectItem
                                  key={business.id}
                                  value={business.id}
                                >
                                  <div className="flex items-center gap-2">
                                    <Icon
                                      className={cn("h-4 w-4", meta.color)}
                                    />
                                    <span>{business.name}</span>
                                  </div>
                                </SelectItem>
                              );
                            })}
                          </SelectContent>
                        </Select>
                      </div>
                      {selectedBusiness && (
                        <Button size="sm" onClick={() => openItemDialog(null)}>
                          <Plus className="mr-2 h-4 w-4" />
                          Add {businessTypeMeta[selectedBusiness.type].itemLabel}
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {itemsLoading ? (
                      <div className="space-y-3">
                        {[1, 2, 3, 4].map((i) => (
                          <Skeleton key={i} className="h-12 w-full" />
                        ))}
                      </div>
                    ) : !items || items.length === 0 ? (
                      <div className="text-muted-foreground py-16 text-center">
                        No items yet for this business.
                      </div>
                    ) : (
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead className="w-16">Image</TableHead>
                            <TableHead>Name</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Availability</TableHead>
                            <TableHead className="text-right">
                              Actions
                            </TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {items.map((item) => (
                            <TableRow key={item.id}>
                              <TableCell>
                                {item.imageUrl ? (
                                  <img
                                    src={item.imageUrl}
                                    alt={item.name}
                                    className="h-10 w-10 rounded-md object-cover"
                                  />
                                ) : (
                                  <div className="bg-muted flex h-10 w-10 items-center justify-center rounded-md">
                                    <ImageIcon className="text-muted-foreground h-5 w-5" />
                                  </div>
                                )}
                              </TableCell>
                              <TableCell>
                                <div className="font-medium">{item.name}</div>
                                {(item.description || item.dosage) && (
                                  <div className="text-muted-foreground max-w-xs truncate text-xs">
                                    {item.dosage || item.description}
                                  </div>
                                )}
                              </TableCell>
                              <TableCell className="font-medium">
                                {formatGMD(item.price)}
                              </TableCell>
                              <TableCell>
                                {typeof item.isAvailable === "boolean" ? (
                                  item.isAvailable ? (
                                    <Badge className="bg-green-600 hover:bg-green-700">
                                      Available
                                    </Badge>
                                  ) : (
                                    <Badge variant="destructive">
                                      Unavailable
                                    </Badge>
                                  )
                                ) : (
                                  <span className="text-muted-foreground">
                                    —
                                  </span>
                                )}
                              </TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8"
                                    onClick={() => openItemDialog(item)}
                                  >
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-red-600 hover:text-red-700"
                                    onClick={() => setDeletingItem(item)}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    )}
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            {/* ─── Earnings tab ────────────────────────────────────────── */}
            <TabsContent value="earnings" className="space-y-4">
              {summary && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">
                        Available Balance (Unsettled)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-orange-600">
                        {formatGMD(summary.pendingUnsettled.total)}
                      </div>
                      <p className="text-muted-foreground text-xs">
                        {summary.pendingUnsettled.count} pending earnings
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">
                        Total Earned (All Time)
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {formatGMD(summary.allTime.total)}
                      </div>
                      <p className="text-muted-foreground text-xs">
                        {summary.totalOrders} orders · this month{" "}
                        {formatGMD(summary.thisMonth.total)}
                      </p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm font-medium">
                        Last Settlement
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold">
                        {summary.lastSettlement
                          ? formatGMD(summary.lastSettlement.amount)
                          : "—"}
                      </div>
                      <p className="text-muted-foreground text-xs">
                        {summary.lastSettlement
                          ? `${summary.lastSettlement.status} · ${formatDate(summary.lastSettlement.paidAt)}`
                          : "No settlements yet"}
                      </p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {summary?.pendingSettlementRequest && (
                <div className="flex items-center gap-3 rounded-md border border-orange-200 bg-orange-50 p-4 text-sm text-orange-800 dark:border-orange-900 dark:bg-orange-950/20 dark:text-orange-300">
                  <AlertCircle className="h-5 w-5 flex-shrink-0" />
                  <span>
                    This vendor has a pending settlement request of{" "}
                    <strong>
                      {formatGMD(summary.pendingSettlementRequest.amount)}
                    </strong>{" "}
                    (requested{" "}
                    {formatDate(summary.pendingSettlementRequest.requestedAt)}
                    ).
                  </span>
                </div>
              )}

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Earnings History</CardTitle>
                  <CardDescription>
                    Per-order vendor earnings, most recent first
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {historyLoading ? (
                    <div className="space-y-3">
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Skeleton key={i} className="h-10 w-full" />
                      ))}
                    </div>
                  ) : !history || history.earnings.length === 0 ? (
                    <div className="text-muted-foreground py-16 text-center">
                      No earnings recorded yet.
                    </div>
                  ) : (
                    <>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Date</TableHead>
                            <TableHead>Order</TableHead>
                            <TableHead>Payment</TableHead>
                            <TableHead>Amount</TableHead>
                            <TableHead>Status</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {history.earnings.map((earning) => (
                            <TableRow key={earning.id}>
                              <TableCell>
                                {formatDate(earning.createdAt)}
                              </TableCell>
                              <TableCell className="font-mono text-xs">
                                {earning.order?.id
                                  ? earning.order.id.slice(0, 8)
                                  : "—"}
                              </TableCell>
                              <TableCell className="text-muted-foreground text-sm">
                                {earning.order?.paymentMethod || "—"}
                              </TableCell>
                              <TableCell className="font-medium">
                                {formatGMD(earning.vendorShare)}
                              </TableCell>
                              <TableCell>
                                {earningStatusBadge(earning.status)}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                      <div className="mt-4 flex items-center justify-between">
                        <p className="text-muted-foreground text-sm">
                          Page {history.page} of {Math.max(history.totalPages, 1)}{" "}
                          · {history.total} earnings
                        </p>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={earningsPage <= 1}
                            onClick={() => setEarningsPage((p) => p - 1)}
                          >
                            <ChevronLeft className="h-4 w-4" />
                            Previous
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={earningsPage >= history.totalPages}
                            onClick={() => setEarningsPage((p) => p + 1)}
                          >
                            Next
                            <ChevronRight className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </Main>

      {/* ─── Edit vendor dialog ─────────────────────────────────────────── */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Edit Vendor</DialogTitle>
            <DialogDescription>
              Update the vendor's account details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-fullName">Full Name</Label>
              <Input
                id="edit-fullName"
                value={editForm.fullName}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, fullName: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-phone">Phone</Label>
              <Input
                id="edit-phone"
                value={editForm.phone}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, phone: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editForm.email}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, email: e.target.value }))
                }
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-wave">Wave Number</Label>
              <Input
                id="edit-wave"
                value={editForm.waveNumber}
                onChange={(e) =>
                  setEditForm((f) => ({ ...f, waveNumber: e.target.value }))
                }
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => updateVendorMutation.mutate(editForm)}
              disabled={
                updateVendorMutation.isPending ||
                !editForm.fullName.trim() ||
                !editForm.phone.trim()
              }
            >
              {updateVendorMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Item create/edit dialog ────────────────────────────────────── */}
      <Dialog open={isItemDialogOpen} onOpenChange={setIsItemDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? "Edit" : "Add"}{" "}
              {selectedBusiness
                ? businessTypeMeta[selectedBusiness.type].itemLabel
                : "Item"}
            </DialogTitle>
            <DialogDescription>
              {selectedBusiness ? `For ${selectedBusiness.name}` : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="item-name">Name *</Label>
              <Input
                id="item-name"
                value={itemForm.name}
                onChange={(e) =>
                  setItemForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="e.g. Chicken Yassa"
              />
            </div>
            {selectedBusiness?.type === "PHARMACY" ? (
              <div className="space-y-2">
                <Label htmlFor="item-dosage">Dosage</Label>
                <Input
                  id="item-dosage"
                  value={itemForm.dosage}
                  onChange={(e) =>
                    setItemForm((f) => ({ ...f, dosage: e.target.value }))
                  }
                  placeholder="e.g. 500mg"
                />
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="item-description">Description</Label>
                <Textarea
                  id="item-description"
                  rows={2}
                  value={itemForm.description}
                  onChange={(e) =>
                    setItemForm((f) => ({ ...f, description: e.target.value }))
                  }
                  placeholder="Short description..."
                />
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="item-price">Price (GMD) *</Label>
              <Input
                id="item-price"
                type="number"
                min="0"
                step="0.01"
                value={itemForm.price}
                onChange={(e) =>
                  setItemForm((f) => ({ ...f, price: e.target.value }))
                }
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>Image</Label>
              <div
                className="border-muted hover:border-muted-foreground/40 flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 transition-colors"
                onClick={() =>
                  document.getElementById("item-image-input")?.click()
                }
              >
                {itemImagePreview ? (
                  <img
                    src={itemImagePreview}
                    alt="Preview"
                    className="h-24 w-24 rounded-lg object-cover"
                  />
                ) : (
                  <>
                    <ImageIcon className="text-muted-foreground mb-1 h-8 w-8" />
                    <span className="text-muted-foreground text-sm">
                      Click to upload image
                    </span>
                  </>
                )}
              </div>
              <input
                id="item-image-input"
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    setItemImageFile(file);
                    setItemImagePreview(URL.createObjectURL(file));
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsItemDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={() => saveItemMutation.mutate()}
              disabled={
                saveItemMutation.isPending ||
                !itemForm.name.trim() ||
                !itemForm.price ||
                Number.isNaN(Number(itemForm.price))
              }
            >
              {saveItemMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : editingItem ? (
                "Save Changes"
              ) : (
                "Create"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ─── Delete item confirm ────────────────────────────────────────── */}
      <AlertDialog
        open={!!deletingItem}
        onOpenChange={(open) => {
          if (!open) setDeletingItem(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {deletingItem?.name || "this item"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The item will be permanently
              removed from this business.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-red-600 hover:bg-red-700"
              onClick={() =>
                deletingItem && deleteItemMutation.mutate(deletingItem)
              }
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

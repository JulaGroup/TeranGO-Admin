// @ts-nocheck
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  Search,
  MoreHorizontal,
  Eye,
  Edit,
  Trash2,
  RefreshCw,
  UtensilsCrossed,
  Phone,
  Mail,
  MapPin,
  Star,
  Package,
  CheckCircle2,
  Ban,
  Loader2,
  Image as ImageIcon,
  X,
  ToggleLeft,
  ToggleRight,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "@/lib/api";
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { TopNav } from "@/components/layout/top-nav";
import { ProfileDropdown } from "@/components/profile-dropdown";
import { ThemeSwitch } from "@/components/theme-switch";
import { cn } from "@/lib/utils";

const CLOUDINARY_CLOUD_NAME = "dkpi5ij2t";
const CLOUDINARY_UPLOAD_PRESET = "unsigned_preset";

async function uploadToCloudinary(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: "POST", body: formData },
  );
  if (!response.ok) throw new Error("Image upload failed");
  const data = await response.json();
  return data.secure_url;
}

const topNav = [
  { title: "Overview", href: "/admin", isActive: false },
  { title: "Vendors", href: "/admin/vendors", isActive: false },
  { title: "Restaurants", href: "/admin/restaurants", isActive: true },
  { title: "Shops", href: "/admin/shops", isActive: false },
];

export const Route = createFileRoute("/_authenticated/admin/restaurants/")({
  component: RestaurantsPage,
});

interface Restaurant {
  id: string;
  name: string;
  imageUrl?: string;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
  website?: string;
  description?: string;
  isActive: boolean;
  acceptsOrders: boolean;
  rating?: number;
  totalReviews?: number;
  minimumOrderAmount?: number;
  vendor?: {
    user?: { fullName?: string; phone?: string; email?: string };
  };
  _count?: { menus?: number; orders?: number };
}

const emptyEdit = {
  name: "",
  description: "",
  phone: "",
  email: "",
  website: "",
  address: "",
  city: "",
  imageUrl: "",
  isActive: true,
  acceptsOrders: true,
  minimumOrderAmount: 0,
};

function RestaurantsPage() {
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "active" | "inactive"
  >("all");
  const [selected, setSelected] = useState<Restaurant | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);
  const [editForm, setEditForm] = useState({ ...emptyEdit });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const queryClient = useQueryClient();

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["admin-restaurants"],
    queryFn: async () => {
      const res = await adminApi.getRestaurants({ limit: 100 });
      // Admin dashboard controller returns { restaurants, pagination }
      return res.data.restaurants ?? res.data.data ?? res.data ?? [];
    },
  });

  const restaurants: Restaurant[] = Array.isArray(data) ? data : [];

  const filtered = restaurants.filter((r) => {
    const matchSearch =
      !search.trim() ||
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.city?.toLowerCase().includes(search.toLowerCase()) ||
      r.vendor?.user?.fullName?.toLowerCase().includes(search.toLowerCase());
    const matchStatus =
      filterStatus === "all" ||
      (filterStatus === "active" && r.isActive) ||
      (filterStatus === "inactive" && !r.isActive);
    return matchSearch && matchStatus;
  });

  const stats = {
    total: restaurants.length,
    active: restaurants.filter((r) => r.isActive).length,
    accepting: restaurants.filter((r) => r.acceptsOrders).length,
    avgRating:
      restaurants.length > 0
        ? (
            restaurants.reduce((a, b) => a + (b.rating ?? 0), 0) /
            restaurants.length
          ).toFixed(1)
        : "—",
  };

  const updateMutation = useMutation({
    mutationFn: async (data: typeof editForm) => {
      let imageUrl = data.imageUrl;
      if (imageFile) {
        setIsUploadingImage(true);
        try {
          imageUrl = await uploadToCloudinary(imageFile);
        } finally {
          setIsUploadingImage(false);
        }
      }
      return adminApi.updateRestaurant(selected!.id, { ...data, imageUrl });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-restaurants"] });
      toast.success("Restaurant updated");
      setIsEditOpen(false);
      setImageFile(null);
      setImagePreview("");
    },
    onError: (e: any) =>
      toast.error(e.response?.data?.message ?? "Update failed"),
  });

  const deleteMutation = useMutation({
    mutationFn: () => adminApi.deleteRestaurant(selected!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-restaurants"] });
      toast.success("Restaurant deleted");
      setIsDeleteOpen(false);
      setSelected(null);
    },
    onError: (e: any) =>
      toast.error(e.response?.data?.message ?? "Delete failed"),
  });

  const toggleStatusMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      adminApi.updateRestaurant(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-restaurants"] });
      toast.success("Status updated");
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed"),
  });

  const toggleOrdersMutation = useMutation({
    mutationFn: ({
      id,
      acceptsOrders,
    }: {
      id: string;
      acceptsOrders: boolean;
    }) => adminApi.updateRestaurant(id, { acceptsOrders }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-restaurants"] });
      toast.success("Orders setting updated");
    },
    onError: (e: any) => toast.error(e.response?.data?.message ?? "Failed"),
  });

  const openEdit = (r: Restaurant) => {
    setSelected(r);
    setEditForm({
      name: r.name,
      description: r.description ?? "",
      phone: r.phone ?? "",
      email: r.email ?? "",
      website: r.website ?? "",
      address: r.address ?? "",
      city: r.city ?? "",
      imageUrl: r.imageUrl ?? "",
      isActive: r.isActive,
      acceptsOrders: r.acceptsOrders,
      minimumOrderAmount: r.minimumOrderAmount ?? 0,
    });
    setImageFile(null);
    setImagePreview(r.imageUrl ?? "");
    setIsEditOpen(true);
  };

  const openDetails = (r: Restaurant) => {
    setSelected(r);
    setIsDetailsOpen(true);
  };

  const openDelete = (r: Restaurant) => {
    setSelected(r);
    setIsDeleteOpen(true);
  };

  return (
    <>
      <Header>
        <TopNav links={topNav} />
        <div className="ml-auto flex items-center gap-4">
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>
      <Main>
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Restaurants</h1>
            <p className="text-muted-foreground">
              Manage all restaurants on the platform
            </p>
          </div>
          <Button variant="outline" onClick={() => refetch()}>
            <RefreshCw className="mr-2 h-4 w-4" /> Refresh
          </Button>
        </div>

        {/* Stats */}
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <StatCard title="Total" value={stats.total} icon={UtensilsCrossed} />
          <StatCard
            title="Active"
            value={stats.active}
            icon={CheckCircle2}
            iconColor="text-green-500"
          />
          <StatCard
            title="Accepting Orders"
            value={stats.accepting}
            icon={Package}
            iconColor="text-blue-500"
          />
          <StatCard
            title="Avg Rating"
            value={stats.avgRating}
            icon={Star}
            iconColor="text-yellow-500"
          />
        </div>

        {/* Filters */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search by name, city, or vendor..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            {(["all", "active", "inactive"] as const).map((s) => (
              <Button
                key={s}
                size="sm"
                variant={filterStatus === s ? "default" : "outline"}
                onClick={() => setFilterStatus(s)}
                className="capitalize"
              >
                {s}
              </Button>
            ))}
          </div>
        </div>

        {/* List */}
        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center text-muted-foreground">
            <UtensilsCrossed className="mb-2 h-10 w-10" />
            <p>No restaurants found</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {filtered.map((r) => (
              <RestaurantCard
                key={r.id}
                restaurant={r}
                onEdit={openEdit}
                onView={openDetails}
                onDelete={openDelete}
                onToggleStatus={(id, active) =>
                  toggleStatusMutation.mutate({ id, isActive: active })
                }
                onToggleOrders={(id, accepts) =>
                  toggleOrdersMutation.mutate({ id, acceptsOrders: accepts })
                }
              />
            ))}
          </div>
        )}
      </Main>

      {/* Details Dialog */}
      {selected && (
        <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>{selected.name}</DialogTitle>
              <DialogDescription>Restaurant details</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {selected.imageUrl && (
                <img
                  src={selected.imageUrl}
                  alt={selected.name}
                  className="h-40 w-full rounded-lg object-cover"
                />
              )}
              <div className="grid grid-cols-2 gap-3 text-sm">
                <InfoRow
                  icon={MapPin}
                  label="Address"
                  value={
                    [selected.address, selected.city]
                      .filter(Boolean)
                      .join(", ") || "—"
                  }
                />
                <InfoRow
                  icon={Phone}
                  label="Phone"
                  value={selected.phone || "—"}
                />
                <InfoRow
                  icon={Mail}
                  label="Email"
                  value={selected.email || "—"}
                />
                <InfoRow
                  icon={Star}
                  label="Rating"
                  value={
                    selected.rating
                      ? `${selected.rating} (${selected.totalReviews} reviews)`
                      : "—"
                  }
                />
                <InfoRow
                  icon={DollarSign}
                  label="Min. Order"
                  value={
                    selected.minimumOrderAmount
                      ? `D${selected.minimumOrderAmount}`
                      : "None"
                  }
                />
                <InfoRow
                  icon={Package}
                  label="Menus"
                  value={String(selected._count?.menus ?? 0)}
                />
                <InfoRow
                  icon={Package}
                  label="Total Orders"
                  value={String(selected._count?.orders ?? 0)}
                />
              </div>
              {selected.description && (
                <p className="text-sm text-muted-foreground">
                  {selected.description}
                </p>
              )}
              <div className="flex gap-2">
                <Badge variant={selected.isActive ? "default" : "secondary"}>
                  {selected.isActive ? "Active" : "Inactive"}
                </Badge>
                <Badge variant={selected.acceptsOrders ? "default" : "outline"}>
                  {selected.acceptsOrders
                    ? "Accepting Orders"
                    : "Not Accepting"}
                </Badge>
              </div>
              {selected.vendor?.user && (
                <div className="rounded-lg border p-3 text-sm">
                  <p className="mb-1 font-medium">Vendor</p>
                  <p>{selected.vendor.user.fullName}</p>
                  <p className="text-muted-foreground">
                    {selected.vendor.user.phone}
                  </p>
                </div>
              )}
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDetailsOpen(false)}>
                Close
              </Button>
              <Button
                onClick={() => {
                  setIsDetailsOpen(false);
                  openEdit(selected);
                }}
              >
                <Edit className="mr-2 h-4 w-4" /> Edit
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Edit Dialog */}
      {selected && (
        <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Restaurant</DialogTitle>
              <DialogDescription>
                Update {selected.name}'s information
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-5 py-2">
              {/* Image */}
              <div className="space-y-2">
                <Label>Restaurant Image</Label>
                <div
                  className="relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 transition-colors hover:border-muted-foreground/40"
                  onClick={() =>
                    document.getElementById("rest-img-input")?.click()
                  }
                >
                  {imagePreview ? (
                    <img
                      src={imagePreview}
                      className="h-32 w-full rounded-lg object-cover"
                    />
                  ) : (
                    <>
                      <ImageIcon className="mb-2 h-8 w-8 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Click to upload image
                      </span>
                    </>
                  )}
                  {imagePreview && (
                    <button
                      type="button"
                      className="absolute right-2 top-2 rounded-full bg-destructive p-1 text-destructive-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        setImageFile(null);
                        setImagePreview("");
                        setEditForm((f) => ({ ...f, imageUrl: "" }));
                      }}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <input
                  id="rest-img-input"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setImageFile(file);
                      setImagePreview(URL.createObjectURL(file));
                    }
                  }}
                />
              </div>

              {/* Basic info */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>Name *</Label>
                  <Input
                    value={editForm.name}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, name: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>City</Label>
                  <Input
                    placeholder="e.g. Serrekunda"
                    value={editForm.city}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, city: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Phone</Label>
                  <Input
                    placeholder="+220..."
                    value={editForm.phone}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, phone: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Email</Label>
                  <Input
                    type="email"
                    value={editForm.email}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, email: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label>Address</Label>
                  <Input
                    value={editForm.address}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, address: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Website</Label>
                  <Input
                    placeholder="https://..."
                    value={editForm.website}
                    onChange={(e) =>
                      setEditForm((f) => ({ ...f, website: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-1">
                  <Label>Min. Order Amount (D)</Label>
                  <Input
                    type="number"
                    min={0}
                    value={editForm.minimumOrderAmount}
                    onChange={(e) =>
                      setEditForm((f) => ({
                        ...f,
                        minimumOrderAmount: Number(e.target.value),
                      }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label>Description</Label>
                <Textarea
                  rows={3}
                  value={editForm.description}
                  onChange={(e) =>
                    setEditForm((f) => ({ ...f, description: e.target.value }))
                  }
                />
              </div>

              {/* Toggles */}
              <div className="flex gap-6">
                <div className="flex items-center gap-3">
                  <Switch
                    checked={editForm.isActive}
                    onCheckedChange={(v) =>
                      setEditForm((f) => ({ ...f, isActive: v }))
                    }
                  />
                  <Label>Active</Label>
                </div>
                <div className="flex items-center gap-3">
                  <Switch
                    checked={editForm.acceptsOrders}
                    onCheckedChange={(v) =>
                      setEditForm((f) => ({ ...f, acceptsOrders: v }))
                    }
                  />
                  <Label>Accepting Orders</Label>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => updateMutation.mutate(editForm)}
                disabled={
                  updateMutation.isPending ||
                  isUploadingImage ||
                  !editForm.name.trim()
                }
              >
                {updateMutation.isPending || isUploadingImage ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {isUploadingImage ? "Uploading..." : "Saving..."}
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Delete Confirm */}
      {selected && (
        <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Restaurant</AlertDialogTitle>
              <AlertDialogDescription>
                Are you sure you want to delete <strong>{selected.name}</strong>
                ? This will also delete all associated menus and data. This
                action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Delete"
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      )}
    </>
  );
}

function RestaurantCard({
  restaurant: r,
  onEdit,
  onView,
  onDelete,
  onToggleStatus,
  onToggleOrders,
}: {
  restaurant: Restaurant;
  onEdit: (r: Restaurant) => void;
  onView: (r: Restaurant) => void;
  onDelete: (r: Restaurant) => void;
  onToggleStatus: (id: string, active: boolean) => void;
  onToggleOrders: (id: string, accepts: boolean) => void;
}) {
  return (
    <Card
      className={cn(
        "transition-shadow hover:shadow-md",
        !r.isActive && "opacity-60",
      )}
    >
      <div className="relative h-32 overflow-hidden rounded-t-lg bg-muted">
        {r.imageUrl ? (
          <img
            src={r.imageUrl}
            alt={r.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <UtensilsCrossed className="h-12 w-12 text-muted-foreground/40" />
          </div>
        )}
        <div className="absolute right-2 top-2 flex gap-1">
          <Badge
            variant={r.isActive ? "default" : "secondary"}
            className="text-xs"
          >
            {r.isActive ? "Active" : "Inactive"}
          </Badge>
          {!r.acceptsOrders && (
            <Badge variant="outline" className="bg-background/80 text-xs">
              Paused
            </Badge>
          )}
        </div>
      </div>
      <CardHeader className="pb-2 pt-3">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate text-base">{r.name}</CardTitle>
            {r.city && (
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="h-3 w-3 shrink-0" /> {r.city}
              </p>
            )}
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => onView(r)}>
                <Eye className="mr-2 h-4 w-4" /> View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(r)}>
                <Edit className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onToggleStatus(r.id, !r.isActive)}
              >
                {r.isActive ? (
                  <>
                    <Ban className="mr-2 h-4 w-4" /> Deactivate
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" /> Activate
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onToggleOrders(r.id, !r.acceptsOrders)}
              >
                {r.acceptsOrders ? (
                  <>
                    <ToggleLeft className="mr-2 h-4 w-4" /> Pause Orders
                  </>
                ) : (
                  <>
                    <ToggleRight className="mr-2 h-4 w-4" /> Resume Orders
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => onDelete(r)}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>
      <CardContent className="space-y-2 pb-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Star className="h-3 w-3 text-yellow-500" />
            {r.rating ? r.rating.toFixed(1) : "—"} ({r.totalReviews ?? 0})
          </span>
          <span>{r._count?.orders ?? 0} orders</span>
          <span>{r._count?.menus ?? 0} menus</span>
        </div>
        {r.vendor?.user?.fullName && (
          <p className="truncate text-xs text-muted-foreground">
            Vendor: {r.vendor.user.fullName}
          </p>
        )}
        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 h-7 text-xs"
            onClick={() => onEdit(r)}
          >
            <Edit className="mr-1 h-3 w-3" /> Edit
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 h-7 text-xs"
            onClick={() => onView(r)}
          >
            <Eye className="mr-1 h-3 w-3" /> View
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  iconColor,
}: {
  title: string;
  value: string | number;
  icon: any;
  iconColor?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        <Icon className={cn("h-4 w-4 text-muted-foreground", iconColor)} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </div>
  );
}

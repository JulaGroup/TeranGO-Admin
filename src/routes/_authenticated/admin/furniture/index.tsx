// @ts-nocheck
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  Plus, Search, Edit, Trash2, RefreshCw,
  Sofa, Tag, Phone, Mail, DollarSign,
  MoreHorizontal, Eye, FolderTree, BadgeCheck,
  Layers, Star, CheckCircle2, Ban, Loader2,
  Image as ImageIcon, X, Package, TrendingUp,
  Percent,
} from "lucide-react";
import { toast } from "sonner";
import { furnitureApi } from "@/lib/api";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription,
  AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog, DialogContent, DialogDescription,
  DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { TopNav } from "@/components/layout/top-nav";
import { ProfileDropdown } from "@/components/profile-dropdown";
import { ThemeSwitch } from "@/components/theme-switch";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/furniture/")({
  component: FurniturePage,
});

const CONDITIONS = [
  { value: "NEW", label: "New" },
  { value: "USED_LIKE_NEW", label: "Used – Like New" },
  { value: "USED_GOOD", label: "Used – Good" },
  { value: "USED_FAIR", label: "Used – Fair" },
];

const CONDITION_COLORS: Record<string, string> = {
  NEW: "bg-green-100 text-green-800",
  USED_LIKE_NEW: "bg-blue-100 text-blue-800",
  USED_GOOD: "bg-yellow-100 text-yellow-800",
  USED_FAIR: "bg-orange-100 text-orange-800",
};

const fmtPrice = (n: number) => `D${n.toLocaleString("en-GM", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

// ── Image uploader ────────────────────────────────────────────────────────────
function ImageUploader({ images, onChange }: { images: string[]; onChange: (imgs: string[]) => void }) {
  const [uploading, setUploading] = useState(false);
  const [urlInput, setUrlInput] = useState("");

  const uploadFile = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", "terango_uploads");
      const res = await fetch("https://api.cloudinary.com/v1_1/terango/image/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.secure_url) onChange([...images, data.secure_url]);
      else toast.error("Upload failed");
    } catch {
      toast.error("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Input
          placeholder="Paste image URL…"
          value={urlInput}
          onChange={(e) => setUrlInput(e.target.value)}
          className="flex-1"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            if (urlInput.trim()) {
              onChange([...images, urlInput.trim()]);
              setUrlInput("");
            }
          }}
        >
          Add URL
        </Button>
      </div>
      <label className="flex items-center gap-2 cursor-pointer text-sm text-muted-foreground border-2 border-dashed rounded-lg p-4 hover:border-primary transition-colors justify-center">
        <ImageIcon className="h-4 w-4" />
        {uploading ? "Uploading…" : "Click to upload image"}
        <input
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={(e) => { if (e.target.files?.[0]) uploadFile(e.target.files[0]); }}
        />
      </label>
      {images.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {images.map((url, i) => (
            <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border">
              <img src={url} alt="" className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => onChange(images.filter((_, j) => j !== i))}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
              {i === 0 && (
                <span className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-1 rounded">Primary</span>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Category Form ─────────────────────────────────────────────────────────────
function CategoryForm({
  initial,
  onSave,
  onClose,
  saving,
}: {
  initial?: any;
  onSave: (data: any) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    description: initial?.description ?? "",
    icon: initial?.icon ?? "",
    imageUrl: initial?.imageUrl ?? "",
    sortOrder: initial?.sortOrder ?? 0,
    isActive: initial?.isActive ?? true,
  });
  const set = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 space-y-1">
          <Label>Category Name *</Label>
          <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Sofas & Couches" />
        </div>
        <div className="space-y-1">
          <Label>Icon (Ionicons name)</Label>
          <Input value={form.icon} onChange={(e) => set("icon", e.target.value)} placeholder="e.g. bed-outline" />
        </div>
        <div className="space-y-1">
          <Label>Sort Order</Label>
          <Input type="number" value={form.sortOrder} onChange={(e) => set("sortOrder", parseInt(e.target.value) || 0)} />
        </div>
        <div className="col-span-2 space-y-1">
          <Label>Description</Label>
          <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={2} />
        </div>
        <div className="col-span-2 space-y-1">
          <Label>Image URL</Label>
          <Input value={form.imageUrl} onChange={(e) => set("imageUrl", e.target.value)} placeholder="https://…" />
        </div>
        <div className="col-span-2 flex items-center gap-3">
          <Switch checked={form.isActive} onCheckedChange={(v) => set("isActive", v)} />
          <Label>Active</Label>
        </div>
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button onClick={() => onSave(form)} disabled={saving || !form.name.trim()}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {initial ? "Update Category" : "Create Category"}
        </Button>
      </DialogFooter>
    </div>
  );
}

// ── Listing Form ──────────────────────────────────────────────────────────────
function ListingForm({
  initial,
  categories,
  onSave,
  onClose,
  saving,
}: {
  initial?: any;
  categories: any[];
  onSave: (data: any) => void;
  onClose: () => void;
  saving: boolean;
}) {
  const [form, setForm] = useState({
    name: initial?.name ?? "",
    description: initial?.description ?? "",
    categoryId: initial?.categoryId ?? "",
    imageUrls: initial?.imageUrls ?? [],
    sellerPrice: initial?.sellerPrice ?? "",
    commissionPct: initial?.commissionPct ?? 10,
    sellerName: initial?.sellerName ?? "",
    sellerPhone: initial?.sellerPhone ?? "",
    sellerEmail: initial?.sellerEmail ?? "",
    condition: initial?.condition ?? "NEW",
    material: initial?.material ?? "",
    dimensions: initial?.dimensions ?? "",
    color: initial?.color ?? "",
    brand: initial?.brand ?? "",
    city: initial?.city ?? "",
    address: initial?.address ?? "",
    stock: initial?.stock ?? 1,
    isActive: initial?.isActive ?? true,
    isFeatured: initial?.isFeatured ?? false,
    isVerified: initial?.isVerified ?? false,
    tags: initial?.tags?.join(", ") ?? "",
  });
  const set = (k: string, v: any) => setForm((p) => ({ ...p, [k]: v }));

  const sellerPrice = parseFloat(form.sellerPrice) || 0;
  const listingPrice = parseFloat((sellerPrice * (1 + Number(form.commissionPct) / 100)).toFixed(2));
  const commissionAmount = parseFloat((listingPrice - sellerPrice).toFixed(2));

  return (
    <div className="space-y-6 max-h-[70vh] overflow-y-auto pr-1">
      {/* Basic info */}
      <div>
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Listing Details</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-1">
            <Label>Item Name *</Label>
            <Input value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. 3-Seater Leather Sofa" />
          </div>
          <div className="space-y-1">
            <Label>Category *</Label>
            <Select value={form.categoryId} onValueChange={(v) => set("categoryId", v)}>
              <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
              <SelectContent>
                {categories.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label>Condition *</Label>
            <Select value={form.condition} onValueChange={(v) => set("condition", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CONDITIONS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="col-span-2 space-y-1">
            <Label>Description</Label>
            <Textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={3} placeholder="Describe the item, its features, and condition…" />
          </div>
        </div>
      </div>

      {/* Pricing */}
      <div>
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Pricing & Commission</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Seller Price (GMD) *</Label>
            <Input type="number" value={form.sellerPrice} onChange={(e) => set("sellerPrice", e.target.value)} placeholder="0.00" />
          </div>
          <div className="space-y-1">
            <Label>Commission %</Label>
            <Input type="number" value={form.commissionPct} onChange={(e) => set("commissionPct", parseFloat(e.target.value) || 0)} placeholder="10" />
          </div>
        </div>
        {sellerPrice > 0 && (
          <div className="mt-3 p-3 bg-muted rounded-lg text-sm grid grid-cols-3 gap-2 text-center">
            <div><p className="text-muted-foreground text-xs">Seller Gets</p><p className="font-bold">{fmtPrice(sellerPrice)}</p></div>
            <div><p className="text-muted-foreground text-xs">Commission</p><p className="font-bold text-orange-600">{fmtPrice(commissionAmount)}</p></div>
            <div><p className="text-muted-foreground text-xs">Listing Price</p><p className="font-bold text-green-700">{fmtPrice(listingPrice)}</p></div>
          </div>
        )}
      </div>

      {/* Images */}
      <div>
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Images</h4>
        <ImageUploader images={form.imageUrls} onChange={(imgs) => set("imageUrls", imgs)} />
      </div>

      {/* Item specs */}
      <div>
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Item Specifications</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label>Brand</Label>
            <Input value={form.brand} onChange={(e) => set("brand", e.target.value)} placeholder="e.g. IKEA" />
          </div>
          <div className="space-y-1">
            <Label>Color</Label>
            <Input value={form.color} onChange={(e) => set("color", e.target.value)} placeholder="e.g. Charcoal Grey" />
          </div>
          <div className="space-y-1">
            <Label>Material</Label>
            <Input value={form.material} onChange={(e) => set("material", e.target.value)} placeholder="e.g. Solid Wood, Leather" />
          </div>
          <div className="space-y-1">
            <Label>Dimensions</Label>
            <Input value={form.dimensions} onChange={(e) => set("dimensions", e.target.value)} placeholder="e.g. 200cm × 90cm × 75cm" />
          </div>
          <div className="space-y-1">
            <Label>Stock / Quantity</Label>
            <Input type="number" min={1} value={form.stock} onChange={(e) => set("stock", parseInt(e.target.value) || 1)} />
          </div>
          <div className="space-y-1">
            <Label>Tags (comma-separated)</Label>
            <Input value={form.tags} onChange={(e) => set("tags", e.target.value)} placeholder="modern, sale, clearance" />
          </div>
        </div>
      </div>

      {/* Seller info */}
      <div>
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Seller Information</h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 space-y-1">
            <Label>Seller Name *</Label>
            <Input value={form.sellerName} onChange={(e) => set("sellerName", e.target.value)} placeholder="Full name or business name" />
          </div>
          <div className="space-y-1">
            <Label>Phone</Label>
            <Input value={form.sellerPhone} onChange={(e) => set("sellerPhone", e.target.value)} placeholder="+220 …" />
          </div>
          <div className="space-y-1">
            <Label>Email</Label>
            <Input value={form.sellerEmail} onChange={(e) => set("sellerEmail", e.target.value)} placeholder="seller@email.com" />
          </div>
          <div className="space-y-1">
            <Label>City</Label>
            <Input value={form.city} onChange={(e) => set("city", e.target.value)} placeholder="e.g. Banjul" />
          </div>
          <div className="space-y-1">
            <Label>Address</Label>
            <Input value={form.address} onChange={(e) => set("address", e.target.value)} placeholder="Street address" />
          </div>
        </div>
      </div>

      {/* Flags */}
      <div>
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Status</h4>
        <div className="flex flex-wrap gap-6">
          {[
            { key: "isActive", label: "Active" },
            { key: "isFeatured", label: "Featured" },
            { key: "isVerified", label: "Verified" },
          ].map(({ key, label }) => (
            <div key={key} className="flex items-center gap-2">
              <Switch checked={form[key]} onCheckedChange={(v) => set(key, v)} />
              <Label>{label}</Label>
            </div>
          ))}
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
        <Button
          onClick={() => {
            const payload = {
              ...form,
              tags: form.tags.split(",").map((t: string) => t.trim()).filter(Boolean),
            };
            onSave(payload);
          }}
          disabled={saving || !form.name.trim() || !form.categoryId || !form.sellerPrice || !form.sellerName.trim()}
        >
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {initial ? "Update Listing" : "Create Listing"}
        </Button>
      </DialogFooter>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
function FurniturePage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState("listings");
  const [search, setSearch] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterCondition, setFilterCondition] = useState("all");

  const [listingDialog, setListingDialog] = useState<{ open: boolean; item?: any }>({ open: false });
  const [categoryDialog, setCategoryDialog] = useState<{ open: boolean; item?: any }>({ open: false });
  const [deleteDialog, setDeleteDialog] = useState<{ open: boolean; id?: string; type?: string; name?: string }>({ open: false });

  // ── Queries ─────────────────────────────────────────────────────────────────
  const { data: stats } = useQuery({
    queryKey: ["furniture-stats"],
    queryFn: () => furnitureApi.getStats().then((r) => r.data),
  });

  const { data: categoriesData = [], isLoading: catsLoading, refetch: refetchCats } = useQuery({
    queryKey: ["furniture-categories"],
    queryFn: () => furnitureApi.getCategories().then((r) => r.data),
  });

  const { data: listingsData, isLoading: listingsLoading, refetch: refetchListings } = useQuery({
    queryKey: ["furniture-listings", search, filterCategory, filterCondition],
    queryFn: () =>
      furnitureApi.getListings({
        search: search || undefined,
        categoryId: filterCategory !== "all" ? filterCategory : undefined,
        condition: filterCondition !== "all" ? filterCondition : undefined,
        limit: 100,
      }).then((r) => r.data),
  });

  const listings = listingsData?.listings ?? [];
  const categories = categoriesData;

  // ── Mutations ────────────────────────────────────────────────────────────────
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["furniture-listings"] });
    qc.invalidateQueries({ queryKey: ["furniture-stats"] });
  };

  const createListing = useMutation({
    mutationFn: (data: any) => furnitureApi.createListing(data),
    onSuccess: () => { toast.success("Listing created"); setListingDialog({ open: false }); invalidate(); },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? "Failed to create listing"),
  });

  const updateListing = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => furnitureApi.updateListing(id, data),
    onSuccess: () => { toast.success("Listing updated"); setListingDialog({ open: false }); invalidate(); },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? "Failed to update listing"),
  });

  const deleteListing = useMutation({
    mutationFn: (id: string) => furnitureApi.deleteListing(id),
    onSuccess: () => { toast.success("Listing deleted"); setDeleteDialog({ open: false }); invalidate(); },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? "Failed to delete"),
  });

  const toggleActive = useMutation({
    mutationFn: (id: string) => furnitureApi.toggleActive(id),
    onSuccess: () => { toast.success("Status updated"); invalidate(); },
  });
  const toggleFeatured = useMutation({
    mutationFn: (id: string) => furnitureApi.toggleFeatured(id),
    onSuccess: () => { toast.success("Featured updated"); invalidate(); },
  });
  const toggleVerified = useMutation({
    mutationFn: (id: string) => furnitureApi.toggleVerified(id),
    onSuccess: () => { toast.success("Verified updated"); invalidate(); },
  });

  const createCategory = useMutation({
    mutationFn: (data: any) => furnitureApi.createCategory(data),
    onSuccess: () => { toast.success("Category created"); setCategoryDialog({ open: false }); qc.invalidateQueries({ queryKey: ["furniture-categories"] }); qc.invalidateQueries({ queryKey: ["furniture-stats"] }); },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? "Failed to create category"),
  });

  const updateCategory = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => furnitureApi.updateCategory(id, data),
    onSuccess: () => { toast.success("Category updated"); setCategoryDialog({ open: false }); qc.invalidateQueries({ queryKey: ["furniture-categories"] }); },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? "Failed to update category"),
  });

  const deleteCategory = useMutation({
    mutationFn: (id: string) => furnitureApi.deleteCategory(id),
    onSuccess: () => { toast.success("Category deleted"); setDeleteDialog({ open: false }); qc.invalidateQueries({ queryKey: ["furniture-categories"] }); qc.invalidateQueries({ queryKey: ["furniture-stats"] }); },
    onError: (e: any) => toast.error(e?.response?.data?.error ?? "Failed to delete category"),
  });

  return (
    <>
      <Header>
        <TopNav links={[]} />
        <div className="ml-auto flex items-center gap-2">
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        {/* Page header */}
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Sofa className="h-6 w-6 text-orange-500" />
              Furniture Marketplace
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Manage seller listings, categories and commission structure
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => { refetchListings(); refetchCats(); }}>
              <RefreshCw className="h-4 w-4 mr-1" /> Refresh
            </Button>
            {activeTab === "listings" ? (
              <Button size="sm" onClick={() => setListingDialog({ open: true })}>
                <Plus className="h-4 w-4 mr-1" /> Add Listing
              </Button>
            ) : (
              <Button size="sm" onClick={() => setCategoryDialog({ open: true })}>
                <Plus className="h-4 w-4 mr-1" /> Add Category
              </Button>
            )}
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
            {[
              { label: "Total Listings", value: stats.totalListings, icon: Package, color: "text-blue-500" },
              { label: "Active", value: stats.activeListings, icon: CheckCircle2, color: "text-green-500" },
              { label: "Featured", value: stats.featuredListings, icon: Star, color: "text-yellow-500" },
              { label: "Categories", value: stats.totalCategories, icon: FolderTree, color: "text-purple-500" },
              { label: "Est. Commission", value: `D${(stats.potentialCommission || 0).toLocaleString()}`, icon: Percent, color: "text-orange-500" },
            ].map(({ label, value, icon: Icon, color }) => (
              <Card key={label}>
                <CardContent className="p-4 flex items-center gap-3">
                  <Icon className={cn("h-8 w-8", color)} />
                  <div>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-xl font-bold">{value}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-4">
            <TabsTrigger value="listings">Listings</TabsTrigger>
            <TabsTrigger value="categories">Categories</TabsTrigger>
          </TabsList>

          {/* ── Listings Tab ─────────────────────────────────────── */}
          <TabsContent value="listings">
            {/* Filters */}
            <div className="flex flex-wrap gap-3 mb-4">
              <div className="relative flex-1 min-w-48">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search name, brand, seller…"
                  className="pl-9"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
              </div>
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger className="w-44"><SelectValue placeholder="All categories" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {categories.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={filterCondition} onValueChange={setFilterCondition}>
                <SelectTrigger className="w-44"><SelectValue placeholder="All conditions" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Conditions</SelectItem>
                  {CONDITIONS.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {listingsLoading ? (
              <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
            ) : listings.length === 0 ? (
              <div className="text-center py-20 text-muted-foreground">
                <Sofa className="h-12 w-12 mx-auto mb-3 opacity-30" />
                <p className="font-medium">No listings found</p>
                <p className="text-sm">Add your first furniture listing</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {listings.map((item: any) => (
                  <Card key={item.id} className="overflow-hidden hover:shadow-md transition-shadow">
                    {/* Image */}
                    <div className="relative h-48 bg-muted">
                      {item.imageUrls?.[0] ? (
                        <img src={item.imageUrls[0]} alt={item.name} className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex items-center justify-center h-full">
                          <Sofa className="h-14 w-14 text-muted-foreground/30" />
                        </div>
                      )}
                      {/* Badges overlay */}
                      <div className="absolute top-2 left-2 flex gap-1 flex-wrap">
                        {item.isFeatured && <Badge className="bg-yellow-500 text-white text-xs">Featured</Badge>}
                        {item.isVerified && <Badge className="bg-green-500 text-white text-xs">Verified</Badge>}
                        {!item.isActive && <Badge variant="destructive" className="text-xs">Inactive</Badge>}
                      </div>
                      <div className="absolute top-2 right-2">
                        <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full", CONDITION_COLORS[item.condition] ?? "bg-gray-100 text-gray-700")}>
                          {CONDITIONS.find((c) => c.value === item.condition)?.label ?? item.condition}
                        </span>
                      </div>
                    </div>

                    <CardContent className="p-4 space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-semibold text-sm leading-tight line-clamp-1">{item.name}</p>
                          <p className="text-xs text-muted-foreground">{item.category?.name}</p>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => setListingDialog({ open: true, item })}>
                              <Edit className="h-4 w-4 mr-2" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => toggleActive.mutate(item.id)}>
                              {item.isActive ? <><Ban className="h-4 w-4 mr-2" /> Deactivate</> : <><CheckCircle2 className="h-4 w-4 mr-2" /> Activate</>}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleFeatured.mutate(item.id)}>
                              <Star className="h-4 w-4 mr-2" /> {item.isFeatured ? "Unfeature" : "Feature"}
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => toggleVerified.mutate(item.id)}>
                              <BadgeCheck className="h-4 w-4 mr-2" /> {item.isVerified ? "Unverify" : "Verify"}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() => setDeleteDialog({ open: true, id: item.id, type: "listing", name: item.name })}
                            >
                              <Trash2 className="h-4 w-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      {/* Pricing */}
                      <div className="flex items-center justify-between pt-1 border-t">
                        <div>
                          <p className="text-xs text-muted-foreground">Seller</p>
                          <p className="text-sm font-semibold">{fmtPrice(item.sellerPrice)}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-xs text-muted-foreground">Commission</p>
                          <p className="text-sm font-semibold text-orange-500">{item.commissionPct}%</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs text-muted-foreground">Listing</p>
                          <p className="text-sm font-bold text-green-700">{fmtPrice(item.listingPrice)}</p>
                        </div>
                      </div>

                      {/* Seller */}
                      <p className="text-xs text-muted-foreground truncate">
                        Seller: <span className="font-medium text-foreground">{item.sellerName}</span>
                        {item.city ? ` · ${item.city}` : ""}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Categories Tab ────────────────────────────────────── */}
          <TabsContent value="categories">
            {catsLoading ? (
              <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-muted-foreground" /></div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {categories.map((cat: any) => (
                  <Card key={cat.id} className="flex items-center gap-4 p-4">
                    <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center shrink-0">
                      <Sofa className="h-6 w-6 text-orange-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">{cat.name}</p>
                      <p className="text-xs text-muted-foreground">{cat._count?.listings ?? 0} listings · icon: {cat.icon ?? "—"}</p>
                      {!cat.isActive && <Badge variant="outline" className="text-xs mt-0.5">Inactive</Badge>}
                    </div>
                    <div className="flex gap-1 shrink-0">
                      <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCategoryDialog({ open: true, item: cat })}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-destructive hover:text-destructive"
                        onClick={() => setDeleteDialog({ open: true, id: cat.id, type: "category", name: cat.name })}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </Main>

      {/* ── Listing Dialog ─────────────────────────────────────────── */}
      <Dialog open={listingDialog.open} onOpenChange={(o) => !o && setListingDialog({ open: false })}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{listingDialog.item ? "Edit Listing" : "Add Furniture Listing"}</DialogTitle>
            <DialogDescription>
              {listingDialog.item ? "Update listing details" : "Add a new seller listing. Commission is automatically calculated."}
            </DialogDescription>
          </DialogHeader>
          <ListingForm
            initial={listingDialog.item}
            categories={categories}
            onSave={(data) => {
              if (listingDialog.item) {
                updateListing.mutate({ id: listingDialog.item.id, data });
              } else {
                createListing.mutate(data);
              }
            }}
            onClose={() => setListingDialog({ open: false })}
            saving={createListing.isPending || updateListing.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* ── Category Dialog ─────────────────────────────────────────── */}
      <Dialog open={categoryDialog.open} onOpenChange={(o) => !o && setCategoryDialog({ open: false })}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{categoryDialog.item ? "Edit Category" : "Add Category"}</DialogTitle>
          </DialogHeader>
          <CategoryForm
            initial={categoryDialog.item}
            onSave={(data) => {
              if (categoryDialog.item) {
                updateCategory.mutate({ id: categoryDialog.item.id, data });
              } else {
                createCategory.mutate(data);
              }
            }}
            onClose={() => setCategoryDialog({ open: false })}
            saving={createCategory.isPending || updateCategory.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm ─────────────────────────────────────────── */}
      <AlertDialog open={deleteDialog.open} onOpenChange={(o) => !o && setDeleteDialog({ open: false })}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {deleteDialog.type === "category" ? "Category" : "Listing"}?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{deleteDialog.name}</strong> will be permanently deleted. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive hover:bg-destructive/90"
              onClick={() => {
                if (!deleteDialog.id) return;
                if (deleteDialog.type === "category") {
                  deleteCategory.mutate(deleteDialog.id);
                } else {
                  deleteListing.mutate(deleteDialog.id);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

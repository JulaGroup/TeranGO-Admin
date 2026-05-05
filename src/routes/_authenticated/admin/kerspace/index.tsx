// @ts-nocheck
import { useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  Building2,
  Home,
  Search,
  Plus,
  Edit,
  Trash2,
  Eye,
  CheckCircle,
  Star,
  Calendar,
  MessageSquare,
  MapPin,
  BedDouble,
  Bath,
  ArrowUpDown,
  MoreHorizontal,
  RefreshCw,
  X,
  Phone,
  Mail,
  TrendingUp,
  BarChart3,
  Clock,
  AlertCircle,
  Loader2,
  Image as ImageIcon,
  Tag,
  SquareArrowOutUpRight,
} from "lucide-react";
import { toast } from "sonner";
import { kerspaceApi } from "@/lib/api";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { ProfileDropdown } from "@/components/profile-dropdown";
import { ThemeSwitch } from "@/components/theme-switch";
import { Skeleton } from "@/components/ui/skeleton";
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

export const Route = createFileRoute("/_authenticated/admin/kerspace/")({
  component: KerSpacePage,
});

// ─── Types ────────────────────────────────────────────────────────────────────
type PropertyType =
  | "HOUSE"
  | "APARTMENT"
  | "OFFICE"
  | "LAND"
  | "COMMERCIAL"
  | "VILLA";
type ListingType = "FOR_SALE" | "FOR_RENT";
type PropertyStatus =
  | "AVAILABLE"
  | "UNDER_OFFER"
  | "SOLD"
  | "RENTED"
  | "INACTIVE";

interface PropertyImage {
  id: string;
  url: string;
  isPrimary: boolean;
  order: number;
}
interface Property {
  id: string;
  title: string;
  description: string;
  type: PropertyType;
  listingType: ListingType;
  price: number;
  currency: string;
  negotiable: boolean;
  bedrooms: number | null;
  bathrooms: number | null;
  area: number | null;
  address: string;
  city: string;
  region: string | null;
  features: string[];
  furnished: boolean;
  serviced: boolean;
  isActive: boolean;
  isVerified: boolean;
  isFeatured: boolean;
  status: PropertyStatus;
  contactName: string;
  contactPhone: string;
  contactEmail: string | null;
  commissionRate: number;
  viewCount: number;
  inquiryCount: number;
  images: PropertyImage[];
  _count?: { inquiries: number; appointments: number };
  createdAt: string;
}

interface Inquiry {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  message: string | null;
  inquiryType: string;
  status: string;
  createdAt: string;
  property: {
    id: string;
    title: string;
    city: string;
    type: string;
    listingType: string;
  };
}

interface Appointment {
  id: string;
  fullName: string;
  phone: string;
  email: string | null;
  preferredDate: string;
  preferredTime: string;
  notes: string | null;
  status: string;
  createdAt: string;
  property: { id: string; title: string; city: string; type: string };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  HOUSE: "House",
  APARTMENT: "Apartment",
  OFFICE: "Office",
  LAND: "Land",
  COMMERCIAL: "Commercial",
  VILLA: "Villa",
};
const LISTING_TYPE_COLORS: Record<ListingType, string> = {
  FOR_SALE: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
  FOR_RENT:
    "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
};
const STATUS_COLORS: Record<PropertyStatus, string> = {
  AVAILABLE: "bg-green-100 text-green-800",
  UNDER_OFFER: "bg-yellow-100 text-yellow-800",
  SOLD: "bg-gray-200 text-gray-700",
  RENTED: "bg-gray-200 text-gray-700",
  INACTIVE: "bg-red-100 text-red-700",
};
const formatPrice = (price: number, currency = "GMD") =>
  `${currency} ${price.toLocaleString()}`;

// ─── Stat Card ────────────────────────────────────────────────────────────────
function StatCard({
  title,
  value,
  icon: Icon,
  color,
  loading,
}: {
  title: string;
  value: number | string;
  icon: any;
  color: string;
  loading?: boolean;
}) {
  return (
    <Card>
      <CardContent className="pt-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-muted-foreground">{title}</p>
            {loading ? (
              <Skeleton className="h-7 w-16 mt-1" />
            ) : (
              <p className="text-2xl font-bold mt-1">{value}</p>
            )}
          </div>
          <div className={cn("p-3 rounded-full", color)}>
            <Icon className="h-5 w-5 text-white" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Property Form ────────────────────────────────────────────────────────────
function PropertyForm({
  initial,
  onSubmit,
  loading,
}: {
  initial?: Partial<Property>;
  onSubmit: (data: any) => void;
  loading: boolean;
}) {
  const [form, setForm] = useState({
    title: initial?.title || "",
    description: initial?.description || "",
    type: initial?.type || "HOUSE",
    listingType: initial?.listingType || "FOR_SALE",
    price: initial?.price?.toString() || "",
    currency: initial?.currency || "GMD",
    negotiable: initial?.negotiable ?? false,
    bedrooms: initial?.bedrooms?.toString() || "",
    bathrooms: initial?.bathrooms?.toString() || "",
    area: initial?.area?.toString() || "",
    address: initial?.address || "",
    city: initial?.city || "",
    region: initial?.region || "",
    furnished: initial?.furnished ?? false,
    serviced: initial?.serviced ?? false,
    isActive: initial?.isActive ?? true,
    isVerified: initial?.isVerified ?? false,
    isFeatured: initial?.isFeatured ?? false,
    status: initial?.status || "AVAILABLE",
    contactName: initial?.contactName || "",
    contactPhone: initial?.contactPhone || "",
    contactEmail: initial?.contactEmail || "",
    commissionRate: initial?.commissionRate?.toString() || "0.07",
  });
  const [features, setFeatures] = useState<string[]>(initial?.features || []);
  const [featureInput, setFeatureInput] = useState("");
  const [imageUrls, setImageUrls] = useState<string[]>(
    initial?.images?.map((i) => i.url) || [],
  );
  const [uploading, setUploading] = useState(false);

  const set = (field: string, value: any) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setUploading(true);
    try {
      const urls = await Promise.all(files.map((f) => uploadToCloudinary(f)));
      setImageUrls((prev) => [...prev, ...urls]);
      toast.success(`${urls.length} image(s) uploaded`);
    } catch {
      toast.error("Image upload failed");
    } finally {
      setUploading(false);
    }
  };

  const addFeature = () => {
    const val = featureInput.trim();
    if (!val) return;
    const parts = val
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
    setFeatures((prev) => {
      const next = [...prev];
      parts.forEach((p) => {
        if (!next.includes(p)) next.push(p);
      });
      return next;
    });
    setFeatureInput("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit({
      ...form,
      price: parseFloat(form.price),
      bedrooms: form.bedrooms ? parseInt(form.bedrooms) : null,
      bathrooms: form.bathrooms ? parseInt(form.bathrooms) : null,
      area: form.area ? parseFloat(form.area) : null,
      commissionRate: parseFloat(form.commissionRate),
      features,
      images: imageUrls.map((url, i) => ({
        url,
        isPrimary: i === 0,
        order: i,
      })),
    });
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="space-y-5 max-h-[70vh] overflow-y-auto pr-1"
    >
      {/* Title + Type */}
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 space-y-1">
          <Label>Title *</Label>
          <Input
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            placeholder="e.g. Modern 3-Bedroom House in Kanifing"
            required
          />
        </div>
        <div className="space-y-1">
          <Label>Property Type *</Label>
          <Select value={form.type} onValueChange={(v) => set("type", v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {Object.entries(PROPERTY_TYPE_LABELS).map(([k, v]) => (
                <SelectItem key={k} value={k}>
                  {v}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Listing Type *</Label>
          <Select
            value={form.listingType}
            onValueChange={(v) => set("listingType", v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="FOR_SALE">For Sale</SelectItem>
              <SelectItem value="FOR_RENT">For Rent</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Price */}
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2 space-y-1">
          <Label>Price *</Label>
          <Input
            type="number"
            min="0"
            value={form.price}
            onChange={(e) => set("price", e.target.value)}
            placeholder="e.g. 2500000"
            required
          />
        </div>
        <div className="space-y-1">
          <Label>Currency</Label>
          <Select
            value={form.currency}
            onValueChange={(v) => set("currency", v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="GMD">GMD</SelectItem>
              <SelectItem value="USD">USD</SelectItem>
              <SelectItem value="EUR">EUR</SelectItem>
              <SelectItem value="GBP">GBP</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Specs */}
      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-1">
          <Label>Bedrooms</Label>
          <Input
            type="number"
            min="0"
            value={form.bedrooms}
            onChange={(e) => set("bedrooms", e.target.value)}
            placeholder="0"
          />
        </div>
        <div className="space-y-1">
          <Label>Bathrooms</Label>
          <Input
            type="number"
            min="0"
            value={form.bathrooms}
            onChange={(e) => set("bathrooms", e.target.value)}
            placeholder="0"
          />
        </div>
        <div className="space-y-1">
          <Label>Area (m²)</Label>
          <Input
            type="number"
            min="0"
            value={form.area}
            onChange={(e) => set("area", e.target.value)}
            placeholder="e.g. 200"
          />
        </div>
      </div>

      {/* Location */}
      <div className="grid grid-cols-2 gap-4">
        <div className="col-span-2 space-y-1">
          <Label>Address *</Label>
          <Input
            value={form.address}
            onChange={(e) => set("address", e.target.value)}
            placeholder="Street address"
            required
          />
        </div>
        <div className="space-y-1">
          <Label>City *</Label>
          <Input
            value={form.city}
            onChange={(e) => set("city", e.target.value)}
            placeholder="e.g. Banjul"
            required
          />
        </div>
        <div className="space-y-1">
          <Label>Region</Label>
          <Input
            value={form.region}
            onChange={(e) => set("region", e.target.value)}
            placeholder="e.g. Greater Banjul Area"
          />
        </div>
      </div>

      {/* Description */}
      <div className="space-y-1">
        <Label>Description</Label>
        <Textarea
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          placeholder="Describe the property..."
          rows={3}
        />
      </div>

      {/* Features */}
      <div className="space-y-2">
        <Label>Features & Amenities</Label>
        <div className="flex gap-2">
          <Input
            value={featureInput}
            onChange={(e) => setFeatureInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                addFeature();
              }
              if (e.key === ",") {
                e.preventDefault();
                addFeature();
              }
            }}
            placeholder="Type a feature, press Enter or comma to add"
          />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addFeature}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {features.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {features.map((f) => (
              <span
                key={f}
                className="inline-flex items-center gap-1 bg-primary/10 text-primary text-xs font-medium px-2 py-1 rounded-full"
              >
                {f}
                <button
                  type="button"
                  onClick={() =>
                    setFeatures((prev) => prev.filter((x) => x !== f))
                  }
                  className="hover:text-destructive transition-colors"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Contact */}
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-1">
          <Label>Contact Name *</Label>
          <Input
            value={form.contactName}
            onChange={(e) => set("contactName", e.target.value)}
            placeholder="Agent / Owner name"
            required
          />
        </div>
        <div className="space-y-1">
          <Label>Contact Phone *</Label>
          <Input
            value={form.contactPhone}
            onChange={(e) => set("contactPhone", e.target.value)}
            placeholder="+220..."
            required
          />
        </div>
        <div className="col-span-2 space-y-1">
          <Label>Contact Email</Label>
          <Input
            type="email"
            value={form.contactEmail}
            onChange={(e) => set("contactEmail", e.target.value)}
            placeholder="agent@email.com"
          />
        </div>
      </div>

      {/* Commission */}
      <div className="space-y-1">
        <Label>Commission Rate (e.g. 0.07 = 7%)</Label>
        <Input
          type="number"
          step="0.01"
          min="0"
          max="0.20"
          value={form.commissionRate}
          onChange={(e) => set("commissionRate", e.target.value)}
        />
      </div>

      {/* Toggles */}
      <div className="grid grid-cols-2 gap-4">
        {[
          ["negotiable", "Negotiable Price"],
          ["furnished", "Furnished"],
          ["serviced", "Serviced"],
          ["isActive", "Active (visible)"],
          ["isVerified", "Terango Verified ✓"],
          ["isFeatured", "Featured Listing ★"],
        ].map(([field, label]) => (
          <div key={field} className="flex items-center gap-2">
            <Switch
              checked={form[field as keyof typeof form] as boolean}
              onCheckedChange={(v) => set(field, v)}
            />
            <Label>{label}</Label>
          </div>
        ))}
      </div>

      {/* Status */}
      <div className="space-y-1">
        <Label>Status</Label>
        <Select value={form.status} onValueChange={(v) => set("status", v)}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="AVAILABLE">Available</SelectItem>
            <SelectItem value="UNDER_OFFER">Under Offer</SelectItem>
            <SelectItem value="SOLD">Sold</SelectItem>
            <SelectItem value="RENTED">Rented</SelectItem>
            <SelectItem value="INACTIVE">Inactive</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Images */}
      <div className="space-y-2">
        <Label>Images</Label>
        <div className="flex flex-wrap gap-2">
          {imageUrls.map((url, i) => (
            <div key={i} className="relative group">
              <img
                src={url}
                alt=""
                className={cn(
                  "w-20 h-20 object-cover rounded-lg border-2 cursor-pointer transition-all",
                  i === 0
                    ? "border-primary"
                    : "border-transparent hover:border-muted-foreground",
                )}
                title={i === 0 ? "Cover photo" : "Click to set as cover"}
                onClick={() => {
                  if (i === 0) return;
                  setImageUrls((prev) => {
                    const next = [...prev];
                    next.splice(i, 1);
                    next.unshift(url);
                    return next;
                  });
                }}
              />
              <button
                type="button"
                onClick={() =>
                  setImageUrls((prev) => prev.filter((_, idx) => idx !== i))
                }
                className="absolute -top-1 -right-1 bg-destructive text-destructive-foreground rounded-full w-5 h-5 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
              {i === 0 ? (
                <span className="absolute bottom-1 left-1 bg-primary text-primary-foreground text-[9px] px-1 rounded font-semibold">
                  Cover
                </span>
              ) : (
                <span className="absolute bottom-1 left-1 bg-black/50 text-white text-[9px] px-1 rounded opacity-0 group-hover:opacity-100 transition-opacity">
                  Set cover
                </span>
              )}
            </div>
          ))}
          <label
            className={cn(
              "w-20 h-20 border-2 border-dashed rounded-lg flex flex-col items-center justify-center cursor-pointer hover:bg-muted transition-colors",
              uploading && "opacity-50 pointer-events-none",
            )}
          >
            {uploading ? (
              <Loader2 className="h-5 w-5 animate-spin" />
            ) : (
              <Plus className="h-5 w-5 text-muted-foreground" />
            )}
            <span className="text-[10px] text-muted-foreground mt-1">
              Add photo
            </span>
            <input
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleImageUpload}
            />
          </label>
        </div>
      </div>

      <DialogFooter>
        <Button type="submit" disabled={loading || uploading}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            "Save Property"
          )}
        </Button>
      </DialogFooter>
    </form>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
function KerSpacePage() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("properties");
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [listingFilter, setListingFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [createOpen, setCreateOpen] = useState(false);
  const [editProperty, setEditProperty] = useState<Property | null>(null);
  const [deleteProperty, setDeleteProperty] = useState<Property | null>(null);
  const [viewProperty, setViewProperty] = useState<Property | null>(null);
  const [inquiryFilter, setInquiryFilter] = useState("ALL");
  const [appointmentFilter, setAppointmentFilter] = useState("ALL");

  // ─── Queries ─────────────────────────────────────────────────────────────
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["kerspace-stats"],
    queryFn: () => kerspaceApi.getStats().then((r) => r.data),
  });

  const {
    data: propertiesData,
    isLoading: propertiesLoading,
    refetch,
  } = useQuery({
    queryKey: [
      "kerspace-properties",
      search,
      typeFilter,
      listingFilter,
      statusFilter,
      page,
    ],
    queryFn: () =>
      kerspaceApi
        .getProperties({
          page,
          limit: 12,
          ...(search && { search }),
          ...(typeFilter !== "ALL" && { type: typeFilter }),
          ...(listingFilter !== "ALL" && { listingType: listingFilter }),
          ...(statusFilter !== "ALL" && { status: statusFilter }),
        })
        .then((r) => r.data),
    placeholderData: (prev) => prev,
  });

  const { data: inquiriesData, isLoading: inquiriesLoading } = useQuery({
    queryKey: ["kerspace-inquiries", inquiryFilter],
    queryFn: () =>
      kerspaceApi
        .getInquiries({
          limit: 20,
          ...(inquiryFilter !== "ALL" && { status: inquiryFilter }),
        })
        .then((r) => r.data),
  });

  const { data: appointmentsData, isLoading: appointmentsLoading } = useQuery({
    queryKey: ["kerspace-appointments", appointmentFilter],
    queryFn: () =>
      kerspaceApi
        .getAppointments({
          limit: 20,
          ...(appointmentFilter !== "ALL" && { status: appointmentFilter }),
        })
        .then((r) => r.data),
  });

  // ─── Mutations ────────────────────────────────────────────────────────────
  const createMutation = useMutation({
    mutationFn: (data: any) => kerspaceApi.createProperty(data),
    onSuccess: () => {
      toast.success("Property created successfully");
      setCreateOpen(false);
      queryClient.invalidateQueries({ queryKey: ["kerspace-properties"] });
      queryClient.invalidateQueries({ queryKey: ["kerspace-stats"] });
    },
    onError: () => toast.error("Failed to create property"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      kerspaceApi.updateProperty(id, data),
    onSuccess: () => {
      toast.success("Property updated");
      setEditProperty(null);
      queryClient.invalidateQueries({ queryKey: ["kerspace-properties"] });
    },
    onError: () => toast.error("Failed to update property"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => kerspaceApi.deleteProperty(id),
    onSuccess: () => {
      toast.success("Property deleted");
      setDeleteProperty(null);
      queryClient.invalidateQueries({ queryKey: ["kerspace-properties"] });
      queryClient.invalidateQueries({ queryKey: ["kerspace-stats"] });
    },
    onError: () => toast.error("Failed to delete property"),
  });

  const updateInquiryMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      kerspaceApi.updateInquiryStatus(id, status),
    onSuccess: () => {
      toast.success("Inquiry updated");
      queryClient.invalidateQueries({ queryKey: ["kerspace-inquiries"] });
      queryClient.invalidateQueries({ queryKey: ["kerspace-stats"] });
    },
  });

  const updateAppointmentMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      kerspaceApi.updateAppointmentStatus(id, status),
    onSuccess: () => {
      toast.success("Appointment updated");
      queryClient.invalidateQueries({ queryKey: ["kerspace-appointments"] });
      queryClient.invalidateQueries({ queryKey: ["kerspace-stats"] });
    },
  });

  const toggleVerified = useCallback(
    (p: Property) => {
      updateMutation.mutate({ id: p.id, data: { isVerified: !p.isVerified } });
    },
    [updateMutation],
  );

  const toggleFeatured = useCallback(
    (p: Property) => {
      updateMutation.mutate({ id: p.id, data: { isFeatured: !p.isFeatured } });
    },
    [updateMutation],
  );

  const properties: Property[] = propertiesData?.data || [];
  const meta = propertiesData?.meta;
  const inquiries: Inquiry[] = inquiriesData?.data || [];
  const appointments: Appointment[] = appointmentsData?.data || [];

  return (
    <>
      <Header fixed>
        <div className="flex items-center gap-2">
          <Building2 className="h-5 w-5 text-primary" />
          <span className="font-semibold text-lg">KërSpace</span>
          <Badge variant="secondary" className="ml-1">
            Real Estate
          </Badge>
        </div>
        <div className="ml-auto flex items-center gap-2">
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        {/* ── Stats Row ──────────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <StatCard
            title="Total Listings"
            value={stats?.totalListings ?? 0}
            icon={Building2}
            color="bg-blue-500"
            loading={statsLoading}
          />
          <StatCard
            title="For Sale"
            value={stats?.forSale ?? 0}
            icon={Tag}
            color="bg-green-500"
            loading={statsLoading}
          />
          <StatCard
            title="For Rent"
            value={stats?.forRent ?? 0}
            icon={Home}
            color="bg-purple-500"
            loading={statsLoading}
          />
          <StatCard
            title="Pending Inquiries"
            value={stats?.pendingInquiries ?? 0}
            icon={MessageSquare}
            color="bg-orange-500"
            loading={statsLoading}
          />
          <StatCard
            title="Pending Appointments"
            value={stats?.pendingAppointments ?? 0}
            icon={Calendar}
            color="bg-red-500"
            loading={statsLoading}
          />
          <StatCard
            title="Featured Listings"
            value={stats?.featuredListings ?? 0}
            icon={Star}
            color="bg-yellow-500"
            loading={statsLoading}
          />
          <StatCard
            title="Verified"
            value={stats?.verifiedListings ?? 0}
            icon={CheckCircle}
            color="bg-teal-500"
            loading={statsLoading}
          />
          <StatCard
            title="Active Listings"
            value={stats?.activeListings ?? 0}
            icon={BarChart3}
            color="bg-indigo-500"
            loading={statsLoading}
          />
        </div>

        {/* ── Tabs ───────────────────────────────────────────────────────────── */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <div className="flex items-center justify-between mb-4">
            <TabsList>
              <TabsTrigger
                value="properties"
                className="flex items-center gap-1.5"
              >
                <Building2 className="h-4 w-4" /> Properties
              </TabsTrigger>
              <TabsTrigger
                value="inquiries"
                className="flex items-center gap-1.5"
              >
                <MessageSquare className="h-4 w-4" /> Inquiries
                {(stats?.pendingInquiries ?? 0) > 0 && (
                  <Badge
                    variant="destructive"
                    className="h-4 min-w-4 text-[10px] px-1"
                  >
                    {stats.pendingInquiries}
                  </Badge>
                )}
              </TabsTrigger>
              <TabsTrigger
                value="appointments"
                className="flex items-center gap-1.5"
              >
                <Calendar className="h-4 w-4" /> Appointments
                {(stats?.pendingAppointments ?? 0) > 0 && (
                  <Badge
                    variant="destructive"
                    className="h-4 min-w-4 text-[10px] px-1"
                  >
                    {stats.pendingAppointments}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>
            {activeTab === "properties" && (
              <Button onClick={() => setCreateOpen(true)} size="sm">
                <Plus className="h-4 w-4 mr-1" /> Add Listing
              </Button>
            )}
          </div>

          {/* ── Properties Tab ──────────────────────────────────────────────── */}
          <TabsContent value="properties">
            {/* Filters */}
            <div className="flex flex-wrap gap-2 mb-4">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search listings..."
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPage(1);
                  }}
                />
              </div>
              <Select
                value={typeFilter}
                onValueChange={(v) => {
                  setTypeFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Types</SelectItem>
                  {Object.entries(PROPERTY_TYPE_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>
                      {v}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={listingFilter}
                onValueChange={(v) => {
                  setListingFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Listing" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Listings</SelectItem>
                  <SelectItem value="FOR_SALE">For Sale</SelectItem>
                  <SelectItem value="FOR_RENT">For Rent</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={statusFilter}
                onValueChange={(v) => {
                  setStatusFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All Status</SelectItem>
                  <SelectItem value="AVAILABLE">Available</SelectItem>
                  <SelectItem value="UNDER_OFFER">Under Offer</SelectItem>
                  <SelectItem value="SOLD">Sold</SelectItem>
                  <SelectItem value="RENTED">Rented</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="icon" onClick={() => refetch()}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>

            {/* Properties Grid */}
            {propertiesLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i}>
                    <Skeleton className="h-48 rounded-t-lg" />
                    <CardContent className="pt-4 space-y-2">
                      <Skeleton className="h-5 w-3/4" />
                      <Skeleton className="h-4 w-1/2" />
                      <Skeleton className="h-4 w-1/3" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : properties.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-center">
                <Building2 className="h-12 w-12 text-muted-foreground mb-3" />
                <p className="font-medium text-muted-foreground">
                  No listings found
                </p>
                <Button className="mt-4" onClick={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4 mr-1" /> Add First Listing
                </Button>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {properties.map((p) => (
                    <Card
                      key={p.id}
                      className={cn(
                        "overflow-hidden group hover:shadow-md transition-shadow",
                        !p.isActive && "opacity-60",
                      )}
                    >
                      {/* Image */}
                      <div className="relative h-48 bg-muted overflow-hidden">
                        {p.images[0] ? (
                          <img
                            src={p.images[0].url}
                            alt={p.title}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <ImageIcon className="h-10 w-10 text-muted-foreground" />
                          </div>
                        )}
                        {/* Badges overlay */}
                        <div className="absolute top-2 left-2 flex flex-wrap gap-1">
                          <span
                            className={cn(
                              "text-xs font-semibold px-2 py-0.5 rounded-full",
                              LISTING_TYPE_COLORS[p.listingType],
                            )}
                          >
                            {p.listingType === "FOR_SALE"
                              ? "For Sale"
                              : "For Rent"}
                          </span>
                          {p.isFeatured && (
                            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-yellow-400 text-yellow-900">
                              ★ Featured
                            </span>
                          )}
                        </div>
                        {p.isVerified && (
                          <div className="absolute top-2 right-2">
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-primary text-primary-foreground flex items-center gap-1">
                              <CheckCircle className="h-3 w-3" /> Verified
                            </span>
                          </div>
                        )}
                        <div className="absolute bottom-2 right-2">
                          <span
                            className={cn(
                              "text-xs font-semibold px-2 py-0.5 rounded-full",
                              STATUS_COLORS[p.status],
                            )}
                          >
                            {p.status.replace("_", " ")}
                          </span>
                        </div>
                      </div>

                      <CardContent className="pt-3 pb-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold text-sm truncate">
                              {p.title}
                            </p>
                            <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                              <MapPin className="h-3 w-3" /> {p.city}
                              {p.region && `, ${p.region}`}
                            </p>
                          </div>
                          <p className="font-bold text-primary text-sm whitespace-nowrap">
                            {formatPrice(p.price, p.currency)}
                          </p>
                        </div>

                        {/* Specs row */}
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1 capitalize">
                            <Building2 className="h-3 w-3" />
                            {PROPERTY_TYPE_LABELS[p.type]}
                          </span>
                          {p.bedrooms != null && (
                            <span className="flex items-center gap-1">
                              <BedDouble className="h-3 w-3" /> {p.bedrooms} bd
                            </span>
                          )}
                          {p.bathrooms != null && (
                            <span className="flex items-center gap-1">
                              <Bath className="h-3 w-3" /> {p.bathrooms} ba
                            </span>
                          )}
                          {p.area && <span>{p.area}m²</span>}
                        </div>

                        {/* Stats row */}
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span>
                            <Eye className="h-3 w-3 inline" /> {p.viewCount}
                          </span>
                          <span>
                            <MessageSquare className="h-3 w-3 inline" />{" "}
                            {p.inquiryCount}
                          </span>
                          <span className="text-orange-600 font-medium">
                            {(p.commissionRate * 100).toFixed(0)}% commission
                          </span>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 mt-3">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1 h-8 text-xs"
                            onClick={() => setViewProperty(p)}
                          >
                            <Eye className="h-3 w-3 mr-1" /> View
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs px-2"
                            onClick={() => toggleVerified(p)}
                            title={
                              p.isVerified ? "Remove verification" : "Verify"
                            }
                          >
                            <CheckCircle
                              className={cn(
                                "h-3.5 w-3.5",
                                p.isVerified ? "text-primary fill-primary" : "",
                              )}
                            />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="h-8 text-xs px-2"
                            onClick={() => toggleFeatured(p)}
                            title={p.isFeatured ? "Remove featured" : "Feature"}
                          >
                            <Star
                              className={cn(
                                "h-3.5 w-3.5",
                                p.isFeatured
                                  ? "text-yellow-500 fill-yellow-500"
                                  : "",
                              )}
                            />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 px-0"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => setEditProperty(p)}
                              >
                                <Edit className="h-4 w-4 mr-2" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => setDeleteProperty(p)}
                              >
                                <Trash2 className="h-4 w-4 mr-2" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Pagination */}
                {meta && meta.totalPages > 1 && (
                  <div className="flex items-center justify-between mt-6">
                    <p className="text-sm text-muted-foreground">
                      Showing {(page - 1) * 12 + 1}–
                      {Math.min(page * 12, meta.total)} of {meta.total}
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setPage((p) => Math.max(1, p - 1))}
                        disabled={page === 1}
                      >
                        Previous
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          setPage((p) => Math.min(meta.totalPages, p + 1))
                        }
                        disabled={page === meta.totalPages}
                      >
                        Next
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </TabsContent>

          {/* ── Inquiries Tab ───────────────────────────────────────────────── */}
          <TabsContent value="inquiries">
            <div className="flex gap-2 mb-4">
              {["ALL", "PENDING", "CONTACTED", "CLOSED"].map((s) => (
                <Button
                  key={s}
                  size="sm"
                  variant={inquiryFilter === s ? "default" : "outline"}
                  onClick={() => setInquiryFilter(s)}
                >
                  {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
                </Button>
              ))}
            </div>
            {inquiriesLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-20" />
                ))}
              </div>
            ) : inquiries.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <MessageSquare className="h-10 w-10 mx-auto mb-2" />
                No inquiries found
              </div>
            ) : (
              <div className="space-y-3">
                {inquiries.map((inq) => (
                  <Card key={inq.id}>
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-sm">
                              {inq.fullName}
                            </p>
                            <Badge variant="outline" className="text-xs">
                              {inq.inquiryType}
                            </Badge>
                            <span
                              className={cn(
                                "text-xs px-2 py-0.5 rounded-full font-medium",
                                inq.status === "PENDING"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : inq.status === "CONTACTED"
                                    ? "bg-blue-100 text-blue-800"
                                    : "bg-gray-100 text-gray-600",
                              )}
                            >
                              {inq.status}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-3">
                            <span>
                              <Phone className="h-3 w-3 inline mr-1" />
                              {inq.phone}
                            </span>
                            {inq.email && (
                              <span>
                                <Mail className="h-3 w-3 inline mr-1" />
                                {inq.email}
                              </span>
                            )}
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            <Building2 className="h-3 w-3 inline mr-1" />
                            {inq.property.title} — {inq.property.city}
                          </p>
                          {inq.message && (
                            <p className="text-xs mt-1 text-foreground/70 italic">
                              "{inq.message}"
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col gap-1 shrink-0">
                          <p className="text-xs text-muted-foreground">
                            {new Date(inq.createdAt).toLocaleDateString()}
                          </p>
                          <Select
                            defaultValue={inq.status}
                            onValueChange={(v) =>
                              updateInquiryMutation.mutate({
                                id: inq.id,
                                status: v,
                              })
                            }
                          >
                            <SelectTrigger className="h-7 text-xs w-[110px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="PENDING">Pending</SelectItem>
                              <SelectItem value="CONTACTED">
                                Contacted
                              </SelectItem>
                              <SelectItem value="CLOSED">Closed</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* ── Appointments Tab ────────────────────────────────────────────── */}
          <TabsContent value="appointments">
            <div className="flex gap-2 mb-4">
              {["ALL", "PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"].map(
                (s) => (
                  <Button
                    key={s}
                    size="sm"
                    variant={appointmentFilter === s ? "default" : "outline"}
                    onClick={() => setAppointmentFilter(s)}
                  >
                    {s === "ALL"
                      ? "All"
                      : s.charAt(0) + s.slice(1).toLowerCase()}
                  </Button>
                ),
              )}
            </div>
            {appointmentsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-20" />
                ))}
              </div>
            ) : appointments.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Calendar className="h-10 w-10 mx-auto mb-2" />
                No appointments found
              </div>
            ) : (
              <div className="space-y-3">
                {appointments.map((apt) => (
                  <Card key={apt.id}>
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-sm">
                              {apt.fullName}
                            </p>
                            <span
                              className={cn(
                                "text-xs px-2 py-0.5 rounded-full font-medium",
                                apt.status === "PENDING"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : apt.status === "CONFIRMED"
                                    ? "bg-green-100 text-green-800"
                                    : apt.status === "COMPLETED"
                                      ? "bg-blue-100 text-blue-800"
                                      : "bg-red-100 text-red-700",
                              )}
                            >
                              {apt.status}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1 flex items-center gap-3">
                            <span>
                              <Phone className="h-3 w-3 inline mr-1" />
                              {apt.phone}
                            </span>
                            <span>
                              <Calendar className="h-3 w-3 inline mr-1" />
                              {new Date(
                                apt.preferredDate,
                              ).toLocaleDateString()}{" "}
                              · {apt.preferredTime}
                            </span>
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            <Building2 className="h-3 w-3 inline mr-1" />
                            {apt.property.title} — {apt.property.city}
                          </p>
                          {apt.notes && (
                            <p className="text-xs mt-1 text-foreground/70 italic">
                              "{apt.notes}"
                            </p>
                          )}
                        </div>
                        <div className="flex flex-col gap-1 shrink-0">
                          <p className="text-xs text-muted-foreground">
                            {new Date(apt.createdAt).toLocaleDateString()}
                          </p>
                          <Select
                            defaultValue={apt.status}
                            onValueChange={(v) =>
                              updateAppointmentMutation.mutate({
                                id: apt.id,
                                status: v,
                              })
                            }
                          >
                            <SelectTrigger className="h-7 text-xs w-[120px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="PENDING">Pending</SelectItem>
                              <SelectItem value="CONFIRMED">
                                Confirmed
                              </SelectItem>
                              <SelectItem value="COMPLETED">
                                Completed
                              </SelectItem>
                              <SelectItem value="CANCELLED">
                                Cancelled
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </Main>

      {/* ── Create Dialog ─────────────────────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Add New Listing</DialogTitle>
            <DialogDescription>
              Create a new KërSpace property listing
            </DialogDescription>
          </DialogHeader>
          <PropertyForm
            onSubmit={(data) => createMutation.mutate(data)}
            loading={createMutation.isPending}
          />
        </DialogContent>
      </Dialog>

      {/* ── Edit Dialog ───────────────────────────────────────────────────────── */}
      <Dialog
        open={!!editProperty}
        onOpenChange={(v) => !v && setEditProperty(null)}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Edit Listing</DialogTitle>
            <DialogDescription>{editProperty?.title}</DialogDescription>
          </DialogHeader>
          {editProperty && (
            <PropertyForm
              initial={editProperty}
              onSubmit={(data) =>
                updateMutation.mutate({ id: editProperty.id, data })
              }
              loading={updateMutation.isPending}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* ── Delete Confirm ────────────────────────────────────────────────────── */}
      <Dialog
        open={!!deleteProperty}
        onOpenChange={(v) => !v && setDeleteProperty(null)}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Listing</DialogTitle>
            <DialogDescription>
              Are you sure you want to permanently delete "
              {deleteProperty?.title}"? This will also delete all inquiries and
              appointments linked to it.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteProperty(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() =>
                deleteProperty && deleteMutation.mutate(deleteProperty.id)
              }
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Delete"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── View Property Dialog ──────────────────────────────────────────────── */}
      <Dialog
        open={!!viewProperty}
        onOpenChange={(v) => !v && setViewProperty(null)}
      >
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          {viewProperty && (
            <>
              <DialogHeader>
                <DialogTitle>{viewProperty.title}</DialogTitle>
                <DialogDescription>
                  {viewProperty.address}, {viewProperty.city}
                </DialogDescription>
              </DialogHeader>
              {/* Image gallery */}
              {viewProperty.images.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {viewProperty.images.map((img) => (
                    <img
                      key={img.id}
                      src={img.url}
                      alt=""
                      className="h-32 w-48 object-cover rounded-lg shrink-0"
                    />
                  ))}
                </div>
              )}
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Price</span>
                  <p className="font-bold text-primary">
                    {formatPrice(viewProperty.price, viewProperty.currency)}
                  </p>
                </div>
                <div>
                  <span className="text-muted-foreground">Type</span>
                  <p>
                    {PROPERTY_TYPE_LABELS[viewProperty.type]} ·{" "}
                    {viewProperty.listingType.replace("_", " ")}
                  </p>
                </div>
                {viewProperty.bedrooms != null && (
                  <div>
                    <span className="text-muted-foreground">Bedrooms</span>
                    <p>{viewProperty.bedrooms}</p>
                  </div>
                )}
                {viewProperty.bathrooms != null && (
                  <div>
                    <span className="text-muted-foreground">Bathrooms</span>
                    <p>{viewProperty.bathrooms}</p>
                  </div>
                )}
                {viewProperty.area && (
                  <div>
                    <span className="text-muted-foreground">Area</span>
                    <p>{viewProperty.area}m²</p>
                  </div>
                )}
                <div>
                  <span className="text-muted-foreground">Status</span>
                  <p>{viewProperty.status}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Commission</span>
                  <p>{(viewProperty.commissionRate * 100).toFixed(0)}%</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Views</span>
                  <p>{viewProperty.viewCount}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Contact</span>
                  <p>
                    {viewProperty.contactName} · {viewProperty.contactPhone}
                  </p>
                </div>
              </div>
              {viewProperty.description && (
                <div className="mt-2">
                  <p className="text-sm text-muted-foreground mb-1">
                    Description
                  </p>
                  <p className="text-sm">{viewProperty.description}</p>
                </div>
              )}
              {viewProperty.features.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {viewProperty.features.map((f) => (
                    <Badge key={f} variant="secondary">
                      {f}
                    </Badge>
                  ))}
                </div>
              )}
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => {
                    setViewProperty(null);
                    setEditProperty(viewProperty);
                  }}
                >
                  <Edit className="h-4 w-4 mr-1" /> Edit
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

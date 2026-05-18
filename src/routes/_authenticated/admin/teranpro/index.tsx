// @ts-nocheck
import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  RefreshCw,
  Briefcase,
  MapPin,
  Star,
  CheckCircle2,
  Ban,
  Loader2,
  Image as ImageIcon,
  X,
  Tag,
  Phone,
  Mail,
  DollarSign,
  MoreHorizontal,
  Eye,
  FolderTree,
  BadgeCheck,
  Layers,
} from "lucide-react";
import { toast } from "sonner";
import { teranProApi } from "@/lib/api";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
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
import { TopNav } from "@/components/layout/top-nav";
import { ProfileDropdown } from "@/components/profile-dropdown";
import { ThemeSwitch } from "@/components/theme-switch";
import { cn } from "@/lib/utils";

// ─── Cloudinary ───────────────────────────────────────────────────────────────
const CLOUDINARY_CLOUD_NAME = "dkpi5ij2t";
const CLOUDINARY_UPLOAD_PRESET = "unsigned_preset";

async function uploadToCloudinary(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: "POST", body: formData },
  );
  if (!res.ok) throw new Error("Image upload failed");
  const data = await res.json();
  return data.secure_url;
}

// Fix Leaflet default marker icons
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// ─── Location Picker Map ──────────────────────────────────────────────────────
function LocationPickerMap({
  lat,
  lng,
  onChange,
}: {
  lat: number | null;
  lng: number | null;
  onChange: (lat: number, lng: number) => void;
}) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);

  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const initialLat = lat ?? 13.4549;
    const initialLng = lng ?? -16.579;

    const map = L.map(mapContainerRef.current).setView(
      [initialLat, initialLng],
      13,
    );
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
      maxZoom: 19,
    }).addTo(map);

    if (lat !== null && lng !== null) {
      markerRef.current = L.marker([lat, lng]).addTo(map);
    }

    map.on("click", (e: L.LeafletMouseEvent) => {
      const { lat: clickLat, lng: clickLng } = e.latlng;
      onChange(clickLat, clickLng);
      if (markerRef.current) {
        markerRef.current.setLatLng([clickLat, clickLng]);
      } else {
        markerRef.current = L.marker([clickLat, clickLng]).addTo(map);
      }
    });

    mapRef.current = map;
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
        markerRef.current = null;
      }
    };
  }, []);

  // Sync external lat/lng changes (e.g. editing existing service)
  useEffect(() => {
    if (!mapRef.current || lat === null || lng === null) return;
    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]);
    } else {
      markerRef.current = L.marker([lat, lng]).addTo(mapRef.current);
    }
    mapRef.current.setView([lat, lng], mapRef.current.getZoom());
  }, [lat, lng]);

  return (
    <div className="space-y-1">
      <div
        ref={mapContainerRef}
        style={{
          height: 300,
          borderRadius: 8,
          border: "1px solid hsl(var(--border))",
        }}
      />
      {lat !== null && lng !== null ? (
        <p className="text-xs text-muted-foreground">
          📍 {lat.toFixed(6)}, {lng.toFixed(6)} — click map to change
        </p>
      ) : (
        <p className="text-xs text-muted-foreground">
          Click on the map to set location
        </p>
      )}
    </div>
  );
}

// ─── Route ────────────────────────────────────────────────────────────────────
export const Route = createFileRoute("/_authenticated/admin/teranpro/")({
  component: TeranProPage,
});

const topNav = [
  { title: "Overview", href: "/admin", isActive: false },
  { title: "TeranPro", href: "/admin/teranpro", isActive: true },
];

// ─── Types ────────────────────────────────────────────────────────────────────
interface TeranProCategory {
  id: string;
  name: string;
  description?: string;
  imageUrl?: string;
  icon?: string;
  isActive: boolean;
  sortOrder: number;
  _count?: { services: number };
}

interface TeranProService {
  id: string;
  name: string;
  description?: string;
  categoryId: string;
  category?: { id: string; name: string; icon?: string };
  imageUrls: string[];
  latitude: number;
  longitude: number;
  address?: string;
  city?: string;
  state?: string;
  phone?: string;
  email?: string;
  priceFrom?: number;
  priceTo?: number;
  priceUnit?: string;
  isActive: boolean;
  isFeatured: boolean;
  isVerified: boolean;
  rating: number;
  totalReviews: number;
  tags: string[];
  createdAt: string;
}

// ─── Empty forms ──────────────────────────────────────────────────────────────
const emptyCategoryForm = {
  name: "",
  description: "",
  imageUrl: "",
  icon: "",
  isActive: true,
  sortOrder: 0,
};

const emptyServiceForm = {
  name: "",
  description: "",
  categoryId: "",
  imageUrls: [] as string[],
  latitude: null as number | null,
  longitude: null as number | null,
  address: "",
  city: "",
  state: "",
  phone: "",
  email: "",
  priceFrom: "",
  priceTo: "",
  priceUnit: "per job",
  isActive: true,
  isFeatured: false,
  isVerified: false,
  tags: "",
};

// ─── Main Page ────────────────────────────────────────────────────────────────
function TeranProPage() {
  const qc = useQueryClient();

  // ─── Stats ─────────────────────────────────────────────────────────────────
  const { data: stats } = useQuery({
    queryKey: ["teranpro-stats"],
    queryFn: () => teranProApi.getStats().then((r) => r.data),
  });

  // ─── Categories state ───────────────────────────────────────────────────────
  const [catSearch, setCatSearch] = useState("");
  const [selectedCat, setSelectedCat] = useState<TeranProCategory | null>(null);
  const [isCatFormOpen, setIsCatFormOpen] = useState(false);
  const [isCatDeleteOpen, setIsCatDeleteOpen] = useState(false);
  const [catForm, setCatForm] = useState({ ...emptyCategoryForm });
  const [catImageFile, setCatImageFile] = useState<File | null>(null);
  const [catImageUploading, setCatImageUploading] = useState(false);
  const [editingCat, setEditingCat] = useState<TeranProCategory | null>(null);

  const { data: categories = [], isLoading: catsLoading } = useQuery({
    queryKey: ["teranpro-categories"],
    queryFn: () => teranProApi.getCategories().then((r) => r.data),
  });

  const createCatMutation = useMutation({
    mutationFn: (data: any) => teranProApi.createCategory(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["teranpro-categories"] });
      qc.invalidateQueries({ queryKey: ["teranpro-stats"] });
      toast.success("Category created");
      setIsCatFormOpen(false);
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.error || "Failed to create category"),
  });

  const updateCatMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      teranProApi.updateCategory(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["teranpro-categories"] });
      toast.success("Category updated");
      setIsCatFormOpen(false);
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.error || "Failed to update category"),
  });

  const deleteCatMutation = useMutation({
    mutationFn: (id: string) => teranProApi.deleteCategory(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["teranpro-categories"] });
      qc.invalidateQueries({ queryKey: ["teranpro-stats"] });
      toast.success("Category deleted");
      setIsCatDeleteOpen(false);
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.error || "Failed to delete category"),
  });

  function openCreateCat() {
    setEditingCat(null);
    setCatForm({ ...emptyCategoryForm });
    setCatImageFile(null);
    setIsCatFormOpen(true);
  }

  function openEditCat(cat: TeranProCategory) {
    setEditingCat(cat);
    setCatForm({
      name: cat.name,
      description: cat.description || "",
      imageUrl: cat.imageUrl || "",
      icon: cat.icon || "",
      isActive: cat.isActive,
      sortOrder: cat.sortOrder,
    });
    setCatImageFile(null);
    setIsCatFormOpen(true);
  }

  async function submitCatForm() {
    let imageUrl = catForm.imageUrl;
    if (catImageFile) {
      try {
        setCatImageUploading(true);
        imageUrl = await uploadToCloudinary(catImageFile);
      } catch {
        toast.error("Image upload failed");
        return;
      } finally {
        setCatImageUploading(false);
      }
    }
    const payload = {
      ...catForm,
      imageUrl,
      sortOrder: Number(catForm.sortOrder),
    };
    if (editingCat) {
      updateCatMutation.mutate({ id: editingCat.id, data: payload });
    } else {
      createCatMutation.mutate(payload);
    }
  }

  const filteredCategories = (categories as TeranProCategory[]).filter((c) =>
    c.name.toLowerCase().includes(catSearch.toLowerCase()),
  );

  // ─── Services state ─────────────────────────────────────────────────────────
  const [svcSearch, setSvcSearch] = useState("");
  const [svcCatFilter, setSvcCatFilter] = useState("all");
  const [svcStatusFilter, setSvcStatusFilter] = useState("all");
  const [selectedSvc, setSelectedSvc] = useState<TeranProService | null>(null);
  const [isSvcFormOpen, setIsSvcFormOpen] = useState(false);
  const [isSvcDeleteOpen, setIsSvcDeleteOpen] = useState(false);
  const [isSvcDetailsOpen, setIsSvcDetailsOpen] = useState(false);
  const [svcForm, setSvcForm] = useState({ ...emptyServiceForm });
  const [svcImageFiles, setSvcImageFiles] = useState<File[]>([]);
  const [svcImageUploading, setSvcImageUploading] = useState(false);
  const [editingSvc, setEditingSvc] = useState<TeranProService | null>(null);

  const svcParams: any = {};
  if (svcSearch) svcParams.search = svcSearch;
  if (svcCatFilter !== "all") svcParams.categoryId = svcCatFilter;
  if (svcStatusFilter === "active") svcParams.isActive = "true";
  if (svcStatusFilter === "inactive") svcParams.isActive = "false";
  if (svcStatusFilter === "featured") svcParams.isFeatured = "true";
  if (svcStatusFilter === "verified") svcParams.isVerified = "true";

  const {
    data: svcData,
    isLoading: svcsLoading,
    refetch: refetchSvcs,
  } = useQuery({
    queryKey: ["teranpro-services", svcParams],
    queryFn: () => teranProApi.getServices(svcParams).then((r) => r.data),
  });
  const services: TeranProService[] = svcData?.services ?? [];

  const createSvcMutation = useMutation({
    mutationFn: (data: any) => teranProApi.createService(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["teranpro-services"] });
      qc.invalidateQueries({ queryKey: ["teranpro-stats"] });
      toast.success("Service created");
      setIsSvcFormOpen(false);
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.error || "Failed to create service"),
  });

  const updateSvcMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      teranProApi.updateService(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["teranpro-services"] });
      toast.success("Service updated");
      setIsSvcFormOpen(false);
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.error || "Failed to update service"),
  });

  const deleteSvcMutation = useMutation({
    mutationFn: (id: string) => teranProApi.deleteService(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["teranpro-services"] });
      qc.invalidateQueries({ queryKey: ["teranpro-stats"] });
      toast.success("Service deleted");
      setIsSvcDeleteOpen(false);
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.error || "Failed to delete service"),
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (id: string) => teranProApi.toggleActive(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["teranpro-services"] }),
    onError: () => toast.error("Failed to toggle status"),
  });

  const toggleFeaturedMutation = useMutation({
    mutationFn: (id: string) => teranProApi.toggleFeatured(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["teranpro-services"] }),
    onError: () => toast.error("Failed to toggle featured"),
  });

  const toggleVerifiedMutation = useMutation({
    mutationFn: (id: string) => teranProApi.toggleVerified(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["teranpro-services"] }),
    onError: () => toast.error("Failed to toggle verified"),
  });

  function openCreateSvc() {
    setEditingSvc(null);
    setSvcForm({ ...emptyServiceForm });
    setSvcImageFiles([]);
    setIsSvcFormOpen(true);
  }

  function openEditSvc(svc: TeranProService) {
    setEditingSvc(svc);
    setSvcForm({
      name: svc.name,
      description: svc.description || "",
      categoryId: svc.categoryId,
      imageUrls: svc.imageUrls,
      latitude: svc.latitude,
      longitude: svc.longitude,
      address: svc.address || "",
      city: svc.city || "",
      state: svc.state || "",
      phone: svc.phone || "",
      email: svc.email || "",
      priceFrom: svc.priceFrom?.toString() || "",
      priceTo: svc.priceTo?.toString() || "",
      priceUnit: svc.priceUnit || "per job",
      isActive: svc.isActive,
      isFeatured: svc.isFeatured,
      isVerified: svc.isVerified,
      tags: svc.tags.join(", "),
    });
    setSvcImageFiles([]);
    setIsSvcFormOpen(true);
  }

  async function submitSvcForm() {
    if (!svcForm.name.trim()) return toast.error("Service name is required");
    if (!svcForm.categoryId) return toast.error("Category is required");
    if (svcForm.latitude === null || svcForm.longitude === null) {
      return toast.error("Please click on the map to set the GPS location");
    }

    let imageUrls = [
      ...(Array.isArray(svcForm.imageUrls) ? svcForm.imageUrls : []),
    ];
    if (svcImageFiles.length > 0) {
      try {
        setSvcImageUploading(true);
        const uploaded = await Promise.all(
          svcImageFiles.map(uploadToCloudinary),
        );
        imageUrls = [...imageUrls, ...uploaded];
      } catch {
        toast.error("One or more image uploads failed");
        return;
      } finally {
        setSvcImageUploading(false);
      }
    }

    const tags = svcForm.tags
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);

    const payload = {
      name: svcForm.name.trim(),
      description: svcForm.description.trim() || null,
      categoryId: svcForm.categoryId,
      imageUrls,
      latitude: svcForm.latitude,
      longitude: svcForm.longitude,
      address: svcForm.address.trim() || null,
      city: svcForm.city.trim() || null,
      state: svcForm.state.trim() || null,
      phone: svcForm.phone.trim() || null,
      email: svcForm.email.trim() || null,
      priceFrom: svcForm.priceFrom ? parseFloat(svcForm.priceFrom) : null,
      priceTo: svcForm.priceTo ? parseFloat(svcForm.priceTo) : null,
      priceUnit: svcForm.priceUnit || null,
      isActive: svcForm.isActive,
      isFeatured: svcForm.isFeatured,
      isVerified: svcForm.isVerified,
      tags,
    };

    if (editingSvc) {
      updateSvcMutation.mutate({ id: editingSvc.id, data: payload });
    } else {
      createSvcMutation.mutate(payload);
    }
  }

  function removeExistingImage(url: string) {
    setSvcForm((f) => ({
      ...f,
      imageUrls: f.imageUrls.filter((u) => u !== url),
    }));
  }

  // ─── Render ─────────────────────────────────────────────────────────────────
  return (
    <>
      <Header>
        <TopNav links={topNav} />
        <div className="ml-auto flex items-center gap-2">
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className="mb-6">
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <Briefcase className="h-6 w-6" /> TeranPro Professional Services
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage professional service listings with GPS locations
          </p>
        </div>

        {/* Stats cards */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4 mb-6">
          {[
            {
              label: "Total Services",
              value: stats?.total ?? "—",
              icon: Briefcase,
            },
            {
              label: "Active",
              value: stats?.active ?? "—",
              icon: CheckCircle2,
            },
            { label: "Featured", value: stats?.featured ?? "—", icon: Star },
            {
              label: "Verified",
              value: stats?.verified ?? "—",
              icon: BadgeCheck,
            },
            {
              label: "Categories",
              value: stats?.categories ?? "—",
              icon: Layers,
            },
          ].map(({ label, value, icon: Icon }) => (
            <Card key={label}>
              <CardContent className="pt-4 pb-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-muted-foreground">{label}</p>
                    <p className="text-2xl font-bold">{value}</p>
                  </div>
                  <Icon className="h-5 w-5 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Tabs */}
        <Tabs defaultValue="services">
          <TabsList className="mb-4">
            <TabsTrigger value="services">
              <Briefcase className="h-4 w-4 mr-2" /> Services
            </TabsTrigger>
            <TabsTrigger value="categories">
              <FolderTree className="h-4 w-4 mr-2" /> Categories
            </TabsTrigger>
          </TabsList>

          {/* ── SERVICES TAB ─────────────────────────────────────────────────── */}
          <TabsContent value="services">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
                  <CardTitle>Pro Services</CardTitle>
                  <Button size="sm" onClick={openCreateSvc}>
                    <Plus className="h-4 w-4 mr-2" /> Add Service
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-3">
                  <div className="relative flex-1 min-w-48">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search services..."
                      className="pl-9"
                      value={svcSearch}
                      onChange={(e) => setSvcSearch(e.target.value)}
                    />
                  </div>
                  <Select value={svcCatFilter} onValueChange={setSvcCatFilter}>
                    <SelectTrigger className="w-44">
                      <SelectValue placeholder="All Categories" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {(categories as TeranProCategory[]).map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={svcStatusFilter}
                    onValueChange={setSvcStatusFilter}
                  >
                    <SelectTrigger className="w-36">
                      <SelectValue placeholder="All Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="featured">Featured</SelectItem>
                      <SelectItem value="verified">Verified</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => refetchSvcs()}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {svcsLoading ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : services.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    No services found
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b text-left">
                          <th className="pb-2 font-medium">Service</th>
                          <th className="pb-2 font-medium hidden md:table-cell">
                            Category
                          </th>
                          <th className="pb-2 font-medium hidden md:table-cell">
                            Location
                          </th>
                          <th className="pb-2 font-medium hidden lg:table-cell">
                            Price
                          </th>
                          <th className="pb-2 font-medium">Status</th>
                          <th className="pb-2 font-medium text-right">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {services.map((svc) => (
                          <tr
                            key={svc.id}
                            className="border-b last:border-0 hover:bg-muted/30"
                          >
                            <td className="py-3 pr-3">
                              <div className="flex items-center gap-3">
                                {svc.imageUrls?.[0] ? (
                                  <img
                                    src={svc.imageUrls[0]}
                                    alt={svc.name}
                                    className="h-10 w-10 rounded-md object-cover"
                                  />
                                ) : (
                                  <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center">
                                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                                  </div>
                                )}
                                <div>
                                  <p className="font-medium">{svc.name}</p>
                                  <p className="text-xs text-muted-foreground line-clamp-1">
                                    {svc.description || "No description"}
                                  </p>
                                </div>
                              </div>
                            </td>
                            <td className="py-3 pr-3 hidden md:table-cell">
                              <Badge variant="secondary">
                                {svc.category?.name || "—"}
                              </Badge>
                            </td>
                            <td className="py-3 pr-3 hidden md:table-cell">
                              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                                <MapPin className="h-3 w-3" />
                                <span>
                                  {svc.city ||
                                    `${svc.latitude.toFixed(4)}, ${svc.longitude.toFixed(4)}`}
                                </span>
                              </div>
                            </td>
                            <td className="py-3 pr-3 hidden lg:table-cell text-xs">
                              {svc.priceFrom
                                ? `D${svc.priceFrom}${svc.priceTo ? `–D${svc.priceTo}` : ""} ${svc.priceUnit || ""}`
                                : "—"}
                            </td>
                            <td className="py-3 pr-3">
                              <div className="flex flex-wrap gap-1">
                                <Badge
                                  className={cn(
                                    "text-xs",
                                    svc.isActive
                                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                      : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
                                  )}
                                >
                                  {svc.isActive ? "Active" : "Inactive"}
                                </Badge>
                                {svc.isFeatured && (
                                  <Badge className="text-xs bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
                                    Featured
                                  </Badge>
                                )}
                                {svc.isVerified && (
                                  <Badge className="text-xs bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                    Verified
                                  </Badge>
                                )}
                              </div>
                            </td>
                            <td className="py-3 text-right">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" size="icon">
                                    <MoreHorizontal className="h-4 w-4" />
                                  </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                  <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                  <DropdownMenuItem
                                    onClick={() => {
                                      setSelectedSvc(svc);
                                      setIsSvcDetailsOpen(true);
                                    }}
                                  >
                                    <Eye className="mr-2 h-4 w-4" /> View
                                    Details
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() => openEditSvc(svc)}
                                  >
                                    <Edit className="mr-2 h-4 w-4" /> Edit
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    onClick={() =>
                                      toggleActiveMutation.mutate(svc.id)
                                    }
                                  >
                                    {svc.isActive ? (
                                      <>
                                        <Ban className="mr-2 h-4 w-4" />{" "}
                                        Deactivate
                                      </>
                                    ) : (
                                      <>
                                        <CheckCircle2 className="mr-2 h-4 w-4" />{" "}
                                        Activate
                                      </>
                                    )}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      toggleFeaturedMutation.mutate(svc.id)
                                    }
                                  >
                                    <Star className="mr-2 h-4 w-4" />
                                    {svc.isFeatured
                                      ? "Unfeature"
                                      : "Mark Featured"}
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      toggleVerifiedMutation.mutate(svc.id)
                                    }
                                  >
                                    <BadgeCheck className="mr-2 h-4 w-4" />
                                    {svc.isVerified
                                      ? "Remove Verified"
                                      : "Mark Verified"}
                                  </DropdownMenuItem>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem
                                    className="text-destructive"
                                    onClick={() => {
                                      setSelectedSvc(svc);
                                      setIsSvcDeleteOpen(true);
                                    }}
                                  >
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {svcData?.total > services.length && (
                      <p className="text-xs text-muted-foreground text-center mt-3">
                        Showing {services.length} of {svcData.total} services
                      </p>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* ── CATEGORIES TAB ───────────────────────────────────────────────── */}
          <TabsContent value="categories">
            <Card>
              <CardHeader>
                <div className="flex flex-col sm:flex-row gap-3 sm:items-center justify-between">
                  <CardTitle>Service Categories</CardTitle>
                  <Button size="sm" onClick={openCreateCat}>
                    <Plus className="h-4 w-4 mr-2" /> Add Category
                  </Button>
                </div>
                <div className="flex gap-2 mt-3">
                  <div className="relative flex-1">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search categories..."
                      className="pl-9"
                      value={catSearch}
                      onChange={(e) => setCatSearch(e.target.value)}
                    />
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {catsLoading ? (
                  <div className="flex justify-center py-10">
                    <Loader2 className="h-6 w-6 animate-spin" />
                  </div>
                ) : filteredCategories.length === 0 ? (
                  <div className="text-center py-10 text-muted-foreground">
                    No categories found
                  </div>
                ) : (
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {filteredCategories.map((cat) => (
                      <div
                        key={cat.id}
                        className="border rounded-lg p-4 flex flex-col gap-2 hover:bg-muted/30 transition-colors"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-3">
                            {cat.imageUrl ? (
                              <img
                                src={cat.imageUrl}
                                alt={cat.name}
                                className="h-10 w-10 rounded-md object-cover"
                              />
                            ) : (
                              <div className="h-10 w-10 rounded-md bg-muted flex items-center justify-center text-lg">
                                {cat.icon || "📦"}
                              </div>
                            )}
                            <div>
                              <p className="font-medium">{cat.name}</p>
                              <p className="text-xs text-muted-foreground">
                                {cat._count?.services ?? 0} service(s)
                              </p>
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={() => openEditCat(cat)}
                              >
                                <Edit className="mr-2 h-4 w-4" /> Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                className="text-destructive"
                                onClick={() => {
                                  setSelectedCat(cat);
                                  setIsCatDeleteOpen(true);
                                }}
                              >
                                <Trash2 className="mr-2 h-4 w-4" /> Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                        {cat.description && (
                          <p className="text-xs text-muted-foreground line-clamp-2">
                            {cat.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2">
                          <Badge
                            className={cn(
                              "text-xs",
                              cat.isActive
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700",
                            )}
                          >
                            {cat.isActive ? "Active" : "Inactive"}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            Order: {cat.sortOrder}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </Main>

      {/* ── Category Form Dialog ─────────────────────────────────────────────── */}
      <Dialog open={isCatFormOpen} onOpenChange={setIsCatFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingCat ? "Edit Category" : "Add Category"}
            </DialogTitle>
            <DialogDescription>
              {editingCat
                ? "Update the service category details."
                : "Create a new service category."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Name *</Label>
              <Input
                value={catForm.name}
                onChange={(e) =>
                  setCatForm((f) => ({ ...f, name: e.target.value }))
                }
                placeholder="e.g. Cleaning"
              />
            </div>
            <div className="space-y-1">
              <Label>Description</Label>
              <Textarea
                value={catForm.description}
                onChange={(e) =>
                  setCatForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder="Short description..."
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Icon (emoji)</Label>
                <Input
                  value={catForm.icon}
                  onChange={(e) =>
                    setCatForm((f) => ({ ...f, icon: e.target.value }))
                  }
                  placeholder="🔧"
                />
              </div>
              <div className="space-y-1">
                <Label>Sort Order</Label>
                <Input
                  type="number"
                  value={catForm.sortOrder}
                  onChange={(e) =>
                    setCatForm((f) => ({
                      ...f,
                      sortOrder: parseInt(e.target.value) || 0,
                    }))
                  }
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Image</Label>
              {catForm.imageUrl && (
                <div className="flex items-center gap-2 mb-1">
                  <img
                    src={catForm.imageUrl}
                    alt="preview"
                    className="h-12 w-12 rounded object-cover"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setCatForm((f) => ({ ...f, imageUrl: "" }))}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              )}
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => setCatImageFile(e.target.files?.[0] || null)}
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={catForm.isActive}
                onCheckedChange={(v) =>
                  setCatForm((f) => ({ ...f, isActive: v }))
                }
              />
              <Label>Active</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCatFormOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={submitCatForm}
              disabled={
                !catForm.name.trim() ||
                catImageUploading ||
                createCatMutation.isPending ||
                updateCatMutation.isPending
              }
            >
              {catImageUploading ||
              createCatMutation.isPending ||
              updateCatMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                </>
              ) : editingCat ? (
                "Update Category"
              ) : (
                "Create Category"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Category Delete Dialog ───────────────────────────────────────────── */}
      <AlertDialog open={isCatDeleteOpen} onOpenChange={setIsCatDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Category</AlertDialogTitle>
            <AlertDialogDescription>
              Delete <strong>{selectedCat?.name}</strong>? This cannot be
              undone. All services must be reassigned or deleted first.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                selectedCat && deleteCatMutation.mutate(selectedCat.id)
              }
              disabled={deleteCatMutation.isPending}
            >
              {deleteCatMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* ── Service Form Dialog ──────────────────────────────────────────────── */}
      <Dialog open={isSvcFormOpen} onOpenChange={setIsSvcFormOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingSvc ? "Edit Service" : "Add Service"}
            </DialogTitle>
            <DialogDescription>
              Fill in the details and pick a GPS location on the map.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-5 py-2">
            {/* Basic info */}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label>Name *</Label>
                <Input
                  value={svcForm.name}
                  onChange={(e) =>
                    setSvcForm((f) => ({ ...f, name: e.target.value }))
                  }
                  placeholder="e.g. John's Plumbing Services"
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Description</Label>
                <Textarea
                  value={svcForm.description}
                  onChange={(e) =>
                    setSvcForm((f) => ({ ...f, description: e.target.value }))
                  }
                  placeholder="What does this service offer?"
                  rows={2}
                />
              </div>
              <div className="col-span-2 space-y-1">
                <Label>Category *</Label>
                <Select
                  value={svcForm.categoryId}
                  onValueChange={(v) =>
                    setSvcForm((f) => ({ ...f, categoryId: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {(categories as TeranProCategory[])
                      .filter((c) => c.isActive)
                      .map((c) => (
                        <SelectItem key={c.id} value={c.id}>
                          {c.icon} {c.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* GPS Location Map */}
            <div className="space-y-1">
              <Label className="flex items-center gap-2">
                <MapPin className="h-4 w-4" /> GPS Location *
              </Label>
              <LocationPickerMap
                lat={svcForm.latitude}
                lng={svcForm.longitude}
                onChange={(lat, lng) =>
                  setSvcForm((f) => ({ ...f, latitude: lat, longitude: lng }))
                }
              />
            </div>

            {/* Address */}
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2 space-y-1">
                <Label>Address</Label>
                <Input
                  value={svcForm.address}
                  onChange={(e) =>
                    setSvcForm((f) => ({ ...f, address: e.target.value }))
                  }
                  placeholder="Street address"
                />
              </div>
              <div className="space-y-1">
                <Label>City</Label>
                <Input
                  value={svcForm.city}
                  onChange={(e) =>
                    setSvcForm((f) => ({ ...f, city: e.target.value }))
                  }
                  placeholder="e.g. Banjul"
                />
              </div>
              <div className="space-y-1">
                <Label>State / Region</Label>
                <Input
                  value={svcForm.state}
                  onChange={(e) =>
                    setSvcForm((f) => ({ ...f, state: e.target.value }))
                  }
                  placeholder="e.g. Greater Banjul"
                />
              </div>
            </div>

            {/* Contact */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="flex items-center gap-1">
                  <Phone className="h-3.5 w-3.5" /> Phone
                </Label>
                <Input
                  value={svcForm.phone}
                  onChange={(e) =>
                    setSvcForm((f) => ({ ...f, phone: e.target.value }))
                  }
                  placeholder="+220..."
                />
              </div>
              <div className="space-y-1">
                <Label className="flex items-center gap-1">
                  <Mail className="h-3.5 w-3.5" /> Email
                </Label>
                <Input
                  type="email"
                  value={svcForm.email}
                  onChange={(e) =>
                    setSvcForm((f) => ({ ...f, email: e.target.value }))
                  }
                  placeholder="email@example.com"
                />
              </div>
            </div>

            {/* Pricing */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <Label className="flex items-center gap-1">
                  <DollarSign className="h-3.5 w-3.5" /> Price From (D)
                </Label>
                <Input
                  type="number"
                  value={svcForm.priceFrom}
                  onChange={(e) =>
                    setSvcForm((f) => ({ ...f, priceFrom: e.target.value }))
                  }
                  placeholder="0"
                />
              </div>
              <div className="space-y-1">
                <Label>Price To (D)</Label>
                <Input
                  type="number"
                  value={svcForm.priceTo}
                  onChange={(e) =>
                    setSvcForm((f) => ({ ...f, priceTo: e.target.value }))
                  }
                  placeholder="0"
                />
              </div>
              <div className="space-y-1">
                <Label>Price Unit</Label>
                <Select
                  value={svcForm.priceUnit}
                  onValueChange={(v) =>
                    setSvcForm((f) => ({ ...f, priceUnit: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="per job">Per Job</SelectItem>
                    <SelectItem value="per hour">Per Hour</SelectItem>
                    <SelectItem value="per day">Per Day</SelectItem>
                    <SelectItem value="fixed">Fixed</SelectItem>
                    <SelectItem value="negotiable">Negotiable</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Tags */}
            <div className="space-y-1">
              <Label className="flex items-center gap-1">
                <Tag className="h-3.5 w-3.5" /> Tags
              </Label>
              <Input
                value={svcForm.tags}
                onChange={(e) =>
                  setSvcForm((f) => ({ ...f, tags: e.target.value }))
                }
                placeholder="plumbing, repairs, pipes — comma separated"
              />
            </div>

            {/* Images */}
            <div className="space-y-2">
              <Label className="flex items-center gap-1">
                <ImageIcon className="h-3.5 w-3.5" /> Images
              </Label>
              {Array.isArray(svcForm.imageUrls) &&
                svcForm.imageUrls.length > 0 && (
                  <div className="flex flex-wrap gap-2">
                    {svcForm.imageUrls.map((url) => (
                      <div key={url} className="relative group">
                        <img
                          src={url}
                          alt="service"
                          className="h-16 w-16 rounded object-cover"
                        />
                        <button
                          type="button"
                          onClick={() => removeExistingImage(url)}
                          className="absolute -top-1 -right-1 h-4 w-4 bg-destructive text-destructive-foreground rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              <Input
                type="file"
                accept="image/*"
                multiple
                onChange={(e) =>
                  setSvcImageFiles(Array.from(e.target.files || []))
                }
              />
              <p className="text-xs text-muted-foreground">
                {svcImageFiles.length > 0
                  ? `${svcImageFiles.length} new file(s) selected`
                  : "Select one or more images"}
              </p>
            </div>

            {/* Toggles */}
            <div className="flex flex-wrap gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  checked={svcForm.isActive}
                  onCheckedChange={(v) =>
                    setSvcForm((f) => ({ ...f, isActive: v }))
                  }
                />
                <Label>Active</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={svcForm.isFeatured}
                  onCheckedChange={(v) =>
                    setSvcForm((f) => ({ ...f, isFeatured: v }))
                  }
                />
                <Label>Featured</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={svcForm.isVerified}
                  onCheckedChange={(v) =>
                    setSvcForm((f) => ({ ...f, isVerified: v }))
                  }
                />
                <Label>Verified</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsSvcFormOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={submitSvcForm}
              disabled={
                svcImageUploading ||
                createSvcMutation.isPending ||
                updateSvcMutation.isPending
              }
            >
              {svcImageUploading ||
              createSvcMutation.isPending ||
              updateSvcMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...
                </>
              ) : editingSvc ? (
                "Update Service"
              ) : (
                "Create Service"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Service Details Dialog ───────────────────────────────────────────── */}
      <Dialog open={isSvcDetailsOpen} onOpenChange={setIsSvcDetailsOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{selectedSvc?.name}</DialogTitle>
            <DialogDescription>{selectedSvc?.category?.name}</DialogDescription>
          </DialogHeader>
          {selectedSvc && (
            <div className="space-y-4 py-2">
              {selectedSvc.imageUrls?.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {selectedSvc.imageUrls.map((url) => (
                    <img
                      key={url}
                      src={url}
                      alt="service"
                      className="h-20 w-20 rounded-md object-cover"
                    />
                  ))}
                </div>
              )}
              {selectedSvc.description && (
                <p className="text-sm">{selectedSvc.description}</p>
              )}
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Location
                  </p>
                  <p>
                    {selectedSvc.city || "—"}
                    {selectedSvc.state ? `, ${selectedSvc.state}` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {selectedSvc.address}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    GPS
                  </p>
                  <p className="text-xs">
                    {selectedSvc.latitude.toFixed(6)},{" "}
                    {selectedSvc.longitude.toFixed(6)}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Price
                  </p>
                  <p>
                    {selectedSvc.priceFrom
                      ? `D${selectedSvc.priceFrom}${selectedSvc.priceTo ? `–D${selectedSvc.priceTo}` : ""} ${selectedSvc.priceUnit || ""}`
                      : "Not specified"}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">
                    Contact
                  </p>
                  <p>{selectedSvc.phone || selectedSvc.email || "—"}</p>
                </div>
              </div>
              {selectedSvc.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {selectedSvc.tags.map((tag) => (
                    <Badge key={tag} variant="secondary" className="text-xs">
                      {tag}
                    </Badge>
                  ))}
                </div>
              )}
              <div className="flex gap-2 flex-wrap">
                <Badge
                  className={
                    selectedSvc.isActive
                      ? "bg-green-100 text-green-700"
                      : "bg-red-100 text-red-700"
                  }
                >
                  {selectedSvc.isActive ? "Active" : "Inactive"}
                </Badge>
                {selectedSvc.isFeatured && (
                  <Badge className="bg-yellow-100 text-yellow-700">
                    Featured
                  </Badge>
                )}
                {selectedSvc.isVerified && (
                  <Badge className="bg-blue-100 text-blue-700">Verified</Badge>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setIsSvcDetailsOpen(false);
                if (selectedSvc) openEditSvc(selectedSvc);
              }}
            >
              <Edit className="mr-2 h-4 w-4" /> Edit
            </Button>
            <Button onClick={() => setIsSvcDetailsOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Service Delete Dialog ────────────────────────────────────────────── */}
      <AlertDialog open={isSvcDeleteOpen} onOpenChange={setIsSvcDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Service</AlertDialogTitle>
            <AlertDialogDescription>
              Permanently delete <strong>{selectedSvc?.name}</strong>? This
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() =>
                selectedSvc && deleteSvcMutation.mutate(selectedSvc.id)
              }
              disabled={deleteSvcMutation.isPending}
            >
              {deleteSvcMutation.isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

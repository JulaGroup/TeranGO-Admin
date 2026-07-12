import { useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  Search,
  Package,
  Plus,
  Edit,
  Trash2,
  MoreVertical,
  Star,
  RefreshCw,
  Upload,
  Crown,
  TrendingUp,
  Box,
  CheckCircle,
  XCircle,
  Filter,
  X,
  CalendarDays,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { ProfileDropdown } from "@/components/profile-dropdown";
import { ThemeSwitch } from "@/components/theme-switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
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
import { Switch } from "@/components/ui/switch";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";

// Cloudinary config
const CLOUDINARY_CLOUD_NAME = "dkpi5ij2t";
const CLOUDINARY_UPLOAD_PRESET = "unsigned_preset";

// Types
interface TerangoProduct {
  id: string;
  name: string;
  price: number;
  discountedPrice?: number;
  costPrice?: number;
  imageUrl?: string;
  subCategoryId?: string;
  category?: string;
  description?: string;
  brand?: string;
  sku?: string;
  stock?: number;
  isAvailable: boolean;
  isOfficial: boolean;
  isFeatured: boolean;
  priority: number;
  weightKg?: number;
  shop?: {
    id: string;
    name: string;
  };
  subCategory?: {
    id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface ProductStats {
  totalProducts: number;
  availableProducts: number;
  outOfStockProducts: number;
  featuredProducts: number;
  totalStock: number;
}

interface SubCategory {
  id: string;
  name: string;
}

export const Route = createFileRoute("/_authenticated/admin/terango-products/")(
  {
    component: TerangoProductsPage,
  },
);

function TerangoProductsPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [filterSubCategory, setFilterSubCategory] = useState<string>("all");
  const [filterAvailability, setFilterAvailability] = useState<string>("all");
  const [filterFeatured, setFilterFeatured] = useState<string>("all");
  const [filterHasImage, setFilterHasImage] = useState<string>("all");
  const [sortBy, setSortBy] = useState<string>("createdAt_desc");
  const [createdFrom, setCreatedFrom] = useState("");
  const [createdTo, setCreatedTo] = useState("");
  const [updatedFrom, setUpdatedFrom] = useState("");
  const [updatedTo, setUpdatedTo] = useState("");
  const [showDateFilters, setShowDateFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [productsPerPage, setProductsPerPage] = useState(50);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<TerangoProduct | null>(
    null,
  );
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: "",
    price: "",
    discountedPrice: "",
    costPrice: "",
    imageUrl: "",
    subCategoryId: "",
    category: "",
    description: "",
    brand: "",
    sku: "",
    stock: "0",
    isFeatured: false,
    priority: "50",
    weightKg: "",
  });

  // Fetch products
  const { data: productsData, isLoading } = useQuery({
    queryKey: [
      "terango-products",
      searchQuery,
      filterSubCategory,
      filterAvailability,
      filterFeatured,
      filterHasImage,
      sortBy,
      createdFrom,
      createdTo,
      updatedFrom,
      updatedTo,
      currentPage,
      productsPerPage,
    ],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (searchQuery) params.append("search", searchQuery);
      if (filterSubCategory !== "all")
        params.append("subCategoryId", filterSubCategory);
      if (filterAvailability !== "all")
        params.append("isAvailable", filterAvailability);
      if (filterFeatured !== "all")
        params.append("isFeatured", filterFeatured);
      if (filterHasImage !== "all")
        params.append("hasImage", filterHasImage);
      if (sortBy) params.append("sortBy", sortBy);
      if (createdFrom) params.append("createdFrom", createdFrom);
      if (createdTo) params.append("createdTo", createdTo);
      if (updatedFrom) params.append("updatedFrom", updatedFrom);
      if (updatedTo) params.append("updatedTo", updatedTo);
      params.append("limit", String(productsPerPage));
      params.append("page", String(currentPage));

      const response = await api.get(`/api/admin/terango-products?${params}`);
      return response.data;
    },
  });

  // Fetch stats
  const { data: stats } = useQuery<ProductStats>({
    queryKey: ["terango-products-stats"],
    queryFn: async () => {
      const response = await api.get("/api/admin/terango-products/stats");
      return response.data;
    },
  });

  // Fetch subcategories
  const { data: subCategories } = useQuery<SubCategory[]>({
    queryKey: ["subcategories"],
    queryFn: async () => {
      const response = await api.get("/api/categories");
      const categories = response.data.categories || response.data || [];
      const subs: SubCategory[] = [];
      categories.forEach((cat: { subCategories?: SubCategory[] }) => {
        if (cat.subCategories) {
          subs.push(...cat.subCategories);
        }
      });
      return subs;
    },
  });

  // Create product mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await api.post("/api/admin/terango-products", {
        ...data,
        price: parseFloat(data.price),
        discountedPrice: data.discountedPrice
          ? parseFloat(data.discountedPrice)
          : undefined,
        costPrice: data.costPrice ? parseFloat(data.costPrice) : undefined,
        stock: parseInt(data.stock),
        priority: parseInt(data.priority),
        weightKg: data.weightKg ? parseFloat(data.weightKg) : undefined,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["terango-products"] });
      queryClient.invalidateQueries({ queryKey: ["terango-products-stats"] });
      toast.success("Product created successfully");
      closeDialog();
    },
    onError: () => {
      toast.error("Failed to create product");
    },
  });

  // Update product mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const response = await api.put(`/api/admin/terango-products/${id}`, {
        ...data,
        price: parseFloat(data.price),
        discountedPrice: data.discountedPrice
          ? parseFloat(data.discountedPrice)
          : null,
        costPrice: data.costPrice ? parseFloat(data.costPrice) : null,
        stock: parseInt(data.stock),
        priority: parseInt(data.priority),
        weightKg: data.weightKg ? parseFloat(data.weightKg) : null,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["terango-products"] });
      queryClient.invalidateQueries({ queryKey: ["terango-products-stats"] });
      toast.success("Product updated successfully");
      closeDialog();
    },
    onError: () => {
      toast.error("Failed to update product");
    },
  });

  // Delete product mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/admin/terango-products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["terango-products"] });
      queryClient.invalidateQueries({ queryKey: ["terango-products-stats"] });
      toast.success("Product deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete product");
    },
  });

  // Toggle featured mutation
  const toggleFeaturedMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.patch(
        `/api/admin/terango-products/${id}/toggle-featured`,
      );
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["terango-products"] });
      queryClient.invalidateQueries({ queryKey: ["terango-products-stats"] });
      toast.success(
        data.product.isFeatured ? "Product featured" : "Product unfeatured",
      );
    },
    onError: () => {
      toast.error("Failed to toggle featured status");
    },
  });

  // Toggle availability mutation
  const toggleAvailabilityMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.patch(
        `/api/admin/terango-products/${id}/toggle-availability`,
      );
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["terango-products"] });
      queryClient.invalidateQueries({ queryKey: ["terango-products-stats"] });
      toast.success(
        data.product.isAvailable
          ? "Product marked as available"
          : "Product marked as unavailable",
      );
    },
    onError: () => {
      toast.error("Failed to toggle availability");
    },
  });

  // Make all products available mutation
  const makeAllAvailableMutation = useMutation({
    mutationFn: async () => {
      const response = await api.patch(
        "/api/admin/terango-products/bulk/make-all-available",
      );
      return response.data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["terango-products"] });
      queryClient.invalidateQueries({ queryKey: ["terango-products-stats"] });
      toast.success(data.message || "All products marked as available");
    },
    onError: () => {
      toast.error("Failed to make all products available");
    },
  });

  // Setup TeranGO store mutation
  const setupMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post("/api/admin/terango-products/setup");
      return response.data;
    },
    onSuccess: () => {
      toast.success("TeranGO Official Store setup completed");
    },
    onError: () => {
      toast.error("Failed to setup TeranGO store");
    },
  });

  // Image upload handler
  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploadingImage(true);
    try {
      const uploadFormData = new FormData();
      uploadFormData.append("file", file);
      uploadFormData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
      uploadFormData.append("folder", "terango-products");

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: "POST", body: uploadFormData },
      );

      const data = await response.json();
      if (data.secure_url) {
        setFormData({ ...formData, imageUrl: data.secure_url });
        setImagePreview(data.secure_url);
        toast.success("Image uploaded successfully");
      } else {
        throw new Error("Upload failed");
      }
    } catch {
      toast.error("Failed to upload image");
    } finally {
      setIsUploadingImage(false);
    }
  };

  const openCreateDialog = () => {
    setEditingProduct(null);
    setFormData({
      name: "",
      price: "",
      discountedPrice: "",
      costPrice: "",
      imageUrl: "",
      subCategoryId: "",
      category: "",
      description: "",
      brand: "",
      sku: "",
      stock: "0",
      isFeatured: false,
      priority: "50",
      weightKg: "",
    });
    setImagePreview(null);
    setIsDialogOpen(true);
  };

  const openEditDialog = (product: TerangoProduct) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      price: product.price.toString(),
      discountedPrice: product.discountedPrice?.toString() || "",
      costPrice: product.costPrice?.toString() || "",
      imageUrl: product.imageUrl || "",
      subCategoryId: product.subCategoryId || "",
      category: product.category || "",
      description: product.description || "",
      brand: product.brand || "",
      sku: product.sku || "",
      stock: (product.stock || 0).toString(),
      isFeatured: product.isFeatured,
      priority: product.priority.toString(),
      weightKg: product.weightKg?.toString() || "",
    });
    setImagePreview(product.imageUrl || null);
    setIsDialogOpen(true);
  };

  const closeDialog = () => {
    setIsDialogOpen(false);
    setEditingProduct(null);
    setImagePreview(null);
  };

  const handleSubmit = () => {
    if (!formData.name || !formData.price) {
      toast.error("Name and price are required");
      return;
    }

    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const products = productsData?.products || [];
  const pagination = productsData?.pagination;
  const totalProducts = pagination?.total ?? products.length;
  const totalPages = pagination?.pages ?? Math.ceil(totalProducts / productsPerPage);

  const hasActiveFilters =
    filterSubCategory !== "all" ||
    filterAvailability !== "all" ||
    filterFeatured !== "all" ||
    filterHasImage !== "all" ||
    createdFrom !== "" ||
    createdTo !== "" ||
    updatedFrom !== "" ||
    updatedTo !== "";

  const clearAllFilters = () => {
    setFilterSubCategory("all");
    setFilterAvailability("all");
    setFilterFeatured("all");
    setFilterHasImage("all");
    setCreatedFrom("");
    setCreatedTo("");
    setUpdatedFrom("");
    setUpdatedTo("");
    setSortBy("createdAt_desc");
    setCurrentPage(1);
  };

  return (
    <>
      <Header fixed>
        <div className="ms-auto flex items-center gap-2">
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
    <div className="container mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-3xl font-bold">
            <Crown className="h-8 w-8 text-yellow-500" />
            TeranGO Official Products
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage products sold directly by TeranGO
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={() => {
              if (
                confirm(
                  "Mark every official store product as available?",
                )
              ) {
                makeAllAvailableMutation.mutate();
              }
            }}
            disabled={makeAllAvailableMutation.isPending}
          >
            <CheckCircle className="mr-2 h-4 w-4" />
            Make All Available
          </Button>
          <Button variant="outline" onClick={() => setupMutation.mutate()}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Setup Store
          </Button>
          <Button onClick={openCreateDialog}>
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card className="border-l-4 border-l-primary shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Products
            </CardTitle>
            <Package className="text-primary h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.totalProducts || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">All products</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Available</CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.availableProducts || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">In stock</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Out of Stock</CardTitle>
            <XCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.outOfStockProducts || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Need restocking</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-violet-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Featured</CardTitle>
            <Star className="h-4 w-4 text-violet-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats?.featuredProducts || 0}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Priority placement</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Stock</CardTitle>
            <Box className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.totalStock || 0}</div>
            <p className="text-xs text-muted-foreground mt-1">Units available</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card className="shadow-sm overflow-hidden">
        <CardHeader className="border-b pb-4">
          <CardTitle>Products</CardTitle>
          <CardDescription>
            Products sold directly by TeranGO with priority placement
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-4 space-y-3">
            {/* Row 1: Search + main filters */}
            <div className="flex flex-wrap gap-3">
              <div className="relative min-w-[200px] flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  className="pl-9 h-9"
                />
              </div>
              <Select
                value={filterSubCategory}
                onValueChange={(v) => { setFilterSubCategory(v); setCurrentPage(1); }}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Sub Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {subCategories?.map((sub) => (
                    <SelectItem key={sub.id} value={sub.id}>
                      {sub.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={filterAvailability}
                onValueChange={(v) => { setFilterAvailability(v); setCurrentPage(1); }}
              >
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Availability" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Availability</SelectItem>
                  <SelectItem value="true">Available</SelectItem>
                  <SelectItem value="false">Out of Stock</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={filterFeatured}
                onValueChange={(v) => { setFilterFeatured(v); setCurrentPage(1); }}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Featured" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Products</SelectItem>
                  <SelectItem value="true">Featured Only</SelectItem>
                  <SelectItem value="false">Not Featured</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={filterHasImage}
                onValueChange={(v) => { setFilterHasImage(v); setCurrentPage(1); }}
              >
                <SelectTrigger className="w-[140px]">
                  <SelectValue placeholder="Image" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Any Image</SelectItem>
                  <SelectItem value="true">Has Image</SelectItem>
                  <SelectItem value="false">No Image</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={sortBy}
                onValueChange={(v) => { setSortBy(v); setCurrentPage(1); }}
              >
                <SelectTrigger className="w-[170px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="createdAt_desc">Newest First</SelectItem>
                  <SelectItem value="createdAt_asc">Oldest First</SelectItem>
                  <SelectItem value="updatedAt_desc">Recently Updated</SelectItem>
                  <SelectItem value="updatedAt_asc">Least Recently Updated</SelectItem>
                  <SelectItem value="name_asc">Name A–Z</SelectItem>
                  <SelectItem value="name_desc">Name Z–A</SelectItem>
                  <SelectItem value="price_asc">Price Low–High</SelectItem>
                  <SelectItem value="price_desc">Price High–Low</SelectItem>
                  <SelectItem value="stock_desc">Most Stock</SelectItem>
                  <SelectItem value="priority_desc">Highest Priority</SelectItem>
                </SelectContent>
              </Select>
              <Button
                variant={showDateFilters ? "secondary" : "outline"}
                size="sm"
                onClick={() => setShowDateFilters((v) => !v)}
                className="h-9 gap-2"
              >
                <CalendarDays className="h-4 w-4" />
                Date Filters
              </Button>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={clearAllFilters}
                  className="h-9 gap-1 text-red-500 hover:text-red-600"
                >
                  <X className="h-4 w-4" />
                  Clear Filters
                </Button>
              )}
            </div>

            {/* Row 2: Date filters (collapsible) */}
            {showDateFilters && (
              <div className="bg-muted/40 flex flex-wrap gap-4 rounded-lg border p-4">
                <div className="space-y-1">
                  <label className="text-muted-foreground flex items-center gap-1 text-xs font-medium">
                    <CalendarDays className="h-3 w-3" /> Created From
                  </label>
                  <input
                    type="date"
                    title="Created from date"
                    value={createdFrom}
                    onChange={(e) => { setCreatedFrom(e.target.value); setCurrentPage(1); }}
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-muted-foreground flex items-center gap-1 text-xs font-medium">
                    <CalendarDays className="h-3 w-3" /> Created To
                  </label>
                  <input
                    type="date"
                    title="Created to date"
                    value={createdTo}
                    onChange={(e) => { setCreatedTo(e.target.value); setCurrentPage(1); }}
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="w-px self-stretch bg-border" />
                <div className="space-y-1">
                  <label className="text-muted-foreground flex items-center gap-1 text-xs font-medium">
                    <RefreshCw className="h-3 w-3" /> Updated From
                  </label>
                  <input
                    type="date"
                    title="Updated from date"
                    value={updatedFrom}
                    onChange={(e) => { setUpdatedFrom(e.target.value); setCurrentPage(1); }}
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-muted-foreground flex items-center gap-1 text-xs font-medium">
                    <RefreshCw className="h-3 w-3" /> Updated To
                  </label>
                  <input
                    type="date"
                    title="Updated to date"
                    value={updatedTo}
                    onChange={(e) => { setUpdatedTo(e.target.value); setCurrentPage(1); }}
                    className="h-9 rounded-md border border-input bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  />
                </div>
                {(createdFrom || createdTo || updatedFrom || updatedTo) && (
                  <div className="flex items-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => { setCreatedFrom(""); setCreatedTo(""); setUpdatedFrom(""); setUpdatedTo(""); setCurrentPage(1); }}
                      className="h-9 gap-1 text-red-500 hover:text-red-600"
                    >
                      <X className="h-3 w-3" /> Clear Dates
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Row 3: Per page + active filter badges */}
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-2">
                <Filter className="text-muted-foreground h-4 w-4" />
                <span className="text-muted-foreground text-sm">Show</span>
                <select
                  title="Products per page"
                  value={productsPerPage}
                  onChange={(e) => { setProductsPerPage(Number(e.target.value)); setCurrentPage(1); }}
                  className="h-9 rounded-md border border-input bg-background px-2 py-0 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {[25, 50, 100, 200].map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
                <span className="text-muted-foreground text-sm">per page</span>
              </div>
              {hasActiveFilters && (
                <span className="text-muted-foreground text-sm">
                  <span className="font-medium text-foreground">{totalProducts}</span> results with active filters
                </span>
              )}
            </div>
          </div>

          {/* Products Table */}
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-6 w-6 animate-spin" />
            </div>
          ) : products.length > 0 ? (
            <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/50 hover:bg-muted/50">
                  <TableHead>Product</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead>Updated</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product: TerangoProduct) => (
                  <TableRow key={product.id} className="hover:bg-muted/30 transition-colors">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="h-12 w-12 rounded-md object-cover"
                          />
                        ) : (
                          <div className="bg-muted flex h-12 w-12 items-center justify-center rounded-md">
                            <Package className="text-muted-foreground h-6 w-6" />
                          </div>
                        )}
                        <div>
                          <div className="flex items-center gap-2 font-medium">
                            {product.name}
                            {product.isFeatured && (
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            )}
                          </div>
                          <div className="text-muted-foreground text-sm">
                            {product.brand || "No brand"} •{" "}
                            {product.subCategory?.name || "Uncategorized"}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className="font-medium">
                          GMD {product.price.toLocaleString()}
                        </div>
                        {product.discountedPrice && (
                          <div className="text-sm text-green-600">
                            Sale: GMD {product.discountedPrice.toLocaleString()}
                          </div>
                        )}
                        {product.costPrice != null && (
                          <div className="text-muted-foreground text-xs">
                            Profit: GMD{" "}
                            {(
                              (product.discountedPrice ?? product.price) -
                              product.costPrice
                            ).toLocaleString()}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          product.stock && product.stock > 0
                            ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm"
                            : ""
                        }
                        variant={
                          product.stock && product.stock > 0
                            ? "default"
                            : "destructive"
                        }
                      >
                        {product.stock || 0} units
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <TrendingUp className="h-4 w-4 text-blue-500" />
                        <span>{product.priority}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Switch
                          checked={product.isAvailable}
                          onCheckedChange={() =>
                            toggleAvailabilityMutation.mutate(product.id)
                          }
                          disabled={toggleAvailabilityMutation.isPending}
                          aria-label={`Toggle availability for ${product.name}`}
                        />
                        <span
                          className={
                            product.isAvailable
                              ? "text-xs font-medium text-emerald-600"
                              : "text-xs text-muted-foreground"
                          }
                        >
                          {product.isAvailable ? "Available" : "Unavailable"}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-muted-foreground text-xs">
                        {new Date(product.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-muted-foreground text-xs">
                        {new Date(product.updatedAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={() => openEditDialog(product)}
                          >
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              toggleFeaturedMutation.mutate(product.id)
                            }
                          >
                            <Star className="mr-2 h-4 w-4" />
                            {product.isFeatured ? "Unfeature" : "Feature"}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              if (
                                confirm(
                                  "Are you sure you want to delete this product?",
                                )
                              ) {
                                deleteMutation.mutate(product.id);
                              }
                            }}
                            className="text-red-600"
                          >
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Crown className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
              <p className="text-lg font-medium">No Official Products Yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Click "Setup Store" first, then add products to sell directly
                from TeranGO
              </p>
              <Button onClick={openCreateDialog} className="mt-4">
                <Plus className="mr-2 h-4 w-4" />
                Add First Product
              </Button>
            </div>
          )}
          {/* Pagination */}
          {products.length > 0 && (
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t pt-4">
              <p className="text-muted-foreground text-sm">
                {totalPages > 1 ? `Page ${currentPage} of ${totalPages} — ` : ""}
                {totalProducts} product{totalProducts !== 1 ? "s" : ""}
              </p>
              {totalPages > 1 && (
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage <= 1}
                  >
                    Previous
                  </Button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1)
                    .filter(
                      (p) =>
                        Math.abs(p - currentPage) <= 2 ||
                        p === 1 ||
                        p === totalPages,
                    )
                    .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                      if (idx > 0 && p - (arr[idx - 1] as number) > 1)
                        acc.push("...");
                      acc.push(p);
                      return acc;
                    }, [])
                    .map((p, i) =>
                      p === "..." ? (
                        <span key={`ellipsis-${i}`} className="text-muted-foreground px-1">
                          …
                        </span>
                      ) : (
                        <Button
                          key={p}
                          variant={p === currentPage ? "default" : "outline"}
                          size="sm"
                          className="w-9"
                          onClick={() => setCurrentPage(p as number)}
                        >
                          {p}
                        </Button>
                      ),
                    )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage >= totalPages}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? "Edit Product" : "Add Official Product"}
            </DialogTitle>
            <DialogDescription>
              {editingProduct
                ? "Update the product details"
                : "Add a new product to TeranGO's official store"}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            {/* Image Upload */}
            <div className="space-y-2">
              <Label>Product Image</Label>
              <div className="flex items-center gap-4">
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt="Preview"
                    className="h-24 w-24 rounded-md object-cover"
                  />
                ) : (
                  <div className="bg-muted flex h-24 w-24 items-center justify-center rounded-md">
                    <Package className="text-muted-foreground h-8 w-8" />
                  </div>
                )}
                <div className="flex flex-col gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingImage}
                  >
                    <Upload className="mr-2 h-4 w-4" />
                    {isUploadingImage ? "Uploading..." : "Upload Image"}
                  </Button>
                  <input
                    title="Upload Image"
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={handleImageUpload}
                    className="hidden"
                  />
                  <Input
                    placeholder="Or paste image URL"
                    value={formData.imageUrl}
                    onChange={(e) => {
                      setFormData({ ...formData, imageUrl: e.target.value });
                      setImagePreview(e.target.value);
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Product Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder="Product name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="brand">Brand</Label>
                <Input
                  id="brand"
                  value={formData.brand}
                  onChange={(e) =>
                    setFormData({ ...formData, brand: e.target.value })
                  }
                  placeholder="Brand name"
                />
              </div>
            </div>

            {/* Pricing */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="price">Price (GMD) *</Label>
                <Input
                  id="price"
                  type="number"
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: e.target.value })
                  }
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="discountedPrice">Sale Price (GMD)</Label>
                <Input
                  id="discountedPrice"
                  type="number"
                  value={formData.discountedPrice}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      discountedPrice: e.target.value,
                    })
                  }
                  placeholder="Optional"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="stock">Stock</Label>
                <Input
                  id="stock"
                  type="number"
                  value={formData.stock}
                  onChange={(e) =>
                    setFormData({ ...formData, stock: e.target.value })
                  }
                  placeholder="0"
                />
              </div>
            </div>

            {/* Cost / Profit tracking — optional, for products sourced from other stores */}
            <div className="space-y-2 rounded-lg border p-3">
              <Label htmlFor="costPrice">
                Cost Price (GMD){" "}
                <span className="text-muted-foreground font-normal">
                  — optional
                </span>
              </Label>
              <Input
                id="costPrice"
                type="number"
                value={formData.costPrice}
                onChange={(e) =>
                  setFormData({ ...formData, costPrice: e.target.value })
                }
                placeholder="What TeranGO pays the source vendor"
              />
              <p className="text-muted-foreground text-xs">
                If this product is sourced from another store, enter what you
                pay for it here. Leave blank if TeranGO earns the full price.
              </p>
              {formData.price && formData.costPrice && (
                <p className="text-sm font-medium">
                  Profit per unit:{" "}
                  <span
                    className={
                      parseFloat(formData.price) -
                        parseFloat(formData.costPrice) >=
                      0
                        ? "text-emerald-600"
                        : "text-destructive"
                    }
                  >
                    GMD{" "}
                    {(
                      parseFloat(formData.price) -
                      parseFloat(formData.costPrice)
                    ).toLocaleString()}
                  </span>
                </p>
              )}
            </div>

            {/* Weight */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="weightKg">Weight (kg)</Label>
                <Input
                  id="weightKg"
                  type="number"
                  step="0.001"
                  min="0"
                  value={formData.weightKg}
                  onChange={(e) =>
                    setFormData({ ...formData, weightKg: e.target.value })
                  }
                  placeholder="e.g. 0.5"
                />
                <p className="text-muted-foreground text-xs">
                  Used for delivery vehicle assignment
                </p>
              </div>
            </div>

            {/* Category & SKU */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="subCategoryId">Sub Category</Label>
                <Select
                  value={formData.subCategoryId || "none"}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      subCategoryId: value === "none" ? "" : value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {subCategories?.map((sub) => (
                      <SelectItem key={sub.id} value={sub.id}>
                        {sub.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="sku">SKU</Label>
                <Input
                  id="sku"
                  value={formData.sku}
                  onChange={(e) =>
                    setFormData({ ...formData, sku: e.target.value })
                  }
                  placeholder="Optional product code"
                />
              </div>
            </div>

            {/* Description */}
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Product description..."
                rows={3}
              />
            </div>

            {/* Priority & Featured */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="priority">Priority (0-100)</Label>
                <Input
                  id="priority"
                  type="number"
                  min="0"
                  max="100"
                  value={formData.priority}
                  onChange={(e) =>
                    setFormData({ ...formData, priority: e.target.value })
                  }
                  placeholder="50"
                />
                <p className="text-muted-foreground text-xs">
                  Higher priority = shown first (official products default to
                  50)
                </p>
              </div>
              <div className="flex items-center space-x-2 pt-6">
                <Switch
                  id="isFeatured"
                  checked={formData.isFeatured}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isFeatured: checked })
                  }
                />
                <Label htmlFor="isFeatured">Featured Product</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={closeDialog}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending
                ? "Saving..."
                : editingProduct
                  ? "Update Product"
                  : "Create Product"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
      </Main>
    </>
  );
}

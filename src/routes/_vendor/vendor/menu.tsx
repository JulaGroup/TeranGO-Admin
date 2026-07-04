import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  Plus,
  Search,
  Edit,
  Trash2,
  RefreshCw,
  Image as ImageIcon,
  X,
  LayoutGrid,
  List as ListIcon,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { VendorShop } from "@/lib/vendor";
import { useVendorProfile } from "@/hooks/use-vendor-profile";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
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
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Separator } from "@/components/ui/separator";
import ProductCard from "@/components/product-card";
import { ProductsGridSkeleton } from "@/components/product-skeleton";

export const Route = createFileRoute("/_vendor/vendor/menu")({
  component: VendorMenu,
});

// Cloudinary configuration - matching React Native app
const CLOUDINARY_CLOUD_NAME = "dkpi5ij2t";
const CLOUDINARY_UPLOAD_PRESET = "unsigned_preset";

// Helper function to upload image to Cloudinary
async function uploadToCloudinary(file: File): Promise<string> {
  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

    const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

    console.log("☁️ Uploading to Cloudinary...");
    const response = await fetch(cloudinaryUrl, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      throw new Error("Upload failed");
    }

    const data = await response.json();
    console.log("✅ Upload successful:", data.secure_url);
    return data.secure_url;
  } catch (error) {
    console.error("❌ Error uploading to Cloudinary:", error);
    throw new Error("Failed to upload image to Cloudinary");
  }
}

type ViewMode = "grid" | "list";

interface MenuItem {
  id: string;
  name: string;
  description?: string;
  price: number;
  discountedPrice?: number;
  imageUrl?: string;
  isAvailable: boolean;
  mealTime?: string;
  preparationTime?: number;
  subCategoryId?: string;
  restaurantId?: string;
}

interface SubCategory {
  id: string;
  name: string;
}

interface MenuItemPayload {
  name: string;
  description?: string;
  price: number;
  discountedPrice?: number;
  imageUrl?: string;
  isAvailable: boolean;
  mealTime?: string;
  subCategoryId?: string;
  preparationTime?: number;
  restaurantId?: string;
}

export interface ShopProduct {
  id: string;
  name: string;
  description?: string;
  price: number;
  discountedPrice?: number | null;
  imageUrl?: string | null;
  stock?: number | null;
  isAvailable: boolean;
  subCategoryId?: string | null;
}

interface ShopProductPayload {
  name: string;
  description?: string;
  price: number;
  discountedPrice?: number | null;
  stock?: number;
  subCategoryId?: string;
  shopId: string;
  imageUrl?: string;
  isAvailable: boolean;
}

interface ShopProductFormState {
  name: string;
  description: string;
  price: string;
  discountedPrice: string;
  stock: string;
  subCategoryId: string;
  isAvailable: boolean;
}

const MEAL_TIMES = [
  "APPETIZERS",
  "SOUPS",
  "SALADS",
  "STARTER",
  "MAIN_COURSE",
  "BREAKFAST",
  "LUNCH",
  "DINNER",
  "SIDES",
  "DESSERTS",
  "BEVERAGES",
];

/* ------------------------------------------------------------------ */
/*  Small shared UI pieces                                            */
/* ------------------------------------------------------------------ */

function ViewToggle({
  value,
  onChange,
}: {
  value: ViewMode;
  onChange: (v: ViewMode) => void;
}) {
  return (
    <div className="inline-flex shrink-0 items-center gap-0.5 rounded-lg bg-zinc-100 p-0.5 dark:bg-zinc-800">
      <button
        type="button"
        aria-label="Grid view"
        aria-pressed={value === "grid"}
        onClick={() => onChange("grid")}
        className={`inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
          value === "grid"
            ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
            : "text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-200"
        }`}
      >
        <LayoutGrid className="h-4 w-4" />
      </button>
      <button
        type="button"
        aria-label="List view"
        aria-pressed={value === "list"}
        onClick={() => onChange("list")}
        className={`inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors ${
          value === "list"
            ? "bg-zinc-900 text-white dark:bg-white dark:text-zinc-900"
            : "text-zinc-400 hover:text-zinc-700 dark:text-zinc-500 dark:hover:text-zinc-200"
        }`}
      >
        <ListIcon className="h-4 w-4" />
      </button>
    </div>
  );
}

function AvailabilityPill({ isAvailable }: { isAvailable: boolean }) {
  return (
    <span
      className={`absolute right-2 top-2 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium shadow-sm backdrop-blur-sm ${
        isAvailable
          ? "bg-white/90 text-zinc-700 dark:bg-zinc-900/80 dark:text-zinc-200"
          : "bg-white/90 text-zinc-400 dark:bg-zinc-900/80 dark:text-zinc-500"
      }`}
    >
      <span
        className={`h-1.5 w-1.5 rounded-full ${
          isAvailable ? "bg-green-500" : "bg-zinc-400 dark:bg-zinc-600"
        }`}
      />
      {isAvailable ? "Available" : "Unavailable"}
    </span>
  );
}

function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <Card className="rounded-2xl border-2 border-dashed border-zinc-200 bg-white/60 shadow-none dark:border-zinc-800 dark:bg-zinc-900/60">
      <CardContent className="flex min-h-[320px] flex-col items-center justify-center p-8 text-center">
        <div className="mb-4 rounded-full bg-zinc-100 p-4 dark:bg-zinc-800">
          {icon}
        </div>
        <h3 className="mb-1.5 text-lg font-semibold text-zinc-900 dark:text-zinc-50">
          {title}
        </h3>
        <p className="max-w-sm text-sm text-zinc-500 dark:text-zinc-400">
          {description}
        </p>
        {action && <div className="mt-4">{action}</div>}
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */
/*  Vendor menu (restaurant items)                                    */
/* ------------------------------------------------------------------ */

function VendorMenu() {
  const queryClient = useQueryClient();
  const { vendor, isLoading: vendorLoading } = useVendorProfile();
  const restaurant = vendor?.restaurants?.[0];
  const shop = vendor?.shops?.[0];
  const [activeView, setActiveView] = useState<"MENU" | "PRODUCTS">(() =>
    restaurant ? "MENU" : shop ? "PRODUCTS" : "MENU",
  );

  const hasBothBusinessTypes = Boolean(restaurant && shop);
  const effectiveView =
    activeView === "MENU" && !restaurant && shop
      ? "PRODUCTS"
      : activeView === "PRODUCTS" && !shop && restaurant
        ? "MENU"
        : activeView;
  const viewSwitcher = hasBothBusinessTypes ? (
    <div className="flex justify-end">
      <div className="flex items-center gap-3">
        <Label className="text-muted-foreground text-sm">View</Label>
        <Select
          value={activeView}
          onValueChange={(value) => setActiveView(value as "MENU" | "PRODUCTS")}
        >
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Select view" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="MENU">Restaurant Menu</SelectItem>
            <SelectItem value="PRODUCTS">Shop Products</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  ) : null;

  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string>("");
  const [imageUploading, setImageUploading] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    price: "",
    discountedPrice: "",
    mealTime: "",
    subCategoryId: "",
    preparationTime: "",
    isAvailable: true,
    imageUrl: "",
  });

  // Form validation state
  const [formErrors, setFormErrors] = useState({
    name: "",
    price: "",
    mealTime: "",
    preparationTime: "",
    discountedPrice: "",
  });

  const [touchedFields, setTouchedFields] = useState({
    name: false,
    price: false,
    mealTime: false,
    preparationTime: false,
    discountedPrice: false,
  });

  // Validation functions matching React Native app
  const validateField = (field: string, value: string) => {
    let error = "";

    switch (field) {
      case "name":
        if (!value.trim()) {
          error = "Item name is required";
        } else if (value.trim().length < 2) {
          error = "Item name must be at least 2 characters";
        } else if (value.trim().length > 100) {
          error = "Item name must be less than 100 characters";
        }
        break;

      case "price":
        if (!value.trim()) {
          error = "Price is required";
        } else {
          const price = parseFloat(value);
          if (isNaN(price) || price <= 0) {
            error = "Price must be a positive number";
          } else if (price > 999999) {
            error = "Price cannot exceed 999,999 GMD";
          }
        }
        break;

      case "mealTime":
        if (!value.trim()) {
          error = "Meal time is required";
        }
        break;

      case "preparationTime":
        if (!value.trim()) {
          error = "Preparation time is required";
        } else {
          const prepTime = parseInt(value);
          if (isNaN(prepTime) || prepTime < 1) {
            error = "Preparation time must be at least 1 minute";
          } else if (prepTime > 480) {
            error = "Preparation time cannot exceed 480 minutes (8 hours)";
          }
        }
        break;

      case "discountedPrice":
        if (value.trim()) {
          const discountedPrice = parseFloat(value);
          const originalPrice = parseFloat(formData.price);

          if (isNaN(discountedPrice) || discountedPrice <= 0) {
            error = "Discounted price must be a positive number";
          } else if (
            !isNaN(originalPrice) &&
            discountedPrice >= originalPrice
          ) {
            error = "Discounted price must be less than original price";
          } else if (discountedPrice > 999999) {
            error = "Discounted price cannot exceed 999,999 GMD";
          }
        }
        break;
    }

    return error;
  };

  const validateForm = () => {
    const errors = {
      name: validateField("name", formData.name),
      price: validateField("price", formData.price),
      mealTime: validateField("mealTime", formData.mealTime),
      preparationTime: validateField(
        "preparationTime",
        formData.preparationTime,
      ),
      discountedPrice: validateField(
        "discountedPrice",
        formData.discountedPrice,
      ),
    };

    setFormErrors(errors);
    return !Object.values(errors).some((error) => error !== "");
  };

  const handleFieldChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }));

    // Validate field on change if it has been touched
    if (touchedFields[field as keyof typeof touchedFields]) {
      const error = validateField(field, value);
      setFormErrors((prev) => ({ ...prev, [field]: error }));
    }
  };

  const handleFieldBlur = (field: string) => {
    setTouchedFields((prev) => ({ ...prev, [field]: true }));
    const error = validateField(
      field,
      formData[field as keyof typeof formData] as string,
    );
    setFormErrors((prev) => ({ ...prev, [field]: error }));
  };

  const {
    data: menuItems,
    isLoading,
    refetch,
  } = useQuery<MenuItem[]>({
    queryKey: ["vendor-menu", restaurant?.id],
    queryFn: async () => {
      if (!restaurant?.id) return [];
      const response = await api.get(
        `/api/menuItem/restaurant/${restaurant.id}`,
      );
      return response.data;
    },
    enabled: Boolean(restaurant?.id),
  });

  const { data: subCategories } = useQuery<SubCategory[]>({
    queryKey: ["subcategories"],
    queryFn: async () => {
      const response = await api.get("/api/subcategories");
      return response.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: async (payload: MenuItemPayload) => {
      if (!restaurant?.id) {
        throw new Error("No restaurant found for this vendor");
      }

      const response = await api.post("/api/menuItem", {
        ...payload,
        restaurantId: restaurant.id,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-menu"] });
      toast.success("Menu item created successfully");
      handleCloseModal();
    },
    onError: (error: any) => {
      console.error("Create error:", error);
      toast.error("Failed to create menu item");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: MenuItemPayload;
    }) => {
      const response = await api.put(`/api/menuItem/${id}`, payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-menu"] });
      toast.success("Menu item updated successfully");
      handleCloseModal();
    },
    onError: (error: any) => {
      console.error("Update error:", error);
      toast.error("Failed to update menu item");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/menuItem/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-menu"] });
      toast.success("Menu item deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete menu item");
    },
  });

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    try {
      setImageFile(file);

      // Show preview immediately
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Upload to Cloudinary
      setImageUploading(true);
      const cloudinaryUrl = await uploadToCloudinary(file);

      // Update form data with Cloudinary URL
      setFormData((prev) => ({ ...prev, imageUrl: cloudinaryUrl }));
      toast.success("Image uploaded successfully!");
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Failed to upload image. Please try again.");
      setImageFile(null);
      setImagePreview("");
    } finally {
      setImageUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Validate form before submission
    if (!validateForm()) {
      toast.error("Please fix the errors in the form before saving");
      return;
    }

    try {
      const itemData: MenuItemPayload = {
        name: formData.name.trim(),
        description: formData.description.trim() || undefined,
        price: parseFloat(formData.price),
        discountedPrice: formData.discountedPrice
          ? parseFloat(formData.discountedPrice)
          : undefined,
        preparationTime: formData.preparationTime
          ? parseInt(formData.preparationTime)
          : 15,
        isAvailable: formData.isAvailable,
        mealTime: formData.mealTime || undefined,
        subCategoryId: formData.subCategoryId || undefined,
      };

      // Add image URL if available (already uploaded to Cloudinary)
      if (formData.imageUrl) {
        itemData.imageUrl = formData.imageUrl;
      }

      if (editMode && selectedItem) {
        updateMutation.mutate({ id: selectedItem.id, payload: itemData });
      } else {
        createMutation.mutate(itemData);
      }
    } catch (error) {
      console.error("Error saving menu item:", error);
      toast.error("Failed to save menu item");
    }
  };

  const handleEdit = (item: MenuItem) => {
    setSelectedItem(item);
    setEditMode(true);
    setFormData({
      name: item.name,
      description: item.description || "",
      price: String(item.price),
      discountedPrice: item.discountedPrice ? String(item.discountedPrice) : "",
      mealTime: item.mealTime || "",
      subCategoryId: item.subCategoryId || "",
      preparationTime: item.preparationTime ? String(item.preparationTime) : "",
      isAvailable: item.isAvailable,
      imageUrl: item.imageUrl || "",
    });
    setImagePreview(item.imageUrl || "");
    setFormErrors({
      name: "",
      price: "",
      mealTime: "",
      preparationTime: "",
      discountedPrice: "",
    });
    setTouchedFields({
      name: false,
      price: false,
      mealTime: false,
      preparationTime: false,
      discountedPrice: false,
    });
    setModalOpen(true);
  };

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this item?")) {
      deleteMutation.mutate(id);
    }
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setEditMode(false);
    setSelectedItem(null);
    setImageFile(null);
    setImagePreview("");
    setImageUploading(false);
    setFormData({
      name: "",
      description: "",
      price: "",
      discountedPrice: "",
      mealTime: "",
      subCategoryId: "",
      preparationTime: "",
      isAvailable: true,
      imageUrl: "",
    });
    setFormErrors({
      name: "",
      price: "",
      mealTime: "",
      preparationTime: "",
      discountedPrice: "",
    });
    setTouchedFields({
      name: false,
      price: false,
      mealTime: false,
      preparationTime: false,
      discountedPrice: false,
    });
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview("");
    setFormData((prev) => ({ ...prev, imageUrl: "" }));
  };

  const filteredItems = menuItems?.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  if (vendorLoading) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <RefreshCw className="text-muted-foreground h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!restaurant && !shop) {
    return (
      <div className="flex-1 p-6 md:p-8 bg-zinc-50 dark:bg-zinc-950 min-h-screen">
        <div className="max-w-7xl mx-auto">
          <EmptyState
            icon={<ImageIcon className="h-8 w-8 text-zinc-400" />}
            title="No businesses found"
            description="Link a restaurant or shop to your vendor profile to start managing menu items or products."
          />
        </div>
      </div>
    );
  }

  if (effectiveView === "PRODUCTS") {
    if (!shop) {
      return (
        <div className="flex-1 p-6 md:p-8 bg-zinc-50 dark:bg-zinc-950 min-h-screen">
          <div className="max-w-7xl mx-auto space-y-6">
            {viewSwitcher}
            <EmptyState
              icon={<ImageIcon className="h-8 w-8 text-zinc-400" />}
              title="No shop found"
              description="Link a shop to your vendor profile to manage products."
            />
          </div>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {viewSwitcher}
        <ShopProductManager shop={shop} />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="flex-1 p-6 md:p-8 bg-zinc-50 dark:bg-zinc-950 min-h-screen">
        <div className="max-w-7xl mx-auto space-y-6">
          {viewSwitcher}
          <EmptyState
            icon={<ImageIcon className="h-8 w-8 text-zinc-400" />}
            title="No restaurant found"
            description="Link a restaurant to your vendor profile to manage menu items."
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 p-6 md:p-8 bg-zinc-50 dark:bg-zinc-950 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        {viewSwitcher}
        {/* Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
              Menu Management
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm">
              <span className="font-medium text-orange-600 dark:text-orange-500">
                {restaurant.name}
              </span>
              <span className="mx-1.5 text-zinc-300 dark:text-zinc-700">·</span>
              {filteredItems?.length ?? 0} item
              {filteredItems?.length === 1 ? "" : "s"}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => refetch()}
              variant="outline"
              className="shadow-sm border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400"
              size="sm"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button
              onClick={() => setModalOpen(true)}
              size="sm"
              className="bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 shadow-sm"
            >
              <Plus className="mr-2 h-4 w-4 text-orange-500" />
              Add Item
            </Button>
          </div>
        </div>

        {/* Search + view toggle */}
        <Card className="rounded-2xl border-0 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-zinc-950/[0.06] overflow-hidden bg-white dark:bg-zinc-900 dark:ring-white/[0.08]">
          <CardContent className="p-4">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="relative flex-1">
                <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                <Input
                  placeholder="Search menu items by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <ViewToggle value={viewMode} onChange={setViewMode} />
            </div>
          </CardContent>
        </Card>

        {/* Menu Items */}
        {isLoading ? (
          <div className="flex min-h-[300px] items-center justify-center">
            <RefreshCw className="text-muted-foreground h-8 w-8 animate-spin" />
          </div>
        ) : filteredItems && filteredItems.length > 0 ? (
          viewMode === "grid" ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredItems.map((item) => (
                <Card
                  key={item.id}
                  className="group relative overflow-hidden rounded-2xl border-0 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04),0_1px_6px_rgba(0,0,0,0.04)] ring-1 ring-zinc-950/[0.06] transition-shadow hover:shadow-[0_4px_16px_rgba(0,0,0,0.08)] dark:bg-zinc-900 dark:ring-white/[0.08]"
                >
                  <CardContent className="p-0">
                    {/* Image Section */}
                    <div className="relative aspect-[4/3] overflow-hidden bg-zinc-100 dark:bg-zinc-800">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <ImageIcon className="h-8 w-8 text-zinc-300 dark:text-zinc-700" />
                        </div>
                      )}
                      <AvailabilityPill isAvailable={item.isAvailable} />

                      {/* Actions - revealed on hover (desktop only) */}
                      <div className="absolute bottom-2 right-2 hidden gap-1 opacity-0 transition-opacity duration-150 group-hover:opacity-100 sm:flex">
                        <button
                          type="button"
                          onClick={() => handleEdit(item)}
                          title="Edit item"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-zinc-600 shadow-sm backdrop-blur-sm transition-colors hover:bg-white hover:text-zinc-900 dark:bg-zinc-900/95 dark:text-zinc-300 dark:hover:text-white"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          title="Delete item"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-white/95 text-zinc-600 shadow-sm backdrop-blur-sm transition-colors hover:bg-red-50 hover:text-red-600 dark:bg-zinc-900/95 dark:text-zinc-300 dark:hover:bg-red-950/60 dark:hover:text-red-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Content Section */}
                    <div className="space-y-2 p-3.5">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="line-clamp-1 text-sm font-semibold leading-tight text-zinc-900 dark:text-zinc-50">
                          {item.name}
                        </h3>
                        {item.mealTime && (
                          <span className="shrink-0 rounded-full bg-zinc-100 px-2 py-0.5 text-[10px] font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
                            {item.mealTime}
                          </span>
                        )}
                      </div>

                      {item.description && (
                        <p className="line-clamp-1 text-xs text-zinc-500 dark:text-zinc-400">
                          {item.description}
                        </p>
                      )}

                      <div className="flex items-baseline justify-between pt-1">
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                            D{item.price.toFixed(2)}
                          </span>
                          {item.discountedPrice && (
                            <span className="text-xs text-zinc-400 line-through">
                              D{item.discountedPrice.toFixed(2)}
                            </span>
                          )}
                        </div>
                        {item.preparationTime && (
                          <span className="text-[11px] text-zinc-400">
                            {item.preparationTime}m
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Mobile action bar (no hover on touch) */}
                    <div className="flex border-t border-zinc-100 dark:border-zinc-800 sm:hidden">
                      <button
                        type="button"
                        onClick={() => handleEdit(item)}
                        className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-zinc-600 active:bg-zinc-50 dark:text-zinc-400 dark:active:bg-zinc-800"
                      >
                        <Edit className="h-3.5 w-3.5" /> Edit
                      </button>
                      <div className="w-px bg-zinc-100 dark:bg-zinc-800" />
                      <button
                        type="button"
                        onClick={() => handleDelete(item.id)}
                        className="flex flex-1 items-center justify-center gap-1.5 py-2.5 text-xs font-medium text-red-600 active:bg-red-50 dark:text-red-400 dark:active:bg-red-950/40"
                      >
                        <Trash2 className="h-3.5 w-3.5" /> Delete
                      </button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredItems.map((item) => (
                <Card
                  key={item.id}
                  className="overflow-hidden rounded-xl border-0 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-zinc-950/[0.06] transition-shadow hover:shadow-[0_2px_10px_rgba(0,0,0,0.06)] dark:bg-zinc-900 dark:ring-white/[0.08]"
                >
                  <CardContent className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:gap-4">
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-full items-center justify-center">
                          <ImageIcon className="h-5 w-5 text-zinc-300 dark:text-zinc-700" />
                        </div>
                      )}
                    </div>

                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                          {item.name}
                        </h3>
                        {item.mealTime && (
                          <Badge
                            variant="outline"
                            className="text-[10px] font-normal text-zinc-500 dark:text-zinc-400"
                          >
                            {item.mealTime}
                          </Badge>
                        )}
                        <span className="inline-flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              item.isAvailable
                                ? "bg-green-500"
                                : "bg-zinc-400 dark:bg-zinc-600"
                            }`}
                          />
                          {item.isAvailable ? "Available" : "Unavailable"}
                        </span>
                      </div>
                      {item.description && (
                        <p className="line-clamp-1 text-sm text-zinc-500 dark:text-zinc-400">
                          {item.description}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between gap-4 sm:justify-end sm:shrink-0">
                      <div className="text-left sm:text-right">
                        <div className="flex items-baseline gap-2">
                          <span className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                            D{item.price.toFixed(2)}
                          </span>
                          {item.discountedPrice && (
                            <span className="text-xs text-zinc-400 line-through">
                              D{item.discountedPrice.toFixed(2)}
                            </span>
                          )}
                        </div>
                        {item.preparationTime && (
                          <p className="text-xs text-zinc-400">
                            {item.preparationTime} min
                          </p>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <button
                          type="button"
                          onClick={() => handleEdit(item)}
                          title="Edit item"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          title="Delete item"
                          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-red-50 hover:text-red-600 dark:text-zinc-400 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )
        ) : (
          <EmptyState
            icon={<Search className="h-8 w-8 text-zinc-400" />}
            title="No menu items found"
            description={
              searchQuery
                ? "Try adjusting your search terms"
                : "Get started by adding your first menu item"
            }
            action={
              !searchQuery && (
                <Button onClick={() => setModalOpen(true)} size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Menu Item
                </Button>
              )
            }
          />
        )}

        {/* Add/Edit Dialog */}
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">
                {editMode ? "Edit Menu Item" : "Add New Menu Item"}
              </DialogTitle>
              <DialogDescription>
                {editMode
                  ? "Update the details of your menu item below"
                  : "Fill in the details to add a new item to your menu"}
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Image Upload */}
              <div className="space-y-3">
                <Label className="text-base">Item Image</Label>
                {imagePreview ? (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="h-48 w-full rounded-lg object-cover"
                    />
                    {imageUploading && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/50">
                        <div className="text-center">
                          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-white" />
                          <p className="mt-2 text-sm font-medium text-white">
                            Uploading to Cloudinary...
                          </p>
                        </div>
                      </div>
                    )}
                    {!imageUploading && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute right-2 top-2"
                        onClick={handleRemoveImage}
                      >
                        <X className="mr-1 h-3.5 w-3.5" />
                        Remove
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="border-muted-foreground/25 hover:border-muted-foreground/50 flex h-48 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed transition-colors">
                    <label
                      htmlFor="image-upload"
                      className="flex cursor-pointer flex-col items-center gap-2"
                    >
                      {imageUploading ? (
                        <>
                          <RefreshCw className="text-primary h-10 w-10 animate-spin" />
                          <span className="text-primary text-sm font-medium">
                            Uploading to Cloudinary...
                          </span>
                        </>
                      ) : (
                        <>
                          <ImageIcon className="text-muted-foreground h-10 w-10" />
                          <span className="text-muted-foreground text-sm">
                            Click to upload image
                          </span>
                          <span className="text-muted-foreground text-xs">
                            JPG, PNG up to 5MB
                          </span>
                        </>
                      )}
                      <Input
                        id="image-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="hidden"
                        disabled={imageUploading}
                      />
                    </label>
                  </div>
                )}
              </div>

              <Separator />

              {/* Name */}
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium">
                  Item Name <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="name"
                  placeholder="e.g., Chicken Yassa"
                  value={formData.name}
                  onChange={(e) => handleFieldChange("name", e.target.value)}
                  onBlur={() => handleFieldBlur("name")}
                  required
                  maxLength={100}
                  className={
                    formErrors.name && touchedFields.name
                      ? "border-destructive"
                      : ""
                  }
                />
                {formErrors.name && touchedFields.name && (
                  <p className="text-destructive text-sm">{formErrors.name}</p>
                )}
              </div>

              {/* Description */}
              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium">
                  Description
                </Label>
                <Textarea
                  id="description"
                  placeholder="Describe your dish..."
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={3}
                  className="resize-none"
                />
              </div>

              {/* Price */}
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="price" className="text-sm font-medium">
                    Price (D) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    max="999999"
                    placeholder="0.00"
                    value={formData.price}
                    onChange={(e) => handleFieldChange("price", e.target.value)}
                    onBlur={() => handleFieldBlur("price")}
                    required
                    className={
                      formErrors.price && touchedFields.price
                        ? "border-destructive"
                        : ""
                    }
                  />
                  {formErrors.price && touchedFields.price && (
                    <p className="text-destructive text-sm">
                      {formErrors.price}
                    </p>
                  )}
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="preparationTime"
                    className="text-sm font-medium"
                  >
                    Preparation Time (minutes){" "}
                    <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="preparationTime"
                    type="number"
                    min="1"
                    max="480"
                    placeholder="e.g., 30"
                    value={formData.preparationTime}
                    onChange={(e) =>
                      handleFieldChange("preparationTime", e.target.value)
                    }
                    onBlur={() => handleFieldBlur("preparationTime")}
                    required
                    className={
                      formErrors.preparationTime &&
                      touchedFields.preparationTime
                        ? "border-destructive"
                        : ""
                    }
                  />
                  {formErrors.preparationTime &&
                    touchedFields.preparationTime && (
                      <p className="text-destructive text-sm">
                        {formErrors.preparationTime}
                      </p>
                    )}
                </div>
              </div>

              {/* Discounted Price with preview */}
              <div className="space-y-2">
                <Label
                  htmlFor="discountedPrice"
                  className="text-sm font-medium"
                >
                  Discounted Price (D){" "}
                  <span className="text-muted-foreground text-xs font-normal">
                    (Optional)
                  </span>
                </Label>
                <Input
                  id="discountedPrice"
                  type="number"
                  step="0.01"
                  min="0"
                  max="999999"
                  placeholder="0.00"
                  value={formData.discountedPrice}
                  onChange={(e) =>
                    handleFieldChange("discountedPrice", e.target.value)
                  }
                  onBlur={() => handleFieldBlur("discountedPrice")}
                  className={
                    formErrors.discountedPrice && touchedFields.discountedPrice
                      ? "border-destructive"
                      : ""
                  }
                />
                {formErrors.discountedPrice &&
                  touchedFields.discountedPrice && (
                    <p className="text-destructive text-sm">
                      {formErrors.discountedPrice}
                    </p>
                  )}
                {/* Discount Preview */}
                {formData.discountedPrice &&
                  parseFloat(formData.discountedPrice) > 0 &&
                  formData.price &&
                  parseFloat(formData.price) > 0 &&
                  parseFloat(formData.discountedPrice) <
                    parseFloat(formData.price) && (
                    <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3">
                      <Badge
                        variant="outline"
                        className="bg-green-600 text-white"
                      >
                        {Math.round(
                          ((parseFloat(formData.price) -
                            parseFloat(formData.discountedPrice)) /
                            parseFloat(formData.price)) *
                            100,
                        )}
                        % OFF
                      </Badge>
                      <p className="text-green-700 text-sm">
                        Customers will see this discount badge
                      </p>
                    </div>
                  )}
              </div>

              {/* Meal Time - Required */}
              <div className="space-y-2">
                <Label htmlFor="mealTime" className="text-sm font-medium">
                  Meal Time <span className="text-destructive">*</span>
                </Label>
                <Select
                  value={formData.mealTime}
                  onValueChange={(value) => {
                    handleFieldChange("mealTime", value);
                    setTouchedFields((prev) => ({ ...prev, mealTime: true }));
                  }}
                >
                  <SelectTrigger
                    id="mealTime"
                    className={
                      formErrors.mealTime && touchedFields.mealTime
                        ? "border-destructive"
                        : ""
                    }
                  >
                    <SelectValue placeholder="Select meal time" />
                  </SelectTrigger>
                  <SelectContent>
                    {MEAL_TIMES.map((time) => (
                      <SelectItem key={time} value={time}>
                        {time.charAt(0) + time.slice(1).toLowerCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.mealTime && touchedFields.mealTime && (
                  <p className="text-destructive text-sm">
                    {formErrors.mealTime}
                  </p>
                )}
              </div>

              {/* Sub Category - Optional */}
              <div className="space-y-2">
                <Label htmlFor="subCategory" className="text-sm font-medium">
                  Category{" "}
                  <span className="text-muted-foreground text-xs font-normal">
                    (Optional)
                  </span>
                </Label>
                <Select
                  value={formData.subCategoryId || undefined}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      subCategoryId: value === "none" ? "" : value,
                    })
                  }
                >
                  <SelectTrigger id="subCategory">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {subCategories?.map((cat) => (
                      <SelectItem key={cat.id} value={cat.id}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              {/* Availability */}
              <div className="bg-muted/50 flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="available" className="text-base font-medium">
                    Available for Customers
                  </Label>
                  <p className="text-muted-foreground text-sm">
                    Toggle to make this item visible in your menu
                  </p>
                </div>
                <Switch
                  id="available"
                  checked={formData.isAvailable}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isAvailable: checked })
                  }
                />
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseModal}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={
                    createMutation.isPending || updateMutation.isPending
                  }
                >
                  {createMutation.isPending || updateMutation.isPending ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>{editMode ? "Update Item" : "Create Item"}</>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Shop products                                                     */
/* ------------------------------------------------------------------ */

function ShopProductManager({ shop }: { shop: VendorShop }) {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [filterAvailability, setFilterAvailability] = useState("all");
  const [filterFeatured, setFilterFeatured] = useState("all");
  const [sortBy, setSortBy] = useState("createdAt_desc");
  const [currentPage, setCurrentPage] = useState(1);
  const [productsPerPage, setProductsPerPage] = useState(50);
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [modalOpen, setModalOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ShopProduct | null>(
    null,
  );
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState("");
  const [imageUploading, setImageUploading] = useState(false);

  const initialFormState: ShopProductFormState = {
    name: "",
    description: "",
    price: "",
    discountedPrice: "",
    stock: "",
    subCategoryId: "",
    isAvailable: true,
  };
  const [formData, setFormData] =
    useState<ShopProductFormState>(initialFormState);

  // Debounce search so we don't hammer the server on every keystroke
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(searchQuery);
      setCurrentPage(1); // reset to page 1 on new search
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  const { data, isLoading, refetch } = useQuery({
    queryKey: [
      "vendor-shop-products",
      shop.id,
      debouncedSearch,
      filterAvailability,
      filterFeatured,
      sortBy,
      currentPage,
      productsPerPage,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(productsPerPage),
      });
      if (debouncedSearch) params.append("search", debouncedSearch);
      if (filterAvailability !== "all")
        params.append("isAvailable", filterAvailability);
      if (filterFeatured !== "all") params.append("isFeatured", filterFeatured);
      params.append("sortBy", sortBy);
      const response = await api.get(`/api/products/shop/${shop.id}?${params}`);
      return response.data as {
        products: ShopProduct[];
        pagination: {
          page: number;
          limit: number;
          total: number;
          pages: number;
        };
      };
    },
    enabled: Boolean(shop.id),
  });

  const products = data?.products ?? [];
  const pagination = data?.pagination;

  const { data: subCategories = [] } = useQuery<SubCategory[]>({
    queryKey: ["subcategories"],
    queryFn: async () => {
      const response = await api.get("/api/subcategories");
      return response.data;
    },
  });

  const resetFormState = () => {
    setFormData(initialFormState);
    setImageFile(null);
    setImagePreview("");
    setSelectedProduct(null);
    setEditMode(false);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    resetFormState();
  };

  const handleAddProduct = () => {
    resetFormState();
    setModalOpen(true);
  };

  const handleEditProduct = (product: ShopProduct) => {
    setSelectedProduct(product);
    setEditMode(true);
    setFormData({
      name: product.name,
      description: product.description || "",
      price: product.price ? String(product.price) : "",
      discountedPrice: product.discountedPrice
        ? String(product.discountedPrice)
        : "",
      stock: product.stock ? String(product.stock) : "",
      subCategoryId: product.subCategoryId || "",
      isAvailable: product.isAvailable,
    });
    setImagePreview(product.imageUrl || "");
    setModalOpen(true);
  };

  const handleImageChange = async (
    event: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    // Validate file size (5MB limit)
    const maxSize = 5 * 1024 * 1024; // 5MB
    if (file.size > maxSize) {
      toast.error("Image size must be less than 5MB");
      return;
    }

    try {
      setImageFile(file);

      // Show preview immediately
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);

      // Upload to Cloudinary
      setImageUploading(true);
      const cloudinaryUrl = await uploadToCloudinary(file);

      // Store the Cloudinary URL
      setImagePreview(cloudinaryUrl);
      toast.success("Image uploaded successfully!");
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Failed to upload image. Please try again.");
      setImageFile(null);
      setImagePreview("");
    } finally {
      setImageUploading(false);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview("");
    setImageUploading(false);
  };

  const buildPayload = async (): Promise<ShopProductPayload> => {
    const trimmedName = formData.name.trim();
    if (!trimmedName) {
      throw new Error("Product name is required");
    }

    const priceValue = Number(formData.price);
    if (Number.isNaN(priceValue) || priceValue <= 0) {
      throw new Error("Enter a valid price greater than 0");
    }

    const stockValue = formData.stock ? Number(formData.stock) : 0;
    if (Number.isNaN(stockValue) || stockValue < 0) {
      throw new Error("Enter a valid stock quantity");
    }

    let discountedValue: number | null = null;
    if (formData.discountedPrice) {
      discountedValue = Number(formData.discountedPrice);
      if (Number.isNaN(discountedValue) || discountedValue <= 0) {
        throw new Error("Enter a valid discounted price");
      }
      if (discountedValue >= priceValue) {
        throw new Error("Discounted price must be less than the base price");
      }
    }

    const payload: ShopProductPayload = {
      name: trimmedName,
      description: formData.description.trim() || undefined,
      price: priceValue,
      discountedPrice: discountedValue,
      stock: stockValue,
      subCategoryId: formData.subCategoryId || undefined,
      shopId: shop.id,
      isAvailable: formData.isAvailable,
    };

    // Use imagePreview which already contains the Cloudinary URL
    if (imagePreview) {
      payload.imageUrl = imagePreview;
    }

    return payload;
  };

  const createProductMutation = useMutation({
    mutationFn: async (payload: ShopProductPayload) => {
      const response = await api.post("/api/products", payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-shop-products"] });
      toast.success("Product created successfully");
      handleCloseModal();
    },
    onError: () => {
      toast.error("Failed to create product");
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string;
      payload: ShopProductPayload;
    }) => {
      const response = await api.put(`/api/products/${id}`, payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-shop-products"] });
      toast.success("Product updated successfully");
      handleCloseModal();
    },
    onError: () => {
      toast.error("Failed to update product");
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      await api.delete(`/api/products/${productId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-shop-products"] });
      toast.success("Product deleted successfully");
    },
    onError: () => {
      toast.error("Failed to delete product");
    },
  });

  const availabilityMutation = useMutation({
    mutationFn: async ({
      id,
      isAvailable,
    }: {
      id: string;
      isAvailable: boolean;
    }) => {
      const response = await api.put(`/api/products/${id}`, { isAvailable });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-shop-products"] });
      toast.success("Product visibility updated");
    },
    onError: () => {
      toast.error("Failed to update product visibility");
    },
  });

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const payload = await buildPayload();
      if (editMode && selectedProduct) {
        updateProductMutation.mutate({ id: selectedProduct.id, payload });
      } else {
        createProductMutation.mutate(payload);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save product";
      toast.error(message);
    }
  };

  const handleDelete = (productId: string) => {
    if (!window.confirm("Delete this product? This action cannot be undone.")) {
      return;
    }
    deleteProductMutation.mutate(productId);
  };

  const handleToggleAvailability = (product: ShopProduct) => {
    availabilityMutation.mutate({
      id: product.id,
      isAvailable: !product.isAvailable,
    });
  };

  // Search is handled server-side via query params
  const isSaving =
    createProductMutation.isPending || updateProductMutation.isPending;

  const hasActiveFilters =
    filterAvailability !== "all" ||
    filterFeatured !== "all" ||
    sortBy !== "createdAt_desc";

  return (
    <div className="flex-1 p-6 md:p-8 bg-zinc-50 dark:bg-zinc-950 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
              Product Management
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 text-sm">
              <span className="font-medium text-orange-600 dark:text-orange-500">
                {shop.name}
              </span>
              {pagination && (
                <>
                  <span className="mx-1.5 text-zinc-300 dark:text-zinc-700">
                    ·
                  </span>
                  {pagination.total} total
                </>
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              onClick={() => refetch()}
              variant="outline"
              size="sm"
              className="shadow-sm border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-zinc-600 dark:text-zinc-400"
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              <span className="hidden sm:inline">Refresh</span>
            </Button>
            <Button
              onClick={handleAddProduct}
              size="sm"
              className="bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200 shadow-sm"
            >
              <Plus className="mr-2 h-4 w-4 text-orange-500" />
              Add Product
            </Button>
          </div>
        </div>

        <Card className="rounded-2xl border-0 shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-zinc-950/[0.06] overflow-hidden bg-white dark:bg-zinc-900 dark:ring-white/[0.08]">
          <CardContent className="p-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative min-w-48 flex-1">
                <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                <Input
                  placeholder="Search products by name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select
                value={filterAvailability}
                onValueChange={(v) => {
                  setFilterAvailability(v);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-40">
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
                onValueChange={(v) => {
                  setFilterFeatured(v);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-36">
                  <SelectValue placeholder="Featured" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Products</SelectItem>
                  <SelectItem value="true">Featured Only</SelectItem>
                  <SelectItem value="false">Not Featured</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={sortBy}
                onValueChange={(v) => {
                  setSortBy(v);
                  setCurrentPage(1);
                }}
              >
                <SelectTrigger className="w-44">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="createdAt_desc">Newest First</SelectItem>
                  <SelectItem value="createdAt_asc">Oldest First</SelectItem>
                  <SelectItem value="updatedAt_desc">
                    Recently Updated
                  </SelectItem>
                  <SelectItem value="name_asc">Name A–Z</SelectItem>
                  <SelectItem value="name_desc">Name Z–A</SelectItem>
                  <SelectItem value="price_asc">Price Low–High</SelectItem>
                  <SelectItem value="price_desc">Price High–Low</SelectItem>
                  <SelectItem value="stock_desc">Most Stock</SelectItem>
                </SelectContent>
              </Select>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFilterAvailability("all");
                    setFilterFeatured("all");
                    setSortBy("createdAt_desc");
                    setCurrentPage(1);
                  }}
                  className="h-9 gap-1 text-red-500 hover:text-red-600"
                >
                  <X className="h-4 w-4" /> Clear
                </Button>
              )}
              <ViewToggle value={viewMode} onChange={setViewMode} />
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <ProductsGridSkeleton count={12} />
        ) : products.length > 0 ? (
          viewMode === "grid" ? (
            <div className="grid gap-5 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
              {products.map((product) => {
                const toggling =
                  availabilityMutation.isPending &&
                  availabilityMutation.variables?.id === product.id;
                const deleting =
                  deleteProductMutation.isPending &&
                  deleteProductMutation.variables === product.id;

                return (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onEdit={handleEditProduct}
                    onDelete={handleDelete}
                    onToggleAvailability={handleToggleAvailability}
                    isToggling={toggling}
                    isDeleting={deleting}
                  />
                );
              })}
            </div>
          ) : (
            <div className="space-y-2.5">
              {products.map((product) => {
                const toggling =
                  availabilityMutation.isPending &&
                  availabilityMutation.variables?.id === product.id;
                const deleting =
                  deleteProductMutation.isPending &&
                  deleteProductMutation.variables === product.id;

                return (
                  <Card
                    key={product.id}
                    className="overflow-hidden rounded-xl border-0 bg-white shadow-[0_1px_2px_rgba(0,0,0,0.04)] ring-1 ring-zinc-950/[0.06] transition-shadow hover:shadow-[0_2px_10px_rgba(0,0,0,0.06)] dark:bg-zinc-900 dark:ring-white/[0.08]"
                  >
                    <CardContent className="flex flex-col gap-3 p-3 sm:flex-row sm:items-center sm:gap-4">
                      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-zinc-100 dark:bg-zinc-800">
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <ImageIcon className="h-5 w-5 text-zinc-300 dark:text-zinc-700" />
                          </div>
                        )}
                      </div>

                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="font-semibold text-zinc-900 dark:text-zinc-50">
                            {product.name}
                          </h3>
                          <span className="inline-flex items-center gap-1.5 text-xs text-zinc-500 dark:text-zinc-400">
                            <span
                              className={`h-1.5 w-1.5 rounded-full ${
                                product.isAvailable
                                  ? "bg-green-500"
                                  : "bg-zinc-400 dark:bg-zinc-600"
                              }`}
                            />
                            {product.isAvailable ? "Available" : "Unavailable"}
                          </span>
                          {typeof product.stock === "number" && (
                            <span className="text-xs text-zinc-400 dark:text-zinc-500">
                              {product.stock} in stock
                            </span>
                          )}
                        </div>
                        {product.description && (
                          <p className="line-clamp-1 text-sm text-zinc-500 dark:text-zinc-400">
                            {product.description}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center justify-between gap-3 border-t border-zinc-100 pt-3 dark:border-zinc-800 sm:justify-end sm:gap-5 sm:border-t-0 sm:pt-0 sm:shrink-0">
                        <div className="text-left sm:text-right">
                          <div className="flex items-baseline gap-2">
                            <span className="text-base font-bold text-zinc-900 dark:text-zinc-50">
                              D{product.price.toFixed(2)}
                            </span>
                            {product.discountedPrice && (
                              <span className="text-xs text-zinc-400 line-through">
                                D{product.discountedPrice.toFixed(2)}
                              </span>
                            )}
                          </div>
                        </div>
                        <Switch
                          checked={product.isAvailable}
                          disabled={toggling}
                          onCheckedChange={() =>
                            handleToggleAvailability(product)
                          }
                          aria-label="Toggle availability"
                        />
                        <div className="flex gap-1">
                          <button
                            type="button"
                            onClick={() => handleEditProduct(product)}
                            title="Edit product"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800 dark:hover:text-white"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(product.id)}
                            disabled={deleting}
                            title="Delete product"
                            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )
        ) : (
          <EmptyState
            icon={<Search className="h-8 w-8 text-zinc-400" />}
            title="No products found"
            description={
              searchQuery
                ? "Try adjusting your search terms"
                : "Get started by adding your first product"
            }
            action={
              !searchQuery && (
                <Button onClick={handleAddProduct} size="sm">
                  <Plus className="mr-2 h-4 w-4" />
                  Add Product
                </Button>
              )
            }
          />
        )}

        {/* Pagination */}
        {pagination && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-200 dark:border-zinc-800 pt-4">
            <div className="flex items-center gap-3">
              <p className="text-sm text-zinc-500">
                {pagination.pages > 1
                  ? `Page ${pagination.page} of ${pagination.pages} — `
                  : ""}
                {pagination.total} products
              </p>
              <div className="flex items-center gap-2">
                <span className="text-sm text-zinc-500">Show</span>
                <select
                  title="Products per page"
                  value={productsPerPage}
                  onChange={(e) => {
                    setProductsPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="h-8 rounded-md border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-2 py-0 text-sm text-zinc-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  {[10, 25, 50, 100, 200].map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
                <span className="text-sm text-zinc-500">per page</span>
              </div>
            </div>
            {pagination.pages > 1 && (
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={pagination.page <= 1}
                >
                  Previous
                </Button>
                {Array.from({ length: pagination.pages }, (_, i) => i + 1)
                  .filter(
                    (p) =>
                      Math.abs(p - pagination.page) <= 2 ||
                      p === 1 ||
                      p === pagination.pages,
                  )
                  .reduce<(number | "...")[]>((acc, p, idx, arr) => {
                    if (idx > 0 && p - (arr[idx - 1] as number) > 1)
                      acc.push("...");
                    acc.push(p);
                    return acc;
                  }, [])
                  .map((p, i) =>
                    p === "..." ? (
                      <span
                        key={`ellipsis-${i}`}
                        className="text-zinc-400 px-1"
                      >
                        …
                      </span>
                    ) : (
                      <Button
                        key={p}
                        variant={p === pagination.page ? "default" : "outline"}
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
                  onClick={() =>
                    setCurrentPage((p) => Math.min(pagination.pages, p + 1))
                  }
                  disabled={pagination.page >= pagination.pages}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        )}

        <Dialog
          open={modalOpen}
          onOpenChange={(open) =>
            open ? setModalOpen(true) : handleCloseModal()
          }
        >
          <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
            <DialogHeader>
              <DialogTitle className="text-2xl">
                {editMode ? "Edit Product" : "Add New Product"}
              </DialogTitle>
              <DialogDescription>
                {editMode
                  ? "Update product details for your shop"
                  : "Fill in the details to add a new product to your shop"}
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Image Upload */}
              <div className="space-y-3">
                <Label className="text-base">Product Image</Label>
                {imagePreview ? (
                  <div className="relative">
                    <img
                      src={imagePreview}
                      alt="Product preview"
                      className="h-48 w-full rounded-lg object-cover"
                    />
                    {imageUploading && (
                      <div className="absolute inset-0 flex items-center justify-center rounded-lg bg-black/50">
                        <div className="text-center">
                          <RefreshCw className="mx-auto h-8 w-8 animate-spin text-white" />
                          <p className="mt-2 text-sm font-medium text-white">
                            Uploading to Cloudinary...
                          </p>
                        </div>
                      </div>
                    )}
                    {!imageUploading && (
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="absolute right-2 top-2"
                        onClick={handleRemoveImage}
                        disabled={isSaving}
                      >
                        <X className="mr-1 h-3.5 w-3.5" />
                        Remove
                      </Button>
                    )}
                  </div>
                ) : (
                  <div className="border-muted-foreground/25 hover:border-muted-foreground/50 flex h-48 cursor-pointer items-center justify-center rounded-lg border-2 border-dashed transition-colors">
                    <label
                      htmlFor="product-image-upload"
                      className="flex cursor-pointer flex-col items-center gap-2"
                    >
                      {imageUploading ? (
                        <>
                          <RefreshCw className="text-primary h-10 w-10 animate-spin" />
                          <span className="text-primary text-sm font-medium">
                            Uploading to Cloudinary...
                          </span>
                        </>
                      ) : (
                        <>
                          <ImageIcon className="text-muted-foreground h-10 w-10" />
                          <span className="text-muted-foreground text-sm">
                            Click to upload image
                          </span>
                          <span className="text-muted-foreground text-xs">
                            JPG, PNG up to 5MB
                          </span>
                        </>
                      )}
                      <Input
                        id="product-image-upload"
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        disabled={isSaving || imageUploading}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </div>

              <Separator />

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="productName" className="text-sm font-medium">
                    Product Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="productName"
                    placeholder="e.g., Laptop Stand"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    disabled={isSaving}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="productPrice" className="text-sm font-medium">
                    Price (D) <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="productPrice"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.price}
                    onChange={(e) =>
                      setFormData({ ...formData, price: e.target.value })
                    }
                    disabled={isSaving}
                  />
                </div>
                <div className="space-y-2">
                  <Label
                    htmlFor="discountedPrice"
                    className="text-sm font-medium"
                  >
                    Discounted Price (D)
                  </Label>
                  <Input
                    id="discountedPrice"
                    type="number"
                    min="0"
                    step="0.01"
                    placeholder="0.00"
                    value={formData.discountedPrice}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        discountedPrice: e.target.value,
                      })
                    }
                    disabled={isSaving}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="stock" className="text-sm font-medium">
                    Stock Quantity
                  </Label>
                  <Input
                    id="stock"
                    type="number"
                    min="0"
                    placeholder="0"
                    value={formData.stock}
                    onChange={(e) =>
                      setFormData({ ...formData, stock: e.target.value })
                    }
                    disabled={isSaving}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subCategory" className="text-sm font-medium">
                  Category
                </Label>
                <Select
                  value={formData.subCategoryId}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      subCategoryId: value === "none" ? "" : value,
                    })
                  }
                  disabled={isSaving}
                >
                  <SelectTrigger id="subCategory">
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {subCategories.map((subCategory) => (
                      <SelectItem key={subCategory.id} value={subCategory.id}>
                        {subCategory.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description" className="text-sm font-medium">
                  Description
                </Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  rows={4}
                  placeholder="Describe your product..."
                  disabled={isSaving}
                  className="resize-none"
                />
              </div>

              <Separator />

              <div className="bg-muted/50 flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label className="text-base font-medium">
                    Available for Ordering
                  </Label>
                  <p className="text-muted-foreground text-sm">
                    Toggle to make this product visible to customers
                  </p>
                </div>
                <Switch
                  checked={formData.isAvailable}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isAvailable: checked })
                  }
                  disabled={isSaving}
                />
              </div>

              <DialogFooter className="gap-2 sm:gap-0">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseModal}
                  disabled={isSaving}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSaving}>
                  {isSaving ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    <>{editMode ? "Update Product" : "Create Product"}</>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}

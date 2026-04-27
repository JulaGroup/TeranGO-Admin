// @ts-nocheck
import { useState, useEffect, useMemo, useRef } from "react";
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
  MapPin,
  Map as MapIcon,
  Save,
  Upload,
  Image as ImageIcon,
  X,
  Loader2,
  Plus,
} from "lucide-react";
import { toast } from "sonner";
import { adminApi, api } from "@/lib/api";
import Vendor from "@/lib/types";
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
import { Textarea } from "@/components/ui/textarea";
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
import {
  VendorLocationsMap,
  VendorBusiness,
} from "@/components/vendor-locations-map";

const topNav = [
  { title: "Overview", href: "/admin", isActive: false },
  { title: "Vendors", href: "/admin/vendors", isActive: true },
  { title: "Drivers", href: "/admin/drivers", isActive: false },
  { title: "Settings", href: "#", isActive: false },
];

// Cloudinary configuration - matching menu management
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
  const [viewMode, setViewMode] = useState("grid"); // 'grid', 'list', or 'map'
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
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    fullName: "",
    email: "",
    phone: "",
    waveNumber: "",
    // Business details
    businessType: "" as "" | "RESTAURANT" | "SHOP" | "PHARMACY",
    businessName: "",
    businessAddress: "",
    businessPhone: "",
    businessEmail: "",
    businessDescription: "",
    businessImageUrl: "",
  });
  const [createStep, setCreateStep] = useState<1 | 2>(1);
  const [createImageFile, setCreateImageFile] = useState<File | null>(null);
  const [createImagePreview, setCreateImagePreview] = useState<string>("");
  const [isUploadingCreateImage, setIsUploadingCreateImage] = useState(false);
  const [isEditLocationOpen, setIsEditLocationOpen] = useState(false);
  const [selectedBusiness, setSelectedBusiness] = useState<any>(null);
  const [selectedLocation, setSelectedLocation] = useState<{
    lat: number;
    lng: number;
    address?: string;
    city?: string;
  } | null>(null);
  const [editedBusinessName, setEditedBusinessName] = useState("");
  const [isGeocodingLocation, setIsGeocodingLocation] = useState(false);
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
      const response = await adminApi.getVendors({ limit: 500 });
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

  const createVendorMutation = useMutation({
    mutationFn: async (data: typeof createForm) => {
      let imageUrl = data.businessImageUrl;
      if (createImageFile) {
        setIsUploadingCreateImage(true);
        try {
          imageUrl = await uploadToCloudinary(createImageFile);
        } finally {
          setIsUploadingCreateImage(false);
        }
      }
      const payload: Record<string, unknown> = {
        fullName: data.fullName,
        phone: data.phone,
        ...(data.email ? { email: data.email } : {}),
        ...(data.waveNumber ? { waveNumber: data.waveNumber } : {}),
        ...(data.businessType && data.businessName
          ? {
              businessType: data.businessType,
              businessName: data.businessName,
              ...(data.businessAddress
                ? { businessAddress: data.businessAddress }
                : {}),
              ...(data.businessPhone
                ? { businessPhone: data.businessPhone }
                : {}),
              ...(data.businessEmail
                ? { businessEmail: data.businessEmail }
                : {}),
              ...(data.businessDescription
                ? { businessDescription: data.businessDescription }
                : {}),
              ...(imageUrl ? { businessImageUrl: imageUrl } : {}),
            }
          : {}),
      };
      const response = await adminApi.createVendor(payload);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors-all"] });
      toast.success("Vendor created successfully");
      setIsCreateOpen(false);
      setCreateStep(1);
      setCreateImageFile(null);
      setCreateImagePreview("");
      setCreateForm({
        fullName: "",
        email: "",
        phone: "",
        waveNumber: "",
        businessType: "",
        businessName: "",
        businessAddress: "",
        businessPhone: "",
        businessEmail: "",
        businessDescription: "",
        businessImageUrl: "",
      });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to create vendor");
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

  const updateBusinessLocationMutation = useMutation({
    mutationFn: async ({
      businessType,
      businessId,
      businessName,
      latitude,
      longitude,
      address,
      city,
    }: {
      businessType: string;
      businessId: string;
      businessName: string;
      latitude: number;
      longitude: number;
      address?: string;
      city?: string;
    }) => {
      const endpoint =
        businessType === "Restaurant"
          ? "/api/restaurants"
          : businessType === "Shop"
            ? "/api/shops"
            : "/api/pharmacies";

      const response = await api.put(`${endpoint}/${businessId}/details`, {
        name: businessName,
        latitude,
        longitude,
        address: address || "",
        city: city || "",
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendors-all"] });
      refetch(); // Force immediate refetch
      refetch(); // Force immediate refetch
      toast.success("Business location updated successfully");
      setIsEditLocationOpen(false);
      setSelectedBusiness(null);
      setSelectedLocation(null);
      setEditedBusinessName("");
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || "Failed to update business location",
      );
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

  const handleEditBusinessLocation = (business: any) => {
    setSelectedBusiness(business);
    setEditedBusinessName(business.name); // Initialize with current name
    setSelectedLocation(
      business.latitude && business.longitude
        ? { lat: business.latitude, lng: business.longitude }
        : null,
    );
    setIsEditLocationOpen(true);
  };

  const handleMapClick = async (lat: number, lng: number) => {
    // Set coordinates immediately
    setSelectedLocation({ lat, lng });
    setIsGeocodingLocation(true);

    try {
      // Reverse geocode to get address and city
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`,
        {
          headers: {
            "User-Agent": "TeranGO Admin Panel",
          },
        },
      );

      if (response.ok) {
        const data = await response.json();
        const address = data.display_name || "";
        const city =
          data.address?.city ||
          data.address?.town ||
          data.address?.village ||
          data.address?.county ||
          data.address?.state ||
          "";

        setSelectedLocation({ lat, lng, address, city });
        toast.success("Location details fetched");
      }
    } catch (error) {
      console.error("Reverse geocoding failed:", error);
      toast.warning(
        "Could not fetch address automatically. You can still save the coordinates.",
      );
    } finally {
      setIsGeocodingLocation(false);
    }
  };

  const handleSaveBusinessLocation = () => {
    if (!selectedBusiness || !selectedLocation) return;
    if (!editedBusinessName.trim()) {
      toast.error("Business name is required");
      return;
    }

    updateBusinessLocationMutation.mutate({
      businessType: selectedBusiness.type,
      businessId: selectedBusiness.id,
      businessName: editedBusinessName.trim(),
      latitude: selectedLocation.lat,
      longitude: selectedLocation.lng,
      address: selectedLocation.address,
      city: selectedLocation.city,
    });
  };

  const handleCloseLocationDialog = () => {
    setIsEditLocationOpen(false);
    setSelectedBusiness(null);
    setSelectedLocation(null);
    setEditedBusinessName("");
    setIsGeocodingLocation(false);
  };

  // Convert all vendor businesses to VendorBusiness format for map (memoized)
  const allBusinessesForMap = useMemo(() => {
    const businesses: VendorBusiness[] = [];

    filteredVendors.forEach((vendor) => {
      // Add restaurants
      vendor.restaurants?.forEach((restaurant) => {
        businesses.push({
          id: restaurant.id,
          name: restaurant.name,
          type: "Restaurant",
          latitude: restaurant.latitude,
          longitude: restaurant.longitude,
          address: restaurant.address,
          vendorName: vendor.user?.fullName,
        });
      });

      // Add shops
      vendor.shops?.forEach((shop) => {
        businesses.push({
          id: shop.id,
          name: shop.name,
          type: "Shop",
          latitude: shop.latitude,
          longitude: shop.longitude,
          address: shop.address,
          vendorName: vendor.user?.fullName,
        });
      });

      // Add pharmacies
      vendor.pharmacies?.forEach((pharmacy) => {
        businesses.push({
          id: pharmacy.id,
          name: pharmacy.name,
          type: "Pharmacy",
          latitude: pharmacy.latitude,
          longitude: pharmacy.longitude,
          address: pharmacy.address,
          vendorName: vendor.user?.fullName,
        });
      });
    });

    return businesses;
  }, [filteredVendors]);

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

  const getBusinessImage = (vendor: VendorWithSubscription) => {
    // Get the first available business image
    const firstRestaurant = vendor.restaurants?.[0];
    const firstShop = vendor.shops?.[0];
    const firstPharmacy = vendor.pharmacies?.[0];

    return (
      firstRestaurant?.imageUrl ||
      firstShop?.imageUrl ||
      firstPharmacy?.imageUrl ||
      null
    );
  };

  const VendorCard = ({ vendor }: { vendor: VendorWithSubscription }) => {
    const businessImage = getBusinessImage(vendor);

    return (
      <Card className="flex flex-col transition-all hover:shadow-lg">
        <CardHeader className="flex flex-row items-start gap-4 space-y-0">
          <Avatar className="h-12 w-12">
            <AvatarImage
              src={businessImage || vendor.user?.avatarUrl || ""}
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
              <DropdownMenuItem
                onClick={() => handleManageSubscription(vendor)}
              >
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
              <Badge
                variant="outline"
                className="border-blue-500 text-blue-500"
              >
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
                    {vendor.restaurants?.length ?? 0} Restaurant(s)
                  </TooltipContent>
                </Tooltip>
              )}
              {vendor.shops?.length > 0 && (
                <Tooltip>
                  <TooltipTrigger>
                    <Package className="h-4 w-4" />
                  </TooltipTrigger>
                  <TooltipContent>
                    {vendor.shops?.length ?? 0} Shop(s)
                  </TooltipContent>
                </Tooltip>
              )}
              {vendor.pharmacies?.length > 0 && (
                <Tooltip>
                  <TooltipTrigger>
                    <Pill className="h-4 w-4" />
                  </TooltipTrigger>
                  <TooltipContent>
                    {vendor.pharmacies?.length ?? 0} Pharmac(y/ies)
                  </TooltipContent>
                </Tooltip>
              )}
            </TooltipProvider>
            <Badge variant="secondary">{getTotalBusinesses(vendor)}</Badge>
          </div>
        </CardFooter>
      </Card>
    );
  };

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
              <Button size="sm" onClick={() => setIsCreateOpen(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Create Vendor
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
                    <Button
                      variant={viewMode === "map" ? "primary" : "ghost"}
                      size="sm"
                      onClick={() => setViewMode("map")}
                    >
                      <MapIcon className="h-4 w-4" />
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
              ) : viewMode === "list" ? (
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
                              <AvatarImage
                                src={
                                  getBusinessImage(vendor) ||
                                  vendor.user?.avatarUrl ||
                                  ""
                                }
                              />
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
              ) : (
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-muted/40 rounded-lg">
                    <div className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-primary" />
                      <div>
                        <h3 className="font-semibold">Business Locations</h3>
                        <p className="text-sm text-muted-foreground">
                          Click on a business marker to edit its location
                        </p>
                      </div>
                    </div>
                    <Badge variant="outline">
                      {
                        allBusinessesForMap.filter(
                          (b) => b.latitude && b.longitude,
                        ).length
                      }{" "}
                      / {allBusinessesForMap.length} with coordinates
                    </Badge>
                  </div>
                  <VendorLocationsMap
                    key={allBusinessesForMap.length}
                    businesses={allBusinessesForMap}
                    onMapClick={(lat, lng) => {
                      // When map is clicked in map view mode, find businesses without coordinates
                      const businessesWithoutCoords =
                        allBusinessesForMap.filter(
                          (b) => !b.latitude || !b.longitude,
                        );
                      if (businessesWithoutCoords.length > 0) {
                        toast.info(
                          "Select a business from the list below to set its location",
                        );
                      }
                    }}
                    clickable={false}
                  />

                  {/* List of businesses without coordinates */}
                  <div className="mt-4">
                    <h4 className="text-sm font-semibold mb-2">
                      Businesses Missing Coordinates
                    </h4>
                    <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
                      {allBusinessesForMap
                        .filter((b) => !b.latitude || !b.longitude)
                        .map((business) => (
                          <Card key={business.id} className="p-3">
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex items-start gap-2">
                                {business.type === "Restaurant" && (
                                  <UtensilsCrossed className="h-4 w-4 text-orange-500 mt-0.5" />
                                )}
                                {business.type === "Shop" && (
                                  <Package className="h-4 w-4 text-blue-500 mt-0.5" />
                                )}
                                {business.type === "Pharmacy" && (
                                  <Pill className="h-4 w-4 text-red-500 mt-0.5" />
                                )}
                                <div>
                                  <p className="text-sm font-medium">
                                    {business.name}
                                  </p>
                                  <p className="text-xs text-muted-foreground">
                                    {business.vendorName}
                                  </p>
                                </div>
                              </div>
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  handleEditBusinessLocation(business)
                                }
                              >
                                <MapPin className="h-3 w-3 mr-1" />
                                Set Location
                              </Button>
                            </div>
                          </Card>
                        ))}
                    </div>
                    {allBusinessesForMap.filter(
                      (b) => !b.latitude || !b.longitude,
                    ).length === 0 && (
                      <p className="text-sm text-muted-foreground text-center py-4">
                        All businesses have coordinates! 🎉
                      </p>
                    )}
                  </div>
                </div>
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
        onSave={(data: any) =>
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
        onAssign={(data: any) =>
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
      <EditBusinessLocationDialog
        business={selectedBusiness}
        isOpen={isEditLocationOpen}
        onClose={handleCloseLocationDialog}
        onSave={handleSaveBusinessLocation}
        isSaving={updateBusinessLocationMutation.isPending}
        selectedLocation={selectedLocation}
        onMapClick={handleMapClick}
        editedName={editedBusinessName}
        onNameChange={setEditedBusinessName}
      />

      {/* Create Vendor Dialog */}
      <Dialog
        open={isCreateOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsCreateOpen(false);
            setCreateStep(1);
            setCreateImageFile(null);
            setCreateImagePreview("");
            setCreateForm({
              fullName: "",
              email: "",
              phone: "",
              waveNumber: "",
              businessType: "",
              businessName: "",
              businessAddress: "",
              businessPhone: "",
              businessEmail: "",
              businessDescription: "",
              businessImageUrl: "",
            });
          }
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Vendor — Step {createStep} of 2</DialogTitle>
            <DialogDescription>
              {createStep === 1
                ? "Enter the vendor's personal details. They log in via OTP."
                : "Optionally add a business (restaurant, shop, or pharmacy)."}
            </DialogDescription>
          </DialogHeader>

          {createStep === 1 && (
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label htmlFor="create-fullName">Full Name *</Label>
                <Input
                  id="create-fullName"
                  placeholder="e.g. Abdou Bah"
                  value={createForm.fullName}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, fullName: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-phone">Phone Number *</Label>
                <Input
                  id="create-phone"
                  placeholder="e.g. +2203001234"
                  value={createForm.phone}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, phone: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-email">Email (optional)</Label>
                <Input
                  id="create-email"
                  type="email"
                  placeholder="vendor@example.com"
                  value={createForm.email}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, email: e.target.value }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="create-wave">Wave Number (optional)</Label>
                <Input
                  id="create-wave"
                  placeholder="e.g. 3001234"
                  value={createForm.waveNumber}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, waveNumber: e.target.value }))
                  }
                />
              </div>
            </div>
          )}

          {createStep === 2 && (
            <div className="space-y-4 py-2">
              {/* Business type selector */}
              <div className="space-y-2">
                <Label>Business Type (optional)</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(["RESTAURANT", "SHOP", "PHARMACY"] as const).map((type) => {
                    const icons = {
                      RESTAURANT: UtensilsCrossed,
                      SHOP: Package,
                      PHARMACY: Pill,
                    };
                    const colors = {
                      RESTAURANT: "text-orange-500",
                      SHOP: "text-green-500",
                      PHARMACY: "text-blue-500",
                    };
                    const labels = {
                      RESTAURANT: "Restaurant",
                      SHOP: "Shop",
                      PHARMACY: "Pharmacy",
                    };
                    const Icon = icons[type];
                    const selected = createForm.businessType === type;
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() =>
                          setCreateForm((f) => ({
                            ...f,
                            businessType: selected ? "" : type,
                          }))
                        }
                        className={cn(
                          "flex flex-col items-center gap-1 rounded-lg border-2 p-3 text-sm transition-colors",
                          selected
                            ? "border-primary bg-primary/5"
                            : "border-muted hover:border-muted-foreground/40",
                        )}
                      >
                        <Icon className={cn("h-5 w-5", colors[type])} />
                        <span>{labels[type]}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {createForm.businessType && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="create-biz-name">Business Name *</Label>
                    <Input
                      id="create-biz-name"
                      placeholder="e.g. Kairaba Grill"
                      value={createForm.businessName}
                      onChange={(e) =>
                        setCreateForm((f) => ({
                          ...f,
                          businessName: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="create-biz-address">
                      Address (optional)
                    </Label>
                    <Input
                      id="create-biz-address"
                      placeholder="e.g. Kairaba Avenue, Serrekunda"
                      value={createForm.businessAddress}
                      onChange={(e) =>
                        setCreateForm((f) => ({
                          ...f,
                          businessAddress: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="create-biz-phone">Business Phone</Label>
                      <Input
                        id="create-biz-phone"
                        placeholder="+220..."
                        value={createForm.businessPhone}
                        onChange={(e) =>
                          setCreateForm((f) => ({
                            ...f,
                            businessPhone: e.target.value,
                          }))
                        }
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="create-biz-email">Business Email</Label>
                      <Input
                        id="create-biz-email"
                        type="email"
                        placeholder="biz@example.com"
                        value={createForm.businessEmail}
                        onChange={(e) =>
                          setCreateForm((f) => ({
                            ...f,
                            businessEmail: e.target.value,
                          }))
                        }
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="create-biz-desc">
                      Description (optional)
                    </Label>
                    <Textarea
                      id="create-biz-desc"
                      placeholder="Short description of the business..."
                      rows={2}
                      value={createForm.businessDescription}
                      onChange={(e) =>
                        setCreateForm((f) => ({
                          ...f,
                          businessDescription: e.target.value,
                        }))
                      }
                    />
                  </div>
                  {/* Logo upload */}
                  <div className="space-y-2">
                    <Label>Business Logo (optional)</Label>
                    <div
                      className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-muted p-4 transition-colors hover:border-muted-foreground/40"
                      onClick={() =>
                        document.getElementById("create-logo-input")?.click()
                      }
                    >
                      {createImagePreview ? (
                        <img
                          src={createImagePreview}
                          alt="Preview"
                          className="h-20 w-20 rounded-lg object-cover"
                        />
                      ) : (
                        <>
                          <ImageIcon className="mb-1 h-8 w-8 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            Click to upload logo
                          </span>
                        </>
                      )}
                    </div>
                    <input
                      id="create-logo-input"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          setCreateImageFile(file);
                          setCreateImagePreview(URL.createObjectURL(file));
                        }
                      }}
                    />
                  </div>
                </>
              )}
            </div>
          )}

          <DialogFooter className="gap-2">
            {createStep === 1 ? (
              <>
                <Button
                  variant="outline"
                  onClick={() => setIsCreateOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => setCreateStep(2)}
                  disabled={
                    !createForm.fullName.trim() || !createForm.phone.trim()
                  }
                >
                  Next: Business Details
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => setCreateStep(1)}>
                  Back
                </Button>
                <Button
                  onClick={() => createVendorMutation.mutate(createForm)}
                  disabled={
                    createVendorMutation.isPending ||
                    isUploadingCreateImage ||
                    (!!createForm.businessType &&
                      !createForm.businessName.trim())
                  }
                >
                  {createVendorMutation.isPending || isUploadingCreateImage ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />{" "}
                      {isUploadingCreateImage ? "Uploading..." : "Creating..."}
                    </>
                  ) : (
                    <>
                      <Plus className="mr-2 h-4 w-4" /> Create Vendor
                    </>
                  )}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
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

  const businessImage =
    vendor.restaurants?.[0]?.imageUrl ||
    vendor.shops?.[0]?.imageUrl ||
    vendor.pharmacies?.[0]?.imageUrl ||
    null;

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
                src={businessImage || vendor.user?.avatarUrl || ""}
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
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">
                  No businesses registered
                </p>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function EditVendorDialog({ vendor, isOpen, onClose, onSave, isSaving }: any) {
  const [activeTab, setActiveTab] = useState("account");
  const [selectedBusinessId, setSelectedBusinessId] = useState("");
  const queryClient = useQueryClient();

  // Account form data
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    waveNumber: "",
  });

  // Business form data
  const [businessFormData, setBusinessFormData] = useState({
    name: "",
    description: "",
    address: "",
    phone: "",
    email: "",
    imageUrl: "",
  });

  const [businessImageFile, setBusinessImageFile] = useState<File | null>(null);
  const [businessImagePreview, setBusinessImagePreview] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);
  const businessFileInputRef = useRef<HTMLInputElement>(null);

  // Get all businesses from vendor
  const allBusinesses = useMemo(() => {
    if (!vendor) return [];
    return [
      ...(vendor.restaurants?.map((r: any) => ({ ...r, type: "RESTAURANT" })) ||
        []),
      ...(vendor.shops?.map((s: any) => ({ ...s, type: "SHOP" })) || []),
      ...(vendor.pharmacies?.map((p: any) => ({ ...p, type: "PHARMACY" })) ||
        []),
    ];
  }, [vendor]);

  const selectedBusiness = useMemo(() => {
    return allBusinesses.find((b: any) => b.id === selectedBusinessId);
  }, [allBusinesses, selectedBusinessId]);

  useEffect(() => {
    if (vendor) {
      setFormData({
        fullName: vendor.user?.fullName || "",
        email: vendor.user?.email || "",
        phone: vendor.user?.phone || "",
        waveNumber: vendor.waveNumber || "",
      });

      // Set first business as default
      if (allBusinesses.length > 0 && !selectedBusinessId) {
        setSelectedBusinessId(allBusinesses[0].id);
      }
    }
  }, [vendor, allBusinesses, selectedBusinessId]);

  useEffect(() => {
    if (selectedBusiness) {
      setBusinessFormData({
        name: selectedBusiness.name || "",
        description: selectedBusiness.description || "",
        address: selectedBusiness.address || "",
        phone: selectedBusiness.phone || "",
        email: selectedBusiness.email || "",
        imageUrl: selectedBusiness.imageUrl || "",
      });
      setBusinessImagePreview(selectedBusiness.imageUrl || "");
    }
  }, [selectedBusiness]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleBusinessChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setBusinessFormData({
      ...businessFormData,
      [e.target.name]: e.target.value,
    });
  };

  const handleBusinessImageSelect = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) {
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
      setBusinessImageFile(file);

      // Show preview immediately
      const reader = new FileReader();
      reader.onloadend = () => {
        setBusinessImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);

      // Upload to Cloudinary
      setImageUploading(true);
      console.log("☁️ Uploading business image to Cloudinary...");
      const cloudinaryUrl = await uploadToCloudinary(file);

      // Update form data with Cloudinary URL
      setBusinessFormData((prev) => ({ ...prev, imageUrl: cloudinaryUrl }));
      console.log("✅ Upload successful:", cloudinaryUrl);
      toast.success("Image uploaded successfully!");
    } catch (error) {
      console.error("❌ Error uploading image:", error);
      toast.error("Failed to upload image. Please try again.");
      setBusinessImageFile(null);
      setBusinessImagePreview("");
    } finally {
      setImageUploading(false);
    }
  };

  const handleRemoveBusinessImage = () => {
    setBusinessImageFile(null);
    setBusinessImagePreview(selectedBusiness?.imageUrl || "");
    setBusinessFormData((prev) => ({
      ...prev,
      imageUrl: selectedBusiness?.imageUrl || "",
    }));
    if (businessFileInputRef.current) {
      businessFileInputRef.current.value = "";
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    setIsUploading(true);

    try {
      // Save vendor account data
      if (activeTab === "account") {
        onSave({ ...formData });
      }
      // Save business data
      else if (activeTab === "business" && selectedBusiness) {
        // Call business-specific API with correct endpoints
        const endpoint =
          selectedBusiness.type === "RESTAURANT"
            ? `/api/restaurants/${selectedBusiness.id}/details`
            : selectedBusiness.type === "SHOP"
              ? `/api/shops/${selectedBusiness.id}/details`
              : `/api/pharmacies/${selectedBusiness.id}/details`;

        console.log("📤 Updating business:", endpoint);
        console.log("📦 Business data:", businessFormData);

        const response = await fetch(
          `${import.meta.env.VITE_API_URL}${endpoint}`,
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
            body: JSON.stringify(businessFormData),
          },
        );

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error("❌ Update failed:", errorData);
          throw new Error(errorData.error || "Failed to update business");
        }

        const updatedBusiness = await response.json();
        console.log("✅ Business updated:", updatedBusiness);

        toast.success("Business updated successfully!");

        // Refetch vendors to get updated data
        queryClient.invalidateQueries({ queryKey: ["vendors-all"] });
        onClose();
      }
    } catch (error: any) {
      console.error("❌ Error saving changes:", error);
      toast.error(error.message || "Failed to save changes");
    } finally {
      setIsUploading(false);
    }
  };

  if (!vendor) return null;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-2xl">
            <Edit className="h-6 w-6" />
            Edit Vendor: {vendor.user?.fullName}
          </DialogTitle>
          <DialogDescription>
            Manage vendor account and business details
          </DialogDescription>
        </DialogHeader>

        {/* Tabs */}
        <div className="border-b">
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => setActiveTab("account")}
              className={cn(
                "pb-2 px-1 border-b-2 transition-colors",
                activeTab === "account"
                  ? "border-primary text-primary font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              Account Details
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("business")}
              className={cn(
                "pb-2 px-1 border-b-2 transition-colors",
                activeTab === "business"
                  ? "border-primary text-primary font-semibold"
                  : "border-transparent text-muted-foreground hover:text-foreground",
              )}
            >
              Business Settings
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Account Tab */}
          {activeTab === "account" && (
            <>
              <div>
                <Label className="text-base font-semibold mb-4 block">
                  Vendor Information
                </Label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">
                      Full Name <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="fullName"
                      name="fullName"
                      value={formData.fullName}
                      onChange={handleChange}
                      placeholder="Enter full name"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      value={formData.email}
                      onChange={handleChange}
                      placeholder="vendor@example.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="phone">
                      Phone Number <span className="text-destructive">*</span>
                    </Label>
                    <Input
                      id="phone"
                      name="phone"
                      value={formData.phone}
                      onChange={handleChange}
                      placeholder="+220 XXX XXXX"
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="waveNumber">Wave Number</Label>
                    <Input
                      id="waveNumber"
                      name="waveNumber"
                      value={formData.waveNumber}
                      onChange={handleChange}
                      placeholder="+220 XXX XXXX"
                    />
                  </div>
                </div>
              </div>

              {/* Businesses Summary */}
              <div className="border-t pt-6 mt-6">
                <Label className="text-base font-semibold mb-3 block">
                  Businesses ({allBusinesses.length})
                </Label>
                <div className="grid grid-cols-1 gap-2">
                  {vendor.restaurants?.map((r: any) => (
                    <div
                      key={r.id}
                      className="flex items-center gap-2 p-3 rounded-lg bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-900"
                    >
                      <UtensilsCrossed className="h-5 w-5 text-orange-600" />
                      <span className="font-medium">{r.name}</span>
                      <Badge variant="outline" className="ml-auto">
                        Restaurant
                      </Badge>
                    </div>
                  ))}
                  {vendor.shops?.map((s: any) => (
                    <div
                      key={s.id}
                      className="flex items-center gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900"
                    >
                      <Package className="h-5 w-5 text-blue-600" />
                      <span className="font-medium">{s.name}</span>
                      <Badge variant="outline" className="ml-auto">
                        Shop
                      </Badge>
                    </div>
                  ))}
                  {vendor.pharmacies?.map((p: any) => (
                    <div
                      key={p.id}
                      className="flex items-center gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900"
                    >
                      <Pill className="h-5 w-5 text-red-600" />
                      <span className="font-medium">{p.name}</span>
                      <Badge variant="outline" className="ml-auto">
                        Pharmacy
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Business Tab */}
          {activeTab === "business" && (
            <>
              {allBusinesses.length > 0 ? (
                <>
                  {/* Business Selector */}
                  <div className="space-y-2">
                    <Label>Select Business</Label>
                    <Select
                      value={selectedBusinessId}
                      onValueChange={setSelectedBusinessId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a business" />
                      </SelectTrigger>
                      <SelectContent>
                        {allBusinesses.map((business: any) => (
                          <SelectItem key={business.id} value={business.id}>
                            <div className="flex items-center gap-2">
                              {business.type === "RESTAURANT" && (
                                <UtensilsCrossed className="h-4 w-4" />
                              )}
                              {business.type === "SHOP" && (
                                <Package className="h-4 w-4" />
                              )}
                              {business.type === "PHARMACY" && (
                                <Pill className="h-4 w-4" />
                              )}
                              <span>{business.name}</span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  {selectedBusiness && (
                    <>
                      {/* Business Image */}
                      <div className="space-y-4 border-t pt-6">
                        <Label className="text-base font-semibold">
                          Business Logo/Image
                        </Label>
                        <div className="flex items-center gap-6">
                          <div className="relative">
                            {businessImagePreview ? (
                              <img
                                src={businessImagePreview}
                                alt="Business"
                                className="h-32 w-32 object-cover rounded-lg border-4 border-border"
                              />
                            ) : (
                              <div className="h-32 w-32 bg-muted rounded-lg border-4 border-border flex items-center justify-center">
                                <ImageIcon className="h-12 w-12 text-muted-foreground" />
                              </div>
                            )}
                            {businessImageFile && (
                              <button
                                type="button"
                                onClick={handleRemoveBusinessImage}
                                className="absolute -top-2 -right-2 h-6 w-6 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center hover:bg-destructive/90"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                          <div className="flex-1 space-y-2">
                            <input
                              ref={businessFileInputRef}
                              type="file"
                              accept="image/*"
                              onChange={handleBusinessImageSelect}
                              className="hidden"
                              id="business-image-upload"
                              disabled={imageUploading}
                            />
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                businessFileInputRef.current?.click()
                              }
                              className="w-full"
                              disabled={imageUploading}
                            >
                              {imageUploading ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Uploading to Cloudinary...
                                </>
                              ) : (
                                <>
                                  <Upload className="mr-2 h-4 w-4" />
                                  {businessImageFile
                                    ? "Change Image"
                                    : "Upload Image"}
                                </>
                              )}
                            </Button>
                            <p className="text-xs text-muted-foreground">
                              {imageUploading
                                ? "Please wait while we upload your image..."
                                : "Recommended: 16:9 or square, at least 800x600px, max 5MB"}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Business Details */}
                      <div className="border-t pt-6 space-y-4">
                        <Label className="text-base font-semibold">
                          Business Details
                        </Label>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="name">
                              Business Name{" "}
                              <span className="text-destructive">*</span>
                            </Label>
                            <Input
                              id="name"
                              name="name"
                              value={businessFormData.name}
                              onChange={handleBusinessChange}
                              placeholder="Enter business name"
                              required
                            />
                          </div>

                          <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="description">Description</Label>
                            <Textarea
                              id="description"
                              name="description"
                              value={businessFormData.description}
                              onChange={handleBusinessChange}
                              placeholder="Describe your business..."
                              rows={3}
                            />
                          </div>

                          <div className="space-y-2 md:col-span-2">
                            <Label htmlFor="address">Address</Label>
                            <Input
                              id="address"
                              name="address"
                              value={businessFormData.address}
                              onChange={handleBusinessChange}
                              placeholder="Enter business address"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="phone">Phone</Label>
                            <Input
                              id="phone"
                              name="phone"
                              value={businessFormData.phone}
                              onChange={handleBusinessChange}
                              placeholder="+220 XXX XXXX"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="email">Email</Label>
                            <Input
                              id="email"
                              name="email"
                              type="email"
                              value={businessFormData.email}
                              onChange={handleBusinessChange}
                              placeholder="business@example.com"
                            />
                          </div>
                        </div>
                      </div>
                    </>
                  )}
                </>
              ) : (
                <div className="text-center py-12 border-2 border-dashed rounded-lg">
                  <Store className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
                  <p className="text-muted-foreground font-medium">
                    No businesses registered
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Vendor needs to create a business in the mobile app
                  </p>
                </div>
              )}
            </>
          )}

          <DialogFooter className="border-t pt-6">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isUploading || isSaving}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isUploading || isSaving}>
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading Images...
                </>
              ) : isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving Changes...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
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

function EditBusinessLocationDialog({
  business,
  isOpen,
  onClose,
  onSave,
  isSaving,
  selectedLocation,
  onMapClick,
  editedName,
  onNameChange,
}: any) {
  if (!business) return null;

  const getBusinessIcon = (type: string) => {
    switch (type) {
      case "Restaurant":
        return <UtensilsCrossed className="h-5 w-5 text-orange-500" />;
      case "Shop":
        return <Package className="h-5 w-5 text-blue-500" />;
      case "Pharmacy":
        return <Pill className="h-5 w-5 text-red-500" />;
      default:
        return <Store className="h-5 w-5" />;
    }
  };

  const hasCoordinates =
    selectedLocation || (business.latitude && business.longitude);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {getBusinessIcon(business.type)}
            Edit Location for {business.name}
          </DialogTitle>
          <DialogDescription>
            {business.vendorName && `Vendor: ${business.vendorName}`}
            <br />
            Click on the map to automatically fetch address, city, and
            coordinates
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Business name input */}
          <div className="space-y-2">
            <label htmlFor="businessName" className="text-sm font-medium">
              Business Name
            </label>
            <input
              id="businessName"
              type="text"
              value={editedName}
              onChange={(e) => onNameChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter business name"
            />
          </div>

          {/* Location details display */}
          {hasCoordinates && (
            <div className="p-3 bg-muted rounded-lg space-y-2">
              <div className="text-sm font-medium">Location Details:</div>

              {selectedLocation?.address && (
                <div className="text-sm">
                  <span className="font-medium">Address:</span>{" "}
                  <span className="text-muted-foreground">
                    {selectedLocation.address}
                  </span>
                </div>
              )}

              {selectedLocation?.city && (
                <div className="text-sm">
                  <span className="font-medium">City:</span>{" "}
                  <span className="text-muted-foreground">
                    {selectedLocation.city}
                  </span>
                </div>
              )}

              <div className="text-sm font-mono text-muted-foreground">
                Latitude:{" "}
                {selectedLocation?.lat?.toFixed(6) ||
                  business.latitude?.toFixed(6)}
                <br />
                Longitude:{" "}
                {selectedLocation?.lng?.toFixed(6) ||
                  business.longitude?.toFixed(6)}
              </div>
            </div>
          )}

          {/* Interactive map */}
          <VendorLocationsMap
            businesses={[business]}
            onMapClick={onMapClick}
            clickable={true}
            selectedLocation={selectedLocation}
          />

          {/* Instructions */}
          <div className="flex items-start gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <MapPin className="h-5 w-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <strong>How to set location:</strong>
              <ul className="list-disc list-inside mt-1 space-y-1">
                <li>Update the business name in the field above</li>
                <li>Click anywhere on the map to set coordinates</li>
                <li>Address and city will be automatically fetched</li>
                <li>A red marker will appear at the selected location</li>
                <li>Click "Save Changes" to confirm</li>
              </ul>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={onSave}
            disabled={isSaving || !selectedLocation || !editedName.trim()}
          >
            {isSaving ? (
              <>
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                Saving...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Save Changes
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

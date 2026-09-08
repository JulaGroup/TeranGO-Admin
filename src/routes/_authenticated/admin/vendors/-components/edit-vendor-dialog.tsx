// @ts-nocheck
import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Edit,
  Image as ImageIcon,
  Loader2,
  Package,
  Pill,
  Save,
  Store,
  Upload,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { uploadToCloudinary } from "../-lib/vendor-utils";

export function EditVendorDialog({ vendor, isOpen, onClose, onSave, isSaving }: any) {
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
      const cloudinaryUrl = await uploadToCloudinary(file);

      // Update form data with Cloudinary URL
      setBusinessFormData((prev) => ({ ...prev, imageUrl: cloudinaryUrl }));
      toast.success("Image uploaded successfully!");
    } catch (error) {
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

        // Goes through the shared axios instance, which already attaches
        // the auth token and base URL.
        await api.put(endpoint, businessFormData);

        toast.success("Business updated successfully!");

        // Refetch vendors to get updated data
        queryClient.invalidateQueries({ queryKey: ["vendors-all"] });
        onClose();
      }
    } catch (error: any) {
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

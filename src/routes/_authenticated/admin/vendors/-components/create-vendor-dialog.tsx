// @ts-nocheck
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Image as ImageIcon, Loader2, Plus, Upload, X } from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "@/lib/api";
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
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { uploadToCloudinary } from "../-lib/vendor-utils";

const EMPTY_FORM = {
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
};

/**
 * Two-step create flow. Form state lives here rather than in the page, so the
 * parent resets it by remounting with a `key` instead of clearing fields by hand.
 */
export function CreateVendorDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [createForm, setCreateForm] = useState({ ...EMPTY_FORM });
  const [createStep, setCreateStep] = useState<1 | 2>(1);
  const [createImageFile, setCreateImageFile] = useState<File | null>(null);
  const [createImagePreview, setCreateImagePreview] = useState("");
  const [isUploadingCreateImage, setIsUploadingCreateImage] = useState(false);

  const createVendorMutation = useMutation({
    mutationFn: async (data: typeof EMPTY_FORM) => {
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
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to create vendor");
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
                    placeholder="e.g. +220833001234"
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
                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {(
                      ["RESTAURANT", "SHOP", "PHARMACY", "EXPERIENCE"] as const
                    ).map((type) => {
                      const icons = {
                        RESTAURANT: UtensilsCrossed,
                        SHOP: Package,
                        PHARMACY: Pill,
                        EXPERIENCE: Star,
                      };
                      const colors = {
                        RESTAURANT: "text-orange-500",
                        SHOP: "text-green-500",
                        PHARMACY: "text-blue-500",
                        EXPERIENCE: "text-amber-500",
                      };
                      const labels = {
                        RESTAURANT: "Restaurant",
                        SHOP: "Shop",
                        PHARMACY: "Pharmacy",
                        EXPERIENCE: "Experience",
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
  );
}

import { useMemo, useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { AlertCircle, Camera, LogOut, Save, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type {
  VendorBusiness,
  VendorBusinessType,
  VendorProfile,
} from "@/lib/vendor";
import {
  useVendorProfile,
  VENDOR_PROFILE_QUERY_KEY,
} from "@/hooks/use-vendor-profile";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

export const Route = createFileRoute("/_vendor/vendor/settings")({
  component: VendorSettings,
});

interface BusinessOption {
  id: string;
  label: string;
  type: VendorBusinessType;
}

interface BusinessHours {
  day: string;
  isOpen: boolean;
  openTime: string;
  closeTime: string;
}

const DAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
];

const CLOUDINARY_CLOUD_NAME = "dkpi5ij2t";
const CLOUDINARY_UPLOAD_PRESET = "unsigned_preset";

function getBusinessOptions(vendor: VendorProfile): BusinessOption[] {
  const options: BusinessOption[] = [];

  if (vendor.restaurants) {
    vendor.restaurants.forEach((r) => {
      options.push({ id: r.id, label: r.name, type: "RESTAURANT" });
    });
  }

  if (vendor.shops) {
    vendor.shops.forEach((s) => {
      options.push({ id: s.id, label: s.name, type: "SHOP" });
    });
  }

  if (vendor.pharmacies) {
    vendor.pharmacies.forEach((p) => {
      options.push({ id: p.id, label: p.name, type: "PHARMACY" });
    });
  }

  if (vendor.experiences) {
    vendor.experiences.forEach((e) => {
      options.push({ id: e.id, label: e.name, type: "EXPERIENCE" });
    });
  }

  return options;
}

/** Which API a business's edits are saved through. */
function endpointFor(business: VendorBusiness): string {
  switch (business.type) {
    case "RESTAURANT":
      return `/api/restaurants/${business.id}/details`;
    case "EXPERIENCE":
      // Providers manage their own listing; ownership is checked server-side.
      return `/api/experiences/vendor/${business.id}`;
    default:
      return `/api/shops/${business.id}`;
  }
}

function findBusinessById(
  vendor: VendorProfile,
  businessId?: string,
): VendorBusiness | undefined {
  if (!businessId) return undefined;

  const allBusinesses: VendorBusiness[] = [
    ...(vendor.restaurants || []).map((r) => ({ ...r, type: "RESTAURANT" as const })),
    ...(vendor.shops || []).map((s) => ({ ...s, type: "SHOP" as const })),
    ...(vendor.pharmacies || []).map((p) => ({ ...p, type: "PHARMACY" as const })),
    ...(vendor.experiences || []).map((e) => ({ ...e, type: "EXPERIENCE" as const })),
  ];

  return allBusinesses.find((b) => b.id === businessId);
}

function parseOpeningHours(business?: VendorBusiness): BusinessHours[] {
  const defaultHours = DAYS.map((day) => ({
    day,
    isOpen: true,
    openTime: "09:00",
    closeTime: "18:00",
  }));

  // Experiences store the same shape under `openHours`; everything else uses
  // `openingHours`.
  const raw =
    (business as any)?.openingHours ?? (business as any)?.openHours ?? null;

  if (!raw || typeof raw !== "object") {
    return defaultHours;
  }

  return DAYS.map((day) => {
    const dayKey = day.toLowerCase();
    const dayData = (
      raw as Record<
        string,
        { open?: string; close?: string; closed?: boolean }
      >
    )[dayKey];

    if (dayData && typeof dayData === "object") {
      return {
        day,
        isOpen: !dayData.closed,
        openTime: dayData.open || "09:00",
        closeTime: dayData.close || "18:00",
      };
    }

    return {
      day,
      isOpen: true,
      openTime: "09:00",
      closeTime: "18:00",
    };
  });
}

function VendorSettings() {
  const { vendor, isLoading, refetch } = useVendorProfile();
  const businessOptions = useMemo(
    () => (vendor ? getBusinessOptions(vendor) : []),
    [vendor],
  );
  const [selectedBusinessId, setSelectedBusinessId] = useState("");

  const resolvedBusinessId = useMemo(() => {
    if (!businessOptions.length) {
      return "";
    }

    const isValidSelection = businessOptions.some(
      (option) => option.id === selectedBusinessId,
    );

    return isValidSelection ? selectedBusinessId : businessOptions[0].id;
  }, [businessOptions, selectedBusinessId]);

  const activeBusiness = useMemo(
    () => (vendor ? findBusinessById(vendor, resolvedBusinessId) : undefined),
    [vendor, resolvedBusinessId],
  );

  const businessKey = activeBusiness
    ? `${activeBusiness.id}-${activeBusiness.imageUrl || "no-image"}`
    : "no-business";

  if (isLoading && !vendor) {
    return (
      <div className="flex justify-center py-12">
        <div className="text-muted-foreground text-sm">Loading settings...</div>
      </div>
    );
  }

  if (!vendor) {
    return (
      <div className="space-y-2 rounded-lg border border-dashed p-6 text-center">
        <p className="font-semibold">Vendor profile not found</p>
        <p className="text-muted-foreground text-sm">
          Complete vendor onboarding on the mobile app to unlock settings.
        </p>
      </div>
    );
  }

  return (
    <VendorSettingsView
      key={businessKey}
      vendor={vendor}
      business={activeBusiness}
      businessOptions={businessOptions}
      selectedBusinessId={resolvedBusinessId}
      onBusinessChange={setSelectedBusinessId}
      refetch={refetch}
    />
  );
}

interface VendorSettingsViewProps {
  vendor: VendorProfile;
  business?: VendorBusiness;
  businessOptions: BusinessOption[];
  selectedBusinessId?: string;
  onBusinessChange: (businessId: string) => void;
  refetch: () => Promise<any> | void;
}

function VendorSettingsView({
  vendor,
  business,
  businessOptions,
  selectedBusinessId,
  onBusinessChange,
  refetch,
}: VendorSettingsViewProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [imageUploading, setImageUploading] = useState(false);

  // Initialize state from business data
  const [profileImage, setProfileImage] = useState(business?.imageUrl || "");
  const [formData, setFormData] = useState({
    name: business?.name || "",
    description: business?.description || "",
    address: business?.address || "",
    phone: business?.phone || "",
    email: business?.email || "",
    // Experiences only
    totalUnits: String((business as any)?.totalUnits ?? 1),
    unitLabel: (business as any)?.unitLabel || "spot",
  });
  const [businessHours, setBusinessHours] = useState<BusinessHours[]>(() =>
    parseOpeningHours(business),
  );

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: "POST",
          body: formData,
        },
      );

      const data = await response.json();
      return data.secure_url || null;
    } catch {
      return null;
    }
  };

  const imageMutation = useMutation({
    mutationFn: async (imageUrl: string) => {
      if (!business) throw new Error("No business");

      if (business.type === "EXPERIENCE") {
        await api.patch(endpointFor(business), { imageUrl });
      } else {
        await api.put(endpointFor(business), { imageUrl });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [VENDOR_PROFILE_QUERY_KEY, vendor.user?.id || vendor.userId],
      });
      refetch();
      toast.success("Business logo updated");
    },
    onError: () => toast.error("Failed to save logo"),
  });

  const buildPayload = (hours: BusinessHours[], data: typeof formData) => {
    const openingHours: Record<
      string,
      { open: string; close: string; closed: boolean }
    > = {};
    hours.forEach((day) => {
      const dayName = day.day.toLowerCase();
      openingHours[dayName] = {
        open: day.openTime,
        close: day.closeTime,
        closed: !day.isOpen,
      };
    });
    const base = {
      name: data.name,
      description: data.description,
      address: data.address,
      phone: data.phone,
    };
    // Experiences have no email field and name their hours `openHours`.
    if (business?.type === "EXPERIENCE") {
      return {
        ...base,
        openHours: openingHours,
        totalUnits: Math.max(1, Number(data.totalUnits) || 1),
        unitLabel: data.unitLabel || "spot",
      };
    }
    return { ...base, email: data.email, openingHours };
  };

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!business) throw new Error("No business");

      const payload = buildPayload(businessHours, formData);
      const endpoint = endpointFor(business);
      return business.type === "EXPERIENCE"
        ? await api.patch(endpoint, payload)
        : await api.put(endpoint, payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [VENDOR_PROFILE_QUERY_KEY, vendor.user?.id || vendor.userId],
      });
      refetch();
      setIsEditing(false);
      toast.success("Business profile updated");
    },
    onError: async (error: any) => {
      // If the shop ID is stale (404), refresh vendor profile to get the current ID
      const status = error?.response?.status;
      if (status === 404) {
        toast.info("Refreshing business data, please save again...");
        await refetch();
        return;
      }
      toast.error("Failed to update profile");
    },
  });

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImageUploading(true);
    try {
      const imageUrl = await uploadImage(file);
      if (imageUrl) {
        setProfileImage(imageUrl);
        await imageMutation.mutateAsync(imageUrl);
      } else {
        toast.error("Failed to upload image");
      }
    } catch {
      toast.error("Failed to upload image");
    }
    setImageUploading(false);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate();
  };

  const handleLogout = () => {
    localStorage.clear();
    window.location.href = "/auth/login";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Business Settings
          </h1>
          <p className="text-muted-foreground">
            Manage your business profile and hours
          </p>
        </div>
        {business && !isEditing && (
          <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
        )}
      </div>

      {businessOptions.length > 1 && (
        <div className="max-w-md space-y-2">
          <Label>Active business</Label>
          <Select value={selectedBusinessId} onValueChange={onBusinessChange}>
            <SelectTrigger>
              <SelectValue placeholder="Select a business" />
            </SelectTrigger>
            <SelectContent>
              {businessOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label} · {option.type.toLowerCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {!business && (
        <div className="flex items-start gap-3 rounded-lg border border-dashed p-4">
          <AlertCircle className="h-5 w-5 text-orange-500" />
          <div>
            <p className="font-medium">No business found</p>
            <p className="text-muted-foreground text-sm">
              Add a restaurant or shop from the mobile app.
            </p>
          </div>
        </div>
      )}

      {business && (
        <form onSubmit={handleSave} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Business Profile</CardTitle>
              <CardDescription>
                Your business image and basic details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Business Image */}
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <div className="h-32 w-32 overflow-hidden rounded-lg border-2 border-gray-200">
                    {profileImage ? (
                      <img
                        src={profileImage}
                        alt="Business logo"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-gray-100 text-gray-400">
                        No Image
                      </div>
                    )}
                  </div>
                  {isEditing && (
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={imageUploading}
                      className="bg-primary hover:bg-primary/90 absolute right-0 bottom-0 rounded-full p-2 text-white shadow-lg"
                    >
                      {imageUploading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Camera className="h-4 w-4" />
                      )}
                    </button>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  className="hidden"
                  aria-label="Upload business image"
                />
                <div className="text-center">
                  <p className="text-lg font-semibold">{formData.name}</p>
                  <p className="text-muted-foreground text-sm">
                    {vendor.user?.email}
                  </p>
                </div>
              </div>

              {/* Business Details */}
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Business Name</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    disabled={!isEditing}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    disabled={!isEditing}
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">Address</Label>
                  <Input
                    id="address"
                    value={formData.address}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        address: e.target.value,
                      }))
                    }
                    disabled
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="phone">Phone</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          phone: e.target.value,
                        }))
                      }
                      disabled={!isEditing}
                    />
                  </div>

                  {business.type !== "EXPERIENCE" && (
                    <div className="space-y-2">
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        type="email"
                        value={formData.email}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            email: e.target.value,
                          }))
                        }
                        disabled={!isEditing}
                      />
                    </div>
                  )}
                </div>

                {/* Capacity — how many can run at once, and what to call them.
                    Changing this changes what customers can book immediately. */}
                {business.type === "EXPERIENCE" && (
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="totalUnits">Capacity</Label>
                      <Input
                        id="totalUnits"
                        type="number"
                        min={1}
                        value={formData.totalUnits}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            totalUnits: e.target.value,
                          }))
                        }
                        disabled={!isEditing}
                      />
                      <p className="text-muted-foreground text-xs">
                        How many can run at the same time
                      </p>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="unitLabel">What you call them</Label>
                      <Input
                        id="unitLabel"
                        placeholder="kart"
                        value={formData.unitLabel}
                        onChange={(e) =>
                          setFormData((prev) => ({
                            ...prev,
                            unitLabel: e.target.value,
                          }))
                        }
                        disabled={!isEditing}
                      />
                      <p className="text-muted-foreground text-xs">
                        Shown to customers, e.g. kart, seat, board
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Business Hours</CardTitle>
              <CardDescription>Set your operating hours</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {businessHours.map((day, index) => (
                  <div
                    key={day.day}
                    className="flex items-center justify-between border-b pb-3 last:border-0"
                  >
                    <div className="flex items-center gap-4">
                      <span className="w-24 font-medium">{day.day}</span>
                      <Switch
                        checked={day.isOpen}
                        onCheckedChange={(checked) => {
                          const updated = [...businessHours];
                          updated[index].isOpen = checked;
                          setBusinessHours(updated);
                        }}
                        disabled={!isEditing}
                      />
                    </div>
                    {day.isOpen && (
                      <div className="flex items-center gap-2">
                        <Input
                          type="time"
                          value={day.openTime}
                          onChange={(e) => {
                            const updated = [...businessHours];
                            updated[index].openTime = e.target.value;
                            setBusinessHours(updated);
                          }}
                          disabled={!isEditing}
                          className="w-32"
                        />
                        <span>-</span>
                        <Input
                          type="time"
                          value={day.closeTime}
                          onChange={(e) => {
                            const updated = [...businessHours];
                            updated[index].closeTime = e.target.value;
                            setBusinessHours(updated);
                          }}
                          disabled={!isEditing}
                          className="w-32"
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Packages — experiences only. Saved immediately, independent of the
              profile form above. */}
          {business.type === "EXPERIENCE" && (
            <ExperiencePackages
              experienceId={business.id}
              unitLabel={(business as any).unitLabel || "spot"}
              options={((business as any).options || []).filter(
                (o: any) => o.isActive !== false,
              )}
              onChanged={refetch}
            />
          )}

          {isEditing && (
            <div className="flex justify-end gap-3">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setIsEditing(false);
                  setFormData({
                    name: business.name || "",
                    description: business.description || "",
                    address: business.address || "",
                    phone: business.phone || "",
                    email: business.email || "",
                    totalUnits: String((business as any).totalUnits ?? 1),
                    unitLabel: (business as any).unitLabel || "spot",
                  });
                  setBusinessHours(parseOpeningHours(business));
                  setProfileImage(business.imageUrl || "");
                }}
                disabled={updateMutation.isPending}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                <Save className="mr-2 h-4 w-4" />
                {updateMutation.isPending ? "Saving..." : "Save Changes"}
              </Button>
            </div>
          )}
        </form>
      )}

      <Card>
        <CardContent className="pt-6">
          <Button
            variant="destructive"
            onClick={handleLogout}
            className="w-full"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Package editor for experience providers — add, reprice and retire the
 * options customers book. Each action saves straight away; there is no draft
 * state to lose, and pricing is the thing a provider changes most often.
 */
function ExperiencePackages({
  experienceId,
  unitLabel,
  options,
  onChanged,
}: {
  experienceId: string;
  unitLabel: string;
  options: Array<{
    id: string;
    label: string;
    durationMins: number;
    price: number;
  }>;
  onChanged: () => void;
}) {
  const [label, setLabel] = useState("");
  const [durationMins, setDurationMins] = useState("5");
  const [price, setPrice] = useState("");
  const [editing, setEditing] = useState<Record<string, string>>({});

  const addMutation = useMutation({
    mutationFn: () =>
      api.post(`/api/experiences/vendor/${experienceId}/options`, {
        label,
        durationMins: Number(durationMins),
        price: Number(price),
      }),
    onSuccess: () => {
      toast.success("Package added");
      setLabel("");
      setDurationMins("5");
      setPrice("");
      onChanged();
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.error || "Couldn't add package"),
  });

  const priceMutation = useMutation({
    mutationFn: ({ id, value }: { id: string; value: number }) =>
      api.patch(`/api/experiences/vendor/${experienceId}/options/${id}`, {
        price: value,
      }),
    onSuccess: (_r, v) => {
      toast.success("Price updated");
      setEditing((p) => {
        const next = { ...p };
        delete next[v.id];
        return next;
      });
      onChanged();
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.error || "Couldn't update price"),
  });

  const removeMutation = useMutation({
    mutationFn: (id: string) =>
      api.delete(`/api/experiences/vendor/${experienceId}/options/${id}`),
    onSuccess: () => {
      toast.success("Package removed");
      onChanged();
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.error || "Couldn't remove package"),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Packages</CardTitle>
        <CardDescription>
          What customers choose and pay for. Prices are per {unitLabel} — you
          receive the full amount, TeranGO&apos;s fee is added on top for the
          customer.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {options.length === 0 ? (
          <p className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
            No packages yet — add your first one below.
          </p>
        ) : (
          <div className="space-y-2">
            {options.map((o) => {
              const draft = editing[o.id];
              const dirty = draft !== undefined && Number(draft) !== o.price;
              return (
                <div
                  key={o.id}
                  className="flex flex-wrap items-center gap-3 rounded-lg border p-3"
                >
                  <div className="min-w-[160px] flex-1">
                    <div className="font-medium">{o.label}</div>
                    <div className="text-muted-foreground text-xs">
                      {o.durationMins} min · per {unitLabel}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground text-sm">D</span>
                    <Input
                      type="number"
                      min={0}
                      className="h-9 w-28"
                      value={draft ?? String(o.price)}
                      onChange={(e) =>
                        setEditing((p) => ({ ...p, [o.id]: e.target.value }))
                      }
                    />
                    <Button
                      size="sm"
                      disabled={!dirty || priceMutation.isPending}
                      onClick={() =>
                        priceMutation.mutate({ id: o.id, value: Number(draft) })
                      }
                    >
                      {priceMutation.isPending &&
                      priceMutation.variables?.id === o.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Save"
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      disabled={removeMutation.isPending}
                      onClick={() => removeMutation.mutate(o.id)}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="bg-muted/30 space-y-3 rounded-lg border p-3">
          <Label className="text-muted-foreground text-xs uppercase tracking-wide">
            Add a package
          </Label>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end">
            <div className="space-y-1">
              <Label className="text-xs">Name</Label>
              <Input
                placeholder="10 min / 12 laps"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Minutes</Label>
              <Input
                type="number"
                min={1}
                className="w-24"
                value={durationMins}
                onChange={(e) => setDurationMins(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Price (D)</Label>
              <Input
                type="number"
                min={0}
                className="w-28"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
              />
            </div>
            <Button
              disabled={
                !label.trim() ||
                !Number(price) ||
                !Number(durationMins) ||
                addMutation.isPending
              }
              onClick={() => addMutation.mutate()}
            >
              {addMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Add"
              )}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

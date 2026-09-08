import { Package, Pill, UtensilsCrossed } from "lucide-react";
import type {
  BusinessType,
  BusinessTypeMeta,
  FlatBusiness,
  VendorRow,
  VendorWithSubscription,
} from "./vendor-types";

const CLOUDINARY_CLOUD_NAME = "dkpi5ij2t";
const CLOUDINARY_UPLOAD_PRESET = "unsigned_preset";

export async function uploadToCloudinary(file: File): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

  const response = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
    { method: "POST", body: formData },
  );

  if (!response.ok) {
    throw new Error("Failed to upload image to Cloudinary");
  }

  const data = await response.json();
  return data.secure_url as string;
}

/** Icon + accent per business type. These accents read correctly in both themes. */
export const BUSINESS_TYPE_META: Record<BusinessType, BusinessTypeMeta> = {
  Restaurant: {
    icon: UtensilsCrossed,
    className: "text-orange-500",
    label: "Restaurant",
  },
  Shop: { icon: Package, className: "text-blue-500", label: "Shop" },
  Pharmacy: { icon: Pill, className: "text-red-500", label: "Pharmacy" },
};

export const BUSINESS_TYPES = Object.keys(
  BUSINESS_TYPE_META,
) as BusinessType[];

/** One flat list of a vendor's businesses across all three relations. */
function flattenBusinesses(
  vendor: VendorWithSubscription,
): FlatBusiness[] {
  const vendorName = vendor.user?.fullName;
  return [
    ...(vendor.restaurants ?? []).map((b) => ({
      ...b,
      type: "Restaurant" as const,
      vendorName,
    })),
    ...(vendor.shops ?? []).map((b) => ({
      ...b,
      type: "Shop" as const,
      vendorName,
    })),
    ...(vendor.pharmacies ?? []).map((b) => ({
      ...b,
      type: "Pharmacy" as const,
      vendorName,
    })),
  ];
}

export function initials(name?: string) {
  if (!name?.trim()) return "?";
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");
}

export function formatDate(value?: string | null) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** Collapse a vendor into the flat shape the table sorts, filters and exports. */
export function toVendorRow(vendor: VendorWithSubscription): VendorRow {
  const businesses = flattenBusinesses(vendor);
  const businessTypes = [
    ...new Set(businesses.map((b) => b.type)),
  ] as BusinessType[];
  const waveNumber = vendor.waveNumber ?? "";
  const autoPayout = Boolean(vendor.autoPayoutEnabled);

  const name = vendor.user?.fullName ?? "Unnamed vendor";
  const email = vendor.user?.email ?? "";
  const phone = vendor.user?.phone ?? "";

  return {
    id: vendor.id,
    name,
    email,
    phone,
    waveNumber,
    avatarUrl: vendor.user?.avatarUrl,
    isActive: vendor.isActive,
    status: vendor.isActive ? "Active" : "Inactive",
    isSystemVendor: Boolean(vendor.isSystemVendor),
    businessCount: businesses.length,
    businessTypes,
    primaryBusiness: businesses[0]?.name ?? "",
    businesses,
    payoutMode: autoPayout ? "Auto" : "Manual",
    payoutMisconfigured: autoPayout && !waveNumber,
    subscriptionStatus: vendor.subscription?.status ?? "None",
    packageName: vendor.subscription?.packageName ?? "",
    subscriptionEndDate: vendor.subscription?.endDate ?? "",
    createdAt: vendor.createdAt ?? "",
    searchBlob: [
      name,
      email,
      phone,
      waveNumber,
      ...businesses.map((b) => b.name),
    ]
      .join(" ")
      .toLowerCase(),
    raw: vendor,
  };
}

/**
 * Explicit CSV export. DataTable's built-in exporter only serialises columns
 * with a literal accessorKey, so computed columns would come out blank.
 */
export function exportVendorsCsv(rows: VendorRow[]) {
  const headers = [
    "Name",
    "Email",
    "Phone",
    "Wave Number",
    "Status",
    "Payout Mode",
    "Businesses",
    "Business Types",
    "Subscription",
    "Package",
    "Joined",
  ];

  const escape = (value: string | number) => {
    const str = String(value ?? "");
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };

  const lines = [
    headers.join(","),
    ...rows.map((r) =>
      [
        r.name,
        r.email,
        r.phone,
        r.waveNumber,
        r.status,
        r.payoutMode,
        r.businessCount,
        r.businessTypes.join(" / "),
        r.subscriptionStatus,
        r.packageName,
        formatDate(r.createdAt),
      ]
        .map(escape)
        .join(","),
    ),
  ];

  const blob = new Blob([lines.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `terango-vendors-${new Date().toISOString().slice(0, 10)}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}

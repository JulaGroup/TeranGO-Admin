import type { LucideIcon } from "lucide-react";

export interface VendorSubscription {
  status: string;
  packageName: string;
  endDate: string;
  isTrial: boolean;
}

export interface VendorBusinessRecord {
  id: string;
  name: string;
  imageUrl?: string | null;
  address?: string | null;
  latitude?: number | null;
  longitude?: number | null;
}

export interface VendorUser {
  fullName?: string;
  email?: string;
  phone?: string;
  avatarUrl?: string;
}

/** Shape returned by GET /api/admin/vendors. */
export interface VendorWithSubscription {
  id: string;
  isActive: boolean;
  createdAt?: string;
  waveNumber?: string | null;
  autoPayoutEnabled?: boolean;
  multiUserEnabled?: boolean;
  isSystemVendor?: boolean;
  user?: VendorUser;
  restaurants?: VendorBusinessRecord[];
  shops?: VendorBusinessRecord[];
  pharmacies?: VendorBusinessRecord[];
  subscription?: VendorSubscription | null;
}

export type BusinessType = "Restaurant" | "Shop" | "Pharmacy";

export interface FlatBusiness extends VendorBusinessRecord {
  type: BusinessType;
  vendorName?: string;
}

export type PayoutMode = "Auto" | "Manual";

/**
 * Flattened row the table actually renders. Plain scalar fields let TanStack
 * Table sort, facet, filter and export without custom accessor functions.
 */
export interface VendorRow {
  id: string;
  name: string;
  email: string;
  phone: string;
  waveNumber: string;
  avatarUrl?: string;
  isActive: boolean;
  status: "Active" | "Inactive";
  isSystemVendor: boolean;
  businessCount: number;
  businessTypes: BusinessType[];
  primaryBusiness: string;
  businesses: FlatBusiness[];
  payoutMode: PayoutMode;
  /** Auto-payout is on but no Wave number is set — the payout would be skipped. */
  payoutMisconfigured: boolean;
  subscriptionStatus: string;
  packageName: string;
  subscriptionEndDate: string;
  createdAt: string;
  /** Lowercased haystack backing the global search box. */
  searchBlob: string;
  raw: VendorWithSubscription;
}

export interface BusinessTypeMeta {
  icon: LucideIcon;
  className: string;
  label: BusinessType;
}

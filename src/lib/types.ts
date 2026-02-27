export interface User {
  id: string;
  _id?: string;
  email?: string;
  phone?: string;
  phoneNumber?: string;
  fullName?: string;
  name?: string;
  role: "ADMIN" | "VENDOR" | "CUSTOMER" | "DRIVER";
  isVerified: boolean;
  avatarUrl?: string;
  profileImage?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Business {
  id: string;
  name: string;
}

export interface Vendor {
  // Primary identifiers
  id: string;
  _id?: string;
  userId: string;

  // Wave payment info
  /**
   * Vendor Wave mobile money number used for payment splitting.
   * Stored as string to accomodate leading zeros and country codes.
   */
  waveNumber?: string;

  // User info
  user?: {
    fullName?: string;
    phone?: string;
    phoneNumber?: string;
    email?: string;
  };

  // Business info
  restaurants?: Business[];
  shops?: Business[];
  pharmacies?: Business[];

  // Status
  isActive: boolean;
  status?: "pending" | "approved" | "rejected" | "suspended";

  // Timestamps
  createdAt: string;
  updatedAt: string;

  // Legacy field support
  _id_legacy?: string;
  shopName?: string;
  ownerName?: string;
  phoneNumber?: string;
  email?: string;
  shopImage?: string;
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
    coordinates?: number[];
  };
  category?: string;
  rating?: number;
  totalRatings?: number;
  totalOrders?: number;
  shopDescription?: string;
  businessName?: string;
  businessType?: "RESTAURANT" | "SHOP" | "PHARMACY";
  isApproved?: boolean;
  totalReviews?: number;
  imageUrl?: string;
  city?: string;
  phone?: string;
  description?: string;
}

export interface VendorApplication {
  id: string;
  businessName: string;
  businessType: "RESTAURANT" | "SHOP" | "PHARMACY";
  ownerName: string;
  ownerPhone: string;
  ownerEmail: string;
  address: string;
  city: string;
  description?: string;
  status: "PENDING" | "APPROVED" | "REJECTED" | "WAITING_LIST";
  rejectionReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Order {
  _id: string;
  id?: string;
  user?: {
    _id?: string;
    id?: string;
    name?: string;
    fullName?: string;
    email?: string;
    phoneNumber?: string;
    phone?: string;
  };
  vendor?: {
    _id?: string;
    id?: string;
    shopName?: string;
    businessName?: string;
    phoneNumber?: string;
    phone?: string;
  };
  customerName?: string;
  customerPhone?: string;
  deliveryAddress?:
    | string
    | {
        street: string;
        city: string;
        state: string;
        zipCode: string;
        coordinates?: number[];
      };
  orderType?: "DELIVERY" | "PICKUP";
  status: string;
  paymentStatus?: string;
  totalAmount: number;
  deliveryFee?: number;
  serviceFee?: number;
  items: OrderItem[];
  restaurant?: Vendor;
  shop?: Vendor;
  pharmacy?: Vendor;
  driver?: Driver;
  createdAt: string;
  updatedAt?: string;
  // Gift Order Fields
  isGiftOrder?: boolean;
  recipientName?: string;
  recipientPhone?: string;
  recipientAddress?: string;
}

export interface OrderItem {
  id?: string;
  _id?: string;
  productId?: string;
  productName?: string;
  quantity: number;
  price: number;
  menuItem?: { name: string; imageUrl?: string };
  product?: { name: string; imageUrl?: string };
  medicine?: { name: string; imageUrl?: string };
}

export interface Driver {
  id?: string;
  _id?: string;
  userId?: string;
  name?: string;
  fullName?: string;
  phoneNumber?: string;
  phone?: string;
  email?: string;
  vehicleNo?: string;
  vehicleNumber?: string;
  vehicleType?: string;
  vehicleColor?: string;
  isAvailable?: boolean;
  isOnline?: boolean;
  rating?: number;
  totalDeliveries?: number;
  totalRatings?: number;
  completedDeliveries?: number;
  currentLatitude?: number;
  currentLongitude?: number;
  currentLocation?: {
    type: string;
    coordinates: [number, number];
  };
  status?: "pending" | "approved" | "rejected" | "suspended";
  profileImage?: string;
  orders?: any[];
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  };
  createdAt?: string;
  user?: User;
}

export interface Category {
  id: string;
  name: string;
  slug: string;
  imageUrl?: string;
  isActive: boolean;
  displayOrder?: number;
  _count?: { products: number; subcategories: number };
  createdAt: string;
  updatedAt: string;
}

export interface Subcategory {
  id: string;
  name: string;
  slug: string;
  categoryId: string;
  imageUrl?: string;
  isActive: boolean;
  displayOrder?: number;
  _count?: { products: number };
  category?: Category;
  createdAt: string;
  updatedAt: string;
}

export interface PromoCode {
  id: string;
  code: string;
  type: "PERCENTAGE" | "FIXED";
  value: number;
  minOrderAmount?: number;
  maxDiscount?: number;
  usageLimit?: number;
  usedCount: number;
  isActive: boolean;
  validFrom?: string;
  validUntil?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Notification {
  id: string;
  title: string;
  message: string;
  type: "INFO" | "SUCCESS" | "WARNING" | "ERROR";
  target: "ALL" | "CUSTOMERS" | "VENDORS" | "DRIVERS";
  isRead: boolean;
  createdAt: string;
}

export interface DashboardStats {
  totalUsers: number;
  totalVendors: number;
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  activeDrivers: number;
  recentOrders: Order[];
  revenueChart: { date: string; amount: number }[];
}

export interface Analytics {
  revenue: {
    total: number;
    growth: number;
    chart: { date: string; amount: number }[];
  };
  orders: {
    total: number;
    growth: number;
    chart: { date: string; count: number }[];
  };
  users: {
    total: number;
    growth: number;
    chart: { date: string; count: number }[];
  };
  topVendors: {
    id: string;
    name: string;
    revenue: number;
    orders: number;
  }[];
}

// Table state types
export interface PaginationState {
  pageIndex: number;
  pageSize: number;
}

export interface SortingState {
  id: string;
  desc: boolean;
}

export interface TableState {
  pagination: PaginationState;
  sorting: SortingState[];
  filters: Record<string, any>;
}

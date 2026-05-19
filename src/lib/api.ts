import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";

// API Base URL - always prefer explicit env or fall back to production API
export const API_BASE_URL =
  (import.meta.env.VITE_API_URL as string) ||
  "https://monkfish-app-korrv.ondigitalocean.app";

// Create axios instance
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Skip for auth-related endpoints
    if (config.url?.includes("/auth/")) {
      return config;
    }

    const token = localStorage.getItem("auth_token");

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }

    return config;
  },
  (error: unknown) => Promise.reject(error),
);

// Response interceptor for error handling
api.interceptors.response.use(
  <T>(response: T) => response,
  (error: AxiosError) => {
    // Handle network errors
    if (!error.response) {
      return Promise.reject(
        new Error("Network error. Please check your connection and try again."),
      );
    }

    // Handle authentication errors
    if (error.response.status === 401) {
      // Clear auth data and redirect to login
      localStorage.removeItem("auth_token");
      localStorage.removeItem("user");
      window.location.href = "/login";
      return Promise.reject(new Error("Session expired. Please login again."));
    }

    // Handle forbidden errors
    if (error.response.status === 403) {
      return Promise.reject(
        new Error("You do not have permission to perform this action."),
      );
    }

    // Handle server errors
    if (error.response.status >= 500) {
      return Promise.reject(new Error("Server error. Please try again later."));
    }

    return Promise.reject(error);
  },
);

// Helper function to get auth header
export const getAuthHeader = () => {
  const token = localStorage.getItem("auth_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// Auth API
export const authApi = {
  // Admin login
  adminLogin: (credentials: { phone: string; password: string }) =>
    api.post("/auth/login", {
      phone: credentials.phone,
      password: credentials.password,
      role: "ADMIN",
    }),

  // Vendor login
  vendorLogin: (credentials: { phone: string; password: string }) =>
    api.post("/auth/vendor-login", credentials),

  // Generic login (auto-detect role)
  login: (credentials: { phone: string; password: string }) =>
    api.post("/auth/login", credentials),

  register: (data: { email: string; password: string; fullName: string }) =>
    api.post("/auth/register", data),

  logout: () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user");
    localStorage.removeItem("vendor");
  },

  getCurrentUser: () => api.get("/api/auth/me"),

  getVendorProfile: () => api.get("/api/vendor/profile"),
};

// Admin API
export const adminApi = {
  // Dashboard
  getDashboardStats: () => api.get("/api/admin/dashboard/stats"),

  // Users
  getUsers: (params?: Record<string, unknown>) =>
    api.get("/api/admin/users", { params }),
  getUserById: (id: string) => api.get(`/api/admin/users/${id}`),
  updateUser: (id: string, data: Record<string, unknown>) =>
    api.put(`/api/admin/users/${id}`, data),
  deleteUser: (id: string) => api.delete(`/api/admin/users/${id}`),

  // Vendors
  getVendors: (params?: Record<string, unknown>) =>
    api.get("/api/admin/vendors", { params }),
  getVendorById: (id: string) => api.get(`/api/admin/vendors/${id}`),
  createVendor: (data: Record<string, unknown>) =>
    api.post("/api/admin/vendors", data),
  approveVendor: (id: string) => api.patch(`/api/admin/vendors/${id}/approve`),
  rejectVendor: (id: string, reason: string) =>
    api.patch(`/api/admin/vendors/${id}/reject`, { reason }),
  updateVendor: (id: string, data: Record<string, unknown>) =>
    api.put(`/api/admin/vendors/${id}`, data),
  deleteVendor: (id: string) => api.delete(`/api/admin/vendors/${id}`),

  // Vendor Applications
  getVendorApplications: (params?: Record<string, unknown>) =>
    api.get("/api/admin/vendor-applications", { params }),
  getVendorApplicationById: (id: string) =>
    api.get(`/api/admin/vendor-applications/${id}`),
  approveApplication: (id: string) =>
    api.patch(`/api/admin/vendor-applications/${id}/approve`),
  rejectApplication: (id: string, reason: string) =>
    api.patch(`/api/admin/vendor-applications/${id}/reject`, { reason }),

  // Orders
  getOrders: (params?: Record<string, unknown>) =>
    api.get("/api/admin/orders", { params }),
  getOrderById: (id: string) => api.get(`/api/admin/orders/${id}`),
  updateOrderStatus: (id: string, status: string) =>
    api.patch(`/api/admin/orders/${id}/status`, { status }),
  assignDriver: (orderId: string, driverId: string) =>
    api.patch(`/api/admin/orders/${orderId}/assign-driver`, { driverId }),

  // Payments
  getPayments: (params?: Record<string, unknown>) =>
    api.get("/api/admin/payments", { params }),
  getPayouts: (params?: Record<string, unknown>) =>
    api.get("/api/admin/payouts", { params }),

  // Finance
  getFinanceOverview: (period?: string) =>
    api.get("/api/admin/finance/overview", {
      params: period ? { period } : {},
    }),

  // Drivers
  getDrivers: (params?: Record<string, unknown>) =>
    api.get("/api/admin/drivers", { params }),
  getDriverById: (id: string) => api.get(`/api/admin/drivers/${id}`),
  createDriver: (data: Record<string, unknown>) =>
    api.post("/api/admin/drivers", data),
  updateDriver: (id: string, data: Record<string, unknown>) =>
    api.put(`/api/admin/drivers/${id}`, data),
  updateDriverType: (
    id: string,
    payload: {
      driverType: "SYSTEM" | "THIRD_PARTY";
      thirdPartyRate?: number | null;
    },
  ) => api.patch(`/api/admin/drivers/${id}/type`, payload),
  deleteDriver: (id: string) => api.delete(`/api/admin/drivers/${id}`),
  approveDriver: (id: string) => api.patch(`/api/admin/drivers/${id}/approve`),
  rejectDriver: (id: string) => api.patch(`/api/admin/drivers/${id}/reject`),
  // Vehicle-based driver assignment
  getAvailableDrivers: () => api.get("/api/drivers/available"),
  getCompatibleDriversForOrder: (orderId: string) =>
    api.get(`/api/drivers/compatible/${orderId}`),
  getDriversByVehicleType: (vehicleType: string) =>
    api.get(`/api/drivers/vehicle-type/${vehicleType}`),

  // Categories
  getCategories: (params?: Record<string, unknown>) =>
    api.get("/api/admin/categories", { params }),
  getCategoryById: (id: string) => api.get(`/api/admin/categories/${id}`),
  createCategory: (data: Record<string, unknown>) =>
    api.post("/api/admin/categories", data),
  updateCategory: (id: string, data: Record<string, unknown>) =>
    api.put(`/api/admin/categories/${id}`, data),
  deleteCategory: (id: string) => api.delete(`/api/admin/categories/${id}`),

  // Subcategories
  getSubcategories: (params?: Record<string, unknown>) =>
    api.get("/api/admin/subcategories", { params }),
  getSubcategoryById: (id: string) => api.get(`/api/admin/subcategories/${id}`),
  createSubcategory: (data: Record<string, unknown>) =>
    api.post("/api/admin/subcategories", data),
  updateSubcategory: (id: string, data: Record<string, unknown>) =>
    api.put(`/api/admin/subcategories/${id}`, data),
  deleteSubcategory: (id: string) =>
    api.delete(`/api/admin/subcategories/${id}`),

  // Promo Codes
  getPromoCodes: (params?: Record<string, unknown>) =>
    api.get("/api/admin/promocodes", { params }),
  getPromoCodeById: (id: string) => api.get(`/api/admin/promocodes/${id}`),
  createPromoCode: (data: Record<string, unknown>) =>
    api.post("/api/admin/promocodes", data),
  updatePromoCode: (id: string, data: Record<string, unknown>) =>
    api.put(`/api/admin/promocodes/${id}`, data),
  deletePromoCode: (id: string) => api.delete(`/api/admin/promocodes/${id}`),

  // Notifications
  getNotifications: (params?: Record<string, unknown>) =>
    api.get("/api/admin/notifications", { params }),
  sendNotification: (data: Record<string, unknown>) =>
    api.post("/api/admin/notifications", data),
  deleteNotification: (id: string) =>
    api.delete(`/api/admin/notifications/${id}`),

  // Analytics
  getAnalytics: (params?: Record<string, unknown>) =>
    api.get("/api/admin/analytics", { params }),
  getRevenueAnalytics: (params?: Record<string, unknown>) =>
    api.get("/api/admin/analytics/revenue", { params }),
  getOrderAnalytics: (params?: Record<string, unknown>) =>
    api.get("/api/admin/analytics/orders", { params }),

  // Reports
  generateReport: (
    type: string,
    params?: Record<string, unknown> | undefined,
  ) => api.post("/api/admin/reports/generate", { type, ...(params ?? {}) }),
  getReports: () => api.get("/api/admin/reports"),

  // TeranGO Official Store
  getTerangoStore: () => api.get("/api/admin/terango-store"),
  getTerangoStoreDashboard: () => api.get("/api/admin/terango-store/dashboard"),
  getTerangoStoreOrders: (params?: Record<string, unknown>) =>
    api.get("/api/admin/terango-store/orders", { params }),
  updateTerangoStoreOrderStatus: (orderId: string, status: string) =>
    api.patch(`/api/admin/terango-store/orders/${orderId}/status`, { status }),
  assignTerangoStoreDriver: (orderId: string, driverId: string) =>
    api.patch(`/api/admin/terango-store/orders/${orderId}/assign-driver`, {
      driverId,
    }),
  updateTerangoStoreSettings: (data: Record<string, unknown>) =>
    api.put("/api/admin/terango-store/settings", data),
  getTerangoStoreDrivers: () =>
    api.get("/api/admin/terango-store/available-drivers"),
  setupTerangoStore: () => api.post("/api/admin/terango-products/setup"),

  // Express Delivery Management
  getExpressDeliveries: (params?: Record<string, unknown>) =>
    api.get("/api/express-delivery", { params }),
  getExpressDeliveryById: (id: string) =>
    api.get(`/api/express-delivery/${id}`),
  getUrgentExpressDeliveries: () => api.get("/api/express-delivery/urgent"),
  approveExpressDeliveryForPayment: (id: string, note?: string) =>
    api.post(`/api/express-delivery/${id}/admin-approve-payment`, { note }),
  assignExpressDelivery: (id: string) =>
    api.post(`/api/express-delivery/${id}/assign`),
  updateExpressDeliveryStatus: (
    id: string,
    status: string,
    data?: Record<string, unknown>,
  ) => api.put(`/api/express-delivery/${id}/status`, { status, ...data }),
  confirmExpressDelivery: (id: string, reason: string) =>
    api.post(`/api/express-delivery/${id}/admin-confirm`, { reason }),
  getExpressMetrics: () => api.get("/api/express-delivery/metrics/dashboard"),

  // Express Delivery Tracking
  getExpressDeliveryTracking: (id: string) =>
    api.get(`/api/express-delivery/${id}/tracking`),
  getExpressDeliveryTimeline: (id: string) =>
    api.get(`/api/express-delivery/${id}/timeline`),

  // Express Driver Management
  getExpressCapableDrivers: () => api.get("/api/drivers/express-capable"),
  updateDriverExpressCapability: (driverId: string, enabled: boolean) =>
    api.patch(`/api/admin/drivers/${driverId}/express-capability`, { enabled }),
  getExpressDriverPerformance: (driverId?: string) =>
    api.get(
      `/api/admin/express-analytics/driver-performance${driverId ? `/${driverId}` : ""}`,
    ),

  // Express Analytics & Reports
  getExpressAnalytics: (params?: Record<string, unknown>) =>
    api.get("/api/admin/express-analytics", { params }),
  getExpressRevenueAnalytics: (params?: Record<string, unknown>) =>
    api.get("/api/admin/express-analytics/revenue", { params }),
  getExpressDeliveryAnalytics: (params?: Record<string, unknown>) =>
    api.get("/api/admin/express-analytics/deliveries", { params }),
  getExpressPerformanceAnalytics: (params?: Record<string, unknown>) =>
    api.get("/api/admin/express-analytics/performance", { params }),

  // Delivery Towns Management
  getDeliveryTowns: (params?: Record<string, unknown>) =>
    api.get("/api/admin/delivery-towns", { params }),
  getDeliveryTownById: (id: string) =>
    api.get(`/api/admin/delivery-towns/${id}`),
  createDeliveryTown: (data: Record<string, unknown>) =>
    api.post("/api/admin/delivery-towns", data),
  updateDeliveryTown: (id: string, data: Record<string, unknown>) =>
    api.put(`/api/admin/delivery-towns/${id}`, data),
  deleteDeliveryTown: (id: string) =>
    api.delete(`/api/admin/delivery-towns/${id}`),
  toggleDeliveryTownStatus: (id: string) =>
    api.patch(`/api/admin/delivery-towns/${id}/toggle`),

  // Restaurants Management (Admin)
  getRestaurants: (params?: Record<string, unknown>) =>
    api.get("/api/admin/restaurants", { params }),
  updateRestaurant: (id: string, data: Record<string, unknown>) =>
    api.patch(`/api/admin/restaurants/${id}`, data),
  deleteRestaurant: (id: string) => api.delete(`/api/admin/restaurants/${id}`),

  // Shops Management (Admin)
  getShops: (params?: Record<string, unknown>) =>
    api.get("/api/admin/shops", { params }),
  updateShop: (id: string, data: Record<string, unknown>) =>
    api.patch(`/api/admin/shops/${id}`, data),
  deleteShop: (id: string) => api.delete(`/api/admin/shops/${id}`),

  // Generic methods for direct API calls (for flexibility)
  get: (url: string, config?: Record<string, unknown>) => api.get(url, config),
  post: (url: string, data?: Record<string, unknown>) => api.post(url, data),
  put: (url: string, data?: Record<string, unknown>) => api.put(url, data),
  patch: (url: string, data?: Record<string, unknown>) => api.patch(url, data),
  delete: (url: string) => api.delete(url),
};

// Vendor-facing API helpers (for vendor portal pages)
export const vendorApi = {
  // payouts for the currently authenticated vendor
  getPayouts: (params?: Record<string, unknown>) =>
    api.get("/api/vendors/payouts", { params }),
};

// ─── KërSpace Real Estate API ─────────────────────────────────────────────────
export const kerspaceApi = {
  // Stats
  getStats: () => api.get("/api/admin/kerspace/stats"),

  // Properties
  getProperties: (params?: Record<string, unknown>) =>
    api.get("/api/admin/kerspace/properties", { params }),
  createProperty: (data: Record<string, unknown>) =>
    api.post("/api/admin/kerspace/properties", data),
  updateProperty: (id: string, data: Record<string, unknown>) =>
    api.put(`/api/admin/kerspace/properties/${id}`, data),
  deleteProperty: (id: string) =>
    api.delete(`/api/admin/kerspace/properties/${id}`),

  // Images
  addPropertyImage: (
    propertyId: string,
    data: { url: string; isPrimary?: boolean; order?: number },
  ) => api.post(`/api/admin/kerspace/properties/${propertyId}/images`, data),
  deletePropertyImage: (imageId: string) =>
    api.delete(`/api/admin/kerspace/properties/images/${imageId}`),

  // Inquiries
  getInquiries: (params?: Record<string, unknown>) =>
    api.get("/api/admin/kerspace/inquiries", { params }),
  updateInquiryStatus: (id: string, status: string) =>
    api.patch(`/api/admin/kerspace/inquiries/${id}/status`, { status }),

  // Appointments
  getAppointments: (params?: Record<string, unknown>) =>
    api.get("/api/admin/kerspace/appointments", { params }),
  updateAppointmentStatus: (id: string, status: string) =>
    api.patch(`/api/admin/kerspace/appointments/${id}/status`, { status }),
};

export const teranProApi = {
  // Stats
  getStats: () => api.get("/api/admin/teranpro/stats"),

  // Categories
  getCategories: (params?: Record<string, unknown>) =>
    api.get("/api/admin/teranpro/categories", { params }),
  createCategory: (data: Record<string, unknown>) =>
    api.post("/api/admin/teranpro/categories", data),
  updateCategory: (id: string, data: Record<string, unknown>) =>
    api.put(`/api/admin/teranpro/categories/${id}`, data),
  deleteCategory: (id: string) =>
    api.delete(`/api/admin/teranpro/categories/${id}`),

  // Services
  getServices: (params?: Record<string, unknown>) =>
    api.get("/api/admin/teranpro/services", { params }),
  getServiceById: (id: string) => api.get(`/api/admin/teranpro/services/${id}`),
  createService: (data: Record<string, unknown>) =>
    api.post("/api/admin/teranpro/services", data),
  updateService: (id: string, data: Record<string, unknown>) =>
    api.put(`/api/admin/teranpro/services/${id}`, data),
  deleteService: (id: string) =>
    api.delete(`/api/admin/teranpro/services/${id}`),
  toggleActive: (id: string) =>
    api.patch(`/api/admin/teranpro/services/${id}/toggle-active`),
  toggleFeatured: (id: string) =>
    api.patch(`/api/admin/teranpro/services/${id}/toggle-featured`),
  toggleVerified: (id: string) =>
    api.patch(`/api/admin/teranpro/services/${id}/toggle-verified`),
};

export const furnitureApi = {
  // Stats
  getStats: () => api.get("/api/admin/furniture/stats"),

  // Categories
  getCategories: (params?: Record<string, unknown>) =>
    api.get("/api/admin/furniture/categories", { params }),
  createCategory: (data: Record<string, unknown>) =>
    api.post("/api/admin/furniture/categories", data),
  updateCategory: (id: string, data: Record<string, unknown>) =>
    api.put(`/api/admin/furniture/categories/${id}`, data),
  deleteCategory: (id: string) =>
    api.delete(`/api/admin/furniture/categories/${id}`),

  // Listings
  getListings: (params?: Record<string, unknown>) =>
    api.get("/api/admin/furniture/listings", { params }),
  getListingById: (id: string) =>
    api.get(`/api/admin/furniture/listings/${id}`),
  createListing: (data: Record<string, unknown>) =>
    api.post("/api/admin/furniture/listings", data),
  updateListing: (id: string, data: Record<string, unknown>) =>
    api.put(`/api/admin/furniture/listings/${id}`, data),
  deleteListing: (id: string) =>
    api.delete(`/api/admin/furniture/listings/${id}`),
  toggleActive: (id: string) =>
    api.patch(`/api/admin/furniture/listings/${id}/toggle-active`),
  toggleFeatured: (id: string) =>
    api.patch(`/api/admin/furniture/listings/${id}/toggle-featured`),
  toggleVerified: (id: string) =>
    api.patch(`/api/admin/furniture/listings/${id}/toggle-verified`),
};

export default api;

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

  // Drivers
  getDrivers: (params?: Record<string, unknown>) =>
    api.get("/api/admin/drivers", { params }),
  getDriverById: (id: string) => api.get(`/api/admin/drivers/${id}`),
  updateDriver: (id: string, data: Record<string, unknown>) =>
    api.put(`/api/admin/drivers/${id}`, data),
  deleteDriver: (id: string) => api.delete(`/api/admin/drivers/${id}`),
  approveDriver: (id: string) => api.patch(`/api/admin/drivers/${id}/approve`),
  rejectDriver: (id: string) => api.patch(`/api/admin/drivers/${id}/reject`),

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
};

// Vendor-facing API helpers (for vendor portal pages)
export const vendorApi = {
  // payouts for the currently authenticated vendor
  getPayouts: (params?: Record<string, unknown>) =>
    api.get("/api/vendors/payouts", { params }),
};

export default api;

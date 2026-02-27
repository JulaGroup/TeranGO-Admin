import {
  LayoutDashboard,
  ShoppingCart,
  Store,
  Truck,
  Bell,
  Users,
  FolderTree,
  Layers,
  BarChart3,
  FileText,
  Settings,
  Crown,
  Star,
  ClipboardList,
  Megaphone,
  Package,
  Shield,
  DollarSign,
} from "lucide-react";
import { type SidebarData } from "../types";

export const sidebarData: SidebarData = {
  user: {
    name: "Admin",
    email: "admin@teranggo.com",
    avatar: "/avatars/shadcn.jpg",
  },
  teams: [],
  navGroups: [
    {
      title: "Overview",
      items: [
        {
          title: "Dashboard",
          url: "/admin",
          icon: LayoutDashboard,
        },
      ],
    },
    {
      title: "Management",
      items: [
        {
          title: "Vendors",
          url: "/admin/vendors",
          icon: Store,
        },
        {
          title: "Vendor Applications",
          url: "/admin/vendor-applications",
          icon: ClipboardList,
        },
        {
          title: "Customers",
          url: "/admin/customers",
          icon: Users,
        },
        {
          title: "Orders",
          url: "/admin/orders",
          icon: ShoppingCart,
        },
        {
          title: "Payments",
          url: "/admin/payments",
          icon: DollarSign,
        },
        {
          title: "Drivers",
          url: "/drivers",
          icon: Truck,
        },
        {
          title: "Promo Codes",
          url: "/admin/promocodes",
          icon: Star,
        },
        {
          title: "Subscriptions",
          url: "/admin/subscriptions",
          icon: Crown,
        },
        {
          title: "Featured Vendors",
          url: "/admin/featured",
          icon: Star,
        },
        {
          title: "Advertisements",
          url: "/admin/advertisements",
          icon: Megaphone,
        },
      ],
    },
    {
      title: "TeranGO Official Store",
      items: [
        {
          title: "Store Dashboard",
          url: "/admin/terango-store",
          icon: Crown,
        },
        {
          title: "Store Orders",
          url: "/admin/terango-store/orders",
          icon: ShoppingCart,
        },
        {
          title: "Store Settings",
          url: "/admin/terango-store/settings",
          icon: Shield,
        },
        {
          title: "Product Management",
          url: "/admin/terango-products",
          icon: Package,
        },
      ],
    },
    {
      title: "Product Management",
      items: [
        {
          title: "Categories",
          url: "/admin/categories",
          icon: FolderTree,
        },
        {
          title: "Subcategories",
          url: "/admin/subcategories",
          icon: Layers,
        },
      ],
    },
    {
      title: "Insights",
      items: [
        {
          title: "Analytics",
          url: "/analytics",
          icon: BarChart3,
        },
        {
          title: "Reports",
          url: "/reports",
          icon: FileText,
        },
      ],
    },
    {
      title: "Communications",
      items: [
        {
          title: "Broadcast Notifications",
          url: "/admin/broadcasts",
          icon: Megaphone,
        },
      ],
    },
    {
      title: "System",
      items: [
        {
          title: "Delivery Fees",
          url: "/admin/delivery-settings",
          icon: DollarSign,
        },
        {
          title: "Notifications",
          url: "/admin/notifications",
          icon: Bell,
        },
        {
          title: "Settings",
          url: "/admin/settings",
          icon: Settings,
        },
      ],
    },
  ],
};

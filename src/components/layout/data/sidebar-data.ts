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
  Settings,
  Crown,
  Star,
  ClipboardList,
  Megaphone,
  Package,
  DollarSign,
  Wallet,
  Zap,
  MapPin,
  TrendingUp,
  UtensilsCrossed,
  Building2,
  Briefcase,
  Sofa,
  Wrench,
  BadgeDollarSign,
  ReceiptText,
  ArrowLeftRight,
  ShieldCheck,
  Tag,
  Sparkles,
  Globe,
  Radio,
  // ChartBar intentionally omitted — not yet used
} from "lucide-react";
import { type SidebarData } from "../types";

export const sidebarData: SidebarData = {
  user: {
    name: "Super Admin",
    email: "admin@teranggo.com",
    avatar: "/avatars/shadcn.jpg",
  },
  teams: [],
  navGroups: [
    /* ─── 1. Home ─── */
    {
      title: "Home",
      items: [
        {
          title: "Dashboard",
          url: "/admin",
          icon: LayoutDashboard,
        },
      ],
    },

    /* ─── 2. Platform Operations ─── */
    {
      title: "Platform",
      items: [
        {
          title: "Vendors",
          icon: Store,
          items: [
            { title: "All Vendors",           url: "/admin/vendors",              icon: Store },
            { title: "Restaurants",           url: "/admin/restaurants",          icon: UtensilsCrossed },
            { title: "Shops",                 url: "/admin/shops",                icon: Package },
            { title: "Applications",          url: "/admin/vendor-applications",  icon: ClipboardList },
          ],
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
          title: "Drivers",
          url: "/drivers",
          icon: Truck,
        },
      ],
    },

    /* ─── 3. Finance ─── */
    {
      title: "Finance",
      items: [
        {
          title: "Payments",
          url: "/admin/payments",
          icon: BadgeDollarSign,
        },
        {
          title: "Earnings",
          url: "/admin/earnings",
          icon: TrendingUp,
        },
        {
          title: "Settlements",
          icon: ArrowLeftRight,
          items: [
            { title: "Vendor Settlements", url: "/admin/vendor-settlements", icon: Wallet },
            { title: "Driver Settlements", url: "/admin/settlements",         icon: DollarSign },
          ],
        },
        {
          title: "Staff Advances",
          url: "/admin/staff-advances",
          icon: Wallet,
        },
      ],
    },

    /* ─── 4. TeranGO Verticals ─── */
    {
      title: "TeranGO Services",
      items: [
        {
          title: "Official Store",
          icon: Crown,
          items: [
            { title: "Store Overview",  url: "/admin/terango-store",           icon: LayoutDashboard },
            { title: "Products",        url: "/admin/terango-products",        icon: Package },
            { title: "Store Orders",    url: "/admin/terango-store/orders",    icon: ShoppingCart },
            { title: "Store Settings",  url: "/admin/terango-store/settings",  icon: ShieldCheck },
          ],
        },
        {
          title: "Express Delivery",
          url: "/express",
          icon: Zap,
        },
        {
          title: "KerSpace",
          url: "/admin/kerspace",
          icon: Building2,
        },
        {
          title: "TeranPro",
          url: "/admin/teranpro",
          icon: Briefcase,
        },
        {
          title: "Furniture",
          url: "/admin/furniture",
          icon: Sofa,
        },
      ],
    },

    /* ─── 5. Catalog & Growth ─── */
    {
      title: "Catalog & Growth",
      items: [
        {
          title: "Categories",
          icon: FolderTree,
          items: [
            { title: "Categories",    url: "/admin/categories",    icon: FolderTree },
            { title: "Subcategories", url: "/admin/subcategories", icon: Layers },
          ],
        },
        {
          title: "Promo Codes",
          url: "/admin/promocodes",
          icon: Tag,
        },
        {
          title: "Subscriptions",
          url: "/admin/subscriptions",
          icon: Sparkles,
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

    /* ─── 6. Analytics ─── */
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
          icon: ReceiptText,
        },
        {
          title: "Broadcasts",
          url: "/admin/broadcasts",
          icon: Radio,
        },
      ],
    },

    /* ─── 7. System ─── */
    {
      title: "System",
      items: [
        {
          title: "Delivery",
          icon: Globe,
          items: [
            { title: "Delivery Fees",  url: "/admin/delivery-settings", icon: DollarSign },
            { title: "Delivery Towns", url: "/admin/delivery-towns",    icon: MapPin },
          ],
        },
        {
          title: "Notifications",
          url: "/admin/notifications",
          icon: Bell,
        },
        {
          title: "Maintenance",
          url: "/admin/maintenance",
          icon: Wrench,
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

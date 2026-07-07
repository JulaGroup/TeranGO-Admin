import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import {
  Users,
  ShoppingCart,
  Store,
  Banknote,
  Crown,
  Package,
  Settings,
  ArrowRight,
  Truck,
  TrendingUp,
  Download,
  Zap,
  Building2,
  Briefcase,
  Sofa,
  AlertTriangle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { adminApi, api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { ProfileDropdown } from "@/components/profile-dropdown";
import { Search } from "@/components/search";
import { ThemeSwitch } from "@/components/theme-switch";
import { Overview } from "./components/overview";
import { RecentSales } from "./components/recent-sales";
import { Analytics } from "./components/analytics";

/* ─── Quick action tiles ─── */
const quickActions = [
  { label: "View Orders",      href: "/admin/orders",             icon: ShoppingCart, color: "text-blue-600   dark:text-blue-400",   bg: "bg-blue-50   dark:bg-blue-900/25" },
  { label: "Manage Drivers",   href: "/drivers",                  icon: Truck,        color: "text-violet-600 dark:text-violet-400", bg: "bg-violet-50 dark:bg-violet-900/25" },
  { label: "Vendor Approvals", href: "/admin/vendor-applications",icon: Store,        color: "text-amber-600  dark:text-amber-400",  bg: "bg-amber-50  dark:bg-amber-900/25" },
  { label: "Express Queue",    href: "/express",                  icon: Zap,          color: "text-orange-600 dark:text-orange-400", bg: "bg-orange-50 dark:bg-orange-900/25" },
  { label: "KerSpace",         href: "/admin/kerspace",           icon: Building2,    color: "text-teal-600   dark:text-teal-400",   bg: "bg-teal-50   dark:bg-teal-900/25" },
  { label: "TeranPro",         href: "/admin/teranpro",           icon: Briefcase,    color: "text-indigo-600 dark:text-indigo-400", bg: "bg-indigo-50 dark:bg-indigo-900/25" },
  { label: "Furniture",        href: "/admin/furniture",          icon: Sofa,         color: "text-rose-600   dark:text-rose-400",   bg: "bg-rose-50   dark:bg-rose-900/25" },
  { label: "Settings",         href: "/admin/settings",           icon: Settings,     color: "text-gray-600   dark:text-gray-400",   bg: "bg-gray-50   dark:bg-gray-900/25" },
] as const;

/* ─── Order status colours ─── */
const statusConfig: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  PENDING:    { label: "Pending",    color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400", icon: Clock },
  PROCESSING: { label: "Processing", color: "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400",         icon: Clock },
  DELIVERED:  { label: "Delivered",  color: "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400",     icon: CheckCircle2 },
  CANCELLED:  { label: "Cancelled",  color: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400",             icon: AlertTriangle },
};

/* ─── Stat number display ─── */
function StatValue({ value, prefix = "", loading }: { value?: number | string; prefix?: string; loading?: boolean }) {
  if (loading) return <Skeleton className="h-8 w-28 mt-1" />;
  return (
    <p className="text-2xl font-bold tracking-tight mt-1">
      {prefix}{typeof value === "number" ? value.toLocaleString() : (value ?? "—")}
    </p>
  );
}

/* ─── Main KPI card ─── */
function KpiCard({
  title, value, icon: Icon, color, bg, prefix = "", loading,
}: {
  title: string;
  value?: number | string;
  icon: React.ElementType;
  color: string;
  bg: string;
  prefix?: string;
  loading?: boolean;
}) {
  return (
    <Card className="group hover:-translate-y-0.5 hover:shadow-md transition-all duration-200">
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <StatValue value={value} prefix={prefix} loading={loading} />
          </div>
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${bg} transition-transform group-hover:scale-110`}>
            <Icon className={`h-5 w-5 ${color}`} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Mini metric tile ─── */
function MiniMetric({ title, value, loading }: { title: string; value?: number | string; loading?: boolean }) {
  return (
    <div className="rounded-xl border bg-card/80 px-4 py-3 hover:bg-card transition-colors">
      <p className="text-xs text-muted-foreground font-medium">{title}</p>
      {loading
        ? <Skeleton className="h-6 w-16 mt-1" />
        : <p className="text-lg font-bold mt-0.5">{typeof value === "number" ? value.toLocaleString() : (value ?? "—")}</p>
      }
    </div>
  );
}

export function Dashboard() {
  const { data: statsResponse, isLoading } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: async () => {
      const response = await adminApi.getDashboardStats();
      return response.data;
    },
  });

  const { data: terangoStats, isLoading: terangoLoading } = useQuery({
    queryKey: ["terango-products-stats"],
    queryFn: async () => {
      const response = await api.get("/api/admin/terango-products/stats");
      return response.data;
    },
  });

  const { data: expressStats, isLoading: expressLoading } = useQuery({
    queryKey: ["express-metrics"],
    queryFn: async () => {
      const response = await adminApi.getExpressMetrics();
      return response.data;
    },
  });

  const stats = {
    totalRevenue:  statsResponse?.overview?.totalRevenue  ?? 0,
    totalOrders:   statsResponse?.overview?.totalOrders   ?? 0,
    activeVendors: statsResponse?.overview?.totalVendors  ?? 0,
    activeDrivers: statsResponse?.overview?.activeDrivers ?? 0,
  };

  const recentOrders    = statsResponse?.recentOrders ?? [];
  const totalSalesCount = statsResponse?.overview?.totalOrders ?? 0;

  const handleDownloadReport = () => {
    const rows: [string, string | number][] = [
      ["Metric", "Value"],
      ["Total Revenue (GMD)", stats.totalRevenue],
      ["Total Orders",        stats.totalOrders],
      ["Active Vendors",      stats.activeVendors],
      ["Active Drivers",      stats.activeDrivers],
      ["Express Deliveries",  expressStats?.totalDeliveries ?? 0],
      ["TeranGO Products",    terangoStats?.totalProducts   ?? 0],
      ["Low Stock Items",     terangoStats?.lowStockCount   ?? 0],
    ];
    const csv  = rows.map(([k, v]) => `"${String(k).replace(/"/g, '""')}","${v}"`).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `terango-dashboard-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const today = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <>
      <Header fixed>
        <div className="ms-auto flex items-center gap-2">
          <Search />
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        {/* ── Hero banner ── */}
        <div className="page-banner mb-6">
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-muted-foreground/80 text-[11px] font-semibold tracking-[0.1em] uppercase">
                {today}
              </p>
              <h1 className="mt-1.5 text-2xl font-bold tracking-tight">
                Welcome back, Admin
              </h1>
              <p className="text-muted-foreground mt-1 text-sm leading-relaxed max-w-md">
                Here's what's happening across the TeranGO platform today.
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Button
                size="sm"
                variant="outline"
                onClick={handleDownloadReport}
                className="gap-2 bg-background/80 backdrop-blur-sm"
              >
                <Download className="h-3.5 w-3.5" />
                Export CSV
              </Button>
              <Link to="/admin/orders">
                <Button size="sm" className="gap-2">
                  <ShoppingCart className="h-3.5 w-3.5" />
                  View Orders
                  <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </Link>
            </div>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-6">
          <div className="w-full overflow-x-auto pb-1">
            <TabsList className="h-9">
              <TabsTrigger value="overview" className="text-xs font-medium px-4">Overview</TabsTrigger>
              <TabsTrigger value="analytics" className="text-xs font-medium px-4">Analytics</TabsTrigger>
            </TabsList>
          </div>

          {/* ════ OVERVIEW TAB ════ */}
          <TabsContent value="overview" className="space-y-6 mt-0">

            {/* ── Main KPIs (4 up) ── */}
            <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
              <KpiCard
                title="Total Revenue"
                value={stats.totalRevenue}
                prefix="D "
                icon={Banknote}
                color="text-emerald-600 dark:text-emerald-400"
                bg="bg-emerald-50 dark:bg-emerald-900/25"
                loading={isLoading}
              />
              <KpiCard
                title="Total Orders"
                value={stats.totalOrders}
                icon={ShoppingCart}
                color="text-blue-600 dark:text-blue-400"
                bg="bg-blue-50 dark:bg-blue-900/25"
                loading={isLoading}
              />
              <KpiCard
                title="Active Vendors"
                value={stats.activeVendors}
                icon={Store}
                color="text-violet-600 dark:text-violet-400"
                bg="bg-violet-50 dark:bg-violet-900/25"
                loading={isLoading}
              />
              <KpiCard
                title="Active Drivers"
                value={stats.activeDrivers}
                icon={Truck}
                color="text-orange-600 dark:text-orange-400"
                bg="bg-orange-50 dark:bg-orange-900/25"
                loading={isLoading}
              />
            </div>

            {/* ── Secondary metrics row ── */}
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
              <MiniMetric
                title="Express Deliveries"
                value={expressStats?.totalDeliveries}
                loading={expressLoading}
              />
              <MiniMetric
                title="TeranGO Products"
                value={terangoStats?.totalProducts}
                loading={terangoLoading}
              />
              <MiniMetric
                title="Low Stock Items"
                value={terangoStats?.lowStockCount}
                loading={terangoLoading}
              />
              <MiniMetric
                title="Featured Products"
                value={terangoStats?.featuredCount}
                loading={terangoLoading}
              />
            </div>

            {/* ── Chart + Recent Orders ── */}
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-7">
              <Card className="col-span-1 lg:col-span-4">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-semibold">Revenue Overview</CardTitle>
                      <CardDescription className="mt-0.5">Monthly revenue trend (GMD)</CardDescription>
                    </div>
                    <Badge variant="outline" className="text-xs font-medium">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      This Year
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="ps-2">
                  <Overview />
                </CardContent>
              </Card>

              <Card className="col-span-1 lg:col-span-3">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-semibold">Recent Orders</CardTitle>
                      <CardDescription className="mt-0.5">
                        {totalSalesCount} orders placed this month
                      </CardDescription>
                    </div>
                    <Link to="/admin/orders">
                      <Button variant="ghost" size="sm" className="h-7 text-xs gap-1 text-primary">
                        View all <ArrowRight className="h-3 w-3" />
                      </Button>
                    </Link>
                  </div>
                </CardHeader>
                <CardContent>
                  <RecentSales orders={recentOrders} />
                </CardContent>
              </Card>
            </div>

            {/* ── TeranGO Official Store card ── */}
            <Card className="border-primary/15 bg-gradient-to-br from-primary/6 via-primary/2 to-transparent">
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4 sm:justify-between">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary shadow-sm shadow-primary/30">
                      <Crown className="h-5 w-5 text-primary-foreground" />
                    </div>
                    <div>
                      <CardTitle className="text-base font-semibold">
                        Teran<span className="text-primary">GO</span> Official Store
                      </CardTitle>
                      <CardDescription>First-party product inventory & fulfilment</CardDescription>
                    </div>
                  </div>
                  <Link to="/admin/terango-products">
                    <Button variant="outline" size="sm" className="gap-1.5 text-xs shrink-0">
                      <Settings className="h-3.5 w-3.5" />
                      Manage Store
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
                  {[
                    { label: "Total Products", value: terangoStats?.totalProducts, icon: Package,    color: "text-orange-500",  bg: "bg-orange-50 dark:bg-orange-900/25" },
                    { label: "Available",       value: terangoStats?.availableProducts, icon: CheckCircle2, color: "text-emerald-600", bg: "bg-emerald-50 dark:bg-emerald-900/25" },
                    { label: "Featured",        value: terangoStats?.featuredProducts, icon: Crown,     color: "text-amber-600",  bg: "bg-amber-50 dark:bg-amber-900/25" },
                    { label: "Total Stock",     value: terangoStats?.totalStock, icon: Store,     color: "text-blue-600",   bg: "bg-blue-50 dark:bg-blue-900/25" },
                  ].map(({ label, value, icon: Icon, color, bg }) => (
                    <div
                      key={label}
                      className="rounded-xl border bg-card/70 p-4 hover:bg-card hover:shadow-sm transition-all"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <div className={`flex h-7 w-7 items-center justify-center rounded-lg ${bg}`}>
                          <Icon className={`h-3.5 w-3.5 ${color}`} />
                        </div>
                        <span className="text-xs text-muted-foreground font-medium">{label}</span>
                      </div>
                      {terangoLoading
                        ? <Skeleton className="h-6 w-14" />
                        : <p className={`text-xl font-bold ${color}`}>{value?.toLocaleString() ?? 0}</p>
                      }
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* ── Quick Actions grid ── */}
            <div>
              <h2 className="text-sm font-semibold text-muted-foreground mb-3 uppercase tracking-wider">
                Quick Actions
              </h2>
              <div className="grid gap-2 grid-cols-2 sm:grid-cols-4 lg:grid-cols-8">
                {quickActions.map(({ label, href, icon: Icon, color, bg }) => (
                  <Link key={label} to={href as string}>
                    <div className="group flex flex-col items-center gap-2 rounded-xl border bg-card/80 p-3 text-center hover:bg-card hover:shadow-sm hover:-translate-y-0.5 transition-all duration-150 cursor-pointer">
                      <div className={`flex h-9 w-9 items-center justify-center rounded-xl ${bg} transition-transform group-hover:scale-110`}>
                        <Icon className={`h-4 w-4 ${color}`} />
                      </div>
                      <span className="text-[11px] font-medium text-foreground/80 leading-tight">{label}</span>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

          </TabsContent>

          {/* ════ ANALYTICS TAB ════ */}
          <TabsContent value="analytics" className="mt-0">
            <Analytics />
          </TabsContent>
        </Tabs>
      </Main>
    </>
  );
}

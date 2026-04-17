import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  ShoppingBag,
  DollarSign,
  Package,
  TrendingUp,
  Clock,
  CheckCircle,
  ArrowRight,
  Activity,
  BarChart2,
  Star,
  AlertCircle,
} from "lucide-react";
import { api } from "@/lib/api";
import { useVendorProfile } from "@/hooks/use-vendor-profile";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_vendor/vendor/dashboard")({
  component: VendorDashboard,
});

// ─── Types ────────────────────────────────────────────────────────────────────

interface TopSellingItem {
  id: string;
  name: string;
  sales: number;
  revenue: number;
}

interface RecentOrder {
  id: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  customerName: string;
  itemCount: number;
}

interface DailyStat {
  date: string;
  orders: number;
  revenue: number;
}

interface VendorStats {
  totalRevenue: number;
  todayRevenue: number;
  totalOrders: number;
  todayOrders: number;
  pendingOrders: number;
  completedOrders: number;
  totalMenuItems: number;
  activeBusinesses: number;
  totalBusinesses: number;
  averageOrderValue: number;
  topSellingItems: TopSellingItem[];
  recentOrders: RecentOrder[];
  dailyStats: DailyStat[];
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (n: number) => `D${n.toFixed(2)}`;

const statusConfig: Record<string, { label: string; className: string }> = {
  DELIVERED: {
    label: "Delivered",
    className:
      "bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-400",
  },
  ACCEPTED: {
    label: "Accepted",
    className:
      "bg-blue-100 text-blue-700 dark:bg-blue-500/15 dark:text-blue-400",
  },
  PENDING: {
    label: "Pending",
    className:
      "bg-orange-100 text-orange-700 dark:bg-orange-500/15 dark:text-orange-400",
  },
  CANCELLED: {
    label: "Cancelled",
    className: "bg-red-100 text-red-700 dark:bg-red-500/15 dark:text-red-400",
  },
};

function StatusBadge({ status }: { status: string }) {
  const cfg = statusConfig[status] ?? {
    label: status,
    className: "bg-zinc-100 text-zinc-600",
  };
  return (
    <span
      className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${cfg.className}`}
    >
      {cfg.label}
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });
}

// ─── Mini Bar Chart (pure SVG, no deps) ──────────────────────────────────────

function RevenueBarChart({ data }: { data: DailyStat[] }) {
  const maxRevenue = Math.max(...data.map((d) => d.revenue), 1);
  const chartH = 80;
  const barW = 28;
  const gap = 10;
  const totalW = data.length * (barW + gap) - gap;

  return (
    <svg
      viewBox={`0 0 ${totalW} ${chartH + 24}`}
      width="100%"
      preserveAspectRatio="xMidYMid meet"
      className="overflow-visible"
    >
      {data.map((d, i) => {
        const barH = Math.max(
          (d.revenue / maxRevenue) * chartH,
          d.revenue > 0 ? 4 : 2,
        );
        const x = i * (barW + gap);
        const y = chartH - barH;
        const isLast = i === data.length - 1;
        const hasActivity = d.revenue > 0;

        return (
          <g key={d.date}>
            {/* Background bar */}
            <rect
              x={x}
              y={0}
              width={barW}
              height={chartH}
              rx={6}
              className="fill-zinc-100 dark:fill-zinc-800"
            />
            {/* Value bar */}
            <rect
              x={x}
              y={y}
              width={barW}
              height={barH}
              rx={6}
              className={
                hasActivity
                  ? isLast
                    ? "fill-orange-500"
                    : "fill-zinc-400 dark:fill-zinc-500"
                  : "fill-zinc-200 dark:fill-zinc-700"
              }
            />
            {/* Date label */}
            <text
              x={x + barW / 2}
              y={chartH + 16}
              textAnchor="middle"
              fontSize={9}
              className="fill-zinc-400 dark:fill-zinc-500"
              fontFamily="inherit"
            >
              {formatShortDate(d.date)}
            </text>
            {/* Revenue tooltip on hover via title */}
            <title>
              {formatShortDate(d.date)}: {fmt(d.revenue)} · {d.orders} orders
            </title>
          </g>
        );
      })}
    </svg>
  );
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

function VendorDashboard() {
  const { vendor } = useVendorProfile();

  const {
    data: stats,
    isLoading,
    error,
  } = useQuery<VendorStats>({
    queryKey: ["vendor-stats"],
    queryFn: async () => {
      const response = await api.get("/api/vendor-stats/dashboard");
      return response.data?.success ? response.data.data : response.data;
    },
  });

  const completionRate = stats?.totalOrders
    ? Math.round((stats.completedOrders / stats.totalOrders) * 100)
    : 0;

  const pendingRate = stats?.totalOrders
    ? Math.round((stats.pendingOrders / stats.totalOrders) * 100)
    : 0;

  const weekRevenue =
    stats?.dailyStats?.reduce((s, d) => s + d.revenue, 0) ?? 0;

  const statCards = [
    {
      title: "Total Revenue",
      value: fmt(stats?.totalRevenue ?? 0),
      subtitle: "Lifetime earnings",
      icon: DollarSign,
      highlight: true,
    },
    {
      title: "Today's Revenue",
      value: fmt(stats?.todayRevenue ?? 0),
      subtitle: `${stats?.todayOrders ?? 0} orders today`,
      icon: TrendingUp,
      highlight: false,
    },
    {
      title: "Avg. Order Value",
      value: fmt(stats?.averageOrderValue ?? 0),
      subtitle: "Per transaction",
      icon: BarChart2,
      highlight: false,
    },
    {
      title: "Total Orders",
      value: stats?.totalOrders ?? 0,
      subtitle: "All time",
      icon: ShoppingBag,
      highlight: false,
    },
    {
      title: "Pending Orders",
      value: stats?.pendingOrders ?? 0,
      subtitle: "Awaiting fulfillment",
      icon: Clock,
      highlight: (stats?.pendingOrders ?? 0) > 0,
    },
    {
      title: "Completed Orders",
      value: stats?.completedOrders ?? 0,
      subtitle: `${completionRate}% completion rate`,
      icon: CheckCircle,
      highlight: false,
    },
  ];

  return (
    <div className="flex-1 p-6 md:p-8 bg-zinc-50 dark:bg-zinc-950 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* ── Header ── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-orange-500 mb-1">
              Vendor Portal
            </p>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
              {vendor?.businessName || vendor?.fullName || "Dashboard"}
            </h1>
            <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
              {new Date().toLocaleDateString("en-GB", {
                weekday: "long",
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="inline-flex items-center gap-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-300 shadow-sm">
              <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
              Live
            </span>
            <span className="inline-flex items-center gap-1.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-3 py-1.5 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-300 shadow-sm">
              <Activity className="h-3.5 w-3.5 text-orange-500" />
              {stats?.activeBusinesses ?? 1} Active Store
            </span>
          </div>
        </div>

        {/* ── Stat Cards ── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {isLoading
            ? Array(6)
                .fill(null)
                .map((_, i) => (
                  <Skeleton key={i} className="h-28 w-full rounded-2xl" />
                ))
            : statCards.map((stat, i) => {
                const Icon = stat.icon;
                return (
                  <Card
                    key={i}
                    className={`rounded-2xl transition-all duration-200 hover:shadow-md ${
                      stat.highlight
                        ? "bg-orange-500 border-orange-400 shadow-md shadow-orange-500/20"
                        : "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm"
                    }`}
                  >
                    <CardContent className="pt-5 pb-5 px-5">
                      <div className="flex items-start justify-between mb-3">
                        <p
                          className={`text-xs font-semibold uppercase tracking-wider ${
                            stat.highlight
                              ? "text-orange-100"
                              : "text-zinc-500 dark:text-zinc-400"
                          }`}
                        >
                          {stat.title}
                        </p>
                        <div
                          className={`p-1.5 rounded-lg ${
                            stat.highlight
                              ? "bg-white/20"
                              : "bg-zinc-100 dark:bg-zinc-800"
                          }`}
                        >
                          <Icon
                            className={`h-3.5 w-3.5 ${
                              stat.highlight
                                ? "text-white"
                                : "text-zinc-500 dark:text-zinc-400"
                            }`}
                          />
                        </div>
                      </div>
                      <p
                        className={`text-2xl font-bold tracking-tight ${
                          stat.highlight
                            ? "text-white"
                            : "text-zinc-900 dark:text-zinc-100"
                        }`}
                      >
                        {stat.value}
                      </p>
                      <p
                        className={`text-xs mt-1 ${
                          stat.highlight
                            ? "text-orange-100"
                            : "text-zinc-400 dark:text-zinc-500"
                        }`}
                      >
                        {stat.subtitle}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
        </div>

        {/* ── Middle Row: Revenue Chart + Performance ── */}
        <div className="grid gap-6 lg:grid-cols-5">
          {/* Revenue Chart */}
          <Card className="lg:col-span-3 rounded-2xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm">
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                    7-Day Revenue
                  </CardTitle>
                  <CardDescription className="text-xs">
                    Week total:{" "}
                    <span className="font-semibold text-orange-500">
                      {fmt(weekRevenue)}
                    </span>
                  </CardDescription>
                </div>
                <BarChart2 className="h-5 w-5 text-zinc-300 dark:text-zinc-600" />
              </div>
            </CardHeader>
            <CardContent className="pt-2">
              {isLoading ? (
                <Skeleton className="h-28 w-full rounded-xl" />
              ) : stats?.dailyStats?.length ? (
                <RevenueBarChart data={stats.dailyStats} />
              ) : (
                <div className="flex items-center justify-center h-28 text-sm text-zinc-400">
                  No data yet
                </div>
              )}
            </CardContent>
          </Card>

          {/* Performance */}
          <Card className="lg:col-span-2 rounded-2xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm">
            <CardHeader className="pb-2">
              <CardTitle className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                Performance
              </CardTitle>
              <CardDescription className="text-xs">
                Order fulfilment breakdown
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5 pt-2">
              {isLoading ? (
                <div className="space-y-3">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-3/4" />
                </div>
              ) : (
                <>
                  {/* Completion rate */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
                        <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                        Completion
                      </span>
                      <span className="text-xs font-bold text-green-600">
                        {completionRate}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-zinc-100 dark:bg-zinc-800">
                      <div
                        className="h-1.5 rounded-full bg-green-500 transition-all duration-700"
                        style={{ width: `${completionRate}%` }}
                      />
                    </div>
                  </div>

                  {/* Pending rate */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <span className="text-xs font-medium text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 text-orange-500" />
                        Pending
                      </span>
                      <span className="text-xs font-bold text-orange-600">
                        {pendingRate}%
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-zinc-100 dark:bg-zinc-800">
                      <div
                        className="h-1.5 rounded-full bg-orange-500 transition-all duration-700"
                        style={{ width: `${pendingRate}%` }}
                      />
                    </div>
                  </div>

                  {/* Menu Items */}
                  <div className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                        <Package className="h-3.5 w-3.5 text-zinc-400" />
                        Menu Items
                      </span>
                      <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                        {stats?.totalMenuItems ?? 0}
                      </span>
                    </div>
                  </div>

                  {/* Avg Order */}
                  <div className="border-t border-zinc-100 dark:border-zinc-800 pt-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                        <DollarSign className="h-3.5 w-3.5 text-zinc-400" />
                        Avg. Order
                      </span>
                      <span className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                        {fmt(stats?.averageOrderValue ?? 0)}
                      </span>
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── Bottom Row: Recent Orders + Top Items + Quick Actions ── */}
        <div className="grid gap-6 lg:grid-cols-5">
          {/* Recent Orders */}
          <Card className="lg:col-span-3 rounded-2xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm">
            <CardHeader className="pb-3 flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  Recent Orders
                </CardTitle>
                <CardDescription className="text-xs">
                  Latest {stats?.recentOrders?.length ?? 0} transactions
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-orange-500 hover:text-orange-600 gap-1 px-2"
                onClick={() => (window.location.href = "/vendor/orders")}
              >
                View all <ArrowRight className="h-3 w-3" />
              </Button>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              {isLoading ? (
                <div className="space-y-2 px-6 pb-4">
                  {Array(4)
                    .fill(null)
                    .map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full rounded-xl" />
                    ))}
                </div>
              ) : stats?.recentOrders?.length ? (
                <div className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {stats.recentOrders.map((order) => (
                    <div
                      key={order.id}
                      className="flex items-center gap-3 px-5 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800/50 transition-colors"
                    >
                      <div className="h-8 w-8 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center flex-shrink-0">
                        <ShoppingBag className="h-3.5 w-3.5 text-zinc-500 dark:text-zinc-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                          {order.customerName}
                        </p>
                        <p className="text-xs text-zinc-400 dark:text-zinc-500">
                          {order.itemCount} item
                          {order.itemCount !== 1 ? "s" : ""} ·{" "}
                          {formatDate(order.createdAt)}
                        </p>
                      </div>
                      <div className="flex flex-col items-end gap-1 flex-shrink-0">
                        <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-100">
                          {fmt(order.totalAmount)}
                        </span>
                        <StatusBadge status={order.status} />
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-zinc-400">
                  <AlertCircle className="h-8 w-8 mb-2 opacity-40" />
                  <p className="text-sm">No orders yet</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Right column: Top Items + Quick Actions */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            {/* Top Selling Items */}
            <Card className="rounded-2xl bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 shadow-sm">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                    Top Items
                  </CardTitle>
                  <Star className="h-4 w-4 text-orange-400" />
                </div>
                <CardDescription className="text-xs">
                  Best performing menu items
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0">
                {isLoading ? (
                  <Skeleton className="h-16 w-full rounded-xl" />
                ) : stats?.topSellingItems?.length ? (
                  <div className="space-y-3">
                    {stats.topSellingItems.map((item, i) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 p-3 rounded-xl bg-zinc-50 dark:bg-zinc-800/50"
                      >
                        <span className="text-xs font-bold text-zinc-400 w-4">
                          #{i + 1}
                        </span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100 truncate">
                            {item.name}
                          </p>
                          <p className="text-xs text-zinc-400">
                            {item.sales} sales
                          </p>
                        </div>
                        <span className="text-sm font-semibold text-orange-500">
                          {fmt(item.revenue)}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-zinc-400 text-center py-4">
                    No data yet
                  </p>
                )}
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card className="rounded-2xl border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 pt-0">
                <Button
                  onClick={() => (window.location.href = "/vendor/orders")}
                  className="w-full bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 justify-between rounded-xl py-5 text-sm font-medium group shadow-sm"
                >
                  <span className="flex items-center gap-2">
                    <ShoppingBag className="h-4 w-4" />
                    Manage Orders
                  </span>
                  <ArrowRight className="h-4 w-4 opacity-50 group-hover:translate-x-0.5 transition-transform" />
                </Button>
                <Button
                  onClick={() => (window.location.href = "/vendor/menu")}
                  variant="outline"
                  className="w-full justify-between rounded-xl py-5 text-sm font-medium group border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-900 dark:text-zinc-100"
                >
                  <span className="flex items-center gap-2">
                    <Package className="h-4 w-4 text-orange-500" />
                    Update Menu
                  </span>
                  <ArrowRight className="h-4 w-4 opacity-50 group-hover:translate-x-0.5 transition-transform" />
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

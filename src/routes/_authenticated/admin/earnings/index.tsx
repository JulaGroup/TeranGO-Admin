import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  TrendingUp,
  DollarSign,
  Truck,
  ShoppingBag,
  Package,
  RefreshCw,
  Activity,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import { adminApi } from "@/lib/api";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { TopNav } from "@/components/layout/top-nav";
import { ProfileDropdown } from "@/components/profile-dropdown";
import { ThemeSwitch } from "@/components/theme-switch";
import { Skeleton } from "@/components/ui/skeleton";

export const Route = createFileRoute("/_authenticated/admin/earnings/")({
  component: FinancePage,
});

const topNav = [
  { title: "Dashboard", href: "/admin", isActive: false },
  { title: "Orders", href: "/admin/orders", isActive: false },
  { title: "Settlements", href: "/admin/settlements", isActive: false },
  { title: "Finance", href: "/admin/earnings", isActive: true },
];

type Period = "today" | "week" | "month" | "year" | "all";

function formatGMD(value: number) {
  if (value >= 1_000_000) return `D${(value / 1_000_000).toFixed(2)}M`;
  if (value >= 1_000) return `D${(value / 1_000).toFixed(1)}k`;
  return `D${value.toFixed(2)}`;
}

function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  loading,
}: {
  title: string;
  value: string;
  subtitle?: string;
  icon: React.ElementType;
  color: string;
  loading?: boolean;
}) {
  return (
    <Card className="relative overflow-hidden">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <div className={`rounded-lg p-2 ${color}`}>
          <Icon className="h-4 w-4 text-white" />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <>
            <Skeleton className="h-8 w-32 mb-1" />
            <Skeleton className="h-4 w-24" />
          </>
        ) : (
          <>
            <div className="text-2xl font-bold tracking-tight">{value}</div>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function RevenueBreakdownCard({
  serviceFee,
  driverPlatformShare,
  vendorPlatformShare,
  loading,
}: {
  serviceFee: number;
  driverPlatformShare: number;
  vendorPlatformShare: number;
  loading?: boolean;
}) {
  const total = serviceFee + driverPlatformShare + vendorPlatformShare || 1;
  const streams = [
    {
      label: "Service Fees",
      value: serviceFee,
      pct: (serviceFee / total) * 100,
      color: "bg-violet-500",
      desc: "Platform fee on each order",
    },
    {
      label: "Delivery Commission",
      value: driverPlatformShare,
      pct: (driverPlatformShare / total) * 100,
      color: "bg-blue-500",
      desc: "25% of driver delivery fees",
    },
    {
      label: "Vendor Commission",
      value: vendorPlatformShare,
      pct: (vendorPlatformShare / total) * 100,
      color: "bg-emerald-500",
      desc: "Platform cut on vendor sales",
    },
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base font-semibold">
          Revenue Breakdown
        </CardTitle>
        <CardDescription>How TeranGO earns its revenue</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-1">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            ))
          : streams.map((s) => (
              <div key={s.label} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <div>
                    <span className="font-medium">{s.label}</span>
                    <span className="ml-2 text-muted-foreground text-xs">
                      {s.desc}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{formatGMD(s.value)}</span>
                    <Badge variant="secondary" className="text-xs">
                      {s.pct.toFixed(1)}%
                    </Badge>
                  </div>
                </div>
                <div className="h-2 w-full rounded-full bg-muted overflow-hidden">
                  <div
                    className={`h-full rounded-full ${s.color} transition-all duration-500`}
                    style={{ width: `${s.pct}%` }}
                  />
                </div>
              </div>
            ))}
      </CardContent>
    </Card>
  );
}

function FinancePage() {
  const [period, setPeriod] = useState<Period>("month");

  const { data, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["finance-overview", period],
    queryFn: async () => {
      const res = await adminApi.getFinanceOverview(period);
      return res.data as {
        overview: {
          totalRevenue: number;
          serviceFee: number;
          driverPlatformShare: number;
          vendorPlatformShare: number;
          gmv: number;
          totalDeliveryFee: number;
          driverPaid: number;
          vendorPaid: number;
          deliveredOrderCount: number;
          totalOrderCount: number;
        };
        chart: Array<{
          month: string;
          serviceFee: number;
          deliveryFee: number;
          orders: number;
          driverPlatformShare: number;
        }>;
      };
    },
    staleTime: 2 * 60 * 1000,
  });

  const ov = data?.overview;
  const chart = data?.chart ?? [];

  const periodLabel: Record<Period, string> = {
    today: "Today",
    week: "This Week",
    month: "This Month",
    year: "This Year",
    all: "All Time",
  };

  return (
    <>
      <Header>
        <TopNav links={topNav} />
        <div className="ml-auto flex items-center space-x-4">
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        {/* Page Header */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Finance Overview
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              All revenue streams and platform earnings at a glance
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select
              value={period}
              onValueChange={(v) => setPeriod(v as Period)}
            >
              <SelectTrigger className="w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="year">This Year</SelectItem>
                <SelectItem value="all">All Time</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              size="icon"
              onClick={() => refetch()}
              disabled={isRefetching}
            >
              <RefreshCw
                className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`}
              />
            </Button>
          </div>
        </div>

        {/* Net Revenue Hero Card */}
        <Card className="mb-6 border-0 bg-linear-to-br from-violet-600 to-violet-800 text-white shadow-lg">
          <CardContent className="pt-6">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-medium text-violet-200">
                  Total TeranGO Revenue ({periodLabel[period]})
                </p>
                {isLoading ? (
                  <Skeleton className="h-12 w-48 bg-violet-500 mt-2" />
                ) : (
                  <p className="mt-1 text-4xl font-bold tracking-tight">
                    {formatGMD(ov?.totalRevenue ?? 0)}
                  </p>
                )}
                <p className="text-xs text-violet-300 mt-1">
                  Net platform earnings across all revenue streams
                </p>
              </div>
              <div className="flex items-center gap-2 text-violet-200">
                <Activity className="h-5 w-5" />
                <span className="text-sm">
                  {isLoading ? "—" : ov?.deliveredOrderCount} delivered orders
                </span>
              </div>
            </div>

            {/* Mini breakdown row */}
            {!isLoading && ov && (
              <div className="mt-6 grid grid-cols-3 divide-x divide-violet-500 border-t border-violet-500 pt-4">
                <div className="px-3 first:pl-0">
                  <p className="text-xs text-violet-300">Service Fees</p>
                  <p className="text-lg font-semibold">
                    {formatGMD(ov.serviceFee)}
                  </p>
                </div>
                <div className="px-3">
                  <p className="text-xs text-violet-300">Delivery Commission</p>
                  <p className="text-lg font-semibold">
                    {formatGMD(ov.driverPlatformShare)}
                  </p>
                </div>
                <div className="px-3">
                  <p className="text-xs text-violet-300">Vendor Commission</p>
                  <p className="text-lg font-semibold">
                    {formatGMD(ov.vendorPlatformShare)}
                  </p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stat cards row */}
        <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            title="Gross Merchandise Value"
            value={formatGMD(ov?.gmv ?? 0)}
            subtitle="Total value of delivered orders"
            icon={ShoppingBag}
            color="bg-slate-700"
            loading={isLoading}
          />
          <StatCard
            title="Total Delivery Fees Collected"
            value={formatGMD(ov?.totalDeliveryFee ?? 0)}
            subtitle={`Drivers kept ${formatGMD(ov?.driverPaid ?? 0)}`}
            icon={Truck}
            color="bg-blue-600"
            loading={isLoading}
          />
          <StatCard
            title="Vendor Sales Processed"
            value={formatGMD(ov?.vendorPaid ?? 0)}
            subtitle="Total paid out to vendors"
            icon={Package}
            color="bg-emerald-600"
            loading={isLoading}
          />
          <StatCard
            title="Total Orders"
            value={String(ov?.totalOrderCount ?? 0)}
            subtitle={`${ov?.deliveredOrderCount ?? 0} successfully delivered`}
            icon={DollarSign}
            color="bg-violet-600"
            loading={isLoading}
          />
        </div>

        {/* Charts + Breakdown grid */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Area chart — spans 2 cols */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Revenue Trend (Last 6 Months)
              </CardTitle>
              <CardDescription>
                Service fees and delivery commission over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-64 w-full" />
              ) : chart.length === 0 ? (
                <div className="flex h-64 items-center justify-center text-muted-foreground">
                  <div className="text-center">
                    <TrendingUp className="mx-auto h-10 w-10 mb-2 opacity-30" />
                    <p className="text-sm">No chart data available yet</p>
                  </div>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={260}>
                  <AreaChart
                    data={chart}
                    margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="colorServiceFee"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#7c3aed"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="#7c3aed"
                          stopOpacity={0}
                        />
                      </linearGradient>
                      <linearGradient
                        id="colorDriver"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#2563eb"
                          stopOpacity={0.3}
                        />
                        <stop
                          offset="95%"
                          stopColor="#2563eb"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      className="stroke-muted"
                    />
                    <XAxis
                      dataKey="month"
                      tick={{ fontSize: 12 }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 11 }}
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(v: number) =>
                        `D${(v / 1000).toFixed(0)}k`
                      }
                    />
                    <Tooltip
                      formatter={(value, name) => [
                        formatGMD(Number(value)),
                        name === "serviceFee"
                          ? "Service Fee"
                          : "Delivery Commission",
                      ]}
                    />
                    <Legend
                      formatter={(v: string) =>
                        v === "serviceFee"
                          ? "Service Fee"
                          : "Delivery Commission"
                      }
                    />
                    <Area
                      type="monotone"
                      dataKey="serviceFee"
                      stroke="#7c3aed"
                      strokeWidth={2}
                      fill="url(#colorServiceFee)"
                    />
                    <Area
                      type="monotone"
                      dataKey="driverPlatformShare"
                      stroke="#2563eb"
                      strokeWidth={2}
                      fill="url(#colorDriver)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          {/* Revenue breakdown — 1 col */}
          <RevenueBreakdownCard
            serviceFee={ov?.serviceFee ?? 0}
            driverPlatformShare={ov?.driverPlatformShare ?? 0}
            vendorPlatformShare={ov?.vendorPlatformShare ?? 0}
            loading={isLoading}
          />
        </div>

        {/* Orders bar chart */}
        {!isLoading && chart.length > 0 && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle className="text-base font-semibold">
                Order Volume (Last 6 Months)
              </CardTitle>
              <CardDescription>
                Number of delivered orders per month
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart
                  data={chart}
                  margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
                >
                  <CartesianGrid
                    strokeDasharray="3 3"
                    className="stroke-muted"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="month"
                    tick={{ fontSize: 12 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 11 }}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip />
                  <Bar
                    dataKey="orders"
                    fill="#7c3aed"
                    radius={[4, 4, 0, 0]}
                    name="Orders"
                  />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Platform split summary */}
        {!isLoading && ov && (
          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900">
                    <Truck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                  </div>
                  <CardTitle className="text-sm font-semibold">
                    Driver Split Summary
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Total delivery fees collected
                  </span>
                  <span className="font-medium">
                    {formatGMD(ov.totalDeliveryFee)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Paid to drivers (75%)
                  </span>
                  <span className="font-medium text-blue-600">
                    {formatGMD(ov.driverPaid)}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-medium">TeranGO keeps (25%)</span>
                  <span className="font-bold text-violet-600">
                    {formatGMD(ov.driverPlatformShare)}
                  </span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center gap-2">
                  <div className="rounded-lg bg-emerald-100 p-2 dark:bg-emerald-900">
                    <Package className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <CardTitle className="text-sm font-semibold">
                    Vendor Split Summary
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Total vendor sales (GMV items)
                  </span>
                  <span className="font-medium">
                    {formatGMD(ov.vendorPaid + ov.vendorPlatformShare)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">
                    Paid to vendors (100%)
                  </span>
                  <span className="font-medium text-emerald-600">
                    {formatGMD(ov.vendorPaid)}
                  </span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-medium">TeranGO keeps</span>
                  <span className="font-bold text-violet-600">
                    {formatGMD(ov.vendorPlatformShare)}
                    {ov.vendorPlatformShare === 0 && (
                      <span className="ml-2 text-xs text-muted-foreground font-normal">
                        (100% vendor rate active)
                      </span>
                    )}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </Main>
    </>
  );
}

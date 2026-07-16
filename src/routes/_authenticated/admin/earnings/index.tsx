import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  TrendingUp,
  DollarSign,
  Truck,
  ShoppingBag,
  Package,
  RefreshCw,
  Activity,
  Zap,
  Store,
  Megaphone,
  Wallet,
  ArrowRight,
  Wrench,
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
    <Card className={`border-l-4 ${color} shadow-sm`}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
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
  expressTotalRevenue,
  tmartProfit,
  advertRevenue,
  loading,
}: {
  serviceFee: number;
  driverPlatformShare: number;
  vendorPlatformShare: number;
  expressTotalRevenue: number;
  tmartProfit: number;
  advertRevenue: number;
  loading?: boolean;
}) {
  const total =
    serviceFee +
      driverPlatformShare +
      vendorPlatformShare +
      expressTotalRevenue +
      tmartProfit +
      advertRevenue || 1;
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
      desc: "Platform cut on 3rd-party vendor sales",
    },
    {
      label: "TMart Profit",
      value: tmartProfit,
      pct: (tmartProfit / total) * 100,
      color: "bg-pink-500",
      desc: "TeranGO Store — sale price minus cost price",
    },
    {
      label: "Express & Custom Delivery",
      value: expressTotalRevenue,
      pct: (expressTotalRevenue / total) * 100,
      color: "bg-amber-500",
      desc: "Booking + service fees, plus 25% of transport fee",
    },
    {
      label: "Advertising",
      value: advertRevenue,
      pct: (advertRevenue / total) * 100,
      color: "bg-cyan-500",
      desc: "Paid ad placements",
    },
  ];

  return (
    <Card className="shadow-sm">
      <CardHeader className="border-b pb-4">
        <CardTitle className="text-base font-semibold">
          Revenue Breakdown
        </CardTitle>
        <CardDescription>How TeranGO earns its revenue</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4 pt-4">
        {loading
          ? Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="space-y-1">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-2 w-full rounded-full" />
              </div>
            ))
          : streams.map((s) => (
              <div key={s.label} className="space-y-1.5">
                <div className="flex items-center justify-between text-sm">
                  <div className="min-w-0 pr-2">
                    <span className="font-medium">{s.label}</span>
                    <span className="ml-2 text-muted-foreground text-xs hidden sm:inline">
                      {s.desc}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
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
  const queryClient = useQueryClient();

  // Maintenance: create missing VendorEarning ledger records for orders
  // marked delivered from the admin panel before that path recorded them.
  // Idempotent — safe to run any number of times.
  const backfillMutation = useMutation({
    mutationFn: async () => (await adminApi.backfillVendorEarnings()).data,
    onSuccess: (result) => {
      if (result.created > 0) {
        toast.success(
          `Backfilled ${result.created} missing vendor earning(s) — D${result.totalVendorShare.toFixed(2)} added to the ledger`,
        );
      } else {
        toast.info("No missing vendor earnings found — ledger is complete");
      }
      if (result.errors?.length) {
        toast.warning(`${result.errors.length} order(s) failed — check server logs`);
      }
      queryClient.invalidateQueries({ queryKey: ["finance-overview"] });
    },
    onError: () => toast.error("Backfill failed — check server logs"),
  });

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
          expressGMV: number;
          expressBookingServiceFee: number;
          expressDriverPlatformShare: number;
          expressDriverPaid: number;
          expressTotalRevenue: number;
          expressDeliveredCount: number;
          expressTotalCount: number;
          tmartGMV: number;
          tmartProfit: number;
          advertRevenue: number;
          paidAdCount: number;
          staffAdvancesOwed: number;
          staffAdvancesOwedCount: number;
          netRevenueAfterAdvances: number;
        };
        chart: Array<{
          month: string;
          serviceFee: number;
          deliveryFee: number;
          orders: number;
          driverPlatformShare: number;
          expressRevenue: number;
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
        <div className="space-y-6">
          {/* Page Header */}
          <div className="flex items-center justify-between">
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
                <SelectTrigger className="h-9 w-[140px]">
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
                className="h-9 w-9"
                onClick={() => refetch()}
                disabled={isRefetching}
              >
                <RefreshCw
                  className={`h-4 w-4 ${isRefetching ? "animate-spin" : ""}`}
                />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-9"
                onClick={() => {
                  if (
                    window.confirm(
                      "Scan for delivered orders missing from the vendor earnings ledger and create their records? Safe to run — already-recorded orders are skipped.",
                    )
                  ) {
                    backfillMutation.mutate();
                  }
                }}
                disabled={backfillMutation.isPending}
                title="Create missing vendor earning records for delivered orders"
              >
                <Wrench
                  className={`h-4 w-4 mr-1.5 ${backfillMutation.isPending ? "animate-spin" : ""}`}
                />
                {backfillMutation.isPending ? "Fixing…" : "Fix Earnings"}
              </Button>
            </div>
          </div>

          {/* Net Revenue Hero Card */}
          <Card className="border-0 bg-gradient-to-br from-violet-600 to-violet-800 text-white shadow-lg">
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
                <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 divide-x divide-y sm:divide-y-0 divide-violet-500 border-t border-violet-500 pt-4">
                  <div className="px-3 first:pl-0 pb-3 sm:pb-0">
                    <p className="text-xs text-violet-300">Service Fees</p>
                    <p className="text-lg font-semibold">
                      {formatGMD(ov.serviceFee)}
                    </p>
                  </div>
                  <div className="px-3 pb-3 sm:pb-0">
                    <p className="text-xs text-violet-300">Delivery Commission</p>
                    <p className="text-lg font-semibold">
                      {formatGMD(ov.driverPlatformShare)}
                    </p>
                  </div>
                  <div className="px-3 pb-3 sm:pb-0">
                    <p className="text-xs text-violet-300">Vendor Commission</p>
                    <p className="text-lg font-semibold">
                      {formatGMD(ov.vendorPlatformShare)}
                    </p>
                  </div>
                  <div className="px-3 pb-3 lg:pb-0">
                    <p className="text-xs text-violet-300">TMart Profit</p>
                    <p className="text-lg font-semibold">
                      {formatGMD(ov.tmartProfit)}
                    </p>
                  </div>
                  <div className="px-3 pb-3 lg:pb-0">
                    <p className="text-xs text-violet-300">Express &amp; Custom</p>
                    <p className="text-lg font-semibold">
                      {formatGMD(ov.expressTotalRevenue)}
                    </p>
                  </div>
                  <div className="px-3">
                    <p className="text-xs text-violet-300">Advertising</p>
                    <p className="text-lg font-semibold">
                      {formatGMD(ov.advertRevenue)}
                    </p>
                  </div>
                </div>
              )}

              {/* Net after outstanding staff advances */}
              {!isLoading && ov && ov.staffAdvancesOwed > 0 && (
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 rounded-lg bg-violet-900/40 px-4 py-2.5 text-sm">
                  <span className="text-violet-200">
                    Net after {formatGMD(ov.staffAdvancesOwed)} owed in
                    outstanding staff advances
                  </span>
                  <span className="font-semibold">
                    {formatGMD(ov.netRevenueAfterAdvances)}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Stat cards row */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <StatCard
              title="Gross Merchandise Value"
              value={formatGMD(ov?.gmv ?? 0)}
              subtitle="Total value of delivered orders"
              icon={ShoppingBag}
              color="border-l-primary"
              loading={isLoading}
            />
            <StatCard
              title="Total Delivery Fees Collected"
              value={formatGMD(ov?.totalDeliveryFee ?? 0)}
              subtitle={`Drivers kept ${formatGMD(ov?.driverPaid ?? 0)}`}
              icon={Truck}
              color="border-l-blue-500"
              loading={isLoading}
            />
            <StatCard
              title="Vendor Sales Processed"
              value={formatGMD(ov?.vendorPaid ?? 0)}
              subtitle="Total paid out to 3rd-party vendors"
              icon={Package}
              color="border-l-emerald-500"
              loading={isLoading}
            />
            <StatCard
              title="TMart Sales"
              value={formatGMD(ov?.tmartGMV ?? 0)}
              subtitle={`Profit: ${formatGMD(ov?.tmartProfit ?? 0)}`}
              icon={Store}
              color="border-l-pink-500"
              loading={isLoading}
            />
            <StatCard
              title="Express & Custom Delivery"
              value={formatGMD(ov?.expressGMV ?? 0)}
              subtitle={`${ov?.expressDeliveredCount ?? 0} delivered • Drivers kept ${formatGMD(ov?.expressDriverPaid ?? 0)}`}
              icon={Zap}
              color="border-l-orange-500"
              loading={isLoading}
            />
            <StatCard
              title="Total Orders"
              value={String(ov?.totalOrderCount ?? 0)}
              subtitle={`${ov?.deliveredOrderCount ?? 0} successfully delivered`}
              icon={DollarSign}
              color="border-l-violet-500"
              loading={isLoading}
            />
          </div>

          {/* Charts + Breakdown grid */}
          <div className="grid gap-6 lg:grid-cols-3">
            {/* Area chart — spans 2 cols */}
            <Card className="lg:col-span-2 shadow-sm">
              <CardHeader className="border-b pb-4">
                <CardTitle className="text-base font-semibold">
                  Revenue Trend (Last 6 Months)
                </CardTitle>
                <CardDescription>
                  Service fees, delivery commission, and Express revenue over
                  time
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
                {isLoading ? (
                  <Skeleton className="h-64 w-full" />
                ) : chart.length === 0 ? (
                  <div className="flex h-64 flex-col items-center justify-center py-20 text-center">
                    <TrendingUp className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                    <p className="text-lg font-medium">No chart data yet</p>
                    <p className="text-sm text-muted-foreground mt-1">
                      Revenue chart will appear once orders are processed.
                    </p>
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
                        <linearGradient
                          id="colorExpress"
                          x1="0"
                          y1="0"
                          x2="0"
                          y2="1"
                        >
                          <stop
                            offset="5%"
                            stopColor="#d97706"
                            stopOpacity={0.3}
                          />
                          <stop
                            offset="95%"
                            stopColor="#d97706"
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
                            : name === "driverPlatformShare"
                              ? "Delivery Commission"
                              : "Express Revenue",
                        ]}
                      />
                      <Legend
                        formatter={(v: string) =>
                          v === "serviceFee"
                            ? "Service Fee"
                            : v === "driverPlatformShare"
                              ? "Delivery Commission"
                              : "Express Revenue"
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
                      <Area
                        type="monotone"
                        dataKey="expressRevenue"
                        stroke="#d97706"
                        strokeWidth={2}
                        fill="url(#colorExpress)"
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
              expressTotalRevenue={ov?.expressTotalRevenue ?? 0}
              tmartProfit={ov?.tmartProfit ?? 0}
              advertRevenue={ov?.advertRevenue ?? 0}
              loading={isLoading}
            />
          </div>

          {/* Orders bar chart */}
          {!isLoading && chart.length > 0 && (
            <Card className="shadow-sm">
              <CardHeader className="border-b pb-4">
                <CardTitle className="text-base font-semibold">
                  Order Volume (Last 6 Months)
                </CardTitle>
                <CardDescription>
                  Number of delivered orders per month
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-4">
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
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <Card className="shadow-sm">
                <CardHeader className="pb-3 border-b">
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-blue-100 p-2 dark:bg-blue-900">
                      <Truck className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                    </div>
                    <CardTitle className="text-sm font-semibold">
                      Driver Split Summary
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2.5 text-sm pt-4">
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
                  <div className="flex justify-between border-t pt-2.5">
                    <span className="font-medium">TeranGO keeps (25%)</span>
                    <span className="font-bold text-violet-600">
                      {formatGMD(ov.driverPlatformShare)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardHeader className="pb-3 border-b">
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-emerald-100 p-2 dark:bg-emerald-900">
                      <Package className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                    </div>
                    <CardTitle className="text-sm font-semibold">
                      Vendor Split Summary
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2.5 text-sm pt-4">
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
                  <div className="flex justify-between border-t pt-2.5">
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

              <Card className="shadow-sm">
                <CardHeader className="pb-3 border-b">
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-amber-100 p-2 dark:bg-amber-900">
                      <Zap className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <CardTitle className="text-sm font-semibold">
                      Express Split Summary
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2.5 text-sm pt-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Total Express/custom delivery sales
                    </span>
                    <span className="font-medium">{formatGMD(ov.expressGMV)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Paid to drivers (75% of transport)
                    </span>
                    <span className="font-medium text-amber-600">
                      {formatGMD(ov.expressDriverPaid)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Booking + service fees
                    </span>
                    <span className="font-medium">
                      {formatGMD(ov.expressBookingServiceFee)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-2.5">
                    <span className="font-medium">TeranGO keeps</span>
                    <span className="font-bold text-violet-600">
                      {formatGMD(ov.expressTotalRevenue)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardHeader className="pb-3 border-b">
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-pink-100 p-2 dark:bg-pink-900">
                      <Store className="h-4 w-4 text-pink-600 dark:text-pink-400" />
                    </div>
                    <CardTitle className="text-sm font-semibold">
                      TMart Split Summary
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2.5 text-sm pt-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Gross sales (TeranGO Store)
                    </span>
                    <span className="font-medium">{formatGMD(ov.tmartGMV)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Cost of goods sold
                    </span>
                    <span className="font-medium text-pink-600">
                      {formatGMD(ov.tmartGMV - ov.tmartProfit)}
                    </span>
                  </div>
                  <div className="flex justify-between border-t pt-2.5">
                    <span className="font-medium">TeranGO keeps (profit)</span>
                    <span className="font-bold text-violet-600">
                      {formatGMD(ov.tmartProfit)}
                      {ov.tmartGMV > 0 && (
                        <span className="ml-2 text-xs text-muted-foreground font-normal">
                          ({((ov.tmartProfit / ov.tmartGMV) * 100).toFixed(0)}%
                          margin)
                        </span>
                      )}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm">
                <CardHeader className="pb-3 border-b">
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-cyan-100 p-2 dark:bg-cyan-900">
                      <Megaphone className="h-4 w-4 text-cyan-600 dark:text-cyan-400" />
                    </div>
                    <CardTitle className="text-sm font-semibold">
                      Advertising Summary
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2.5 text-sm pt-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Paid placements</span>
                    <span className="font-medium">{ov.paidAdCount}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2.5">
                    <span className="font-medium">TeranGO keeps (100%)</span>
                    <span className="font-bold text-violet-600">
                      {formatGMD(ov.advertRevenue)}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card className="shadow-sm border-amber-200 dark:border-amber-900">
                <CardHeader className="pb-3 border-b">
                  <div className="flex items-center gap-2">
                    <div className="rounded-lg bg-amber-100 p-2 dark:bg-amber-900">
                      <Wallet className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                    </div>
                    <CardTitle className="text-sm font-semibold">
                      Staff Advances (Outstanding)
                    </CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-2.5 text-sm pt-4">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">
                      Owed to staff ({ov.staffAdvancesOwedCount} advance
                      {ov.staffAdvancesOwedCount !== 1 ? "s" : ""})
                    </span>
                    <span className="font-bold text-amber-600">
                      {formatGMD(ov.staffAdvancesOwed)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground pt-1">
                    Money staff fronted on TeranGO's behalf (vendor
                    settlements, TMart stock) not yet reimbursed.
                  </p>
                  <Link
                    to="/admin/staff-advances"
                    className="flex items-center justify-between border-t pt-2.5 text-violet-600 hover:text-violet-700"
                  >
                    <span className="font-medium">View Staff Advances</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </Main>
    </>
  );
}

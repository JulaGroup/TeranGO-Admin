import { Building2, CheckCircle, Store, Zap } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { VendorRow } from "../-lib/vendor-types";

export interface VendorStats {
  total: number;
  active: number;
  businesses: number;
  restaurants: number;
  shops: number;
  pharmacies: number;
  autoPayout: number;
  payoutMisconfigured: number;
}

export function computeVendorStats(rows: VendorRow[]): VendorStats {
  return rows.reduce<VendorStats>(
    (acc, row) => {
      acc.total += 1;
      if (row.isActive) acc.active += 1;
      acc.businesses += row.businessCount;
      for (const business of row.businesses) {
        if (business.type === "Restaurant") acc.restaurants += 1;
        else if (business.type === "Shop") acc.shops += 1;
        else acc.pharmacies += 1;
      }
      if (row.payoutMode === "Auto") acc.autoPayout += 1;
      if (row.payoutMisconfigured) acc.payoutMisconfigured += 1;
      return acc;
    },
    {
      total: 0,
      active: 0,
      businesses: 0,
      restaurants: 0,
      shops: 0,
      pharmacies: 0,
      autoPayout: 0,
      payoutMisconfigured: 0,
    },
  );
}

function StatCard({
  title,
  value,
  description,
  icon: Icon,
  accent,
  loading,
  warn,
}: {
  title: string;
  value: number;
  description: string;
  icon: typeof Store;
  accent: string;
  loading?: boolean;
  warn?: boolean;
}) {
  return (
    <Card className={cn("border-l-4 shadow-sm", accent)}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className="h-4 w-4 text-muted-foreground" />
      </CardHeader>
      <CardContent>
        {loading ? (
          <Skeleton className="h-8 w-16" />
        ) : (
          <div className="text-2xl font-bold">{value}</div>
        )}
        <p
          className={cn(
            "mt-1 text-xs",
            warn ? "font-medium text-destructive" : "text-muted-foreground",
          )}
        >
          {description}
        </p>
      </CardContent>
    </Card>
  );
}

export function VendorsStats({
  stats,
  isLoading,
}: {
  stats: VendorStats;
  isLoading: boolean;
}) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <StatCard
        title="Total Vendors"
        value={stats.total}
        description={`${stats.total - stats.active} inactive`}
        icon={Store}
        accent="border-l-primary"
        loading={isLoading}
      />
      <StatCard
        title="Active"
        value={stats.active}
        description="Currently accepting orders"
        icon={CheckCircle}
        accent="border-l-emerald-500"
        loading={isLoading}
      />
      <StatCard
        title="Businesses"
        value={stats.businesses}
        description={`${stats.restaurants} restaurants · ${stats.shops} shops · ${stats.pharmacies} pharmacies`}
        icon={Building2}
        accent="border-l-blue-500"
        loading={isLoading}
      />
      <StatCard
        title="Auto Payout"
        value={stats.autoPayout}
        description={
          stats.payoutMisconfigured
            ? `${stats.payoutMisconfigured} missing a Wave number`
            : "Paid via Wave after each order"
        }
        icon={Zap}
        accent="border-l-amber-500"
        loading={isLoading}
        warn={stats.payoutMisconfigured > 0}
      />
    </div>
  );
}

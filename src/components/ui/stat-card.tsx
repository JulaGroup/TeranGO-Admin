import * as React from "react";
import { TrendingUp, TrendingDown, Minus, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

/* ─── Sparkline ─── */
interface SparklineProps {
  data: number[];
  className?: string;
  color?: string;
}

function Sparkline({ data, className, color = "var(--color-primary)" }: SparklineProps) {
  if (!data?.length) return null;
  const max   = Math.max(...data);
  const min   = Math.min(...data);
  const range = max - min || 1;
  const pts   = data
    .map((v, i) => `${(i / (data.length - 1)) * 100},${100 - ((v - min) / range) * 100}`)
    .join(" ");

  return (
    <svg className={cn("h-8 w-full", className)} viewBox="0 0 100 100" preserveAspectRatio="none">
      <polyline fill="none" stroke={color} strokeWidth="2.5" points={pts} vectorEffect="non-scaling-stroke" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

/* ─── Trend indicator ─── */
interface TrendIndicatorProps {
  value: number;
  className?: string;
  showIcon?: boolean;
  showValue?: boolean;
}

function TrendIndicator({ value, className, showIcon = true, showValue = true }: TrendIndicatorProps) {
  const isPositive = value > 0;
  const isNeutral  = value === 0;
  const Icon  = isNeutral ? Minus : isPositive ? TrendingUp : TrendingDown;
  const color = isNeutral
    ? "text-muted-foreground"
    : isPositive ? "text-emerald-600 dark:text-emerald-400"
                 : "text-red-500 dark:text-red-400";

  return (
    <div className={cn("flex items-center gap-1", color, className)}>
      {showIcon  && <Icon className="h-3.5 w-3.5" />}
      {showValue && (
        <span className="text-xs font-semibold">
          {isPositive && "+"}
          {value.toFixed(1)}%
        </span>
      )}
    </div>
  );
}

/* ─── Colour maps ─── */
const iconBg: Record<string, string> = {
  default: "bg-muted",
  blue:    "bg-blue-50   dark:bg-blue-900/25",
  green:   "bg-emerald-50 dark:bg-emerald-900/25",
  red:     "bg-red-50    dark:bg-red-900/25",
  yellow:  "bg-amber-50  dark:bg-amber-900/25",
  purple:  "bg-violet-50 dark:bg-violet-900/25",
  orange:  "bg-orange-50 dark:bg-orange-900/25",
};

const iconColor: Record<string, string> = {
  default: "text-muted-foreground",
  blue:    "text-blue-600   dark:text-blue-400",
  green:   "text-emerald-600 dark:text-emerald-400",
  red:     "text-red-600    dark:text-red-400",
  yellow:  "text-amber-600  dark:text-amber-400",
  purple:  "text-violet-600 dark:text-violet-400",
  orange:  "text-orange-600 dark:text-orange-400",
};

const cardBorder: Record<string, string> = {
  default: "",
  blue:    "border-blue-200/60   dark:border-blue-800/40",
  green:   "border-emerald-200/60 dark:border-emerald-800/40",
  red:     "border-red-200/60    dark:border-red-800/40",
  yellow:  "border-amber-200/60  dark:border-amber-800/40",
  purple:  "border-violet-200/60 dark:border-violet-800/40",
  orange:  "border-orange-200/60 dark:border-orange-800/40",
};

/* ─── Main StatCard ─── */
export interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  trend?: { value: number; label?: string };
  sparkline?: number[];
  loading?: boolean;
  className?: string;
  variant?: "default" | "gradient" | "outlined";
  color?: "default" | "blue" | "green" | "red" | "yellow" | "purple" | "orange";
}

export function StatCard({
  title,
  value,
  description,
  icon: Icon,
  trend,
  sparkline,
  loading = false,
  className,
  variant = "default",
  color = "default",
}: StatCardProps) {
  if (loading) {
    return (
      <Card className={className}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-9 rounded-xl" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-7 w-28 mb-2" />
          <Skeleton className="h-3 w-20" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      className={cn(
        "group hover:-translate-y-0.5 hover:shadow-md transition-all duration-200",
        variant === "outlined" && cardBorder[color],
        className,
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {Icon && (
          <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl transition-transform group-hover:scale-110", iconBg[color])}>
            <Icon className={cn("h-4 w-4", iconColor[color])} />
          </div>
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        {(description || trend) && (
          <div className="flex items-center gap-2 mt-1">
            {trend && <TrendIndicator value={trend.value} />}
            {(description || trend?.label) && (
              <p className="text-xs text-muted-foreground">
                {trend?.label || description}
              </p>
            )}
          </div>
        )}
        {sparkline && sparkline.length > 0 && (
          <div className="mt-3 opacity-70">
            <Sparkline data={sparkline} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/* ─── Compact Stat Card ─── */
export interface CompactStatCardProps {
  title: string;
  value: string | number;
  icon?: LucideIcon;
  trend?: number;
  loading?: boolean;
  className?: string;
}

export function CompactStatCard({ title, value, icon: Icon, trend, loading = false, className }: CompactStatCardProps) {
  if (loading) {
    return (
      <div className={cn("flex items-center gap-3 rounded-xl border bg-card/80 p-3", className)}>
        <Skeleton className="h-10 w-10 rounded-xl" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3 w-16" />
          <Skeleton className="h-5 w-20" />
        </div>
      </div>
    );
  }

  return (
    <div className={cn("flex items-center gap-3 rounded-xl border bg-card/80 p-3 hover:bg-card hover:shadow-sm transition-all", className)}>
      {Icon && (
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 shrink-0">
          <Icon className="h-4.5 w-4.5 text-primary" />
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-muted-foreground truncate">{title}</p>
        <div className="flex items-center gap-2 mt-0.5">
          <p className="text-base font-bold">{value}</p>
          {trend !== undefined && <TrendIndicator value={trend} showValue={false} />}
        </div>
      </div>
    </div>
  );
}

/* ─── Comparison Card ─── */
export interface ComparisonStatCardProps {
  title: string;
  current: { label: string; value: string | number };
  previous: { label: string; value: string | number };
  icon?: LucideIcon;
  loading?: boolean;
  className?: string;
}

export function ComparisonStatCard({ title, current, previous, icon: Icon, loading = false, className }: ComparisonStatCardProps) {
  if (loading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <Skeleton className="h-4 w-28" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-6 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("hover:shadow-md transition-all duration-200", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium mb-0.5">{current.label}</p>
          <p className="text-2xl font-bold">{current.value}</p>
        </div>
        <div className="pt-3 border-t">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wide font-medium mb-0.5">{previous.label}</p>
          <p className="text-lg font-semibold text-muted-foreground">{previous.value}</p>
        </div>
      </CardContent>
    </Card>
  );
}

/* ─── Stats Grid ─── */
export interface StatsGridProps {
  children: React.ReactNode;
  columns?: 1 | 2 | 3 | 4;
  className?: string;
}

export function StatsGrid({ children, columns = 4, className }: StatsGridProps) {
  const gridCols = {
    1: "grid-cols-1",
    2: "grid-cols-1 md:grid-cols-2",
    3: "grid-cols-1 md:grid-cols-2 lg:grid-cols-3",
    4: "grid-cols-1 md:grid-cols-2 lg:grid-cols-4",
  };
  return (
    <div className={cn("grid gap-4", gridCols[columns], className)}>
      {children}
    </div>
  );
}

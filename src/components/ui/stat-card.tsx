import * as React from 'react'
import { TrendingUp, TrendingDown, Minus, LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'

// Sparkline Chart Component
interface SparklineProps {
  data: number[]
  className?: string
  color?: string
}

function Sparkline({ data, className, color = 'hsl(var(--primary))' }: SparklineProps) {
  if (!data || data.length === 0) return null

  const max = Math.max(...data)
  const min = Math.min(...data)
  const range = max - min || 1

  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100
    const y = 100 - ((value - min) / range) * 100
    return `${x},${y}`
  }).join(' ')

  return (
    <svg
      className={cn('h-8 w-full', className)}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      <polyline
        fill="none"
        stroke={color}
        strokeWidth="2"
        points={points}
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  )
}

// Trend Indicator Component
interface TrendIndicatorProps {
  value: number
  className?: string
  showIcon?: boolean
  showValue?: boolean
}

function TrendIndicator({ value, className, showIcon = true, showValue = true }: TrendIndicatorProps) {
  const isPositive = value > 0
  const isNeutral = value === 0
  
  const Icon = isNeutral ? Minus : isPositive ? TrendingUp : TrendingDown
  const color = isNeutral ? 'text-muted-foreground' : isPositive ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'
  
  return (
    <div className={cn('flex items-center gap-1', color, className)}>
      {showIcon && <Icon className="h-4 w-4" />}
      {showValue && (
        <span className="text-sm font-medium">
          {isPositive && '+'}{value.toFixed(1)}%
        </span>
      )}
    </div>
  )
}

// Main Stat Card Types
export interface StatCardProps {
  title: string
  value: string | number
  description?: string
  icon?: LucideIcon
  trend?: {
    value: number
    label?: string
  }
  sparkline?: number[]
  loading?: boolean
  className?: string
  variant?: 'default' | 'gradient' | 'outlined'
  color?: 'default' | 'blue' | 'green' | 'red' | 'yellow' | 'purple'
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
  variant = 'default',
  color = 'default',
}: StatCardProps) {
  const colorClasses = {
    default: '',
    blue: 'border-blue-200 dark:border-blue-900',
    green: 'border-green-200 dark:border-green-900',
    red: 'border-red-200 dark:border-red-900',
    yellow: 'border-yellow-200 dark:border-yellow-900',
    purple: 'border-purple-200 dark:border-purple-900',
  }

  const iconColorClasses = {
    default: 'text-muted-foreground',
    blue: 'text-blue-600 dark:text-blue-500',
    green: 'text-green-600 dark:text-green-500',
    red: 'text-red-600 dark:text-red-500',
    yellow: 'text-yellow-600 dark:text-yellow-500',
    purple: 'text-purple-600 dark:text-purple-500',
  }

  const gradientClasses = {
    default: '',
    blue: 'bg-gradient-to-br from-blue-50 to-background dark:from-blue-950/20',
    green: 'bg-gradient-to-br from-green-50 to-background dark:from-green-950/20',
    red: 'bg-gradient-to-br from-red-50 to-background dark:from-red-950/20',
    yellow: 'bg-gradient-to-br from-yellow-50 to-background dark:from-yellow-950/20',
    purple: 'bg-gradient-to-br from-purple-50 to-background dark:from-purple-950/20',
  }

  if (loading) {
    return (
      <Card className={className}>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">
            <Skeleton className="h-4 w-[100px]" />
          </CardTitle>
          <Skeleton className="h-4 w-4 rounded" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-8 w-[120px] mb-2" />
          <Skeleton className="h-4 w-[80px]" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      className={cn(
        'transition-all hover:shadow-md',
        variant === 'outlined' && colorClasses[color],
        variant === 'gradient' && gradientClasses[color],
        className
      )}
    >
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {Icon && (
          <Icon className={cn('h-4 w-4', iconColorClasses[color])} />
        )}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
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
          <div className="mt-3">
            <Sparkline data={sparkline} />
          </div>
        )}
      </CardContent>
    </Card>
  )
}

// Compact Stat Card Variant
export interface CompactStatCardProps {
  title: string
  value: string | number
  icon?: LucideIcon
  trend?: number
  loading?: boolean
  className?: string
}

export function CompactStatCard({
  title,
  value,
  icon: Icon,
  trend,
  loading = false,
  className,
}: CompactStatCardProps) {
  if (loading) {
    return (
      <div className={cn('flex items-center gap-3 rounded-lg border p-3', className)}>
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="flex-1 space-y-1">
          <Skeleton className="h-4 w-[60px]" />
          <Skeleton className="h-5 w-[80px]" />
        </div>
      </div>
    )
  }

  return (
    <div className={cn('flex items-center gap-3 rounded-lg border p-3 transition-all hover:shadow-md', className)}>
      {Icon && (
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10">
          <Icon className="h-5 w-5 text-primary" />
        </div>
      )}
      <div className="flex-1">
        <p className="text-sm font-medium text-muted-foreground">{title}</p>
        <div className="flex items-center gap-2">
          <p className="text-lg font-bold">{value}</p>
          {trend !== undefined && <TrendIndicator value={trend} showValue={false} />}
        </div>
      </div>
    </div>
  )
}

// Comparison Stat Card (Before/After)
export interface ComparisonStatCardProps {
  title: string
  current: {
    label: string
    value: string | number
  }
  previous: {
    label: string
    value: string | number
  }
  icon?: LucideIcon
  loading?: boolean
  className?: string
}

export function ComparisonStatCard({
  title,
  current,
  previous,
  icon: Icon,
  loading = false,
  className,
}: ComparisonStatCardProps) {
  if (loading) {
    return (
      <Card className={className}>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium">
            <Skeleton className="h-4 w-[120px]" />
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-8 w-full" />
          <Skeleton className="h-6 w-full" />
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={cn('transition-all hover:shadow-md', className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent className="space-y-3">
        <div>
          <p className="text-xs text-muted-foreground mb-1">{current.label}</p>
          <p className="text-2xl font-bold">{current.value}</p>
        </div>
        <div className="pt-3 border-t">
          <p className="text-xs text-muted-foreground mb-1">{previous.label}</p>
          <p className="text-lg font-semibold text-muted-foreground">{previous.value}</p>
        </div>
      </CardContent>
    </Card>
  )
}

// Stats Grid Container
export interface StatsGridProps {
  children: React.ReactNode
  columns?: 1 | 2 | 3 | 4
  className?: string
}

export function StatsGrid({ children, columns = 4, className }: StatsGridProps) {
  const gridClasses = {
    1: 'grid-cols-1',
    2: 'grid-cols-1 md:grid-cols-2',
    3: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3',
    4: 'grid-cols-1 md:grid-cols-2 lg:grid-cols-4',
  }

  return (
    <div className={cn('grid gap-4', gridClasses[columns], className)}>
      {children}
    </div>
  )
}

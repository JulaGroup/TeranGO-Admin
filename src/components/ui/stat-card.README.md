# Stat Card Components - Usage Guide

Modern, reusable stat card components with trends, sparklines, and comparisons.

## Components

### StatCard (Main Component)
Full-featured stat card with icon, trend indicator, and optional sparkline chart.

### CompactStatCard
Smaller variant for dense layouts with icon and trend.

### ComparisonStatCard
Shows current vs previous period comparison.

### StatsGrid
Container component for responsive stat card layouts.

## Basic Usage

```tsx
import { StatCard, StatsGrid } from '@/components/ui/stat-card'
import { DollarSign } from 'lucide-react'

export function Dashboard() {
  return (
    <StatsGrid columns={4}>
      <StatCard
        title="Total Revenue"
        value="$45,231.89"
        description="from last month"
        icon={DollarSign}
      />
    </StatsGrid>
  )
}
```

## Examples

### With Trend Indicator

```tsx
<StatCard
  title="Total Revenue"
  value="$45,231.89"
  icon={DollarSign}
  trend={{
    value: 20.1,
    label: "from last month"
  }}
  color="green"
  variant="outlined"
/>
```

### With Sparkline Chart

```tsx
const weeklyRevenue = [3200, 3400, 3100, 3600, 3800, 4000, 4200]

<StatCard
  title="Weekly Revenue"
  value="$26,300"
  icon={TrendingUp}
  sparkline={weeklyRevenue}
  trend={{ value: 12.5 }}
/>
```

### Gradient Variant

```tsx
<StatCard
  title="Active Users"
  value="2,350"
  icon={Users}
  variant="gradient"
  color="blue"
  trend={{ value: 15.2, label: "from yesterday" }}
/>
```

### Loading State

```tsx
<StatCard
  title="Orders"
  value="156"
  loading={true}
/>
```

### Complete Dashboard Example

```tsx
import { 
  StatCard, 
  CompactStatCard, 
  ComparisonStatCard, 
  StatsGrid 
} from '@/components/ui/stat-card'
import { 
  DollarSign, 
  Users, 
  ShoppingCart, 
  TrendingUp 
} from 'lucide-react'

export function DashboardStats() {
  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: fetchDashboardStats,
  })

  return (
    <div className="space-y-4">
      {/* Main Stats */}
      <StatsGrid columns={4}>
        <StatCard
          title="Total Revenue"
          value={`$${data?.revenue.toLocaleString()}`}
          icon={DollarSign}
          trend={{
            value: data?.revenueTrend,
            label: "from last month"
          }}
          sparkline={data?.revenueHistory}
          loading={isLoading}
          variant="gradient"
          color="green"
        />
        
        <StatCard
          title="Active Users"
          value={data?.users.toLocaleString()}
          icon={Users}
          trend={{
            value: data?.usersTrend,
            label: "from last week"
          }}
          loading={isLoading}
          variant="outlined"
          color="blue"
        />
        
        <StatCard
          title="Orders"
          value={data?.orders.toLocaleString()}
          icon={ShoppingCart}
          trend={{
            value: data?.ordersTrend,
            label: "from yesterday"
          }}
          sparkline={data?.ordersHistory}
          loading={isLoading}
        />
        
        <StatCard
          title="Conversion Rate"
          value={`${data?.conversionRate}%`}
          icon={TrendingUp}
          trend={{
            value: data?.conversionTrend,
            label: "from last month"
          }}
          loading={isLoading}
          color="purple"
        />
      </StatsGrid>

      {/* Compact Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <CompactStatCard
          title="Vendors"
          value={data?.vendors.toLocaleString()}
          icon={Store}
          trend={data?.vendorsTrend}
          loading={isLoading}
        />
        
        <CompactStatCard
          title="Drivers"
          value={data?.drivers.toLocaleString()}
          icon={Truck}
          trend={data?.driversTrend}
          loading={isLoading}
        />
        
        <CompactStatCard
          title="Products"
          value={data?.products.toLocaleString()}
          icon={Package}
          loading={isLoading}
        />
        
        <CompactStatCard
          title="Categories"
          value={data?.categories}
          icon={Layers}
          loading={isLoading}
        />
      </div>

      {/* Comparison Stats */}
      <StatsGrid columns={3}>
        <ComparisonStatCard
          title="Monthly Revenue"
          current={{
            label: "This Month",
            value: "$45,231"
          }}
          previous={{
            label: "Last Month",
            value: "$37,650"
          }}
          icon={DollarSign}
          loading={isLoading}
        />
        
        <ComparisonStatCard
          title="New Customers"
          current={{
            label: "This Week",
            value: "234"
          }}
          previous={{
            label: "Last Week",
            value: "189"
          }}
          icon={Users}
          loading={isLoading}
        />
        
        <ComparisonStatCard
          title="Average Order Value"
          current={{
            label: "This Month",
            value: "$58.32"
          }}
          previous={{
            label: "Last Month",
            value: "$52.18"
          }}
          icon={TrendingUp}
          loading={isLoading}
        />
      </StatsGrid>
    </div>
  )
}
```

## Props Reference

### StatCard

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | **required** | Card title |
| `value` | `string \| number` | **required** | Main value to display |
| `description` | `string` | - | Description text |
| `icon` | `LucideIcon` | - | Icon component |
| `trend` | `{ value: number, label?: string }` | - | Trend indicator |
| `sparkline` | `number[]` | - | Data for sparkline chart |
| `loading` | `boolean` | `false` | Show loading skeleton |
| `className` | `string` | - | Additional CSS classes |
| `variant` | `'default' \| 'gradient' \| 'outlined'` | `'default'` | Visual style |
| `color` | `'default' \| 'blue' \| 'green' \| 'red' \| 'yellow' \| 'purple'` | `'default'` | Color theme |

### CompactStatCard

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | **required** | Card title |
| `value` | `string \| number` | **required** | Value to display |
| `icon` | `LucideIcon` | - | Icon component |
| `trend` | `number` | - | Trend percentage |
| `loading` | `boolean` | `false` | Show loading skeleton |
| `className` | `string` | - | Additional CSS classes |

### ComparisonStatCard

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `title` | `string` | **required** | Card title |
| `current` | `{ label: string, value: string \| number }` | **required** | Current period data |
| `previous` | `{ label: string, value: string \| number }` | **required** | Previous period data |
| `icon` | `LucideIcon` | - | Icon component |
| `loading` | `boolean` | `false` | Show loading skeleton |
| `className` | `string` | - | Additional CSS classes |

### StatsGrid

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `children` | `ReactNode` | **required** | Stat cards to display |
| `columns` | `1 \| 2 \| 3 \| 4` | `4` | Number of columns |
| `className` | `string` | - | Additional CSS classes |

## Color Variants

```tsx
// Green (success)
<StatCard color="green" variant="gradient" />

// Blue (info)
<StatCard color="blue" variant="outlined" />

// Red (error/alert)
<StatCard color="red" variant="outlined" />

// Yellow (warning)
<StatCard color="yellow" variant="gradient" />

// Purple (premium)
<StatCard color="purple" variant="outlined" />
```

## Visual Variants

```tsx
// Default (standard card)
<StatCard variant="default" />

// Gradient (colored background gradient)
<StatCard variant="gradient" color="blue" />

// Outlined (colored border)
<StatCard variant="outlined" color="green" />
```

## Responsive Layouts

```tsx
// 4 columns on desktop, 2 on tablet, 1 on mobile
<StatsGrid columns={4}>
  {...stats}
</StatsGrid>

// 3 columns on desktop, 2 on tablet, 1 on mobile
<StatsGrid columns={3}>
  {...stats}
</StatsGrid>

// 2 columns on tablet+, 1 on mobile
<StatsGrid columns={2}>
  {...stats}
</StatsGrid>

// Always single column
<StatsGrid columns={1}>
  {...stats}
</StatsGrid>
```

## Best Practices

1. **Use appropriate colors**
   - Green: Revenue, growth, positive metrics
   - Blue: Users, information metrics
   - Red: Alerts, negative trends
   - Yellow: Warnings, pending items
   - Purple: Premium features

2. **Include trend indicators**
   - Always show trends for time-based metrics
   - Use clear labels ("from last month", "vs yesterday")

3. **Sparklines for context**
   - Add sparklines for revenue, orders, user metrics
   - Keep data points between 7-30 for readability

4. **Loading states**
   - Always pass `loading={isLoading}` from queries
   - Maintains layout during data fetch

5. **Consistent formatting**
   - Format numbers: `value.toLocaleString()`
   - Format currency: `$${value.toFixed(2)}`
   - Format percentages: `${value.toFixed(1)}%`

## Integration with React Query

```tsx
import { useQuery } from '@tanstack/react-query'

function DashboardPage() {
  const { data: stats, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => fetch('/api/dashboard/stats').then(res => res.json()),
    refetchInterval: 30000, // Refresh every 30s
  })

  return (
    <StatsGrid columns={4}>
      <StatCard
        title="Revenue"
        value={`$${stats?.revenue ?? 0}`}
        loading={isLoading}
        trend={stats?.trend}
        sparkline={stats?.history}
      />
    </StatsGrid>
  )
}
```

## Migration Guide

### Before

```tsx
<Card>
  <CardHeader>
    <CardTitle>Total Revenue</CardTitle>
  </CardHeader>
  <CardContent>
    <div className="text-2xl font-bold">$45,231.89</div>
    <p className="text-xs text-muted-foreground">
      +20.1% from last month
    </p>
  </CardContent>
</Card>
```

### After

```tsx
<StatCard
  title="Total Revenue"
  value="$45,231.89"
  icon={DollarSign}
  trend={{ value: 20.1, label: "from last month" }}
  color="green"
  variant="gradient"
/>
```

**Benefits:**
- ✅ Consistent design across dashboard
- ✅ Built-in loading states
- ✅ Automatic trend indicators
- ✅ Sparkline support
- ✅ Less code to write
- ✅ Better accessibility
- ✅ Responsive by default

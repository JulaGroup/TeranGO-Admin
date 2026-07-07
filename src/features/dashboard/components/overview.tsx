import { useQuery } from '@tanstack/react-query'
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { api } from '@/lib/api'
import { Skeleton } from '@/components/ui/skeleton'

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']

// Minimal custom tooltip
function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null
  return (
    <div className='rounded-lg border bg-popover px-3 py-2 shadow-lg text-sm'>
      <p className='font-semibold'>{label}</p>
      <p className='text-muted-foreground mt-0.5'>
        D {payload[0].value?.toLocaleString()}
      </p>
    </div>
  )
}

export function Overview() {
  const { data, isLoading } = useQuery({
    queryKey: ['analytics-revenue'],
    queryFn: async () => {
      try {
        const res = await api.get('/api/admin/analytics/revenue')
        return res.data
      } catch {
        return null
      }
    },
  })

  // Normalise API shape or fall back to static placeholder
  const chartData: { name: string; total: number }[] = (() => {
    if (data?.monthly && Array.isArray(data.monthly)) {
      return data.monthly.map((item: { month: number | string; revenue: number; total?: number }) => ({
        name:  MONTHS[(Number(item.month) - 1) % 12] ?? String(item.month),
        total: item.revenue ?? item.total ?? 0,
      }))
    }
    if (data?.revenueByMonth && Array.isArray(data.revenueByMonth)) {
      return data.revenueByMonth.map((item: { month: number | string; revenue: number }) => ({
        name:  MONTHS[(Number(item.month) - 1) % 12] ?? String(item.month),
        total: item.revenue ?? 0,
      }))
    }
    // Placeholder — 12 months of zeros so skeleton still shows axes
    return MONTHS.map((name) => ({ name, total: 0 }))
  })()

  if (isLoading) {
    return (
      <div className='flex items-end gap-1.5 h-[320px] px-2'>
        {Array.from({ length: 12 }).map((_, i) => (
          <Skeleton
            key={i}
            className='flex-1 rounded-sm'
            style={{ height: `${Math.random() * 60 + 20}%` }}
          />
        ))}
      </div>
    )
  }

  return (
    <ResponsiveContainer width='100%' height={320}>
      <BarChart data={chartData} barCategoryGap='30%'>
        <CartesianGrid
          strokeDasharray='3 3'
          vertical={false}
          stroke='var(--color-border)'
          opacity={0.5}
        />
        <XAxis
          dataKey='name'
          stroke='var(--color-muted-foreground)'
          fontSize={11}
          tickLine={false}
          axisLine={false}
          dy={4}
        />
        <YAxis
          direction='ltr'
          stroke='var(--color-muted-foreground)'
          fontSize={11}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => v === 0 ? '0' : `D${(v / 1000).toFixed(0)}k`}
          width={44}
        />
        <Tooltip
          content={<CustomTooltip />}
          cursor={{ fill: 'var(--color-muted)', opacity: 0.4, radius: 4 }}
        />
        <Bar
          dataKey='total'
          radius={[4, 4, 0, 0]}
          fill='var(--color-primary)'
          opacity={0.85}
          maxBarSize={40}
        />
      </BarChart>
    </ResponsiveContainer>
  )
}

import { useQuery } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import {
  ShoppingBag,
  DollarSign,
  Package,
  TrendingUp,
  Clock,
  CheckCircle,
} from 'lucide-react'
import { api } from '@/lib/api'
import { useVendorProfile } from '@/hooks/use-vendor-profile'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'

export const Route = createFileRoute('/_vendor/vendor/dashboard')({
  component: VendorDashboard,
})

interface VendorStats {
  totalOrders: number
  completedOrders: number
  pendingOrders: number
  totalRevenue: number
  todayRevenue: number
  todayOrders: number
  totalMenuItems: number
  averageOrderValue: number
}

function VendorDashboard() {
  const { vendor } = useVendorProfile()

  const {
    data: stats,
    isLoading,
    error,
  } = useQuery<VendorStats>({
    queryKey: ['vendor-stats'],
    queryFn: async () => {
      const response = await api.get('/api/vendor-stats/dashboard')
      if (response.data?.success) {
        return response.data.data as VendorStats
      }
      return response.data as VendorStats
    },
  })

  const statCards = [
    {
      title: 'Total Orders',
      value: stats?.totalOrders || 0,
      icon: ShoppingBag,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900/20',
    },
    {
      title: 'Pending Orders',
      value: stats?.pendingOrders || 0,
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100 dark:bg-orange-900/20',
    },
    {
      title: 'Completed Orders',
      value: stats?.completedOrders || 0,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900/20',
    },
    {
      title: 'Total Revenue',
      value: `D${stats?.totalRevenue?.toFixed(2) || '0.00'}`,
      icon: DollarSign,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100 dark:bg-purple-900/20',
    },
    {
      title: 'Today Revenue',
      value: `D${stats?.todayRevenue?.toFixed(2) || '0.00'}`,
      icon: TrendingUp,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100 dark:bg-emerald-900/20',
    },
    {
      title: 'Menu Items',
      value: stats?.totalMenuItems || 0,
      icon: Package,
      color: 'text-pink-600',
      bgColor: 'bg-pink-100 dark:bg-pink-900/20',
    },
  ]

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div>
        <h1 className='text-3xl font-bold tracking-tight'>Dashboard</h1>
        <p className='text-muted-foreground'>
          {vendor?.user?.fullName
            ? `Welcome back, ${vendor.user.fullName}`
            : 'Monitor your business performance'}
        </p>
      </div>

      {/* Business summary */}
      {vendor && (
        <Card>
          <CardContent className='text-muted-foreground flex flex-wrap gap-6 p-6 text-sm'>
            <div>
              <p className='text-xs tracking-wide uppercase'>Businesses</p>
              <p className='text-foreground text-base font-semibold'>
                {(vendor._count?.restaurants || 0) +
                  (vendor._count?.shops || 0) +
                  (vendor._count?.pharmacies || 0)}
              </p>
            </div>
            {vendor.restaurants.length > 0 && (
              <div>
                <p className='text-xs tracking-wide uppercase'>Restaurants</p>
                <p className='text-foreground text-base font-semibold'>
                  {vendor.restaurants.length}
                </p>
              </div>
            )}
            {vendor.shops.length > 0 && (
              <div>
                <p className='text-xs tracking-wide uppercase'>Shops</p>
                <p className='text-foreground text-base font-semibold'>
                  {vendor.shops.length}
                </p>
              </div>
            )}
            {vendor.pharmacies.length > 0 && (
              <div>
                <p className='text-xs tracking-wide uppercase'>Pharmacies</p>
                <p className='text-foreground text-base font-semibold'>
                  {vendor.pharmacies.length}
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Stats Grid */}
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
        {statCards.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
              <CardTitle className='text-sm font-medium'>
                {stat.title}
              </CardTitle>
              <div className={`rounded-lg p-2 ${stat.bgColor}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className='h-8 w-24' />
              ) : (
                <div className='text-2xl font-bold'>{stat.value}</div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Additional Info */}
      {error && (
        <Card>
          <CardContent className='p-6'>
            <p className='text-sm text-red-600'>
              Unable to load stats. Please refresh the page.
            </p>
          </CardContent>
        </Card>
      )}

      {stats && stats.totalOrders > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Quick Stats</CardTitle>
          </CardHeader>
          <CardContent className='space-y-2'>
            <div className='flex items-center justify-between'>
              <span className='text-muted-foreground text-sm'>
                Average Order Value
              </span>
              <span className='font-medium'>
                D{stats.averageOrderValue?.toFixed(2)}
              </span>
            </div>
            <div className='flex items-center justify-between'>
              <span className='text-muted-foreground text-sm'>
                Today's Orders
              </span>
              <span className='font-medium'>{stats.todayOrders}</span>
            </div>
            <div className='flex items-center justify-between'>
              <span className='text-muted-foreground text-sm'>
                Completion Rate
              </span>
              <span className='font-medium'>
                {((stats.completedOrders / stats.totalOrders) * 100).toFixed(1)}
                %
              </span>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

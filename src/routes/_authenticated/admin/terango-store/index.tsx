import { useQuery } from '@tanstack/react-query'
import { createFileRoute, Link } from '@tanstack/react-router'
import {
  ShoppingBag,
  DollarSign,
  Package,
  TrendingUp,
  Clock,
  CheckCircle,
  AlertTriangle,
  Star,
  ArrowRight,
  RefreshCw,
  Crown,
  XCircle,
} from 'lucide-react'
import { format } from 'date-fns'
import { api } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { TopNav } from '@/components/layout/top-nav'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'

export const Route = createFileRoute('/_authenticated/admin/terango-store/')({
  component: TerangoStoreDashboard,
})

const topNav = [
  { title: 'Store Dashboard', href: '/admin/terango-store', isActive: true },
  { title: 'Orders', href: '/admin/terango-store/orders', isActive: false },
  { title: 'Settings', href: '/admin/terango-store/settings', isActive: false },
  { title: 'Products', href: '/admin/terango-products', isActive: false },
]

interface DashboardStats {
  totalOrders: number
  pendingOrders: number
  completedOrders: number
  cancelledOrders: number
  totalRevenue: number
  todayOrders: number
  todayRevenue: number
  totalProducts: number
  lowStockProducts: number
  featuredProducts: number
  averageOrderValue: number
  recentOrders: {
    id: string
    orderNumber: string
    status: string
    totalAmount: number
    itemCount: number
    customerName: string
    customerPhone: string
    createdAt: string
  }[]
}

function TerangoStoreDashboard() {
  const {
    data: stats,
    isLoading,
    error,
    refetch,
  } = useQuery<DashboardStats>({
    queryKey: ['terango-store-dashboard'],
    queryFn: async () => {
      const response = await api.get('/api/admin/terango-store/dashboard')
      return response.data
    },
  })

  const statCards = [
    {
      title: 'Total Orders',
      value: stats?.totalOrders || 0,
      icon: ShoppingBag,
      color: 'text-blue-600',
      bgColor: 'bg-blue-100 dark:bg-blue-900/20',
      description: 'All time orders',
    },
    {
      title: 'Pending Orders',
      value: stats?.pendingOrders || 0,
      icon: Clock,
      color: 'text-orange-600',
      bgColor: 'bg-orange-100 dark:bg-orange-900/20',
      description: 'Needs attention',
      urgent: (stats?.pendingOrders || 0) > 0,
    },
    {
      title: 'Completed Orders',
      value: stats?.completedOrders || 0,
      icon: CheckCircle,
      color: 'text-green-600',
      bgColor: 'bg-green-100 dark:bg-green-900/20',
      description: 'Successfully delivered',
    },
    {
      title: 'Total Revenue',
      value: `D${(stats?.totalRevenue || 0).toLocaleString()}`,
      icon: DollarSign,
      color: 'text-purple-600',
      bgColor: 'bg-purple-100 dark:bg-purple-900/20',
      description: 'All time earnings',
    },
    {
      title: "Today's Orders",
      value: stats?.todayOrders || 0,
      icon: TrendingUp,
      color: 'text-emerald-600',
      bgColor: 'bg-emerald-100 dark:bg-emerald-900/20',
      description: `D${(stats?.todayRevenue || 0).toLocaleString()} revenue`,
    },
    {
      title: 'Total Products',
      value: stats?.totalProducts || 0,
      icon: Package,
      color: 'text-indigo-600',
      bgColor: 'bg-indigo-100 dark:bg-indigo-900/20',
      description: `${stats?.featuredProducts || 0} featured`,
    },
    {
      title: 'Low Stock',
      value: stats?.lowStockProducts || 0,
      icon: AlertTriangle,
      color: 'text-red-600',
      bgColor: 'bg-red-100 dark:bg-red-900/20',
      description: 'Products need restocking',
      urgent: (stats?.lowStockProducts || 0) > 0,
    },
    {
      title: 'Avg Order Value',
      value: `D${(stats?.averageOrderValue || 0).toFixed(2)}`,
      icon: Star,
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100 dark:bg-yellow-900/20',
      description: 'Per order average',
    },
  ]

  const getStatusBadge = (status: string) => {
    const variants: Record<
      string,
      {
        variant: 'default' | 'secondary' | 'destructive' | 'outline'
        color: string
      }
    > = {
      PENDING: { variant: 'secondary', color: 'bg-yellow-100 text-yellow-700' },
      ACCEPTED: { variant: 'default', color: 'bg-blue-100 text-blue-700' },
      PREPARING: { variant: 'default', color: 'bg-purple-100 text-purple-700' },
      READY: { variant: 'default', color: 'bg-green-100 text-green-700' },
      DISPATCHED: { variant: 'default', color: 'bg-indigo-100 text-indigo-700' },
      DELIVERED: { variant: 'default', color: 'bg-green-100 text-green-700' },
      CANCELLED: { variant: 'destructive', color: 'bg-red-100 text-red-700' },
    }
    const config = variants[status] || { variant: 'outline', color: '' }
    return (
      <Badge variant={config.variant} className={config.color}>
        {status}
      </Badge>
    )
  }

  if (error) {
    return (
      <>
        <Header>
          <TopNav links={topNav} />
          <div className='ms-auto flex items-center space-x-4'>
            <ThemeSwitch />
            <ProfileDropdown />
          </div>
        </Header>
        <Main>
          <Card className='mx-auto max-w-md'>
            <CardContent className='pt-6'>
              <div className='flex flex-col items-center text-center'>
                <XCircle className='mb-4 h-12 w-12 text-red-500' />
                <h2 className='text-lg font-semibold'>
                  Store not set up
                </h2>
                <p className='text-muted-foreground mt-2 text-sm'>
                  Run the TeranGO Store setup first to initialize the official
                  store.
                </p>
                <Button
                  className='mt-4'
                  onClick={() =>
                    api
                      .post('/api/admin/terango-products/setup')
                      .then(() => refetch())
                  }
                >
                  Setup Store
                </Button>
              </div>
            </CardContent>
          </Card>
        </Main>
      </>
    )
  }

  return (
    <>
      <Header>
        <TopNav links={topNav} />
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className='space-y-6'>
          {/* Header */}
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <div className='rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 p-3'>
                <Crown className='h-6 w-6 text-white' />
              </div>
              <div>
                <h1 className='text-3xl font-bold tracking-tight'>
                  TeranGO Official Store
                </h1>
                <p className='text-muted-foreground'>
                  Manage your official store products and orders
                </p>
              </div>
            </div>
            <Button variant='outline' onClick={() => refetch()}>
              <RefreshCw className='mr-2 h-4 w-4' />
              Refresh
            </Button>
          </div>

          {/* Stats Grid */}
          <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
            {statCards.map((stat) => (
              <Card
                key={stat.title}
                className={
                  stat.urgent
                    ? 'border-orange-200 bg-orange-50/50 dark:border-orange-800 dark:bg-orange-900/10'
                    : ''
                }
              >
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
                    <>
                      <div className='text-2xl font-bold'>{stat.value}</div>
                      <p className='text-muted-foreground text-xs'>
                        {stat.description}
                      </p>
                    </>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Quick Actions & Recent Orders */}
          <div className='grid gap-6 md:grid-cols-2'>
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Actions</CardTitle>
                <CardDescription>
                  Common tasks for your store
                </CardDescription>
              </CardHeader>
              <CardContent className='grid gap-3'>
                <Link to='/admin/terango-store/orders'>
                  <Button
                    variant='outline'
                    className='w-full justify-between'
                  >
                    <span className='flex items-center gap-2'>
                      <ShoppingBag className='h-4 w-4' />
                      Manage Orders
                    </span>
                    <ArrowRight className='h-4 w-4' />
                  </Button>
                </Link>
                <Link to='/admin/terango-products'>
                  <Button
                    variant='outline'
                    className='w-full justify-between'
                  >
                    <span className='flex items-center gap-2'>
                      <Package className='h-4 w-4' />
                      Manage Products
                    </span>
                    <ArrowRight className='h-4 w-4' />
                  </Button>
                </Link>
                <Link to='/admin/terango-store/settings'>
                  <Button
                    variant='outline'
                    className='w-full justify-between'
                  >
                    <span className='flex items-center gap-2'>
                      <Star className='h-4 w-4' />
                      Store Settings
                    </span>
                    <ArrowRight className='h-4 w-4' />
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Recent Orders */}
            <Card>
              <CardHeader className='flex flex-row items-center justify-between'>
                <div>
                  <CardTitle>Recent Orders</CardTitle>
                  <CardDescription>Latest customer orders</CardDescription>
                </div>
                <Link to='/admin/terango-store/orders'>
                  <Button variant='ghost' size='sm'>
                    View All
                    <ArrowRight className='ml-2 h-4 w-4' />
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className='space-y-3'>
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className='h-16 w-full' />
                    ))}
                  </div>
                ) : stats?.recentOrders && stats.recentOrders.length > 0 ? (
                  <div className='space-y-3'>
                    {stats.recentOrders.slice(0, 5).map((order) => (
                      <div
                        key={order.id}
                        className='flex items-center justify-between rounded-lg border p-3'
                      >
                        <div>
                          <p className='font-medium'>
                            #{order.orderNumber}
                          </p>
                          <p className='text-muted-foreground text-xs'>
                            {order.customerName} • {order.itemCount} items
                          </p>
                          <p className='text-muted-foreground text-xs'>
                            {format(new Date(order.createdAt), 'MMM dd, h:mm a')}
                          </p>
                        </div>
                        <div className='text-right'>
                          <p className='font-medium'>
                            D{order.totalAmount.toLocaleString()}
                          </p>
                          {getStatusBadge(order.status)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className='text-muted-foreground py-8 text-center'>
                    No orders yet
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </Main>
    </>
  )
}

import { useQuery } from '@tanstack/react-query'
import { Link } from '@tanstack/react-router'
import {
  Users,
  ShoppingCart,
  Store,
  Banknote,
  Crown,
  Package,
  Settings,
  ArrowRight,
  Truck,
  TrendingUp,
} from 'lucide-react'
import { adminApi, api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { TopNav } from '@/components/layout/top-nav'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { StatCard, CompactStatCard, StatsGrid } from '@/components/ui/stat-card'
import { Analytics } from './components/analytics'
import { Overview } from './components/overview'
import { RecentSales } from './components/recent-sales'

export function Dashboard() {
  // Fetch dashboard stats
  const { data: statsResponse, isLoading } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await adminApi.getDashboardStats()
      return response.data
    },
  })

  // Fetch TeranGO products stats
  const { data: terangoStats } = useQuery({
    queryKey: ['terango-products-stats'],
    queryFn: async () => {
      const response = await api.get('/api/admin/terango-products/stats')
      return response.data
    },
  })

  // Fetch Express delivery stats
  const { data: expressStats } = useQuery({
    queryKey: ['express-metrics'],
    queryFn: async () => {
      const response = await adminApi.getExpressMetrics()
      return response.data
    },
  })

  // Map API response to dashboard format.
  // Growth percentages are intentionally omitted — the API does not provide
  // period-over-period deltas, so we don't render misleading "+0.0%" trends.
  const stats = {
    totalRevenue: statsResponse?.overview?.totalRevenue || 0,
    totalOrders: statsResponse?.overview?.totalOrders || 0,
    activeVendors: statsResponse?.overview?.totalVendors || 0,
    activeDrivers: statsResponse?.overview?.totalCustomers || 0,
  }

  // Use recentOrders from the API response
  const recentOrders = statsResponse?.recentOrders || []
  const totalSalesCount = statsResponse?.overview?.totalOrders || 0

  // Export the headline metrics as a CSV snapshot
  const handleDownloadReport = () => {
    const rows: [string, string | number][] = [
      ['Metric', 'Value'],
      ['Total Revenue (GMD)', stats.totalRevenue],
      ['Total Orders', stats.totalOrders],
      ['Active Vendors', stats.activeVendors],
      ['Active Drivers', stats.activeDrivers],
      ['Express Deliveries', expressStats?.totalDeliveries ?? 0],
      ['TeranGO Products', terangoStats?.totalProducts ?? 0],
      ['Low Stock Items', terangoStats?.lowStockCount ?? 0],
    ]
    const csv = rows
      .map(([k, v]) => `"${String(k).replace(/"/g, '""')}","${v}"`)
      .join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `terango-dashboard-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  return (
    <>
      {/* ===== Top Heading ===== */}
      <Header>
        <TopNav links={topNav} />
        <div className='ms-auto flex items-center space-x-4'>
          <Search />
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      {/* ===== Main ===== */}
      <Main>
        <div className='mb-2 flex items-center justify-between space-y-2'>
          <h1 className='text-2xl font-bold tracking-tight'>Dashboard</h1>
          <div className='flex items-center space-x-2'>
            <Button onClick={handleDownloadReport}>Download Report</Button>
          </div>
        </div>
        <Tabs
          orientation='vertical'
          defaultValue='overview'
          className='space-y-4'
        >
          <div className='w-full overflow-x-auto pb-2'>
            <TabsList>
              <TabsTrigger value='overview'>Overview</TabsTrigger>
              <TabsTrigger value='analytics'>Analytics</TabsTrigger>
            </TabsList>
          </div>
          <TabsContent value='overview' className='space-y-4'>
            {/* Main Stats with Modern Stat Cards */}
            <StatsGrid columns={4}>
              <StatCard
                title="Total Revenue"
                value={`D${stats.totalRevenue?.toLocaleString() || '0'}`}
                icon={Banknote}
                loading={isLoading}
                variant="gradient"
                color="green"
              />
              <StatCard
                title="Total Orders"
                value={stats.totalOrders?.toLocaleString() || '0'}
                icon={ShoppingCart}
                loading={isLoading}
                variant="outlined"
                color="blue"
              />
              <StatCard
                title="Active Vendors"
                value={stats.activeVendors?.toLocaleString() || '0'}
                icon={Store}
                loading={isLoading}
                color="purple"
              />
              <StatCard
                title="Active Drivers"
                value={stats.activeDrivers?.toLocaleString() || '0'}
                icon={Truck}
                loading={isLoading}
                variant="outlined"
                color="blue"
              />
            </StatsGrid>

            {/* Compact Stats Row for Express & TeranGO */}
            <div className="grid gap-4 grid-cols-2 md:grid-cols-4">
              <CompactStatCard
                title="Express Deliveries"
                value={expressStats?.totalDeliveries?.toLocaleString() || '0'}
                icon={TrendingUp}
                trend={expressStats?.growthRate}
                loading={!expressStats}
              />
              <CompactStatCard
                title="TeranGO Products"
                value={terangoStats?.totalProducts?.toLocaleString() || '0'}
                icon={Package}
                loading={!terangoStats}
              />
              <CompactStatCard
                title="Low Stock Items"
                value={terangoStats?.lowStockCount?.toLocaleString() || '0'}
                icon={Package}
                loading={!terangoStats}
              />
              <CompactStatCard
                title="Featured Products"
                value={terangoStats?.featuredCount?.toLocaleString() || '0'}
                icon={Crown}
                loading={!terangoStats}
              />
            </div>

            {/* TeranGO Official Store Section */}
            <Card className='border-orange-200 bg-gradient-to-r from-orange-50 to-amber-50 dark:from-orange-950/20 dark:to-amber-950/20'>
              <CardHeader>
                <div className='flex items-center justify-between'>
                  <div className='flex items-center gap-3'>
                    <div className='flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500'>
                      <Crown className='h-5 w-5 text-white' />
                    </div>
                    <div>
                      <CardTitle className='flex items-center gap-1'>
                        <span>Teran</span>
                        <span className='text-orange-500'>GO</span>
                        <span> Official Store</span>
                      </CardTitle>
                      <CardDescription>
                        Manage products sold directly by TeranGO
                      </CardDescription>
                    </div>
                  </div>
                  <Link to='/admin/terango-products'>
                    <Button variant='outline' size='sm' className='gap-2'>
                      <Settings className='h-4 w-4' />
                      Manage Store
                      <ArrowRight className='h-4 w-4' />
                    </Button>
                  </Link>
                </div>
              </CardHeader>
              <CardContent>
                <div className='grid gap-4 sm:grid-cols-4'>
                  <div className='rounded-lg bg-white p-4 dark:bg-gray-800'>
                    <div className='flex items-center gap-2'>
                      <Package className='h-5 w-5 text-orange-500' />
                      <span className='text-muted-foreground text-sm'>
                        Total Products
                      </span>
                    </div>
                    <p className='mt-2 text-2xl font-bold'>
                      {terangoStats?.totalProducts || 0}
                    </p>
                  </div>
                  <div className='rounded-lg bg-white p-4 dark:bg-gray-800'>
                    <div className='flex items-center gap-2'>
                      <ShoppingCart className='h-5 w-5 text-green-500' />
                      <span className='text-muted-foreground text-sm'>
                        Available
                      </span>
                    </div>
                    <p className='mt-2 text-2xl font-bold text-green-600'>
                      {terangoStats?.availableProducts || 0}
                    </p>
                  </div>
                  <div className='rounded-lg bg-white p-4 dark:bg-gray-800'>
                    <div className='flex items-center gap-2'>
                      <Crown className='h-5 w-5 text-yellow-500' />
                      <span className='text-muted-foreground text-sm'>
                        Featured
                      </span>
                    </div>
                    <p className='mt-2 text-2xl font-bold text-yellow-600'>
                      {terangoStats?.featuredProducts || 0}
                    </p>
                  </div>
                  <div className='rounded-lg bg-white p-4 dark:bg-gray-800'>
                    <div className='flex items-center gap-2'>
                      <Store className='h-5 w-5 text-blue-500' />
                      <span className='text-muted-foreground text-sm'>
                        Total Stock
                      </span>
                    </div>
                    <p className='mt-2 text-2xl font-bold text-blue-600'>
                      {terangoStats?.totalStock || 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <div className='grid grid-cols-1 gap-4 lg:grid-cols-7'>
              <Card className='col-span-1 lg:col-span-4'>
                <CardHeader>
                  <CardTitle>Overview</CardTitle>
                </CardHeader>
                <CardContent className='ps-2'>
                  <Overview />
                </CardContent>
              </Card>
              <Card className='col-span-1 lg:col-span-3'>
                <CardHeader>
                  <CardTitle>Recent Orders</CardTitle>
                  <CardDescription>
                    You made {totalSalesCount} sales this month.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <RecentSales orders={recentOrders} />
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          <TabsContent value='analytics' className='space-y-4'>
            <Analytics />
          </TabsContent>
        </Tabs>
      </Main>
    </>
  )
}

const topNav = [
  {
    title: 'Overview',
    href: 'dashboard/overview',
    isActive: true,
    disabled: false,
  },
]

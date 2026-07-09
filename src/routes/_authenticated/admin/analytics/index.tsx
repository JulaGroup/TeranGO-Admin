import { createFileRoute } from '@tanstack/react-router';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import axios from 'axios';
import {
  TrendingUp,
  DollarSign,
  Users,
  ShoppingBag,
  Package,
  Star,
  Activity,
  Calendar,
} from 'lucide-react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

interface AnalyticsData {
  overview: {
    totalRevenue: number;
    totalOrders: number;
    totalVendors: number;
    totalCustomers: number;
    revenueGrowth: number;
    ordersGrowth: number;
  };
  subscriptions: {
    totalActive: number;
    totalTrial: number;
    totalRevenue: number;
    byPackage: Array<{ name: string; count: number; revenue: number }>;
    monthlyRevenue: Array<{ month: string; revenue: number }>;
  };
  orders: {
    byStatus: Array<{ status: string; count: number }>;
    revenueByDay: Array<{ date: string; revenue: number; orders: number }>;
    topVendors: Array<{ vendorName: string; revenue: number; orders: number }>;
  };
  featured: {
    totalActive: number;
    analytics: Array<{
      vendorName: string;
      views: number;
      clicks: number;
      ctr: number;
    }>;
  };
}

export const Route = createFileRoute('/_authenticated/admin/analytics/')({
  component: AnalyticsPage,
});

const COLORS = ['#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#3B82F6'];

function AnalyticsPage() {
  const { data: analytics, isLoading } = useQuery({
    queryKey: ['admin-analytics'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      const response = await axios.get<AnalyticsData>(`${API_URL}/api/analytics/dashboard`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data;
    },
    refetchInterval: 60000, // Refresh every minute
  });

  if (isLoading || !analytics) {
    return (
      <div className='flex items-center justify-center h-screen'>
        <div className='text-center'>
          <div className='animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto' />
          <p className='mt-4 text-muted-foreground'>Loading analytics...</p>
        </div>
      </div>
    );
  }

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-2xl font-bold tracking-tight'>Analytics Dashboard</h1>
          <p className='text-muted-foreground text-sm mt-1'>
            Real-time insights into your platform's performance
          </p>
        </div>
        <div className='flex items-center gap-2 text-sm text-muted-foreground bg-muted/50 px-3 py-1.5 rounded-md border'>
          <Calendar className='h-4 w-4' />
          <span>Updated: {new Date().toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Overview Stats */}
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
        <Card className='border-l-4 border-l-primary shadow-sm'>
          <CardHeader className='flex flex-row items-center justify-between pb-2'>
            <CardTitle className='text-sm font-medium text-muted-foreground'>Total Revenue</CardTitle>
            <DollarSign className='h-4 w-4 text-primary' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              GMD {analytics.overview.totalRevenue.toLocaleString()}
            </div>
            <p className='text-xs text-muted-foreground flex items-center mt-1'>
              <TrendingUp className='h-3 w-3 text-green-600 mr-1' />
              <span className='text-green-600 font-medium'>
                +{analytics.overview.revenueGrowth}%
              </span>
              <span className='ml-1'>from last month</span>
            </p>
          </CardContent>
        </Card>

        <Card className='border-l-4 border-l-blue-500 shadow-sm'>
          <CardHeader className='flex flex-row items-center justify-between pb-2'>
            <CardTitle className='text-sm font-medium text-muted-foreground'>Total Orders</CardTitle>
            <ShoppingBag className='h-4 w-4 text-blue-500' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{analytics.overview.totalOrders.toLocaleString()}</div>
            <p className='text-xs text-muted-foreground flex items-center mt-1'>
              <TrendingUp className='h-3 w-3 text-green-600 mr-1' />
              <span className='text-green-600 font-medium'>
                +{analytics.overview.ordersGrowth}%
              </span>
              <span className='ml-1'>from last month</span>
            </p>
          </CardContent>
        </Card>

        <Card className='border-l-4 border-l-emerald-500 shadow-sm'>
          <CardHeader className='flex flex-row items-center justify-between pb-2'>
            <CardTitle className='text-sm font-medium text-muted-foreground'>Active Vendors</CardTitle>
            <Package className='h-4 w-4 text-emerald-500' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{analytics.overview.totalVendors.toLocaleString()}</div>
            <p className='text-xs text-muted-foreground mt-1'>
              Registered and active vendors
            </p>
          </CardContent>
        </Card>

        <Card className='border-l-4 border-l-orange-500 shadow-sm'>
          <CardHeader className='flex flex-row items-center justify-between pb-2'>
            <CardTitle className='text-sm font-medium text-muted-foreground'>Total Customers</CardTitle>
            <Users className='h-4 w-4 text-orange-500' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{analytics.overview.totalCustomers.toLocaleString()}</div>
            <p className='text-xs text-muted-foreground mt-1'>
              Registered customers
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Main Analytics Tabs */}
      <Tabs defaultValue='subscriptions' className='space-y-4'>
        <TabsList className='bg-muted/50'>
          <TabsTrigger value='subscriptions'>Subscriptions</TabsTrigger>
          <TabsTrigger value='orders'>Orders</TabsTrigger>
          <TabsTrigger value='featured'>Featured Vendors</TabsTrigger>
        </TabsList>

        {/* Subscriptions Tab */}
        <TabsContent value='subscriptions' className='space-y-4'>
          <div className='grid gap-4 md:grid-cols-3'>
            <Card className='border-l-4 border-l-emerald-500 shadow-sm'>
              <CardHeader className='flex flex-row items-center justify-between pb-2'>
                <CardTitle className='text-sm font-medium text-muted-foreground'>Active Subscriptions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold text-emerald-600'>
                  {analytics.subscriptions.totalActive}
                </div>
                <p className='text-xs text-muted-foreground mt-1'>
                  {analytics.subscriptions.totalTrial} on free trial
                </p>
              </CardContent>
            </Card>

            <Card className='border-l-4 border-l-primary shadow-sm'>
              <CardHeader className='flex flex-row items-center justify-between pb-2'>
                <CardTitle className='text-sm font-medium text-muted-foreground'>Subscription Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>
                  GMD {analytics.subscriptions.totalRevenue.toLocaleString()}
                </div>
                <p className='text-xs text-muted-foreground mt-1'>Monthly recurring revenue</p>
              </CardContent>
            </Card>

            <Card className='border-l-4 border-l-blue-500 shadow-sm'>
              <CardHeader className='flex flex-row items-center justify-between pb-2'>
                <CardTitle className='text-sm font-medium text-muted-foreground'>Conversion Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold text-purple-600'>
                  {analytics.subscriptions.totalTrial > 0
                    ? Math.round((analytics.subscriptions.totalActive / (analytics.subscriptions.totalActive + analytics.subscriptions.totalTrial)) * 100)
                    : 0}%
                </div>
                <p className='text-xs text-muted-foreground mt-1'>Trial to paid conversion</p>
              </CardContent>
            </Card>
          </div>

          <div className='grid gap-4 md:grid-cols-2'>
            {/* Package Distribution */}
            <Card className='shadow-sm'>
              <CardHeader className='border-b pb-4'>
                <CardTitle className='text-base font-semibold'>Subscriptions by Package</CardTitle>
                <CardDescription>Distribution across different tiers</CardDescription>
              </CardHeader>
              <CardContent className='pt-6'>
                <ResponsiveContainer width='100%' height={300}>
                  <PieChart>
                    <Pie
                      data={analytics.subscriptions.byPackage}
                      cx='50%'
                      cy='50%'
                      labelLine={false}
                      label
                      outerRadius={80}
                      fill='#8884d8'
                      dataKey='count'
                    >
                      {analytics.subscriptions.byPackage.map((_, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Monthly Revenue */}
            <Card className='shadow-sm'>
              <CardHeader className='border-b pb-4'>
                <CardTitle className='text-base font-semibold'>Monthly Subscription Revenue</CardTitle>
                <CardDescription>Revenue trend over time</CardDescription>
              </CardHeader>
              <CardContent className='pt-6'>
                <ResponsiveContainer width='100%' height={300}>
                  <LineChart data={analytics.subscriptions.monthlyRevenue}>
                    <CartesianGrid strokeDasharray='3 3' />
                    <XAxis dataKey='month' />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type='monotone'
                      dataKey='revenue'
                      stroke='#8B5CF6'
                      strokeWidth={2}
                      name='Revenue (GMD)'
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Package Revenue Table */}
          <Card className='shadow-sm overflow-hidden'>
            <CardHeader className='border-b pb-4'>
              <CardTitle className='text-base font-semibold'>Package Performance</CardTitle>
              <CardDescription>Detailed breakdown by subscription tier</CardDescription>
            </CardHeader>
            <CardContent className='p-0'>
              <div className='overflow-x-auto'>
                <table className='w-full'>
                  <thead>
                    <tr className='bg-muted/50'>
                      <th className='text-left py-3 px-4 text-sm font-medium text-muted-foreground'>Package</th>
                      <th className='text-right py-3 px-4 text-sm font-medium text-muted-foreground'>Subscribers</th>
                      <th className='text-right py-3 px-4 text-sm font-medium text-muted-foreground'>Revenue</th>
                      <th className='text-right py-3 px-4 text-sm font-medium text-muted-foreground'>Avg. Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.subscriptions.byPackage.map((pkg, idx) => (
                      <tr key={idx} className='border-b hover:bg-muted/30 transition-colors'>
                        <td className='py-3 px-4 font-medium'>{pkg.name}</td>
                        <td className='py-3 px-4 text-right'>{pkg.count}</td>
                        <td className='py-3 px-4 text-right'>
                          GMD {pkg.revenue.toLocaleString()}
                        </td>
                        <td className='py-3 px-4 text-right'>
                          GMD {pkg.count > 0 ? Math.round(pkg.revenue / pkg.count).toLocaleString() : 0}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Orders Tab */}
        <TabsContent value='orders' className='space-y-4'>
          <div className='grid gap-4 md:grid-cols-2'>
            {/* Orders by Status */}
            <Card className='shadow-sm'>
              <CardHeader className='border-b pb-4'>
                <CardTitle className='text-base font-semibold'>Orders by Status</CardTitle>
                <CardDescription>Current order distribution</CardDescription>
              </CardHeader>
              <CardContent className='pt-6'>
                <ResponsiveContainer width='100%' height={300}>
                  <BarChart data={analytics.orders.byStatus}>
                    <CartesianGrid strokeDasharray='3 3' />
                    <XAxis dataKey='status' />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey='count' fill='#3B82F6' name='Orders' />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Revenue by Day */}
            <Card className='shadow-sm'>
              <CardHeader className='border-b pb-4'>
                <CardTitle className='text-base font-semibold'>Daily Revenue & Orders</CardTitle>
                <CardDescription>Last 7 days performance</CardDescription>
              </CardHeader>
              <CardContent className='pt-6'>
                <ResponsiveContainer width='100%' height={300}>
                  <LineChart data={analytics.orders.revenueByDay}>
                    <CartesianGrid strokeDasharray='3 3' />
                    <XAxis dataKey='date' />
                    <YAxis yAxisId='left' />
                    <YAxis yAxisId='right' orientation='right' />
                    <Tooltip />
                    <Legend />
                    <Line
                      yAxisId='left'
                      type='monotone'
                      dataKey='revenue'
                      stroke='#10B981'
                      strokeWidth={2}
                      name='Revenue (GMD)'
                    />
                    <Line
                      yAxisId='right'
                      type='monotone'
                      dataKey='orders'
                      stroke='#F59E0B'
                      strokeWidth={2}
                      name='Orders'
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>

          {/* Top Vendors */}
          <Card className='shadow-sm'>
            <CardHeader className='border-b pb-4'>
              <CardTitle className='text-base font-semibold'>Top Performing Vendors</CardTitle>
              <CardDescription>Vendors with highest revenue this month</CardDescription>
            </CardHeader>
            <CardContent className='pt-6'>
              <div className='space-y-3'>
                {analytics.orders.topVendors.map((vendor, idx) => (
                  <div key={idx} className='flex items-center justify-between p-4 border rounded-lg hover:bg-muted/30 transition-colors'>
                    <div className='flex items-center gap-3'>
                      <div className='flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold text-sm shrink-0'>
                        #{idx + 1}
                      </div>
                      <div>
                        <p className='font-semibold'>{vendor.vendorName}</p>
                        <p className='text-sm text-muted-foreground'>{vendor.orders} orders</p>
                      </div>
                    </div>
                    <div className='text-right'>
                      <p className='font-bold text-lg font-semibold text-primary'>GMD {vendor.revenue.toLocaleString()}</p>
                      <p className='text-sm text-muted-foreground'>
                        Avg: GMD {Math.round(vendor.revenue / vendor.orders).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Featured Vendors Tab */}
        <TabsContent value='featured' className='space-y-4'>
          <Card className='shadow-sm overflow-hidden'>
            <CardHeader className='border-b pb-4'>
              <CardTitle className='text-base font-semibold flex items-center gap-2'>
                <Star className='h-5 w-5 text-yellow-500' />
                Featured Vendor Analytics
              </CardTitle>
              <CardDescription>Performance metrics for featured placements</CardDescription>
            </CardHeader>
            <CardContent className='pt-6'>
              <div className='mb-6'>
                <div className='flex items-center justify-between p-4 bg-muted/50 rounded-lg border'>
                  <div>
                    <p className='text-sm text-muted-foreground'>Active Featured Vendors</p>
                    <p className='text-2xl font-bold mt-1'>{analytics.featured.totalActive}</p>
                  </div>
                  <div className='rounded-full bg-primary/10 p-3'>
                    <Activity className='h-6 w-6 text-primary' />
                  </div>
                </div>
              </div>

              <div className='overflow-x-auto'>
                <table className='w-full'>
                  <thead>
                    <tr className='bg-muted/50'>
                      <th className='text-left py-3 px-4 text-sm font-medium text-muted-foreground'>Vendor</th>
                      <th className='text-right py-3 px-4 text-sm font-medium text-muted-foreground'>Views</th>
                      <th className='text-right py-3 px-4 text-sm font-medium text-muted-foreground'>Clicks</th>
                      <th className='text-right py-3 px-4 text-sm font-medium text-muted-foreground'>CTR</th>
                      <th className='text-right py-3 px-4 text-sm font-medium text-muted-foreground'>Performance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.featured.analytics.map((vendor, idx) => (
                      <tr key={idx} className='border-b hover:bg-muted/30 transition-colors'>
                        <td className='py-3 px-4 font-medium'>{vendor.vendorName}</td>
                        <td className='py-3 px-4 text-right'>{vendor.views.toLocaleString()}</td>
                        <td className='py-3 px-4 text-right'>{vendor.clicks.toLocaleString()}</td>
                        <td className='py-3 px-4 text-right'>
                          <span className={`font-semibold ${vendor.ctr > 5 ? 'text-emerald-600' : vendor.ctr > 2 ? 'text-amber-600' : 'text-red-600'}`}>
                            {vendor.ctr.toFixed(2)}%
                          </span>
                        </td>
                        <td className='py-3 px-4 text-right'>
                          <div className='flex items-center justify-end gap-2'>
                            {vendor.ctr > 5 ? (
                              <span className='text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-400 px-2 py-0.5 rounded-full font-medium'>
                                Excellent
                              </span>
                            ) : vendor.ctr > 2 ? (
                              <span className='text-xs bg-amber-100 text-amber-800 dark:bg-amber-950/40 dark:text-amber-400 px-2 py-0.5 rounded-full font-medium'>
                                Good
                              </span>
                            ) : (
                              <span className='text-xs bg-red-100 text-red-800 dark:bg-red-950/40 dark:text-red-400 px-2 py-0.5 rounded-full font-medium'>
                                Needs Improvement
                              </span>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

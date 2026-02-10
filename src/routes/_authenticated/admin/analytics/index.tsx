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
    <div className='container mx-auto p-6 space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight'>Analytics Dashboard</h1>
          <p className='text-muted-foreground'>
            Real-time insights into your platform's performance
          </p>
        </div>
        <div className='flex items-center gap-2 text-sm text-muted-foreground'>
          <Calendar className='h-4 w-4' />
          <span>Last updated: {new Date().toLocaleTimeString()}</span>
        </div>
      </div>

      {/* Overview Stats */}
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between pb-2 space-y-0'>
            <CardTitle className='text-sm font-medium'>Total Revenue</CardTitle>
            <DollarSign className='h-4 w-4 text-muted-foreground' />
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

        <Card>
          <CardHeader className='flex flex-row items-center justify-between pb-2 space-y-0'>
            <CardTitle className='text-sm font-medium'>Total Orders</CardTitle>
            <ShoppingBag className='h-4 w-4 text-muted-foreground' />
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

        <Card>
          <CardHeader className='flex flex-row items-center justify-between pb-2 space-y-0'>
            <CardTitle className='text-sm font-medium'>Active Vendors</CardTitle>
            <Package className='h-4 w-4 text-muted-foreground' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{analytics.overview.totalVendors.toLocaleString()}</div>
            <p className='text-xs text-muted-foreground mt-1'>
              Registered and active vendors
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className='flex flex-row items-center justify-between pb-2 space-y-0'>
            <CardTitle className='text-sm font-medium'>Total Customers</CardTitle>
            <Users className='h-4 w-4 text-muted-foreground' />
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
        <TabsList>
          <TabsTrigger value='subscriptions'>Subscriptions</TabsTrigger>
          <TabsTrigger value='orders'>Orders</TabsTrigger>
          <TabsTrigger value='featured'>Featured Vendors</TabsTrigger>
        </TabsList>

        {/* Subscriptions Tab */}
        <TabsContent value='subscriptions' className='space-y-4'>
          <div className='grid gap-4 md:grid-cols-3'>
            <Card>
              <CardHeader>
                <CardTitle className='text-sm'>Active Subscriptions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className='text-3xl font-bold text-green-600'>
                  {analytics.subscriptions.totalActive}
                </div>
                <p className='text-xs text-muted-foreground mt-1'>
                  {analytics.subscriptions.totalTrial} on free trial
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className='text-sm'>Subscription Revenue</CardTitle>
              </CardHeader>
              <CardContent>
                <div className='text-3xl font-bold'>
                  GMD {analytics.subscriptions.totalRevenue.toLocaleString()}
                </div>
                <p className='text-xs text-muted-foreground mt-1'>Monthly recurring revenue</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className='text-sm'>Conversion Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className='text-3xl font-bold text-purple-600'>
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
            <Card>
              <CardHeader>
                <CardTitle>Subscriptions by Package</CardTitle>
                <CardDescription>Distribution across different tiers</CardDescription>
              </CardHeader>
              <CardContent>
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
            <Card>
              <CardHeader>
                <CardTitle>Monthly Subscription Revenue</CardTitle>
                <CardDescription>Revenue trend over time</CardDescription>
              </CardHeader>
              <CardContent>
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
          <Card>
            <CardHeader>
              <CardTitle>Package Performance</CardTitle>
              <CardDescription>Detailed breakdown by subscription tier</CardDescription>
            </CardHeader>
            <CardContent>
              <div className='overflow-x-auto'>
                <table className='w-full'>
                  <thead>
                    <tr className='border-b'>
                      <th className='text-left py-3 px-4'>Package</th>
                      <th className='text-right py-3 px-4'>Subscribers</th>
                      <th className='text-right py-3 px-4'>Revenue</th>
                      <th className='text-right py-3 px-4'>Avg. Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.subscriptions.byPackage.map((pkg, idx) => (
                      <tr key={idx} className='border-b hover:bg-muted/50'>
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
            <Card>
              <CardHeader>
                <CardTitle>Orders by Status</CardTitle>
                <CardDescription>Current order distribution</CardDescription>
              </CardHeader>
              <CardContent>
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
            <Card>
              <CardHeader>
                <CardTitle>Daily Revenue & Orders</CardTitle>
                <CardDescription>Last 7 days performance</CardDescription>
              </CardHeader>
              <CardContent>
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
          <Card>
            <CardHeader>
              <CardTitle>Top Performing Vendors</CardTitle>
              <CardDescription>Vendors with highest revenue this month</CardDescription>
            </CardHeader>
            <CardContent>
              <div className='space-y-4'>
                {analytics.orders.topVendors.map((vendor, idx) => (
                  <div key={idx} className='flex items-center justify-between p-4 border rounded-lg'>
                    <div className='flex items-center gap-3'>
                      <div className='flex items-center justify-center w-10 h-10 rounded-full bg-primary/10 text-primary font-bold'>
                        #{idx + 1}
                      </div>
                      <div>
                        <p className='font-semibold'>{vendor.vendorName}</p>
                        <p className='text-sm text-muted-foreground'>{vendor.orders} orders</p>
                      </div>
                    </div>
                    <div className='text-right'>
                      <p className='font-bold text-lg'>GMD {vendor.revenue.toLocaleString()}</p>
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
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Star className='h-5 w-5 text-yellow-500' />
                Featured Vendor Analytics
              </CardTitle>
              <CardDescription>Performance metrics for featured placements</CardDescription>
            </CardHeader>
            <CardContent>
              <div className='mb-6'>
                <div className='flex items-center justify-between p-4 bg-muted rounded-lg'>
                  <div>
                    <p className='text-sm text-muted-foreground'>Active Featured Vendors</p>
                    <p className='text-3xl font-bold'>{analytics.featured.totalActive}</p>
                  </div>
                  <Activity className='h-12 w-12 text-muted-foreground' />
                </div>
              </div>

              <div className='overflow-x-auto'>
                <table className='w-full'>
                  <thead>
                    <tr className='border-b'>
                      <th className='text-left py-3 px-4'>Vendor</th>
                      <th className='text-right py-3 px-4'>Views</th>
                      <th className='text-right py-3 px-4'>Clicks</th>
                      <th className='text-right py-3 px-4'>CTR</th>
                      <th className='text-right py-3 px-4'>Performance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analytics.featured.analytics.map((vendor, idx) => (
                      <tr key={idx} className='border-b hover:bg-muted/50'>
                        <td className='py-3 px-4 font-medium'>{vendor.vendorName}</td>
                        <td className='py-3 px-4 text-right'>{vendor.views.toLocaleString()}</td>
                        <td className='py-3 px-4 text-right'>{vendor.clicks.toLocaleString()}</td>
                        <td className='py-3 px-4 text-right'>
                          <span className={`font-semibold ${vendor.ctr > 5 ? 'text-green-600' : vendor.ctr > 2 ? 'text-yellow-600' : 'text-red-600'}`}>
                            {vendor.ctr.toFixed(2)}%
                          </span>
                        </td>
                        <td className='py-3 px-4 text-right'>
                          <div className='flex items-center justify-end gap-2'>
                            {vendor.ctr > 5 ? (
                              <span className='text-xs bg-green-100 text-green-800 px-2 py-1 rounded'>
                                Excellent
                              </span>
                            ) : vendor.ctr > 2 ? (
                              <span className='text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded'>
                                Good
                              </span>
                            ) : (
                              <span className='text-xs bg-red-100 text-red-800 px-2 py-1 rounded'>
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

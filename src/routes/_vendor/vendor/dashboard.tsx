import { useQuery } from '@tanstack/react-query';
import { createFileRoute } from '@tanstack/react-router';
import {
  ShoppingBag,
  DollarSign,
  Package,
  TrendingUp,
  Clock,
  CheckCircle,
  ArrowRight,
  Activity
} from 'lucide-react';
import { api } from '@/lib/api';
import { useVendorProfile } from '@/hooks/use-vendor-profile';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';

export const Route = createFileRoute('/_vendor/vendor/dashboard')({
  component: VendorDashboard,
});

interface VendorStats {
  totalOrders: number;
  completedOrders: number;
  pendingOrders: number;
  totalRevenue: number;
  todayRevenue: number;
  todayOrders: number;
  totalMenuItems: number;
  averageOrderValue: number;
}

function VendorDashboard() {
  const { vendor } = useVendorProfile();

  const {
    data: stats,
    isLoading,
    error,
  } = useQuery<VendorStats>({
    queryKey: ['vendor-stats'],
    queryFn: async () => {
      const response = await api.get('/api/vendor-stats/dashboard');
      if (response.data?.success) {
        return response.data.data as VendorStats;
      }
      return response.data as VendorStats;
    },
  });

  const statCards = [
    {
      title: 'Total Revenue',
      value: "D",
      subtitle: 'Lifetime earnings',
      icon: DollarSign,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-200 dark:border-orange-900'
    },
    {
      title: "Today's Revenue",
      value: `D${stats?.todayRevenue?.toFixed(2) || '0.00'}`,
      subtitle: 'Earnings for today',
      icon: TrendingUp,
      color: 'text-zinc-900 dark:text-white',
      bgColor: 'bg-zinc-100 dark:bg-zinc-800',
      borderColor: 'border-zinc-200 dark:border-zinc-800'
    },
    {
      title: 'Total Orders',
      value: stats?.totalOrders || 0,
      subtitle: 'All time orders',
      icon: ShoppingBag,
      color: 'text-zinc-900 dark:text-white',
      bgColor: 'bg-zinc-100 dark:bg-zinc-800',
      borderColor: 'border-zinc-200 dark:border-zinc-800'
    },
    {
      title: 'Pending Orders',
      value: stats?.pendingOrders || 0,
      subtitle: 'Awaiting fulfillment',
      icon: Clock,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-200 dark:border-orange-900'
    },
    {
      title: 'Completed Orders',
      value: stats?.completedOrders || 0,
      subtitle: 'Successfully delivered',
      icon: CheckCircle,
      color: 'text-zinc-900 dark:text-white',
      bgColor: 'bg-zinc-100 dark:bg-zinc-800',
      borderColor: 'border-zinc-200 dark:border-zinc-800'
    },
    {
      title: 'Active Menu Items',
      value: stats?.totalMenuItems || 0,
      subtitle: 'Currently listed products',
      icon: Package,
      color: 'text-zinc-900 dark:text-white',
      bgColor: 'bg-zinc-100 dark:bg-zinc-800',
      borderColor: 'border-zinc-200 dark:border-zinc-800'
    },
  ];

  return (
    <div className="flex-1 p-6 md:p-8 bg-zinc-50 dark:bg-zinc-950 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header Section */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
              Welcome back, {vendor?.businessName || vendor?.fullName || 'Vendor'}
            </h1>
            <p className="text-zinc-500 dark:text-zinc-400 mt-1">
              Here's a breakdown of your business performance today.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 px-4 py-2 rounded-xl text-sm font-medium text-zinc-600 dark:text-zinc-300 shadow-sm flex items-center gap-2">
              <Activity className="h-4 w-4 text-orange-500" />
              Live Updates
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:gap-6">
          {isLoading ? (
            Array(6).fill(null).map((_, i) => (
              <Skeleton key={i} className="h-36 w-full rounded-2xl" />
            ))
          ) : (
            statCards.map((stat, index) => {
              const Icon = stat.icon;
              const isHighlight = stat.title === "Today's Revenue" || stat.title === 'Pending Orders';
              
              return (
                <Card 
                  key={index} 
                  className={`overflow-hidden rounded-2xl transition-all duration-200 hover:shadow-lg ${
                    isHighlight 
                      ? 'border-orange-500/20 bg-gradient-to-br from-orange-50/50 to-white dark:from-orange-950/10 dark:to-zinc-900 ring-1 ring-orange-500/10 shadow-sm shadow-orange-500/5' 
                      : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 hover:border-zinc-300 dark:hover:border-zinc-700 shadow-sm'
                  }`}
                >
                  <CardHeader className="flex flex-row items-center justify-between pb-2">
                    <CardTitle className={`text-sm font-medium ${isHighlight ? 'text-orange-700 dark:text-orange-400' : 'text-zinc-600 dark:text-zinc-400'}`}>
                      {stat.title}
                    </CardTitle>
                    <div className={`p-2 rounded-lg ${isHighlight ? 'bg-orange-500/10 text-orange-600 dark:text-orange-400' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400'}`}>
                      <Icon className="h-4 w-4" />
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className={`text-3xl font-bold tracking-tight ${isHighlight ? 'text-zinc-950 dark:text-white' : 'text-zinc-900 dark:text-zinc-100'}`}>
                      {stat.value}
                    </div>
                    <p className={`text-xs mt-1 font-medium ${isHighlight ? 'text-orange-600/80 dark:text-orange-500/80' : 'text-zinc-500 dark:text-zinc-400'}`}>
                      {stat.subtitle}
                    </p>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>

        {/* Informational Cards Row */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-7">
          <Card className="col-span-4 rounded-2xl border-zinc-200 dark:border-zinc-800 shadow-sm bg-white dark:bg-zinc-900">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Performance Snapshot</CardTitle>
                <TrendingUp className="h-5 w-5 text-orange-500" />
              </div>
              <CardDescription>Order fulfillment overview</CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-4">
                  <Skeleton className="h-4 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
              ) : (
                <div className="space-y-8">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-green-100 dark:bg-green-500/10 flex items-center justify-center">
                      <CheckCircle className="h-6 w-6 text-green-600 dark:text-green-500" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Completion Rate</p>
                      <div className="flex items-center gap-4">
                        <div className="h-2 flex-1 rounded-full bg-zinc-100 dark:bg-zinc-800">
                          <div 
                            className="h-2 rounded-full bg-green-500" 
                            style={{ 
                              width: stats?.totalOrders 
                                ? `${(stats.completedOrders / stats.totalOrders) * 100}%` 
                                : '0%' 
                            }} 
                          />
                        </div>
                        <span className="text-sm font-semibold text-green-600">
                          {stats?.totalOrders 
                            ? Math.round((stats.completedOrders / stats.totalOrders) * 100) 
                            : 0}%
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full bg-orange-100 dark:bg-orange-500/10 flex items-center justify-center">
                      <Clock className="h-6 w-6 text-orange-600 dark:text-orange-500" />
                    </div>
                    <div className="flex-1 space-y-1">
                      <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">Pending Orders Ratio</p>
                      <div className="flex items-center gap-4">
                        <div className="h-2 flex-1 rounded-full bg-zinc-100 dark:bg-zinc-800">
                          <div 
                            className="h-2 rounded-full bg-orange-500" 
                            style={{ 
                              width: stats?.totalOrders 
                                ? `${(stats.pendingOrders / stats.totalOrders) * 100}%` 
                                : '0%' 
                            }} 
                          />
                        </div>
                        <span className="text-sm font-semibold text-orange-600">
                          {stats?.totalOrders 
                            ? Math.round((stats.pendingOrders / stats.totalOrders) * 100) 
                            : 0}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="col-span-3 rounded-2xl border-orange-200 dark:border-orange-900 bg-gradient-to-br from-orange-50 to-white dark:from-orange-950/20 dark:to-zinc-900 shadow-sm relative overflow-hidden">
            <div className="absolute top-0 right-0 -mr-8 -mt-8 h-32 w-32 rounded-full bg-orange-500/10 blur-2xl pointer-events-none" />
            <div className="absolute bottom-0 left-0 -ml-8 -mb-8 h-24 w-24 rounded-full bg-orange-500/10 blur-2xl pointer-events-none" />
            <CardHeader>
               <CardTitle className="text-lg font-semibold text-zinc-900 dark:text-zinc-100">Quick Actions</CardTitle>
               <CardDescription>Manage your business operations</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3">
              <Button onClick={() => window.location.href = '/vendor/orders'} className="w-full bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:text-zinc-900 shadow-sm justify-between shadow-zinc-900/10 group py-6 rounded-xl">
                <span className="flex items-center">
                  <ShoppingBag className="mr-2 h-5 w-5" />
                  Manage Orders
                </span>
                <ArrowRight className="h-4 w-4 opacity-70 group-hover:translate-x-1 transition-transform" />
              </Button>
              <Button onClick={() => window.location.href = '/vendor/menu'} variant="outline" className="w-full border-zinc-200 shadow-sm hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-800 justify-between group py-6 rounded-xl text-zinc-900 dark:text-zinc-100">
                <span className="flex items-center">
                  <Package className="mr-2 h-5 w-5 text-orange-500" />
                  Update Menu
                </span>
                <ArrowRight className="h-4 w-4 opacity-70 group-hover:translate-x-1 transition-transform" />
              </Button>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}

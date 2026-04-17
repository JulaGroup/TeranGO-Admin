const fs = require('fs');
const content = "import { useQuery } from '@tanstack/react-query';
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
      value: \\\D\\\\,
      subtitle: 'Lifetime earnings',
      icon: DollarSign,
      color: 'text-orange-500',
      bgColor: 'bg-orange-500/10',
      borderColor: 'border-orange-200 dark:border-orange-900'
    },
    {
      title: 'Today\s Revenue',
      value: \\\D\\\\,
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
    <div className=\\"flex-1 space-y-8 p-4 md:p-8 pt-6 max-w-7xl mx-auto w-full\\">
      {/* Header Section */}
      <div className=\\"flex flex-col md:flex-row items-start md:items-center justify-between space-y-4 md:space-y-0\\">
        <div className=\\"space-y-1\\">
          <h1 className=\\"text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50\\">
            Welcome back, {vendor?.user?.fullName || 'Vendor'}
          </h1>
          <p className=\\"text-sm text-zinc-500 dark:text-zinc-400\\">
            Here\s an overview of your business performance today.
          </p>
        </div>
        <div className=\\"flex items-center space-x-2\\">
          <Button className=\\"bg-orange-500 hover:bg-orange-600 text-white shadow-md transition-all\\">
            <Package className=\\"mr-2 h-4 w-4\\" />
            Manage Menu
          </Button>
        </div>
      </div>

      {/* Main Stats Grid */}
      <div className=\\"grid gap-4 md:gap-6 md:grid-cols-2 lg:grid-cols-3\\">
        {statCards.map((stat, i) => (
          <Card key={i} className={\\\overflow-hidden transition-all duration-200 hover:shadow-lg border \\\\}>
            <CardHeader className=\\"flex flex-row items-center justify-between pb-2 space-y-0\\">
              <CardTitle className=\\"text-sm font-medium text-zinc-600 dark:text-zinc-300\\">
                {stat.title}
              </CardTitle>
              <div className={\\\h-10 w-10 rounded-full flex items-center justify-center \\\\}>
                <stat.icon className={\\\h-5 w-5 \\\\} />
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className=\\"space-y-2\\">
                  <Skeleton className=\\"h-8 w-1/2 bg-zinc-200 dark:bg-zinc-800\\" />
                  <Skeleton className=\\"h-4 w-3/4 bg-zinc-200 dark:bg-zinc-800\\" />
                </div>
              ) : (
                <div className=\\"space-y-1\\">
                  <div className=\\"text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50\\">
                    {stat.value}
                  </div>
                  <p className=\\"text-xs text-zinc-500 dark:text-zinc-400\\">
                    {stat.subtitle}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Error State */}
      {error && (
        <div className=\\"rounded-lg border border-red-200 bg-red-50 p-4 dark:bg-red-950/50 dark:border-red-900\\">
          <div className=\\"flex items-center space-x-2 text-red-600 dark:text-red-400\\">
            <Activity className=\\"h-5 w-5\\" />
            <span className=\\"font-semibold text-sm\\">Unable to load statistics</span>
          </div>
          <p className=\\"mt-1 text-sm text-red-500 dark:text-red-300\\">Please check your internet connection or refresh the page.</p>
        </div>
      )}

      {/* Secondary Data Section */}
      {stats && (
        <div className=\\"grid gap-4 md:gap-6 lg:grid-cols-7 pt-4\\">
          {/* Promo / Actions Card */}
          <Card className=\\"col-span-full lg:col-span-4 bg-zinc-950 text-white overflow-hidden relative shadow-lg border-zinc-900\\">
            <div className=\\"absolute -right-10 -top-10 opacity-10 pointer-events-none\\">
              <TrendingUp className=\\"h-64 w-64 text-orange-500\\" />
            </div>
            <CardHeader className=\\"relative z-10 pb-0 pt-8 px-6 md:px-8\\">
              <CardTitle className=\\"text-2xl font-bold text-white\\">Grow Your Sales</CardTitle>
              <CardDescription className=\\"text-zinc-400 text-base mt-2 max-w-md\\">
                Keep your menu updated, add high-quality photos, and respond to orders quickly to maintain a high ranking.
              </CardDescription>
            </CardHeader>
            <CardContent className=\\"relative z-10 pt-6 px-6 md:px-8 pb-8\\">
              <div className=\\"grid sm:grid-cols-2 gap-4 mt-2\\">
                <div className=\\"bg-zinc-900/80 p-5 rounded-xl border border-zinc-800/50 backdrop-blur-sm hover:border-orange-500/30 transition-all\\">
                  <Clock className=\\"h-6 w-6 text-orange-500 mb-3\\" />
                  <h4 className=\\"font-medium text-white mb-1\\">Fast Response</h4>
                  <p className=\\"text-sm text-zinc-400 leading-relaxed\\">Accept orders under 2 mins for better visibility.</p>
                </div>
                <div className=\\"bg-zinc-900/80 p-5 rounded-xl border border-zinc-800/50 backdrop-blur-sm hover:border-orange-500/30 transition-all\\">
                  <Package className=\\"h-6 w-6 text-orange-500 mb-3\\" />
                  <h4 className=\\"font-medium text-white mb-1\\">Menu Variety</h4>
                  <p className=\\"text-sm text-zinc-400 leading-relaxed\\">Updating items regularly keeps customers coming back.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
";
fs.writeFileSync('C:/Users/DELL/Desktop/terango main files/complete admin panel/src/routes/_vendor/vendor/dashboard.tsx', content);

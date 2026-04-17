// @ts-nocheck
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import {
  Zap,
  Clock,
  TrendingUp,
  Users,
  Package,
  AlertTriangle,
  CheckCircle,
  DollarSign,
  MapPin,
  RefreshCw,
} from 'lucide-react';
import { formatExpressDeliveryId } from '@/lib/formatExpressDeliveryId';

interface ExpressMetrics {
  todayStats: {
    totalExpressDeliveries: number;
    averageDeliveryTime: number;
    averageExpressFee: number;
    onTimeRate: number;
  };
  priorityBreakdown: Array<{
    priorityLevel: string;
    _count: { id: number };
  }>;
  vehiclePerformance: Array<{
    vehicleType: string;
    _count: { id: number };
    _avg: { actualDeliveryTime: number };
  }>;
}

interface ExpressDelivery {
  id: string;
  pickupAddress: string;
  dropoffAddress: string;
  status: string;
  isExpress: boolean;
  priorityLevel: 'STANDARD' | 'EXPRESS' | 'URGENT';
  guaranteedDeliveryTime?: string;
  estimatedFee: number;
  expressMultiplier: number;
  createdAt: string;
  verificationStatus: string;
  driverName?: string;
  timeRemaining?: number;
  isDelayed: boolean;
}

interface ActiveDriver {
  id: string;
  name: string;
  vehicleType: string;
  currentLatitude?: number;
  currentLongitude?: number;
  activeExpressDeliveries: number;
  isExpressEnabled: boolean;
  averageExpressTime: number;
  rating: number;
}

const ExpressAdminDashboard: React.FC = () => {
  const [metrics, setMetrics] = useState<ExpressMetrics | null>(null);
  const [deliveries, setDeliveries] = useState<ExpressDelivery[]>([]);
  const [activeDrivers, setActiveDrivers] = useState<ActiveDriver[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [timeRange, setTimeRange] = useState('today');
  const [priorityFilter, setPriorityFilter] = useState('all');

  const PRIORITY_COLORS = {
    URGENT: '#DC2626',
    EXPRESS: '#D97706',
    STANDARD: '#059669',
  };

  useEffect(() => {
    loadDashboardData();
    
    // Set up real-time updates
    const interval = setInterval(loadDashboardData, 30000); // Update every 30 seconds
    
    return () => clearInterval(interval);
  }, [timeRange]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load metrics, deliveries, and drivers in parallel
      const [metricsRes, deliveriesRes, driversRes] = await Promise.all([
        fetch('/api/express-delivery/metrics/dashboard'),
        fetch(`/api/express-delivery?isExpress=true&status=IN_TRANSIT,DRIVER_ASSIGNED,PICKED_UP`),
        fetch('/api/drivers?expressEnabled=true&available=true'),
      ]);

      if (metricsRes.ok) {
        const metricsData = await metricsRes.json();
        setMetrics(metricsData.data);
      }

      if (deliveriesRes.ok) {
        const deliveriesData = await deliveriesRes.json();
        
        // Calculate time remaining and delay status
        const processedDeliveries = deliveriesData.data.map((delivery: any) => {
          const now = new Date();
          const deadline = delivery.guaranteedDeliveryTime ? new Date(delivery.guaranteedDeliveryTime) : null;
          let timeRemaining = 0;
          let isDelayed = false;
          
          if (deadline) {
            const remaining = deadline.getTime() - now.getTime();
            timeRemaining = Math.max(0, Math.round(remaining / (1000 * 60))); // Minutes
            isDelayed = remaining < 0 && delivery.status !== 'DELIVERED';
          }
          
          return {
            ...delivery,
            timeRemaining,
            isDelayed,
          };
        });
        
        setDeliveries(processedDeliveries);
      }

      if (driversRes.ok) {
        const driversData = await driversRes.json();
        setActiveDrivers(driversData.data || []);
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadgeColor = (status: string, isDelayed?: boolean) => {
    if (isDelayed) return 'destructive';
    
    switch (status) {
      case 'PENDING':
        return 'secondary';
      case 'DRIVER_ASSIGNED':
        return 'default';
      case 'PICKED_UP':
        return 'warning';
      case 'IN_TRANSIT':
        return 'info';
      case 'DELIVERED':
        return 'success';
      default:
        return 'secondary';
    }
  };

  const formatTimeRemaining = (minutes: number, isDelayed: boolean) => {
    if (isDelayed) return `${Math.abs(minutes)}m overdue`;
    if (minutes === 0) return 'Due now';
    if (minutes < 60) return `${minutes}m left`;
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return `${hours}h ${mins}m left`;
  };

  const getUrgentDeliveries = () => {
    return deliveries.filter(d => 
      (d.priorityLevel === 'URGENT' || d.isDelayed || d.timeRemaining <= 15) &&
      d.status !== 'DELIVERED'
    );
  };

  const renderOverviewTab = () => (
    <div className="space-y-6">
      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Package className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">
                  {metrics?.todayStats?.totalExpressDeliveries || 0}
                </p>
                <p className="text-xs text-muted-foreground">Express Deliveries Today</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Clock className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold">
                  {metrics?.todayStats?.averageDeliveryTime?.toFixed(1) || '0'}m
                </p>
                <p className="text-xs text-muted-foreground">Average Delivery Time</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-8 w-8 text-emerald-600" />
              <div>
                <p className="text-2xl font-bold">
                  {((metrics?.todayStats?.onTimeRate || 0) * 100).toFixed(1)}%
                </p>
                <p className="text-xs text-muted-foreground">On-Time Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-8 w-8 text-yellow-600" />
              <div>
                <p className="text-2xl font-bold">
                  ₦{metrics?.todayStats?.averageExpressFee?.toFixed(0) || '0'}
                </p>
                <p className="text-xs text-muted-foreground">Avg Express Fee</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Priority Breakdown Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Deliveries by Priority</CardTitle>
          </CardHeader>
          <CardContent>
            {metrics?.priorityBreakdown && (
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={metrics.priorityBreakdown}
                    dataKey="_count.id"
                    nameKey="priorityLevel"
                    cx="50%"
                    cy="50%"
                    outerRadius={80}
                    label={({ priorityLevel, _count }) => `${priorityLevel}: ${_count.id}`}
                  >
                    {metrics.priorityBreakdown.map((entry, index) => (
                      <Cell 
                        key={`cell-${index}`} 
                        fill={PRIORITY_COLORS[entry.priorityLevel as keyof typeof PRIORITY_COLORS] || '#6B7280'} 
                      />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Vehicle Performance</CardTitle>
          </CardHeader>
          <CardContent>
            {metrics?.vehiclePerformance && (
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={metrics.vehiclePerformance}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="vehicleType" />
                  <YAxis />
                  <Tooltip />
                  <Bar 
                    dataKey="_count.id" 
                    fill="#3B82F6" 
                    name="Deliveries"
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Urgent Deliveries Alert */}
      {getUrgentDeliveries().length > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            <strong>{getUrgentDeliveries().length} urgent deliveries</strong> require immediate attention.
            <Button 
              variant="link" 
              className="p-0 h-auto ml-2"
              onClick={() => setActiveTab('active')}
            >
              View Details
            </Button>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );

  const renderActiveDeliveriesTab = () => (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex space-x-4">
        <Select value={priorityFilter} onValueChange={setPriorityFilter}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by priority" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="URGENT">Urgent Only</SelectItem>
            <SelectItem value="EXPRESS">Express Only</SelectItem>
            <SelectItem value="delayed">Delayed Only</SelectItem>
          </SelectContent>
        </Select>

        <Button onClick={loadDashboardData} size="sm" variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Active Deliveries Table */}
      <Card>
        <CardHeader>
          <CardTitle>Active Express Deliveries</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Route</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Driver</TableHead>
                <TableHead>Time Left</TableHead>
                <TableHead>Fee</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {deliveries
                .filter(d => {
                  if (priorityFilter === 'all') return true;
                  if (priorityFilter === 'delayed') return d.isDelayed;
                  return d.priorityLevel === priorityFilter;
                })
                .map(delivery => (
                  <TableRow key={delivery.id}>
                    <TableCell className="font-mono">
                      {formatExpressDeliveryId(delivery.id)}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <div className="flex items-center">
                          <MapPin className="h-3 w-3 text-green-600 mr-1" />
                          <span className="text-xs">{delivery.pickupAddress.substring(0, 25)}...</span>
                        </div>
                        <div className="flex items-center">
                          <MapPin className="h-3 w-3 text-red-600 mr-1" />
                          <span className="text-xs">{delivery.dropoffAddress.substring(0, 25)}...</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge 
                        style={{ backgroundColor: PRIORITY_COLORS[delivery.priorityLevel] }}
                        className="text-white"
                      >
                        {delivery.priorityLevel}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={getStatusBadgeColor(delivery.status, delivery.isDelayed)}>
                        {delivery.isDelayed ? 'DELAYED' : delivery.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{delivery.driverName || 'Unassigned'}</TableCell>
                    <TableCell>
                      <span className={delivery.isDelayed ? 'text-red-600 font-semibold' : ''}>
                        {formatTimeRemaining(delivery.timeRemaining || 0, delivery.isDelayed)}
                      </span>
                    </TableCell>
                    <TableCell>₦{delivery.estimatedFee.toLocaleString()}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button size="sm" variant="outline">
                          Track
                        </Button>
                        {delivery.isDelayed && (
                          <Button size="sm" variant="destructive">
                            Alert
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  const renderDriversTab = () => (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Express-Enabled Drivers</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Driver</TableHead>
                <TableHead>Vehicle</TableHead>
                <TableHead>Active Deliveries</TableHead>
                <TableHead>Avg Express Time</TableHead>
                <TableHead>Rating</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {activeDrivers.map(driver => (
                <TableRow key={driver.id}>
                  <TableCell className="font-semibold">{driver.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{driver.vehicleType}</Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={driver.activeExpressDeliveries > 0 ? 'default' : 'secondary'}>
                      {driver.activeExpressDeliveries}
                    </Badge>
                  </TableCell>
                  <TableCell>{driver.averageExpressTime?.toFixed(1) || '0'}min</TableCell>
                  <TableCell>
                    <div className="flex items-center">
                      ⭐ {driver.rating.toFixed(1)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="bg-green-100 text-green-800">Available</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <RefreshCw className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading Express Dashboard...</span>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Zap className="h-8 w-8 text-orange-500" />
          <div>
            <h1 className="text-3xl font-bold">Express Delivery Dashboard</h1>
            <p className="text-muted-foreground">
              Real-time monitoring and management of Express deliveries
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <Select value={timeRange} onValueChange={setTimeRange}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="week">This Week</SelectItem>
              <SelectItem value="month">This Month</SelectItem>
            </SelectContent>
          </Select>
          
          <Button onClick={loadDashboardData} size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="active">
            Active Deliveries 
            {getUrgentDeliveries().length > 0 && (
              <Badge variant="destructive" className="ml-2">
                {getUrgentDeliveries().length}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="drivers">Drivers</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          {renderOverviewTab()}
        </TabsContent>

        <TabsContent value="active">
          {renderActiveDeliveriesTab()}
        </TabsContent>

        <TabsContent value="drivers">
          {renderDriversTab()}
        </TabsContent>

        <TabsContent value="settings">
          <Card>
            <CardHeader>
              <CardTitle>Express Delivery Settings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div>
                  <h3 className="font-semibold mb-2">Priority Multipliers</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-sm font-medium">Express (1.5x)</label>
                      <input 
                        type="number" 
                        step="0.1" 
                        defaultValue="1.5" 
                        className="w-full border rounded px-3 py-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Urgent (2.0x)</label>
                      <input 
                        type="number" 
                        step="0.1" 
                        defaultValue="2.0" 
                        className="w-full border rounded px-3 py-1"
                      />
                    </div>
                    <div>
                      <label className="text-sm font-medium">Max Distance (km)</label>
                      <input 
                        type="number" 
                        defaultValue="15" 
                        className="w-full border rounded px-3 py-1"
                      />
                    </div>
                  </div>
                </div>
                
                <Button>Save Settings</Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ExpressAdminDashboard;
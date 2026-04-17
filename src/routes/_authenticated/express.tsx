import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
} from "recharts";
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
  Phone,
  MessageSquare,
  Eye,
  UserCheck,
  Timer,
} from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "@/lib/api";
import { formatExpressDeliveryId } from "@/lib/formatExpressDeliveryId";

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
  priorityLevel: "STANDARD" | "EXPRESS" | "URGENT";
  guaranteedDeliveryTime?: string;
  estimatedFee: number;
  expressMultiplier: number;
  createdAt: string;
  verificationStatus: string;
  verificationMethod?: string;
  paymentStatus?: "UNPAID" | "PAID" | "FAILED" | "REFUNDED";
  adminApprovedForPayment?: boolean;
  driverName?: string;
  senderName?: string;
  senderPhone?: string;
  receiverName?: string;
  receiverPhone?: string;
  timeRemaining?: number;
  isDelayed: boolean;
  actualDeliveryTime?: number;
  packageDescription?: string;
  customerNote?: string;
}

const ExpressDeliveryManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDelivery, setSelectedDelivery] =
    useState<ExpressDelivery | null>(null);
  const queryClient = useQueryClient();

  // Fetch Express metrics
  const { data: metrics, isLoading: metricsLoading } = useQuery<ExpressMetrics>(
    {
      queryKey: ["express-metrics"],
      queryFn: () =>
        adminApi.getExpressMetrics().then((res) => res.data?.data ?? res.data),
      refetchInterval: 30000, // Refresh every 30 seconds
    },
  );

  // Fetch Express deliveries
  const { data: deliveries, isLoading: deliveriesLoading } = useQuery<
    ExpressDelivery[]
  >({
    queryKey: ["express-deliveries", statusFilter, priorityFilter],
    queryFn: () =>
      adminApi
        .getExpressDeliveries({
          isExpress: true,
          status: statusFilter !== "ALL" ? statusFilter : undefined,
          priorityLevel: priorityFilter !== "ALL" ? priorityFilter : undefined,
        })
        .then((res) => res.data?.data ?? res.data),
    refetchInterval: 15000, // Refresh every 15 seconds
  });

  // Fetch urgent deliveries
  const { data: urgentDeliveries } = useQuery<ExpressDelivery[]>({
    queryKey: ["urgent-express-deliveries"],
    queryFn: () =>
      adminApi
        .getUrgentExpressDeliveries()
        .then((res) => res.data?.data ?? res.data),
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  // Approve request for payment mutation
  const approveForPaymentMutation = useMutation({
    mutationFn: (deliveryId: string) =>
      adminApi.approveExpressDeliveryForPayment(deliveryId),
    onSuccess: () => {
      toast.success("Delivery approved for payment");
      queryClient.invalidateQueries({ queryKey: ["express-deliveries"] });
      queryClient.invalidateQueries({ queryKey: ["urgent-express-deliveries"] });
    },
    onError: (error: any) => {
      toast.error(`Failed to approve delivery: ${error.message}`);
    },
  });

  // Assign delivery mutation
  const assignDeliveryMutation = useMutation({
    mutationFn: (deliveryId: string) =>
      adminApi.assignExpressDelivery(deliveryId),
    onSuccess: () => {
      toast.success("Delivery assigned successfully");
      queryClient.invalidateQueries({ queryKey: ["express-deliveries"] });
    },
    onError: (error: any) => {
      toast.error(`Failed to assign delivery: ${error.message}`);
    },
  });

  // Confirm delivery mutation
  const confirmDeliveryMutation = useMutation({
    mutationFn: ({
      deliveryId,
      reason,
    }: {
      deliveryId: string;
      reason: string;
    }) => adminApi.confirmExpressDelivery(deliveryId, reason),
    onSuccess: () => {
      toast.success("Delivery confirmed successfully");
      queryClient.invalidateQueries({ queryKey: ["express-deliveries"] });
      setSelectedDelivery(null);
    },
    onError: (error: any) => {
      toast.error(`Failed to confirm delivery: ${error.message}`);
    },
  });

  // Filter deliveries
  const filteredDeliveries =
    deliveries?.filter((delivery) => {
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          delivery.id.toLowerCase().includes(query) ||
          delivery.pickupAddress.toLowerCase().includes(query) ||
          delivery.dropoffAddress.toLowerCase().includes(query) ||
          delivery.senderName?.toLowerCase().includes(query) ||
          delivery.receiverName?.toLowerCase().includes(query)
        );
      }
      return true;
    }) || [];

  const handleAssignDelivery = (deliveryId: string) => {
    assignDeliveryMutation.mutate(deliveryId);
  };

  const handleApproveForPayment = (deliveryId: string) => {
    approveForPaymentMutation.mutate(deliveryId);
  };

  const handleConfirmDelivery = (reason: string) => {
    if (selectedDelivery) {
      confirmDeliveryMutation.mutate({
        deliveryId: selectedDelivery.id,
        reason,
      });
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return "bg-red-100 text-red-800 border-red-200";
      case "EXPRESS":
        return "bg-orange-100 text-orange-800 border-orange-200";
      default:
        return "bg-green-100 text-green-800 border-green-200";
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "DRIVER_ASSIGNED":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "PICKED_UP":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "IN_TRANSIT":
        return "bg-indigo-100 text-indigo-800 border-indigo-200";
      case "DELIVERED":
        return "bg-green-100 text-green-800 border-green-200";
      case "CANCELLED":
        return "bg-red-100 text-red-800 border-red-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getPaymentStatusColor = (status?: string) => {
    switch (status) {
      case "PAID":
        return "bg-green-100 text-green-800 border-green-200";
      case "FAILED":
        return "bg-red-100 text-red-800 border-red-200";
      case "REFUNDED":
        return "bg-slate-100 text-slate-800 border-slate-200";
      default:
        return "bg-amber-100 text-amber-800 border-amber-200";
    }
  };

  const formatTimeRemaining = (guaranteedTime?: string) => {
    if (!guaranteedTime) return "No deadline";

    const deadline = new Date(guaranteedTime);
    const now = new Date();
    const diffMs = deadline.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins <= 0) return "⚠️ OVERDUE";
    if (diffMins < 60) return `${diffMins}m remaining`;

    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return `${hours}h ${mins}m remaining`;
  };

  const formatCurrency = (amount: number) => `D${amount.toLocaleString()}`;

  const todayStats = metrics?.todayStats ?? {
    totalExpressDeliveries: 0,
    averageDeliveryTime: 0,
    averageExpressFee: 0,
    onTimeRate: 0,
  };

  const priorityBreakdown = metrics?.priorityBreakdown ?? [];
  const vehiclePerformance = metrics?.vehiclePerformance ?? [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Express Delivery Management
          </h1>
          <p className="text-gray-600 mt-1">
            Monitor and manage Express deliveries in real-time
          </p>
        </div>
        <div className="flex items-center gap-4">
          <Button
            onClick={() =>
              queryClient.invalidateQueries({
                queryKey: ["express-deliveries"],
              })
            }
            variant="outline"
            size="sm"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Urgent Alerts */}
      {urgentDeliveries && urgentDeliveries.length > 0 && (
        <Alert className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4 text-red-600" />
          <AlertDescription className="text-red-800">
            <strong>{urgentDeliveries.length} urgent Express deliveries</strong>{" "}
            require immediate attention!
          </AlertDescription>
        </Alert>
      )}

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="deliveries">Live Deliveries</TabsTrigger>
          <TabsTrigger value="urgent">Urgent Queue</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          {metricsLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[...Array(4)].map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-4 w-3/4 mb-2" />
                    <Skeleton className="h-8 w-1/2" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        Total Express Today
                      </p>
                      <p className="text-2xl font-bold text-gray-900">
                        {todayStats.totalExpressDeliveries || 0}
                      </p>
                    </div>
                    <Zap className="h-8 w-8 text-orange-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        Avg. Delivery Time
                      </p>
                      <p className="text-2xl font-bold text-gray-900">
                        {Math.round(todayStats.averageDeliveryTime || 0)}
                        m
                      </p>
                    </div>
                    <Clock className="h-8 w-8 text-blue-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        On-Time Rate
                      </p>
                      <p className="text-2xl font-bold text-gray-900">
                        {Math.round((todayStats.onTimeRate || 0) * 100)}
                        %
                      </p>
                    </div>
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">
                        Avg. Express Fee
                      </p>
                      <p className="text-2xl font-bold text-gray-900">
                        {formatCurrency(todayStats.averageExpressFee || 0)}
                      </p>
                    </div>
                    <DollarSign className="h-8 w-8 text-purple-600" />
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Charts */}
          {metrics && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <Card>
                <CardHeader>
                  <CardTitle>Priority Distribution</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={priorityBreakdown.map((item) => ({
                          name: item.priorityLevel,
                          value: item._count.id,
                          fill:
                            item.priorityLevel === "URGENT"
                              ? "#DC2626"
                              : item.priorityLevel === "EXPRESS"
                                ? "#D97706"
                                : "#059669",
                        }))}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) =>
                          `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                        }
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      />
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Vehicle Performance</CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={vehiclePerformance}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="vehicleType" />
                      <YAxis />
                      <Tooltip />
                      <Bar
                        dataKey="_count.id"
                        fill="#8884d8"
                        name="Deliveries"
                      />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        {/* Live Deliveries Tab */}
        <TabsContent value="deliveries" className="space-y-6">
          {/* Filters */}
          <div className="flex flex-wrap gap-4">
            <Input
              placeholder="Search deliveries..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="max-w-sm"
            />

            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="DRIVER_ASSIGNED">Driver Assigned</SelectItem>
                <SelectItem value="PICKED_UP">Picked Up</SelectItem>
                <SelectItem value="IN_TRANSIT">In Transit</SelectItem>
                <SelectItem value="DELIVERED">Delivered</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>

            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="w-40">
                <SelectValue placeholder="Priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Priorities</SelectItem>
                <SelectItem value="URGENT">Urgent</SelectItem>
                <SelectItem value="EXPRESS">Express</SelectItem>
                <SelectItem value="STANDARD">Standard</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Deliveries Table */}
          <Card>
            <CardHeader>
              <CardTitle>
                Express Deliveries ({filteredDeliveries.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {deliveriesLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12" />
                  ))}
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>ID</TableHead>
                      <TableHead>Priority</TableHead>
                      <TableHead>Route</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Driver</TableHead>
                      <TableHead>Time Remaining</TableHead>
                      <TableHead>Fee</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredDeliveries.map((delivery) => (
                      <TableRow key={delivery.id}>
                        <TableCell className="font-mono text-sm">
                          {formatExpressDeliveryId(delivery.id)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={getPriorityColor(delivery.priorityLevel)}
                          >
                            {delivery.priorityLevel}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="max-w-xs">
                            <p className="text-sm font-medium truncate">
                              {delivery.pickupAddress}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              → {delivery.dropoffAddress}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={getStatusColor(delivery.status)}
                          >
                            {delivery.status.replace("_", " ")}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <Badge
                              variant="outline"
                              className={getPaymentStatusColor(
                                delivery.paymentStatus,
                              )}
                            >
                              {delivery.paymentStatus || "UNPAID"}
                            </Badge>
                            <Badge
                              variant="outline"
                              className={
                                delivery.adminApprovedForPayment
                                  ? "bg-green-100 text-green-800 border-green-200"
                                  : "bg-yellow-100 text-yellow-800 border-yellow-200"
                              }
                            >
                              {delivery.adminApprovedForPayment
                                ? "Approved"
                                : "Awaiting Review"}
                            </Badge>
                          </div>
                        </TableCell>
                        <TableCell>
                          {delivery.driverName || (
                            <span className="text-gray-400 text-sm">
                              Unassigned
                            </span>
                          )}
                        </TableCell>
                        <TableCell>
                          <span
                            className={
                              delivery.isDelayed
                                ? "text-red-600 font-semibold"
                                : ""
                            }
                          >
                            {formatTimeRemaining(
                              delivery.guaranteedDeliveryTime,
                            )}
                          </span>
                        </TableCell>
                        <TableCell className="font-semibold">
                          {formatCurrency(delivery.estimatedFee)}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Dialog>
                              <DialogTrigger asChild>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setSelectedDelivery(delivery)}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-2xl">
                                <DialogHeader>
                                  <DialogTitle>
                                    Express Delivery 
                                    {formatExpressDeliveryId(delivery.id)}
                                  </DialogTitle>
                                  <DialogDescription>
                                    Delivery details and verification options
                                  </DialogDescription>
                                </DialogHeader>

                                {selectedDelivery && (
                                  <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <h4 className="font-medium text-gray-900">
                                          Pickup
                                        </h4>
                                        <p className="text-sm text-gray-600">
                                          {selectedDelivery.pickupAddress}
                                        </p>
                                      </div>
                                      <div>
                                        <h4 className="font-medium text-gray-900">
                                          Dropoff
                                        </h4>
                                        <p className="text-sm text-gray-600">
                                          {selectedDelivery.dropoffAddress}
                                        </p>
                                      </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                      <div>
                                        <h4 className="font-medium text-gray-900">
                                          Sender
                                        </h4>
                                        <p className="text-sm text-gray-600">
                                          {selectedDelivery.senderName}
                                          <br />
                                          <span className="font-mono">
                                            {selectedDelivery.senderPhone}
                                          </span>
                                        </p>
                                      </div>
                                      <div>
                                        <h4 className="font-medium text-gray-900">
                                          Receiver
                                        </h4>
                                        <p className="text-sm text-gray-600">
                                          {selectedDelivery.receiverName}
                                          <br />
                                          <span className="font-mono">
                                            {selectedDelivery.receiverPhone}
                                          </span>
                                        </p>
                                      </div>
                                    </div>

                                    {selectedDelivery.packageDescription && (
                                      <div>
                                        <h4 className="font-medium text-gray-900">
                                          Package Description
                                        </h4>
                                        <p className="text-sm text-gray-600">
                                          {selectedDelivery.packageDescription}
                                        </p>
                                      </div>
                                    )}

                                    {selectedDelivery.verificationStatus ===
                                      "PENDING" && (
                                      <div className="flex gap-2 pt-4">
                                        <Button
                                          onClick={() =>
                                            handleConfirmDelivery(
                                              "Admin confirmed via phone verification",
                                            )
                                          }
                                          size="sm"
                                          disabled={
                                            confirmDeliveryMutation.isPending
                                          }
                                        >
                                          <Phone className="h-4 w-4 mr-2" />
                                          Confirm via Phone
                                        </Button>
                                        <Button
                                          onClick={() =>
                                            handleConfirmDelivery(
                                              "Admin confirmed via customer contact",
                                            )
                                          }
                                          variant="outline"
                                          size="sm"
                                          disabled={
                                            confirmDeliveryMutation.isPending
                                          }
                                        >
                                          <MessageSquare className="h-4 w-4 mr-2" />
                                          Confirm via SMS
                                        </Button>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </DialogContent>
                            </Dialog>

                            {delivery.status === "PENDING" &&
                              !delivery.driverName && (
                                <>
                                  {!delivery.adminApprovedForPayment && (
                                    <Button
                                      onClick={() =>
                                        handleApproveForPayment(delivery.id)
                                      }
                                      size="sm"
                                      variant="outline"
                                      disabled={approveForPaymentMutation.isPending}
                                    >
                                      Approve For Payment
                                    </Button>
                                  )}

                                  <Button
                                    onClick={() =>
                                      handleAssignDelivery(delivery.id)
                                    }
                                    size="sm"
                                    disabled={
                                      assignDeliveryMutation.isPending ||
                                      delivery.paymentStatus !== "PAID"
                                    }
                                  >
                                    <UserCheck className="h-4 w-4 mr-2" />
                                    {delivery.paymentStatus === "PAID"
                                      ? "Assign Fallback"
                                      : "Await Payment"}
                                  </Button>
                                </>
                              )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Urgent Queue Tab */}
        <TabsContent value="urgent" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                Urgent Express Deliveries ({urgentDeliveries?.length || 0})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {urgentDeliveries && urgentDeliveries.length > 0 ? (
                <div className="space-y-4">
                  {urgentDeliveries.map((delivery) => (
                    <div
                      key={delivery.id}
                      className="border border-red-200 rounded-lg p-4 bg-red-50"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-red-900">
                            {formatExpressDeliveryId(delivery.id)}
                          </h4>
                          <p className="text-sm text-red-700">
                            {delivery.pickupAddress} → {delivery.dropoffAddress}
                          </p>
                          <p className="text-xs text-red-600 mt-1">
                            {formatTimeRemaining(
                              delivery.guaranteedDeliveryTime,
                            )}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className="bg-red-100 text-red-800 border-red-200"
                          >
                            {delivery.priorityLevel}
                          </Badge>
                          {delivery.status === "PENDING" && (
                            <div className="flex items-center gap-2">
                              {!delivery.adminApprovedForPayment && (
                                <Button
                                  onClick={() =>
                                    handleApproveForPayment(delivery.id)
                                  }
                                  size="sm"
                                  variant="outline"
                                  disabled={approveForPaymentMutation.isPending}
                                >
                                  Approve
                                </Button>
                              )}
                              <Button
                                onClick={() => handleAssignDelivery(delivery.id)}
                                size="sm"
                                className="bg-red-600 hover:bg-red-700"
                                disabled={
                                  assignDeliveryMutation.isPending ||
                                  delivery.paymentStatus !== "PAID"
                                }
                              >
                                <Timer className="h-4 w-4 mr-2" />
                                {delivery.paymentStatus === "PAID"
                                  ? "Urgent Assign Fallback"
                                  : "Await Payment"}
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <CheckCircle className="h-12 w-12 text-green-600 mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900">
                    All Clear!
                  </h3>
                  <p className="text-gray-600">
                    No urgent Express deliveries at the moment.
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <div className="text-center py-12">
            <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900">
              Advanced Analytics
            </h3>
            <p className="text-gray-600">
              Detailed Express delivery analytics and performance reports coming
              soon.
            </p>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export const Route = createFileRoute("/_authenticated/express")({
  component: ExpressDeliveryManagement,
});

export default ExpressDeliveryManagement;

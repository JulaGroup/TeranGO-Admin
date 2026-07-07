import React, { useState } from "react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
  Tooltip as ChartTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
} from "recharts";
import {
  Zap,
  Clock,
  TrendingUp,
  Package,
  AlertTriangle,
  CheckCircle2,
  DollarSign,
  RefreshCw,
  Phone,
  MessageSquare,
  Eye,
  UserCheck,
  Timer,
  Search,
  MoreHorizontal,
  XCircle,
  CreditCard,
  SlidersHorizontal,
  User,
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
  arrivedAt?: string;
}

const PRIORITY_STYLES: Record<string, string> = {
  URGENT: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200",
  EXPRESS: "bg-orange-50 text-orange-700 ring-1 ring-inset ring-orange-200",
  STANDARD: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
};

const PRIORITY_DOT: Record<string, string> = {
  URGENT: "bg-red-500",
  EXPRESS: "bg-orange-500",
  STANDARD: "bg-emerald-500",
};

const STATUS_STYLES: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200",
  DRIVER_ASSIGNED: "bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-200",
  PICKED_UP: "bg-violet-50 text-violet-700 ring-1 ring-inset ring-violet-200",
  IN_TRANSIT: "bg-indigo-50 text-indigo-700 ring-1 ring-inset ring-indigo-200",
  ARRIVED: "bg-teal-50 text-teal-700 ring-1 ring-inset ring-teal-200",
  DELIVERED:
    "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
  CANCELLED: "bg-gray-100 text-gray-600 ring-1 ring-inset ring-gray-200",
};

const PAYMENT_STYLES: Record<string, string> = {
  PAID: "bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200",
  FAILED: "bg-red-50 text-red-700 ring-1 ring-inset ring-red-200",
  REFUNDED: "bg-slate-100 text-slate-600 ring-1 ring-inset ring-slate-200",
  UNPAID: "bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200",
};

const ExpressDeliveryManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDelivery, setSelectedDelivery] =
    useState<ExpressDelivery | null>(null);
  const queryClient = useQueryClient();

  const { data: metrics, isLoading: metricsLoading } = useQuery<ExpressMetrics>(
    {
      queryKey: ["express-metrics"],
      queryFn: () =>
        adminApi.getExpressMetrics().then((res) => res.data?.data ?? res.data),
      refetchInterval: 30000,
    },
  );

  const {
    data: deliveries,
    isLoading: deliveriesLoading,
    isFetching: deliveriesFetching,
  } = useQuery<ExpressDelivery[]>({
    queryKey: ["express-deliveries", statusFilter, priorityFilter],
    queryFn: () =>
      adminApi
        .getExpressDeliveries({
          isExpress: true,
          status: statusFilter !== "ALL" ? statusFilter : undefined,
          priorityLevel: priorityFilter !== "ALL" ? priorityFilter : undefined,
        })
        .then((res) => res.data?.data ?? res.data),
    refetchInterval: 15000,
  });

  const { data: urgentDeliveries } = useQuery<ExpressDelivery[]>({
    queryKey: ["urgent-express-deliveries"],
    queryFn: () =>
      adminApi
        .getUrgentExpressDeliveries()
        .then((res) => res.data?.data ?? res.data),
    refetchInterval: 10000,
  });

  const approveForPaymentMutation = useMutation({
    mutationFn: (deliveryId: string) =>
      adminApi.approveExpressDeliveryForPayment(deliveryId),
    onSuccess: () => {
      toast.success("Delivery approved for payment");
      queryClient.invalidateQueries({ queryKey: ["express-deliveries"] });
      queryClient.invalidateQueries({
        queryKey: ["urgent-express-deliveries"],
      });
    },
    onError: (error: any) => {
      toast.error(`Failed to approve delivery: ${error.message}`);
    },
  });

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

  const cancelDeliveryMutation = useMutation({
    mutationFn: ({
      deliveryId,
      reason,
    }: {
      deliveryId: string;
      reason?: string;
    }) => adminApi.cancelExpressDelivery(deliveryId, reason),
    onSuccess: () => {
      toast.success("Delivery cancelled");
      queryClient.invalidateQueries({ queryKey: ["express-deliveries"] });
      queryClient.invalidateQueries({
        queryKey: ["urgent-express-deliveries"],
      });
    },
    onError: (error: any) => {
      toast.error(`Failed to cancel delivery: ${error.message}`);
    },
  });

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

  const hasActiveFilters =
    statusFilter !== "ALL" || priorityFilter !== "ALL" || searchQuery !== "";

  const clearFilters = () => {
    setStatusFilter("ALL");
    setPriorityFilter("ALL");
    setSearchQuery("");
  };

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

  const handleCancelDelivery = (deliveryId: string) => {
    const reason = window.prompt("Reason for cancelling this delivery:");
    if (reason === null) return;
    cancelDeliveryMutation.mutate({ deliveryId, reason: reason || undefined });
  };

  const formatTimeRemaining = (guaranteedTime?: string) => {
    if (!guaranteedTime) return { label: "No deadline", urgent: false };

    const deadline = new Date(guaranteedTime);
    const now = new Date();
    const diffMs = deadline.getTime() - now.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));

    if (diffMins <= 0) return { label: "Overdue", urgent: true };
    if (diffMins < 60)
      return { label: `${diffMins}m left`, urgent: diffMins < 15 };

    const hours = Math.floor(diffMins / 60);
    const mins = diffMins % 60;
    return { label: `${hours}h ${mins}m left`, urgent: false };
  };

  const formatCurrency = (amount: number) => `D${amount.toLocaleString()}`;

  const initials = (name?: string) =>
    name
      ? name
          .split(" ")
          .map((n) => n[0])
          .slice(0, 2)
          .join("")
          .toUpperCase()
      : "?";

  const todayStats = metrics?.todayStats ?? {
    totalExpressDeliveries: 0,
    averageDeliveryTime: 0,
    averageExpressFee: 0,
    onTimeRate: 0,
  };

  const priorityBreakdown = metrics?.priorityBreakdown ?? [];
  const vehiclePerformance = metrics?.vehiclePerformance ?? [];

  const kpis = [
    {
      label: "Express deliveries today",
      value: todayStats.totalExpressDeliveries || 0,
      icon: Zap,
      accent: "bg-orange-50 text-orange-600",
    },
    {
      label: "Avg. delivery time",
      value: `${Math.round(todayStats.averageDeliveryTime || 0)}m`,
      icon: Clock,
      accent: "bg-blue-50 text-blue-600",
    },
    {
      label: "On-time rate",
      value: `${Math.round((todayStats.onTimeRate || 0) * 100)}%`,
      icon: CheckCircle2,
      accent: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "Avg. express fee",
      value: formatCurrency(todayStats.averageExpressFee || 0),
      icon: DollarSign,
      accent: "bg-purple-50 text-purple-600",
    },
  ];

  return (
    <TooltipProvider delayDuration={200}>
      <div className="space-y-6 pb-10">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-gray-900">
              Express delivery management
            </h1>
            <p className="mt-1 text-sm text-gray-500">
              Monitor and manage express deliveries in real time
            </p>
          </div>
          <Button
            onClick={() =>
              queryClient.invalidateQueries({
                queryKey: ["express-deliveries"],
              })
            }
            variant="outline"
            size="sm"
            className="gap-2"
          >
            <RefreshCw
              className={`h-4 w-4 ${deliveriesFetching ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>

        {/* Urgent alert */}
        {urgentDeliveries && urgentDeliveries.length > 0 && (
          <Alert className="flex items-center justify-between border-red-200 bg-red-50">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" />
              <AlertDescription className="text-red-800">
                <strong>{urgentDeliveries.length}</strong> urgent express{" "}
                {urgentDeliveries.length === 1
                  ? "delivery needs"
                  : "deliveries need"}{" "}
                immediate attention
              </AlertDescription>
            </div>
            <Button
              size="sm"
              variant="outline"
              className="border-red-300 bg-white text-red-700 hover:bg-red-100"
              onClick={() => setActiveTab("urgent")}
            >
              View queue
            </Button>
          </Alert>
        )}

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList>
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="deliveries">Live deliveries</TabsTrigger>
            <TabsTrigger value="urgent">
              Urgent queue
              {urgentDeliveries && urgentDeliveries.length > 0 && (
                <Badge className="ml-2 bg-red-600 px-1.5 py-0 text-[10px] hover:bg-red-600">
                  {urgentDeliveries.length}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          {/* Overview */}
          <TabsContent value="overview" className="space-y-6 pt-6">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {metricsLoading
                ? [...Array(4)].map((_, i) => (
                    <Card key={i} className="border-gray-200">
                      <CardContent className="p-5">
                        <Skeleton className="mb-3 h-4 w-2/3" />
                        <Skeleton className="h-7 w-1/3" />
                      </CardContent>
                    </Card>
                  ))
                : kpis.map((kpi) => (
                    <Card key={kpi.label} className="border-gray-200 shadow-sm">
                      <CardContent className="flex items-center justify-between p-5">
                        <div>
                          <p className="text-sm text-gray-500">{kpi.label}</p>
                          <p className="mt-1 text-2xl font-semibold text-gray-900">
                            {kpi.value}
                          </p>
                        </div>
                        <div
                          className={`flex h-11 w-11 items-center justify-center rounded-full ${kpi.accent}`}
                        >
                          <kpi.icon className="h-5 w-5" />
                        </div>
                      </CardContent>
                    </Card>
                  ))}
            </div>

            {metrics && (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Card className="border-gray-200 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base font-medium">
                      Priority distribution
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                      <PieChart>
                        <Pie
                          data={priorityBreakdown.map((item) => ({
                            name: item.priorityLevel,
                            value: item._count.id,
                            fill:
                              item.priorityLevel === "URGENT"
                                ? "#EF4444"
                                : item.priorityLevel === "EXPRESS"
                                  ? "#F97316"
                                  : "#10B981",
                          }))}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) =>
                            `${name} ${((percent ?? 0) * 100).toFixed(0)}%`
                          }
                          outerRadius={90}
                          dataKey="value"
                        />
                        <ChartTooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                <Card className="border-gray-200 shadow-sm">
                  <CardHeader>
                    <CardTitle className="text-base font-medium">
                      Vehicle performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={280}>
                      <BarChart data={vehiclePerformance}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                        <XAxis
                          dataKey="vehicleType"
                          tick={{ fontSize: 12, fill: "#64748B" }}
                        />
                        <YAxis tick={{ fontSize: 12, fill: "#64748B" }} />
                        <ChartTooltip />
                        <Bar
                          dataKey="_count.id"
                          fill="#6366F1"
                          radius={[6, 6, 0, 0]}
                          name="Deliveries"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              </div>
            )}
          </TabsContent>

          {/* Live deliveries */}
          <TabsContent value="deliveries" className="space-y-4 pt-6">
            <Card className="border-gray-200 shadow-sm">
              <CardContent className="flex flex-wrap items-center gap-3 p-4">
                <div className="relative min-w-[220px] flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Search by ID, address, or name…"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-44">
                    <SlidersHorizontal className="mr-1 h-3.5 w-3.5 text-gray-400" />
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All status</SelectItem>
                    <SelectItem value="PENDING">Pending</SelectItem>
                    <SelectItem value="DRIVER_ASSIGNED">
                      Driver assigned
                    </SelectItem>
                    <SelectItem value="PICKED_UP">Picked up</SelectItem>
                    <SelectItem value="IN_TRANSIT">In transit</SelectItem>
                    <SelectItem value="ARRIVED">Arrived</SelectItem>
                    <SelectItem value="DELIVERED">Delivered</SelectItem>
                    <SelectItem value="CANCELLED">Cancelled</SelectItem>
                  </SelectContent>
                </Select>

                <Select
                  value={priorityFilter}
                  onValueChange={setPriorityFilter}
                >
                  <SelectTrigger className="w-40">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL">All priorities</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                    <SelectItem value="EXPRESS">Express</SelectItem>
                    <SelectItem value="STANDARD">Standard</SelectItem>
                  </SelectContent>
                </Select>

                {hasActiveFilters && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={clearFilters}
                    className="gap-1.5 text-gray-500"
                  >
                    <XCircle className="h-3.5 w-3.5" />
                    Clear
                  </Button>
                )}

                <span className="ml-auto text-sm text-gray-500">
                  {filteredDeliveries.length}{" "}
                  {filteredDeliveries.length === 1 ? "result" : "results"}
                </span>
              </CardContent>
            </Card>

            <Card className="border-gray-200 shadow-sm">
              <CardContent className="p-0">
                {deliveriesLoading ? (
                  <div className="space-y-2 p-4">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                ) : filteredDeliveries.length === 0 ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-16 text-center">
                    <Package className="h-10 w-10 text-gray-300" />
                    <p className="font-medium text-gray-700">
                      No deliveries found
                    </p>
                    <p className="max-w-xs text-sm text-gray-500">
                      {hasActiveFilters
                        ? "Try adjusting your search or filters."
                        : "New express deliveries will show up here as they come in."}
                    </p>
                    {hasActiveFilters && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={clearFilters}
                      >
                        Clear filters
                      </Button>
                    )}
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead>Delivery</TableHead>
                        <TableHead>Route</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Payment</TableHead>
                        <TableHead>Driver</TableHead>
                        <TableHead>Deadline</TableHead>
                        <TableHead className="text-right">Fee</TableHead>
                        <TableHead className="w-10" />
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredDeliveries.map((delivery) => {
                        const remaining = formatTimeRemaining(
                          delivery.guaranteedDeliveryTime,
                        );
                        const needsFallback =
                          delivery.paymentStatus === "PAID" &&
                          !delivery.driverName &&
                          delivery.status === "PENDING";

                        return (
                          <TableRow key={delivery.id} className="align-top">
                            <TableCell className="py-3">
                              <div className="flex items-center gap-2">
                                <span
                                  className={`h-1.5 w-1.5 shrink-0 rounded-full ${PRIORITY_DOT[delivery.priorityLevel]}`}
                                />
                                <div>
                                  <p className="font-mono text-xs text-gray-700">
                                    {formatExpressDeliveryId(delivery.id)}
                                  </p>
                                  <Badge
                                    variant="outline"
                                    className={`mt-1 border-0 text-[11px] font-medium ${PRIORITY_STYLES[delivery.priorityLevel]}`}
                                  >
                                    {delivery.priorityLevel}
                                  </Badge>
                                </div>
                              </div>
                            </TableCell>

                            <TableCell className="max-w-[220px] py-3">
                              <p className="truncate text-sm font-medium text-gray-800">
                                {delivery.pickupAddress}
                              </p>
                              <p className="truncate text-xs text-gray-500">
                                → {delivery.dropoffAddress}
                              </p>
                            </TableCell>

                            <TableCell className="py-3">
                              <Badge
                                variant="outline"
                                className={`border-0 text-[11px] font-medium ${STATUS_STYLES[delivery.status] ?? "bg-gray-100 text-gray-600"}`}
                              >
                                {delivery.status.replace("_", " ")}
                              </Badge>
                            </TableCell>

                            <TableCell className="py-3">
                              <div className="flex flex-col gap-1">
                                <Badge
                                  variant="outline"
                                  className={`w-fit border-0 text-[11px] font-medium ${PAYMENT_STYLES[delivery.paymentStatus ?? "UNPAID"]}`}
                                >
                                  {delivery.paymentStatus || "UNPAID"}
                                </Badge>
                                {!delivery.adminApprovedForPayment && (
                                  <span className="text-[11px] text-gray-400">
                                    Awaiting review
                                  </span>
                                )}
                                {needsFallback && (
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <span className="flex w-fit items-center gap-1 text-[11px] font-medium text-red-600">
                                        <AlertTriangle className="h-3 w-3" />
                                        Auto-assign failed
                                      </span>
                                    </TooltipTrigger>
                                    <TooltipContent>
                                      No drivers were available — assign
                                      manually
                                    </TooltipContent>
                                  </Tooltip>
                                )}
                              </div>
                            </TableCell>

                            <TableCell className="py-3">
                              {delivery.driverName ? (
                                <div className="flex items-center gap-2">
                                  <div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-100 text-[10px] font-medium text-gray-600">
                                    {initials(delivery.driverName)}
                                  </div>
                                  <span className="text-sm text-gray-700">
                                    {delivery.driverName}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-sm text-gray-400">
                                  Unassigned
                                </span>
                              )}
                            </TableCell>

                            <TableCell className="py-3">
                              <span
                                className={`text-sm ${
                                  delivery.isDelayed || remaining.urgent
                                    ? "font-semibold text-red-600"
                                    : "text-gray-600"
                                }`}
                              >
                                {remaining.label}
                              </span>
                            </TableCell>

                            <TableCell className="py-3 text-right font-medium text-gray-800">
                              {formatCurrency(delivery.estimatedFee)}
                            </TableCell>

                            <TableCell className="py-3">
                              <div className="flex items-center justify-end gap-1">
                                <Dialog>
                                  <DialogTrigger asChild>
                                    <Tooltip>
                                      <TooltipTrigger asChild>
                                        <Button
                                          variant="ghost"
                                          size="icon"
                                          className="h-8 w-8"
                                          onClick={() =>
                                            setSelectedDelivery(delivery)
                                          }
                                          aria-label="View delivery details"
                                        >
                                          <Eye className="h-4 w-4 text-gray-500" />
                                        </Button>
                                      </TooltipTrigger>
                                      <TooltipContent>
                                        View details
                                      </TooltipContent>
                                    </Tooltip>
                                  </DialogTrigger>
                                  <DialogContent className="max-w-2xl">
                                    <DialogHeader>
                                      <DialogTitle>
                                        {formatExpressDeliveryId(delivery.id)}
                                      </DialogTitle>
                                      <DialogDescription>
                                        Delivery details and verification
                                        options
                                      </DialogDescription>
                                    </DialogHeader>

                                    {selectedDelivery && (
                                      <div className="space-y-4">
                                        <div className="grid grid-cols-2 gap-4">
                                          <div>
                                            <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                                              Pickup
                                            </h4>
                                            <p className="mt-1 text-sm text-gray-700">
                                              {selectedDelivery.pickupAddress}
                                            </p>
                                          </div>
                                          <div>
                                            <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                                              Dropoff
                                            </h4>
                                            <p className="mt-1 text-sm text-gray-700">
                                              {selectedDelivery.dropoffAddress}
                                            </p>
                                          </div>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                          <div>
                                            <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
                                              <User className="h-3 w-3" />{" "}
                                              Sender
                                            </h4>
                                            <p className="mt-1 text-sm text-gray-700">
                                              {selectedDelivery.senderName}
                                            </p>
                                            <p className="font-mono text-xs text-gray-500">
                                              {selectedDelivery.senderPhone}
                                            </p>
                                          </div>
                                          <div>
                                            <h4 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-400">
                                              <User className="h-3 w-3" />{" "}
                                              Receiver
                                            </h4>
                                            <p className="mt-1 text-sm text-gray-700">
                                              {selectedDelivery.receiverName}
                                            </p>
                                            <p className="font-mono text-xs text-gray-500">
                                              {selectedDelivery.receiverPhone}
                                            </p>
                                          </div>
                                        </div>

                                        {selectedDelivery.arrivedAt && (
                                          <div>
                                            <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                                              Arrived at destination
                                            </h4>
                                            <p className="mt-1 text-sm text-gray-700">
                                              {new Date(
                                                selectedDelivery.arrivedAt,
                                              ).toLocaleString()}
                                            </p>
                                          </div>
                                        )}

                                        {selectedDelivery.packageDescription && (
                                          <div>
                                            <h4 className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                                              Package description
                                            </h4>
                                            <p className="mt-1 text-sm text-gray-700">
                                              {
                                                selectedDelivery.packageDescription
                                              }
                                            </p>
                                          </div>
                                        )}

                                        {selectedDelivery.verificationStatus ===
                                          "PENDING" && (
                                          <div className="flex gap-2 border-t border-gray-100 pt-4">
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
                                              className="gap-2"
                                            >
                                              <Phone className="h-4 w-4" />
                                              Confirm via phone
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
                                              className="gap-2"
                                            >
                                              <MessageSquare className="h-4 w-4" />
                                              Confirm via SMS
                                            </Button>
                                          </div>
                                        )}
                                      </div>
                                    )}
                                  </DialogContent>
                                </Dialog>

                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                      aria-label="More actions"
                                    >
                                      <MoreHorizontal className="h-4 w-4 text-gray-500" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    {delivery.status === "PENDING" &&
                                      !delivery.driverName && (
                                        <>
                                          {!delivery.adminApprovedForPayment && (
                                            <DropdownMenuItem
                                              onClick={() =>
                                                handleApproveForPayment(
                                                  delivery.id,
                                                )
                                              }
                                              disabled={
                                                approveForPaymentMutation.isPending
                                              }
                                            >
                                              <CreditCard className="mr-2 h-4 w-4" />
                                              Approve for payment
                                            </DropdownMenuItem>
                                          )}
                                          <DropdownMenuItem
                                            onClick={() =>
                                              handleAssignDelivery(delivery.id)
                                            }
                                            disabled={
                                              assignDeliveryMutation.isPending ||
                                              delivery.paymentStatus !== "PAID"
                                            }
                                          >
                                            <UserCheck className="mr-2 h-4 w-4" />
                                            {delivery.paymentStatus === "PAID"
                                              ? "Assign fallback driver"
                                              : "Awaiting payment"}
                                          </DropdownMenuItem>
                                          <DropdownMenuSeparator />
                                        </>
                                      )}
                                    {delivery.status !== "DELIVERED" &&
                                      delivery.status !== "CANCELLED" && (
                                        <DropdownMenuItem
                                          onClick={() =>
                                            handleCancelDelivery(delivery.id)
                                          }
                                          disabled={
                                            cancelDeliveryMutation.isPending
                                          }
                                          className="text-red-600 focus:text-red-600"
                                        >
                                          <XCircle className="mr-2 h-4 w-4" />
                                          Cancel delivery
                                        </DropdownMenuItem>
                                      )}
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Urgent queue */}
          <TabsContent value="urgent" className="space-y-4 pt-6">
            {urgentDeliveries && urgentDeliveries.length > 0 ? (
              <div className="space-y-3">
                {urgentDeliveries.map((delivery) => {
                  const remaining = formatTimeRemaining(
                    delivery.guaranteedDeliveryTime,
                  );
                  return (
                    <Card
                      key={delivery.id}
                      className="border-red-200 bg-red-50/40 shadow-sm"
                    >
                      <CardContent className="flex flex-wrap items-center justify-between gap-4 p-4">
                        <div className="flex items-center gap-3">
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                            <Timer className="h-5 w-5 text-red-600" />
                          </div>
                          <div>
                            <p className="font-mono text-sm font-medium text-gray-900">
                              {formatExpressDeliveryId(delivery.id)}
                            </p>
                            <p className="text-sm text-gray-600">
                              {delivery.pickupAddress} →{" "}
                              {delivery.dropoffAddress}
                            </p>
                            <p
                              className={`mt-0.5 text-xs font-semibold ${remaining.urgent ? "text-red-600" : "text-gray-500"}`}
                            >
                              {remaining.label}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className="border-0 bg-red-100 text-red-700"
                          >
                            {delivery.priorityLevel}
                          </Badge>
                          {delivery.status === "PENDING" && (
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
                                  Approve
                                </Button>
                              )}
                              <Button
                                onClick={() =>
                                  handleAssignDelivery(delivery.id)
                                }
                                size="sm"
                                className="gap-1.5 bg-red-600 hover:bg-red-700"
                                disabled={
                                  assignDeliveryMutation.isPending ||
                                  delivery.paymentStatus !== "PAID"
                                }
                              >
                                <Timer className="h-4 w-4" />
                                {delivery.paymentStatus === "PAID"
                                  ? "Assign now"
                                  : "Await payment"}
                              </Button>
                            </>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="border-gray-200 shadow-sm">
                <CardContent className="flex flex-col items-center gap-2 py-16 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50">
                    <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                  </div>
                  <h3 className="font-medium text-gray-900">All clear</h3>
                  <p className="text-sm text-gray-500">
                    No urgent express deliveries at the moment.
                  </p>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Analytics */}
          <TabsContent value="analytics" className="pt-6">
            <Card className="border-gray-200 border-dashed shadow-none">
              <CardContent className="flex flex-col items-center gap-2 py-16 text-center">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-indigo-50">
                  <TrendingUp className="h-6 w-6 text-indigo-500" />
                </div>
                <h3 className="font-medium text-gray-900">
                  Advanced analytics
                </h3>
                <p className="max-w-sm text-sm text-gray-500">
                  Deeper performance breakdowns and trend reports for express
                  deliveries are on the way.
                </p>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </TooltipProvider>
  );
};

export const Route = createFileRoute("/_authenticated/express")({
  component: ExpressDeliveryManagement,
});

export default ExpressDeliveryManagement;

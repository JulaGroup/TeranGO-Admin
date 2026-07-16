// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { useState, useMemo } from "react";
import { format } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  Search,
  Eye,
  ShoppingCart,
  Clock,
  CheckCircle,
  Check,
  Truck,
  MapPin,
  Phone,
  User,
  Store,
  RefreshCw,
  XCircle,
  Package,
  ChefHat,
  Inbox,
  Gift,
  ArrowRight,
  ShoppingBag,
  Receipt,
  Banknote,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Undo2,
} from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "@/lib/api";
import type { Order, Driver } from "@/lib/types";
import { OrderLocationMap } from "@/components/order-location-map";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { ProfileDropdown } from "@/components/profile-dropdown";
import { ThemeSwitch } from "@/components/theme-switch";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

import type { AxiosError } from "axios";

export const Route = createFileRoute("/_authenticated/admin/orders/")({
  component: OrdersPage,
});

interface RawOrder {
  _id: string;
  id: string;
  userId: string;
  customerName: string;
  customerPhone: string;
  restaurant?: {
    id: string;
    name: string;
    phone: string;
    latitude?: number;
    longitude?: number;
  };
  shop?: {
    id: string;
    name: string;
    phone: string;
    latitude?: number;
    longitude?: number;
  };
  pharmacy?: {
    id: string;
    name: string;
    phone: string;
    latitude?: number;
    longitude?: number;
  };
  [key: string]: unknown;
}

// Helper to normalize order data from different API responses
const normalizeOrder = (order: RawOrder): Order => {
  const vendor = order.restaurant || order.shop || order.pharmacy;
  return {
    ...order,
    _id: order._id || order.id,
    id: order.id || order._id,
    user: {
      _id: order.userId,
      name: order.customerName,
      phoneNumber: order.customerPhone,
      phone: order.customerPhone,
    },
    vendor: {
      _id: vendor?.id,
      id: vendor?.id,
      shopName: vendor?.name,
      businessName: vendor?.name,
      phoneNumber: vendor?.phone,
      latitude: vendor?.latitude,
      longitude: vendor?.longitude,
    },
    restaurant: order.restaurant,
    shop: order.shop,
    pharmacy: order.pharmacy,
  } as Order;
};

function getAllowedTransitions(
  current,
  isDelivery,
  paymentStatus,
  isGiftOrder,
) {
  const isPaid = paymentStatus === "PAID";
  switch (current) {
    case "PENDING":
      return ["ACCEPTED", "CANCELLED"];
    case "ACCEPTED":
      return isPaid ? ["PROCESSING", "PREPARING"] : ["CANCELLED"];
    case "PROCESSING":
      return ["PREPARING", "READY"];
    case "PREPARING":
      return ["READY"];
    case "READY":
      return !isDelivery || isGiftOrder ? ["DELIVERED"] : [];
    default:
      return [];
  }
}

const ADMIN_STATUS_CONFIG = {
  PENDING: {
    label: "Pending",
    color: "text-orange-700",
    bg: "bg-orange-50 border-orange-200",
    icon: <Clock className="w-3 h-3" />,
  },
  ACCEPTED: {
    label: "Accepted",
    color: "text-blue-700",
    bg: "bg-blue-50 border-blue-200",
    icon: <CheckCircle className="w-3 h-3" />,
  },
  PROCESSING: {
    label: "Processing",
    color: "text-purple-700",
    bg: "bg-purple-50 border-purple-200",
    icon: <Package className="w-3 h-3" />,
  },
  PREPARING: {
    label: "Preparing",
    color: "text-yellow-700",
    bg: "bg-yellow-50 border-yellow-200",
    icon: <ChefHat className="w-3 h-3" />,
  },
  READY: {
    label: "Ready",
    color: "text-green-700",
    bg: "bg-green-50 border-green-200",
    icon: <ShoppingBag className="w-3 h-3" />,
  },
  DISPATCHED: {
    label: "Dispatched",
    color: "text-indigo-700",
    bg: "bg-indigo-50 border-indigo-200",
    icon: <Truck className="w-3 h-3" />,
  },
  DELIVERED: {
    label: "Delivered",
    color: "text-gray-700",
    bg: "bg-gray-50 border-gray-200",
    icon: <CheckCircle className="w-3 h-3" />,
  },
  CANCELLED: {
    label: "Cancelled",
    color: "text-red-700",
    bg: "bg-red-50 border-red-200",
    icon: <XCircle className="w-3 h-3" />,
  },
  CONFIRMED: {
    label: "Confirmed",
    color: "text-blue-700",
    bg: "bg-blue-50 border-blue-200",
    icon: <CheckCircle className="w-3 h-3" />,
  },
  IN_TRANSIT: {
    label: "In Transit",
    color: "text-indigo-700",
    bg: "bg-indigo-50 border-indigo-200",
    icon: <Truck className="w-3 h-3" />,
  },
};

const ORDER_STATUSES = [
  { value: "PENDING", label: "Pending", icon: Clock },
  { value: "CONFIRMED", label: "Confirmed", icon: CheckCircle },
  { value: "PREPARING", label: "Preparing", icon: ChefHat },
  { value: "READY", label: "Ready", icon: Package },
  { value: "IN_TRANSIT", label: "In Transit", icon: Truck },
  { value: "DELIVERED", label: "Delivered", icon: CheckCircle },
  { value: "CANCELLED", label: "Cancelled", icon: XCircle },
];

// Vehicle metadata — labels, emoji, and a rough max carrying weight (kg) used
// only to *recommend* a vehicle. It never restricts the choice: admins can
// still assign any driver to any order.
const VEHICLE_META: Record<
  string,
  { label: string; emoji: string; maxKg: number }
> = {
  BIKE: { label: "Motorbike", emoji: "🏍️", maxKg: 20 },
  CAR: { label: "Car", emoji: "🚗", maxKg: 40 },
  KEKE_CARGO: { label: "Keke Cargo", emoji: "🛺", maxKg: 250 },
  VAN: { label: "Van", emoji: "🚐", maxKg: 1000 },
  LORRY: { label: "Lorry", emoji: "🚚", maxKg: Infinity },
};

// Ascending carrying-capacity order, used to rank vehicles against an order.
const VEHICLE_CAPACITY_ORDER = ["BIKE", "CAR", "KEKE_CARGO", "VAN", "LORRY"];

const vehicleRank = (type?: string) => {
  const i = VEHICLE_CAPACITY_ORDER.indexOf(type || "");
  return i === -1 ? 0 : i;
};

// Suggest the smallest vehicle that can comfortably carry the order. Prefers an
// explicit requiredVehicleType from the backend, otherwise derives one from the
// order weight (e.g. a 50kg order → Keke Cargo).
const getRecommendedVehicleType = (order?: Order | null): string | null => {
  if (!order) return null;
  if (order.requiredVehicleType) return order.requiredVehicleType;
  const weight = Number(order.totalWeightKg);
  if (!weight || Number.isNaN(weight)) return null;
  return (
    VEHICLE_CAPACITY_ORDER.find((t) => weight <= VEHICLE_META[t].maxKg) ||
    "LORRY"
  );
};

const getStatusBadge = (status: string) => {
  const s = status?.toUpperCase();
  const statusConfig = ORDER_STATUSES.find((os) => os.value === s);
  const Icon = statusConfig?.icon || Package;
  const label = statusConfig?.label || status;

  if (s === "DELIVERED") {
    return (
      <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {label}
      </Badge>
    );
  }
  if (s === "CANCELLED") {
    return (
      <Badge variant="destructive" className="flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {label}
      </Badge>
    );
  }
  if (s === "IN_TRANSIT" || s === "DISPATCHED" || s === "CONFIRMED") {
    return (
      <Badge className="border border-blue-400 text-blue-600 bg-blue-50 dark:bg-blue-950/20 flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {label}
      </Badge>
    );
  }
  if (s === "PENDING" || s === "PREPARING") {
    return (
      <Badge className="border border-amber-400 text-amber-600 bg-amber-50 dark:bg-amber-950/20 flex items-center gap-1">
        <Icon className="h-3 w-3" />
        {label}
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="flex items-center gap-1">
      <Icon className="h-3 w-3" />
      {label}
    </Badge>
  );
};

function OrdersPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isAssignDriverOpen, setIsAssignDriverOpen] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [isCancelItemsOpen, setIsCancelItemsOpen] = useState(false);
  const [cancelItemsReason, setCancelItemsReason] = useState("");
  const [cancelItemsNote, setCancelItemsNote] = useState("");
  const [isMarkPaidOpen, setIsMarkPaidOpen] = useState(false);
  const [markPaidReference, setMarkPaidReference] = useState("");
  const [markPaidNote, setMarkPaidNote] = useState("");
  const [markPaidSendPayout, setMarkPaidSendPayout] = useState(false);
  const [isRefundOpen, setIsRefundOpen] = useState(false);
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [refundReference, setRefundReference] = useState("");
  const [refundNote, setRefundNote] = useState("");

  const {
    data: ordersResponse,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["orders", currentPage, statusFilter, searchQuery],
    queryFn: async () => {
      const response = await adminApi.getOrders({
        page: currentPage,
        limit: 20,
        status: statusFilter === "all" ? undefined : statusFilter,
        search: searchQuery || undefined,
      });
      return response.data;
    },
  });

  const orders = useMemo(
    () => (ordersResponse?.orders || []).map(normalizeOrder),
    [ordersResponse?.orders],
  );

  const paginationInfo = useMemo(
    () =>
      ordersResponse?.pagination || { page: 1, limit: 20, total: 0, pages: 0 },
    [ordersResponse?.pagination],
  );

  const stats = useMemo(() => {
    const base = ordersResponse?.stats || {};
    return {
      total: paginationInfo.total,
      pending:
        base.pending || orders.filter((o) => o.status === "PENDING").length,
      preparing:
        base.preparing ||
        orders.filter((o) => ["CONFIRMED", "PREPARING"].includes(o.status))
          .length,
      ready: base.ready || orders.filter((o) => o.status === "READY").length,
      delivered:
        base.delivered || orders.filter((o) => o.status === "DELIVERED").length,
    };
  }, [ordersResponse?.stats, orders, paginationInfo.total]);

  // Fetch ALL approved drivers so the admin can freely assign any of them.
  // The recommendation (by vehicle type/weight) is applied on top for guidance
  // only — it never removes a driver from the list.
  const { data: driversData } = useQuery<Driver[]>({
    queryKey: ["assignable-drivers"],
    queryFn: async () => {
      const response = await adminApi.getDrivers({ status: "approved" });
      const list = Array.isArray(response?.data)
        ? response.data
        : response?.data?.data || response?.data?.drivers || [];
      return Array.isArray(list) ? list : [];
    },
    enabled: isAssignDriverOpen,
  });

  const drivers: Driver[] = driversData || [];

  // Recommended vehicle for the order being assigned, plus drivers sorted so
  // suitable vehicles come first (recommended type → larger capacity → smaller).
  const recommendedVehicleType = useMemo(
    () => getRecommendedVehicleType(selectedOrder),
    [selectedOrder],
  );

  const sortedDrivers = useMemo(() => {
    if (!recommendedVehicleType) return drivers;
    const recRank = vehicleRank(recommendedVehicleType);
    const score = (d: Driver) => {
      const vt = d.vehicleType || "BIKE";
      if (vt === recommendedVehicleType) return 0; // exact recommendation
      if (vehicleRank(vt) >= recRank) return 1; // bigger, still capable
      return 2; // under recommended capacity
    };
    return [...drivers].sort((a, b) => {
      const s = score(a) - score(b);
      if (s !== 0) return s;
      return (b.isAvailable ? 1 : 0) - (a.isAvailable ? 1 : 0);
    });
  }, [drivers, recommendedVehicleType]);

  // Whether the currently picked driver's vehicle is below the recommendation.
  const selectedDriverUnderCapacity = useMemo(() => {
    if (!recommendedVehicleType || !selectedDriverId) return false;
    const d = drivers.find((dr) => dr.id === selectedDriverId);
    if (!d) return false;
    return vehicleRank(d.vehicleType || "BIKE") < vehicleRank(
      recommendedVehicleType,
    );
  }, [drivers, selectedDriverId, recommendedVehicleType]);

  const updateStatusMutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: string }) =>
      adminApi.updateOrderStatus(orderId, status),
    onSuccess: () => {
      toast.success("Order status updated");
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setIsDetailsOpen(false);
    },
    onError: (error: AxiosError<{ message: string }>) => {
      const message =
        error?.response?.data?.message ||
        error.message ||
        "Failed to update order";
      toast.error(message);
    },
  });

  const cancelItemsMutation = useMutation({
    mutationFn: ({
      orderId,
      itemIds,
      reason,
      note,
    }: {
      orderId: string;
      itemIds: string[];
      reason: string;
      note?: string;
    }) => adminApi.cancelOrderItems(orderId, itemIds, reason, note),
    onSuccess: (response) => {
      toast.success(
        response?.data?.fullyCancelled
          ? "All items cancelled — order has been cancelled"
          : "Selected items cancelled and customer notified",
      );
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setSelectedItemIds([]);
      setIsCancelItemsOpen(false);
      setCancelItemsReason("");
      setCancelItemsNote("");
    },
    onError: (error: AxiosError<{ error: string }>) => {
      const message =
        error?.response?.data?.error ||
        error.message ||
        "Failed to cancel items";
      toast.error(message);
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: ({
      orderId,
      sendVendorPayout,
      reference,
      note,
    }: {
      orderId: string;
      sendVendorPayout: boolean;
      reference?: string;
      note?: string;
    }) => adminApi.markOrderPaid(orderId, sendVendorPayout, reference, note),
    onSuccess: (response) => {
      const payout = response?.data?.payout;
      toast.success("Order marked as paid — customer and vendor notified");
      if (payout?.attempted) {
        if (payout.success) {
          toast.success(payout.message);
        } else {
          toast.warning(payout.message);
        }
      }
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setIsMarkPaidOpen(false);
      setIsDetailsOpen(false);
      setMarkPaidReference("");
      setMarkPaidNote("");
      setMarkPaidSendPayout(false);
    },
    onError: (error: AxiosError<{ error: string }>) => {
      const message =
        error?.response?.data?.error ||
        error.message ||
        "Failed to mark order as paid";
      toast.error(message);
    },
  });

  const refundMutation = useMutation({
    mutationFn: ({
      orderId,
      amount,
      reason,
      reference,
      note,
    }: {
      orderId: string;
      amount?: number;
      reason?: string;
      reference?: string;
      note?: string;
    }) => adminApi.refundOrder(orderId, amount, reason, reference, note),
    onSuccess: (response) => {
      const warnings = response?.data?.warnings;
      toast.success("Order marked as refunded");
      if (warnings?.vendorAlreadySettled) {
        toast.warning(
          "Vendor was already paid for this order — recover that money manually.",
        );
      }
      if (warnings?.driverAlreadySettled) {
        toast.warning(
          "Driver was already paid for this order — recover that money manually.",
        );
      }
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setIsRefundOpen(false);
      setIsDetailsOpen(false);
      setRefundAmount("");
      setRefundReason("");
      setRefundReference("");
      setRefundNote("");
    },
    onError: (error: AxiosError<{ error: string }>) => {
      const message =
        error?.response?.data?.error ||
        error.message ||
        "Failed to mark order as refunded";
      toast.error(message);
    },
  });

  const assignDriverMutation = useMutation({
    mutationFn: ({
      orderId,
      driverId,
    }: {
      orderId: string;
      driverId: string;
    }) => adminApi.assignDriver(orderId, driverId),
    onSuccess: () => {
      toast.success("Driver assigned successfully");
      queryClient.invalidateQueries({ queryKey: ["orders"] });
      setIsAssignDriverOpen(false);
      setSelectedDriverId("");
    },
    onError: (error: AxiosError<{ message: string }>) => {
      const message =
        error?.response?.data?.message ||
        error.message ||
        "Failed to assign driver";
      toast.error(message);
    },
  });

  const handleViewDetails = (order) => {
    setSelectedOrder(order);
    setIsDetailsOpen(true);
    setSelectedItemIds([]);
  };

  const toggleItemSelected = (itemId: string) => {
    setSelectedItemIds((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId],
    );
  };

  const handleConfirmCancelItems = () => {
    if (!selectedOrder || selectedItemIds.length === 0 || !cancelItemsReason)
      return;
    cancelItemsMutation.mutate({
      orderId: selectedOrder._id || selectedOrder.id,
      itemIds: selectedItemIds,
      reason: cancelItemsReason,
      note: cancelItemsNote || undefined,
    });
  };

  const handleStatusUpdate = (status) => {
    if (!selectedOrder) return;
    if (status === "CANCELLED" && selectedOrder.paymentStatus === "PAID") {
      toast.error("Cannot cancel after payment received");
      return;
    }
    updateStatusMutation.mutate({
      orderId: selectedOrder._id || selectedOrder.id,
      status,
    });
  };

  const handleAssignDriverClick = (order) => {
    setSelectedOrder(order);
    setSelectedDriverId(order.driver?.id || "");
    setIsAssignDriverOpen(true);
  };

  const handleDriverAssign = () => {
    if (selectedOrder && selectedDriverId) {
      assignDriverMutation.mutate({
        orderId: selectedOrder._id || selectedOrder.id,
        driverId: selectedDriverId,
      });
    }
  };

  // Filter orders locally by search
  const filteredOrders = useMemo(() => {
    if (!searchQuery) return orders;
    const q = searchQuery.toLowerCase();
    return orders.filter(
      (o) =>
        o.id?.toLowerCase().includes(q) ||
        o.user?.name?.toLowerCase().includes(q) ||
        o.vendor?.shopName?.toLowerCase().includes(q),
    );
  }, [orders, searchQuery]);

  return (
    <>
      <Header fixed>
        <div className="ms-auto flex items-center gap-2">
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track and manage all customer orders
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => refetch()}
            variant="outline"
            size="sm"
            disabled={isLoading}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-5">
        <Card className="border-l-4 border-l-primary shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Orders
            </CardTitle>
            <ShoppingCart className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="text-xs text-muted-foreground mt-1">All time</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending
            </CardTitle>
            <Clock className="h-4 w-4 text-amber-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.pending}</div>
            <p className="text-xs text-muted-foreground mt-1">Awaiting action</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Preparing
            </CardTitle>
            <ChefHat className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.preparing}</div>
            <p className="text-xs text-muted-foreground mt-1">In progress</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Ready
            </CardTitle>
            <ShoppingBag className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.ready}</div>
            <p className="text-xs text-muted-foreground mt-1">For pickup/dispatch</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Delivered
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.delivered}</div>
            <p className="text-xs text-muted-foreground mt-1">Completed</p>
          </CardContent>
        </Card>
      </div>

      {/* Orders Table with integrated filters */}
      <Card className="shadow-sm overflow-hidden">
        <CardHeader className="border-b pb-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                className="pl-9 h-9 w-[260px]"
                placeholder="Search orders, customer, vendor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-[160px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Orders</SelectItem>
                {ORDER_STATUSES.map((s) => (
                  <SelectItem key={s.value} value={s.value}>
                    {s.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground mb-4 opacity-50" />
              <p className="text-sm text-muted-foreground">Loading orders...</p>
            </div>
          ) : filteredOrders.length > 0 ? (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead>Order</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Vendor</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Driver</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredOrders.map((order) => (
                      <TableRow
                        key={order.id}
                        className="hover:bg-muted/30 transition-colors"
                      >
                        <TableCell className="font-medium">
                          TG{order.id?.slice(-4).toUpperCase()}
                        </TableCell>
                        <TableCell>
                          <div>
                            <p className="font-medium flex items-center gap-1">
                              {order.user?.name || "Guest"}
                              {order.isGiftOrder && (
                                <span
                                  title="Gift order"
                                  className="text-base leading-none"
                                >
                                  🎁
                                </span>
                              )}
                            </p>
                            <p className="text-muted-foreground text-xs">
                              {order.user?.phoneNumber || order.user?.phone}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {order.vendor?.shopName ||
                            order.vendor?.businessName ||
                            "N/A"}
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground">
                          {order.items?.length || 0} item
                          {order.items?.length !== 1 ? "s" : ""}
                        </TableCell>
                        <TableCell>
                          <div className="space-y-0.5">
                            <p className="font-semibold text-sm">
                              D{order.totalAmount?.toFixed(2) || "0.00"}
                            </p>
                            {order.deliveryFee ? (
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <Truck className="h-2.5 w-2.5" />D
                                {order.deliveryFee.toFixed(2)} del.
                              </p>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>{getStatusBadge(order.status)}</TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-xs ${
                              order.paymentStatus === "PAID"
                                ? "border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/20"
                                : order.paymentStatus === "REFUNDED"
                                  ? "border-slate-300 bg-slate-50 text-slate-700 dark:bg-slate-900/20"
                                  : "border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-950/20"
                            }`}
                          >
                            {order.paymentStatus === "PAID" ? (
                              <Check className="h-3 w-3 mr-1" />
                            ) : order.paymentStatus === "REFUNDED" ? (
                              <Undo2 className="h-3 w-3 mr-1" />
                            ) : (
                              <Clock className="h-3 w-3 mr-1" />
                            )}
                            {order.paymentStatus || "PENDING"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {order.driver ? (
                            <div className="flex items-center gap-1">
                              <span className="text-sm">{order.driver.name}</span>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-6 px-1 text-xs text-blue-600 hover:text-blue-800"
                                onClick={() => handleAssignDriverClick(order)}
                                title="Change driver"
                              >
                                <RefreshCw className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleAssignDriverClick(order)}
                              disabled={
                                order.status === "CANCELLED" ||
                                order.status === "DELIVERED"
                              }
                            >
                              <Truck className="mr-1 h-3 w-3" />
                              Assign
                            </Button>
                          )}
                        </TableCell>
                        <TableCell>
                          {format(new Date(order.createdAt), "MMM dd, yyyy")}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleViewDetails(order)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              {paginationInfo.pages > 1 && (
                <div className="flex items-center justify-between px-4 py-3 border-t">
                  <p className="text-sm text-muted-foreground">
                    Page {paginationInfo.page} of {paginationInfo.pages}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage((p) => p - 1)}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage >= paginationInfo.pages}
                      onClick={() => setCurrentPage((p) => p + 1)}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Inbox className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
              <p className="text-lg font-medium">No orders found</p>
              <p className="text-sm text-muted-foreground mt-1">
                Try adjusting your search or filters.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader className="border-b pb-4">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1">
                <DialogTitle className="text-xl flex items-center gap-2">
                  Order Details
                  {selectedOrder?.isGiftOrder && (
                    <Gift className="h-4 w-4 text-pink-500" />
                  )}
                </DialogTitle>
                <DialogDescription className="font-mono text-xs text-muted-foreground">
                  Full ID: {selectedOrder?.id || selectedOrder?._id}
                </DialogDescription>
              </div>
              <div className="flex items-center gap-2 pt-1 shrink-0">
                {getStatusBadge(selectedOrder?.status || "")}
                <Badge
                  variant="outline"
                  className={`text-xs ${
                    selectedOrder?.paymentStatus === "PAID"
                      ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                      : selectedOrder?.paymentStatus === "REFUNDED"
                        ? "border-slate-300 bg-slate-50 text-slate-700"
                        : "border-amber-300 bg-amber-50 text-amber-700"
                  }`}
                >
                  {selectedOrder?.paymentStatus === "PAID" ? (
                    <Check className="h-3 w-3 mr-1" />
                  ) : selectedOrder?.paymentStatus === "REFUNDED" ? (
                    <Undo2 className="h-3 w-3 mr-1" />
                  ) : (
                    <Clock className="h-3 w-3 mr-1" />
                  )}
                  {selectedOrder?.paymentStatus || "PENDING"}
                </Badge>
              </div>
            </div>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4 pr-1">
              {/* Customer Info */}
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-2">
                  <User className="h-3.5 w-3.5" />
                  {selectedOrder.isGiftOrder
                    ? "Ordering Customer"
                    : "Customer Information"}
                </p>
                <div className="grid grid-cols-2 gap-3 text-sm rounded-lg border p-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Name</p>
                    <p className="font-medium">{selectedOrder.user?.name || "N/A"}</p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="font-medium flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {selectedOrder.user?.phoneNumber ||
                        selectedOrder.user?.phone ||
                        "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Vendor Info */}
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-2">
                  <Store className="h-3.5 w-3.5" />
                  Vendor
                </p>
                <div className="grid grid-cols-2 gap-3 text-sm rounded-lg border p-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Name</p>
                    <p className="font-medium">
                      {selectedOrder.vendor?.shopName ||
                        selectedOrder.vendor?.businessName ||
                        "N/A"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Phone</p>
                    <p className="font-medium flex items-center gap-1">
                      <Phone className="h-3 w-3" />
                      {selectedOrder.vendor?.phoneNumber || "N/A"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Delivery */}
              {selectedOrder.orderType !== "PICKUP" && (
                <div>
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-2">
                    <MapPin className="h-3.5 w-3.5" />
                    Delivery Address
                  </p>
                  <div className="rounded-lg border p-3 text-sm">
                    {selectedOrder.address ||
                      (typeof selectedOrder.deliveryAddress === "string"
                        ? selectedOrder.deliveryAddress
                        : selectedOrder.deliveryAddress?.street) ||
                      "No address provided"}
                  </div>
                  {/* Map: vendor (origin) → customer (delivery) */}
                  {(selectedOrder.customerLatitude != null ||
                    selectedOrder.vendor?.latitude != null) && (
                    <div className="mt-2">
                      <OrderLocationMap
                        latitude={selectedOrder.customerLatitude}
                        longitude={selectedOrder.customerLongitude}
                        label={`Order #${selectedOrder.id?.slice(-6)?.toUpperCase?.() || ""} delivery location`}
                        originLatitude={selectedOrder.vendor?.latitude}
                        originLongitude={selectedOrder.vendor?.longitude}
                        originLabel={
                          selectedOrder.vendor?.shopName ||
                          selectedOrder.vendor?.businessName ||
                          "Vendor location"
                        }
                        height={260}
                      />
                      <div className="text-muted-foreground mt-1 text-xs flex flex-wrap gap-x-4">
                        {selectedOrder.vendor?.latitude != null && (
                          <span>
                            🏪 From:{" "}
                            {Number(selectedOrder.vendor.latitude).toFixed(6)},{" "}
                            {Number(selectedOrder.vendor.longitude).toFixed(6)}
                          </span>
                        )}
                        {selectedOrder.customerLatitude != null && (
                          <span>
                            📍 To:{" "}
                            {Number(selectedOrder.customerLatitude).toFixed(6)},{" "}
                            {Number(selectedOrder.customerLongitude).toFixed(6)}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Gift Recipient */}
              {selectedOrder.isGiftOrder && (
                <div className="rounded-lg border border-pink-200 bg-gradient-to-r from-pink-50 to-rose-50 p-3">
                  <p className="text-xs font-medium text-pink-700 uppercase tracking-wide mb-2 flex items-center gap-2">
                    <Gift className="h-3.5 w-3.5" />
                    Gift Recipient
                  </p>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    {selectedOrder.recipientName && (
                      <div>
                        <p className="text-xs text-muted-foreground">Recipient</p>
                        <p className="font-medium">{selectedOrder.recipientName}</p>
                      </div>
                    )}
                    {selectedOrder.recipientPhone && (
                      <div>
                        <p className="text-xs text-muted-foreground">Phone</p>
                        <p className="font-medium flex items-center gap-1">
                          <Phone className="h-3 w-3 text-pink-500" />
                          {selectedOrder.recipientPhone}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Order Items */}
              <div>
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2 flex items-center gap-2">
                  <Package className="h-3.5 w-3.5" />
                  Order Items
                  <span className="ml-auto normal-case text-muted-foreground font-normal">
                    {selectedOrder.items?.length || 0} item
                    {selectedOrder.items?.length !== 1 ? "s" : ""}
                  </span>
                </p>
                {!["CANCELLED", "DELIVERED"].includes(
                  selectedOrder.status,
                ) && (
                  <p className="text-xs text-muted-foreground mb-2">
                    Select unavailable products to cancel them individually.
                  </p>
                )}
                <div className="space-y-2">
                  {selectedOrder.items?.map((item, idx) => {
                    const name =
                      item.product?.name ||
                      item.menuItem?.name ||
                      item.medicine?.name ||
                      item.productName ||
                      "Product";
                    const imageUrl =
                      item.product?.imageUrl || item.menuItem?.imageUrl;
                    const itemId = item.id || item._id;
                    const isCancelled = item.status === "CANCELLED";
                    const canSelect =
                      !isCancelled &&
                      !["CANCELLED", "DELIVERED"].includes(
                        selectedOrder.status,
                      );
                    return (
                      <div
                        key={itemId || idx}
                        className={`flex items-center gap-3 rounded-lg border p-3 ${
                          isCancelled ? "bg-destructive/5 opacity-60" : "bg-muted/30"
                        }`}
                      >
                        {canSelect && (
                          <Checkbox
                            checked={selectedItemIds.includes(itemId)}
                            onCheckedChange={() => toggleItemSelected(itemId)}
                          />
                        )}
                        {imageUrl ? (
                          <img
                            src={imageUrl}
                            alt={name}
                            className="w-12 h-12 rounded-lg object-cover border shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded-lg bg-muted border flex items-center justify-center shrink-0">
                            <Package className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p
                            className={`font-medium text-sm leading-snug ${isCancelled ? "line-through" : ""}`}
                          >
                            {name}
                          </p>
                          <p className="text-muted-foreground text-xs mt-0.5">
                            {item.quantity} × D{item.price?.toFixed(2)}
                          </p>
                          {isCancelled && (
                            <p className="text-destructive text-xs mt-0.5">
                              Cancelled
                              {item.cancelReason
                                ? ` — ${item.cancelReason.replace(/_/g, " ").toLowerCase()}`
                                : ""}
                            </p>
                          )}
                        </div>
                        <p className="font-semibold text-sm text-right shrink-0">
                          D{(item.price * item.quantity).toFixed(2)}
                        </p>
                      </div>
                    );
                  })}
                </div>
                {selectedItemIds.length > 0 && (
                  <div className="mt-3">
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => setIsCancelItemsOpen(true)}
                    >
                      Cancel {selectedItemIds.length} selected item
                      {selectedItemIds.length !== 1 ? "s" : ""}
                    </Button>
                  </div>
                )}
              </div>

              {/* Promo Code Banner */}
              {selectedOrder.appliedPromoCode && (
                <div className="rounded-lg border border-purple-200 bg-purple-50 dark:bg-purple-900/20 dark:border-purple-800 p-3 flex items-start gap-3">
                  <Gift className="h-5 w-5 text-purple-600 dark:text-purple-400 shrink-0 mt-0.5" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm text-purple-800 dark:text-purple-300 flex items-center gap-2">
                      Promo Code Applied
                      <span className="font-mono bg-purple-100 dark:bg-purple-800 text-purple-700 dark:text-purple-200 px-2 py-0.5 rounded text-xs tracking-widest">
                        {selectedOrder.appliedPromoCode.code}
                      </span>
                    </p>
                    <p className="text-xs text-purple-700 dark:text-purple-400 mt-1">
                      {selectedOrder.appliedPromoCode.description ||
                        (selectedOrder.appliedPromoCode.type === "PERCENTAGE"
                          ? `${selectedOrder.appliedPromoCode.value}% off`
                          : `D${selectedOrder.appliedPromoCode.value} off`)}
                      {selectedOrder.appliedPromoCode.freeDelivery &&
                        " · Free delivery included"}
                    </p>
                  </div>
                  {selectedOrder.discountAmount != null &&
                    selectedOrder.discountAmount > 0 && (
                      <div className="text-right shrink-0">
                        <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                          Saved
                        </p>
                        <p className="font-bold text-purple-800 dark:text-purple-300 text-sm">
                          D{selectedOrder.discountAmount.toFixed(2)}
                        </p>
                      </div>
                    )}
                </div>
              )}

              {/* Financial Breakdown */}
              <div className="rounded-lg border overflow-hidden">
                <div className="bg-muted/50 px-4 py-2.5 border-b flex items-center gap-2">
                  <Receipt className="h-4 w-4 text-muted-foreground" />
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Financial Summary
                  </p>
                </div>
                <div className="p-4 space-y-2.5 text-sm">
                  {(() => {
                    const freeDelivery =
                      selectedOrder.appliedPromoCode?.freeDelivery === true;
                    // subtotalAmount from API, or fall back to calculation
                    const subtotal =
                      selectedOrder.subtotalAmount ??
                      (selectedOrder.totalAmount || 0) +
                        (selectedOrder.discountAmount || 0) -
                        (selectedOrder.deliveryFee || 0) -
                        (selectedOrder.serviceFee || 0);
                    // item-only discount (excludes delivery fee absorbed into discount)
                    const itemDiscount = freeDelivery
                      ? Math.max(
                          0,
                          (selectedOrder.discountAmount || 0) -
                            (selectedOrder.deliveryFee || 0),
                        )
                      : selectedOrder.discountAmount || 0;
                    return (
                      <>
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">
                            Items subtotal
                          </span>
                          <span className="font-medium">
                            D{subtotal.toFixed(2)}
                          </span>
                        </div>
                        {itemDiscount > 0 && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground flex items-center gap-1.5">
                              <Gift className="h-3 w-3 text-purple-500" />
                              Promo discount
                            </span>
                            <span className="font-medium text-purple-600">
                              −D{itemDiscount.toFixed(2)}
                            </span>
                          </div>
                        )}
                        {selectedOrder.deliveryFee != null && (
                          <div className="flex justify-between">
                            <span className="text-muted-foreground flex items-center gap-1.5">
                              <Truck className="h-3 w-3" />
                              Delivery fee
                            </span>
                            {freeDelivery ? (
                              <span className="flex items-center gap-1.5">
                                <span className="line-through text-muted-foreground text-xs">
                                  D{selectedOrder.deliveryFee.toFixed(2)}
                                </span>
                                <Badge className="text-xs bg-purple-100 text-purple-700 border-purple-300 h-5">
                                  FREE
                                </Badge>
                              </span>
                            ) : (
                              <span className="font-medium">
                                D{selectedOrder.deliveryFee.toFixed(2)}
                              </span>
                            )}
                          </div>
                        )}
                        {selectedOrder.serviceFee != null &&
                          selectedOrder.serviceFee > 0 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">
                                Platform fee
                              </span>
                              <span className="font-medium">
                                D{selectedOrder.serviceFee.toFixed(2)}
                              </span>
                            </div>
                          )}
                        <div className="flex justify-between border-t pt-2.5 font-bold text-base">
                          <span>Total charged</span>
                          <span className="text-emerald-700 dark:text-emerald-400">
                            D{selectedOrder.totalAmount?.toFixed(2)}
                          </span>
                        </div>
                        {freeDelivery && (
                          <p className="text-xs text-purple-600 dark:text-purple-400 flex items-center gap-1 border-t pt-2">
                            <Truck className="h-3 w-3" />
                            Driver earns on full delivery fee — platform absorbs
                            the D{selectedOrder.deliveryFee?.toFixed(2)} promo
                            cost.
                          </p>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Payment & Order Detail Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-lg border p-3 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Payment Method
                  </p>
                  <div className="flex items-center gap-2">
                    <Banknote className="h-4 w-4 text-muted-foreground" />
                    <span className="font-semibold text-sm">
                      {selectedOrder.paymentMethod || "N/A"}
                    </span>
                  </div>
                </div>
                <div className="rounded-lg border p-3 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Payment Status
                  </p>
                  <Badge
                    variant="outline"
                    className={`text-xs ${
                      selectedOrder.paymentStatus === "PAID"
                        ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                        : selectedOrder.paymentStatus === "REFUNDED"
                          ? "border-slate-300 bg-slate-50 text-slate-700"
                          : "border-amber-300 bg-amber-50 text-amber-700"
                    }`}
                  >
                    {selectedOrder.paymentStatus === "PAID" ? (
                      <Check className="h-3 w-3 mr-1" />
                    ) : selectedOrder.paymentStatus === "REFUNDED" ? (
                      <Undo2 className="h-3 w-3 mr-1" />
                    ) : (
                      <Clock className="h-3 w-3 mr-1" />
                    )}
                    {selectedOrder.paymentStatus || "PENDING"}
                  </Badge>
                  {selectedOrder.paymentStatus !== "PAID" &&
                    selectedOrder.paymentStatus !== "REFUNDED" &&
                    selectedOrder.status !== "CANCELLED" && (
                      <Button
                        variant="outline"
                        size="sm"
                        className="w-full mt-2 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                        onClick={() => setIsMarkPaidOpen(true)}
                      >
                        <Check className="h-3.5 w-3.5 mr-1" />
                        Mark as Paid
                      </Button>
                    )}
                  {selectedOrder.paymentStatus === "PAID" && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full mt-2 border-slate-300 text-slate-700 hover:bg-slate-50"
                      onClick={() => {
                        setRefundAmount(String(selectedOrder.totalAmount ?? ""));
                        setIsRefundOpen(true);
                      }}
                    >
                      <Undo2 className="h-3.5 w-3.5 mr-1" />
                      Mark as Refunded
                    </Button>
                  )}
                </div>
                <div className="rounded-lg border p-3 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Order Type
                  </p>
                  <div className="flex items-center gap-2">
                    {selectedOrder.orderType === "PICKUP" ? (
                      <Store className="h-4 w-4 text-muted-foreground" />
                    ) : (
                      <Truck className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="font-semibold text-sm">
                      {selectedOrder.orderType || "DELIVERY"}
                    </span>
                  </div>
                </div>
                <div className="rounded-lg border p-3 space-y-1">
                  <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    Order Status
                  </p>
                  {getStatusBadge(selectedOrder.status)}
                </div>
              </div>

              {/* Timestamps */}
              <div className="grid grid-cols-2 gap-3 text-xs text-muted-foreground">
                <div className="flex items-start gap-2 rounded-lg border p-3">
                  <Calendar className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <div>
                    <p className="font-medium text-foreground mb-0.5">
                      Order Placed
                    </p>
                    <p>{format(new Date(selectedOrder.createdAt), "PPp")}</p>
                  </div>
                </div>
                {selectedOrder.updatedAt && (
                  <div className="flex items-start gap-2 rounded-lg border p-3">
                    <RefreshCw className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-foreground mb-0.5">
                        Last Updated
                      </p>
                      <p>{format(new Date(selectedOrder.updatedAt), "PPp")}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Assigned Driver */}
              {selectedOrder.driver && (
                <div className="rounded-lg border p-4 bg-blue-50/50 dark:bg-blue-950/20">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide flex items-center gap-2">
                      <Truck className="h-3.5 w-3.5 text-blue-600" />
                      Assigned Driver
                    </p>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-xs"
                      onClick={() => {
                        setIsDetailsOpen(false);
                        handleAssignDriverClick(selectedOrder);
                      }}
                    >
                      <RefreshCw className="mr-1 h-3 w-3" />
                      Change
                    </Button>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-lg border-2 border-blue-200 shadow-md">
                      {selectedOrder.driver.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div className="flex-1 space-y-1 text-sm">
                      <p className="font-semibold">
                        {selectedOrder.driver.name}
                      </p>
                      <p className="text-muted-foreground flex items-center gap-1">
                        <Phone className="h-3 w-3" />
                        {selectedOrder.driver.phone ||
                          selectedOrder.driver.phoneNumber}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Status Update */}
              {(() => {
                const isDelivery = selectedOrder.orderType !== "PICKUP";
                const isPaid =
                  selectedOrder.paymentStatus === "PAID" ||
                  selectedOrder.paymentMethod === "CASH" ||
                  [
                    "PREPARING",
                    "PROCESSING",
                    "READY",
                    "DISPATCHED",
                    "DELIVERED",
                  ].includes(selectedOrder.status);
                const transitions = getAllowedTransitions(
                  selectedOrder.status,
                  isDelivery,
                  isPaid ? "PAID" : undefined,
                  selectedOrder.isGiftOrder,
                );
                if (transitions.length === 0) return null;
                return (
                  <div className="rounded-xl border overflow-hidden">
                    <div className="px-4 py-2.5 bg-muted/50 border-b flex items-center justify-between">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                        Update Status
                      </p>
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <span>Current:</span>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${
                            ADMIN_STATUS_CONFIG[selectedOrder.status]?.bg ??
                            "bg-muted border-border"
                          } ${ADMIN_STATUS_CONFIG[selectedOrder.status]?.color ?? "text-foreground"}`}
                        >
                          {ADMIN_STATUS_CONFIG[selectedOrder.status]?.icon}
                          {ADMIN_STATUS_CONFIG[selectedOrder.status]?.label ??
                            selectedOrder.status}
                        </span>
                      </div>
                    </div>
                    {selectedOrder.isGiftOrder &&
                      transitions.includes("DELIVERED") && (
                        <p className="px-4 pt-3 text-xs font-medium text-pink-700">
                          🎁 Gift order: confirm delivery with the driver via
                          Slack, then click Delivered.
                        </p>
                      )}
                    <div className="px-4 py-3 flex flex-wrap gap-2">
                      {transitions.map((t) => {
                        const cfg = ADMIN_STATUS_CONFIG[t];
                        const isCancel = t === "CANCELLED";
                        return (
                          <button
                            key={t}
                            onClick={() => handleStatusUpdate(t)}
                            disabled={updateStatusMutation.isPending}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold border transition-all disabled:opacity-50 ${
                              isCancel
                                ? "border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                                : "border-blue-300 bg-blue-500 text-white hover:bg-blue-600 shadow-sm"
                            }`}
                          >
                            {cfg?.icon}
                            Mark as {cfg?.label ?? t}
                            {!isCancel && <ArrowRight className="w-3 h-3" />}
                          </button>
                        );
                      })}
                    </div>
                    {isPaid && (
                      <p className="px-4 pb-3 text-xs text-muted-foreground">
                        Cancellation disabled — payment already received.
                      </p>
                    )}
                    {!isPaid && selectedOrder.status === "ACCEPTED" && (
                      <p className="px-4 pb-3 text-xs font-medium text-amber-600">
                        Waiting for customer payment before you can begin
                        processing.
                      </p>
                    )}
                  </div>
                );
              })()}

              {/* Admin override: mark a delivery order as delivered directly,
                  bypassing the normal driver QR-scan flow (e.g. driver
                  couldn't scan, phone confirmed with customer, etc). */}
              {(() => {
                const isDelivery = selectedOrder.orderType !== "PICKUP";
                const canOverride =
                  isDelivery &&
                  !selectedOrder.isGiftOrder &&
                  !["DELIVERED", "CANCELLED"].includes(selectedOrder.status) &&
                  ["READY", "DISPATCHED", "PREPARING", "PROCESSING"].includes(
                    selectedOrder.status,
                  );
                if (!canOverride) return null;
                return (
                  <div className="rounded-xl border border-amber-200 bg-amber-50 overflow-hidden mt-3">
                    <div className="px-4 py-2.5 border-b border-amber-200">
                      <p className="text-xs font-semibold text-amber-800 uppercase tracking-wide">
                        Manual Override
                      </p>
                    </div>
                    <div className="px-4 py-3">
                      <p className="text-xs text-amber-800 mb-2">
                        Confirmed the customer received their order some other
                        way (phone call, driver report, etc)? Mark it
                        delivered directly — this notifies both the customer
                        and driver.
                      </p>
                      <button
                        onClick={() => {
                          if (
                            window.confirm(
                              "Mark this order as delivered? This sends a push notification to the customer and driver.",
                            )
                          ) {
                            handleStatusUpdate("DELIVERED");
                          }
                        }}
                        disabled={updateStatusMutation.isPending}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold border border-amber-400 bg-amber-500 text-white hover:bg-amber-600 transition-all disabled:opacity-50"
                      >
                        <CheckCircle className="w-3.5 h-3.5" />
                        Mark as Delivered
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Assign Driver Dialog */}
      <Dialog open={isAssignDriverOpen} onOpenChange={setIsAssignDriverOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {selectedOrder?.driver ? "Change Driver" : "Assign Driver"}
            </DialogTitle>
            <DialogDescription>
              {selectedOrder?.driver
                ? `Currently assigned: ${selectedOrder.driver.name}. Select a different driver.`
                : `Select a driver for order TG${selectedOrder?.id?.slice(-4).toUpperCase()}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Recommendation banner — guidance only, not a restriction */}
            {recommendedVehicleType && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20 p-3">
                <p className="text-sm font-medium text-amber-800 dark:text-amber-300 flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  Recommended:{" "}
                  {VEHICLE_META[recommendedVehicleType]?.emoji}{" "}
                  {VEHICLE_META[recommendedVehicleType]?.label ||
                    recommendedVehicleType}
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-400 mt-1">
                  {selectedOrder?.totalWeightKg
                    ? `This order weighs about ${selectedOrder.totalWeightKg}kg. `
                    : ""}
                  Suitable vehicles are listed first — you're still free to
                  assign any driver.
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label>All Drivers</Label>
              <Select
                value={selectedDriverId}
                onValueChange={setSelectedDriverId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a driver" />
                </SelectTrigger>
                <SelectContent>
                  {sortedDrivers.map((driver) => {
                    const driverName =
                      driver.name ||
                      driver.user?.fullName ||
                      driver.user?.name ||
                      "Unknown";
                    const vt = driver.vehicleType || "BIKE";
                    const isRecommended =
                      recommendedVehicleType &&
                      vt === recommendedVehicleType;
                    const isUnderCapacity =
                      recommendedVehicleType &&
                      vehicleRank(vt) < vehicleRank(recommendedVehicleType);
                    return (
                      <SelectItem
                        key={driver.id}
                        value={driver.id || ""}
                        className="py-3"
                      >
                        <div className="flex items-center gap-3">
                          {driver.profileImageUrl ? (
                            <img
                              src={driver.profileImageUrl}
                              alt={driverName}
                              className="w-8 h-8 rounded-full object-cover border border-border"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-medium text-sm">
                              {driverName.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium">{driverName}</span>
                              {driver.vehicleType && (
                                <span className="text-xs bg-muted px-2 py-0.5 rounded">
                                  {VEHICLE_META[vt]?.emoji}{" "}
                                  {VEHICLE_META[vt]?.label || vt}
                                </span>
                              )}
                              {isRecommended && (
                                <span className="text-xs bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 px-2 py-0.5 rounded font-medium">
                                  ✓ Recommended
                                </span>
                              )}
                              {isUnderCapacity && (
                                <span className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 px-2 py-0.5 rounded font-medium">
                                  ⚠ May be too small
                                </span>
                              )}
                              {driver.isAvailable && (
                                <span
                                  className="w-2 h-2 bg-emerald-400 rounded-full"
                                  title="Available"
                                />
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {driver.user?.phone ||
                                driver.user?.phoneNumber ||
                                driver.phoneNumber}
                            </div>
                          </div>
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
              {selectedDriverUnderCapacity && (
                <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                  ⚠ This vehicle may be too small for a{" "}
                  {selectedOrder?.totalWeightKg
                    ? `${selectedOrder.totalWeightKg}kg `
                    : ""}
                  order. You can still assign it if you're sure.
                </p>
              )}
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsAssignDriverOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleDriverAssign}
              disabled={!selectedDriverId || assignDriverMutation.isPending}
            >
              {assignDriverMutation.isPending
                ? "Assigning..."
                : "Assign Driver"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCancelItemsOpen} onOpenChange={setIsCancelItemsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Cancel {selectedItemIds.length} item{selectedItemIds.length !== 1 ? "s" : ""}</DialogTitle>
            <DialogDescription>
              The customer will be notified with the reason below. Their
              refund will be tracked automatically.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Reason</Label>
              <Select
                value={cancelItemsReason}
                onValueChange={setCancelItemsReason}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="OUT_OF_STOCK">Out of stock</SelectItem>
                  <SelectItem value="PRODUCT_UNAVAILABLE">
                    Product unavailable
                  </SelectItem>
                  <SelectItem value="VENDOR_CLOSED">Vendor closed</SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Note (optional)</Label>
              <Textarea
                value={cancelItemsNote}
                onChange={(e) => setCancelItemsNote(e.target.value)}
                placeholder="Add any extra detail for this cancellation..."
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsCancelItemsOpen(false)}
            >
              Back
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmCancelItems}
              disabled={!cancelItemsReason || cancelItemsMutation.isPending}
            >
              {cancelItemsMutation.isPending
                ? "Cancelling..."
                : "Confirm Cancellation"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isMarkPaidOpen} onOpenChange={setIsMarkPaidOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mark Order as Paid</DialogTitle>
            <DialogDescription>
              Use this when the customer paid outside the app (e.g. direct
              Wave transfer). The order will continue through the normal flow
              and the customer and vendor will be notified.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="rounded-lg border p-3 text-sm flex items-center justify-between">
              <span className="text-muted-foreground">Amount</span>
              <span className="font-semibold">
                D{selectedOrder?.totalAmount?.toFixed(2)}
              </span>
            </div>
            <div className="space-y-2">
              <Label>Payment reference (optional)</Label>
              <Input
                value={markPaidReference}
                onChange={(e) => setMarkPaidReference(e.target.value)}
                placeholder="e.g. Wave transaction ID"
              />
            </div>
            <div className="space-y-2">
              <Label>Note (optional)</Label>
              <Textarea
                value={markPaidNote}
                onChange={(e) => setMarkPaidNote(e.target.value)}
                placeholder="How was this payment received?"
                rows={2}
              />
            </div>
            <div className="flex items-start gap-3 rounded-lg border p-3">
              <Checkbox
                checked={markPaidSendPayout}
                onCheckedChange={(checked) =>
                  setMarkPaidSendPayout(checked === true)
                }
                className="mt-0.5"
              />
              <div
                className="space-y-1 cursor-pointer"
                onClick={() => setMarkPaidSendPayout((v) => !v)}
              >
                <p className="text-sm font-medium leading-none">
                  Send vendor their share via Wave payout
                </p>
                <p className="text-xs text-muted-foreground">
                  Check this if the money came to TeranGO's account. Leave
                  unchecked if the vendor was already paid directly.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsMarkPaidOpen(false)}>
              Back
            </Button>
            <Button
              onClick={() => {
                if (!selectedOrder) return;
                markPaidMutation.mutate({
                  orderId: selectedOrder._id || selectedOrder.id,
                  sendVendorPayout: markPaidSendPayout,
                  reference: markPaidReference || undefined,
                  note: markPaidNote || undefined,
                });
              }}
              disabled={markPaidMutation.isPending}
            >
              {markPaidMutation.isPending
                ? "Confirming..."
                : "Confirm Payment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isRefundOpen} onOpenChange={setIsRefundOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mark Order as Refunded</DialogTitle>
            <DialogDescription>
              Use this once the customer has actually been refunded outside
              the app (e.g. a manual Wave refund). This removes the order
              from all revenue figures and notifies the customer.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Refund amount</Label>
              <Input
                type="number"
                min={0}
                max={selectedOrder?.totalAmount ?? undefined}
                step="0.01"
                value={refundAmount}
                onChange={(e) => setRefundAmount(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Order total: D{selectedOrder?.totalAmount?.toFixed(2)}
              </p>
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Select value={refundReason} onValueChange={setRefundReason}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a reason" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CUSTOMER_REQUEST">
                    Customer request
                  </SelectItem>
                  <SelectItem value="QUALITY_ISSUE">Quality issue</SelectItem>
                  <SelectItem value="ORDER_ISSUE">
                    Order problem (wrong/missing items)
                  </SelectItem>
                  <SelectItem value="DUPLICATE_CHARGE">
                    Duplicate charge
                  </SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Refund reference (optional)</Label>
              <Input
                value={refundReference}
                onChange={(e) => setRefundReference(e.target.value)}
                placeholder="e.g. Wave refund transaction ID"
              />
            </div>
            <div className="space-y-2">
              <Label>Note (optional)</Label>
              <Textarea
                value={refundNote}
                onChange={(e) => setRefundNote(e.target.value)}
                placeholder="Any extra detail for this refund..."
                rows={2}
              />
            </div>
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/20 dark:text-amber-300">
              This only marks the order refunded in TeranGO's records — it
              does not send the refund itself, and it does not automatically
              reclaim money already paid out to the vendor or driver for this
              order.
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsRefundOpen(false)}>
              Back
            </Button>
            <Button
              onClick={() => {
                if (!selectedOrder) return;
                const parsedAmount = parseFloat(refundAmount);
                refundMutation.mutate({
                  orderId: selectedOrder._id || selectedOrder.id,
                  amount: Number.isFinite(parsedAmount)
                    ? parsedAmount
                    : undefined,
                  reason: refundReason || undefined,
                  reference: refundReference || undefined,
                  note: refundNote || undefined,
                });
              }}
              disabled={refundMutation.isPending || !refundReason}
            >
              {refundMutation.isPending ? "Confirming..." : "Confirm Refund"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
      </Main>
    </>
  );
}

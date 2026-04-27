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
  Truck,
  MapPin,
  Phone,
  User,
  Store,
  RefreshCw,
  XCircle,
  Package,
  ChefHat,
  Filter,
  Inbox,
  Gift,
  ArrowRight,
  ShoppingBag,
} from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "@/lib/api";
import type { Order, Driver } from "@/lib/types";

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
  restaurant?: { id: string; name: string; phone: string };
  shop?: { id: string; name: string; phone: string };
  pharmacy?: { id: string; name: string; phone: string };
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
  { value: "PENDING", label: "Pending", color: "bg-yellow-500", icon: Clock },
  {
    value: "CONFIRMED",
    label: "Confirmed",
    color: "bg-blue-500",
    icon: CheckCircle,
  },
  {
    value: "PREPARING",
    label: "Preparing",
    color: "bg-purple-500",
    icon: ChefHat,
  },
  { value: "READY", label: "Ready", color: "bg-green-500", icon: Package },
  {
    value: "IN_TRANSIT",
    label: "In Transit",
    color: "bg-indigo-500",
    icon: Truck,
  },
  {
    value: "DELIVERED",
    label: "Delivered",
    color: "bg-green-600",
    icon: CheckCircle,
  },
  {
    value: "CANCELLED",
    label: "Cancelled",
    color: "bg-red-500",
    icon: XCircle,
  },
];

const getStatusBadge = (status: string) => {
  const statusConfig = ORDER_STATUSES.find(
    (s) => s.value === status?.toUpperCase(),
  );
  const Icon = statusConfig?.icon || Package;
  return (
    <Badge
      className={`${statusConfig?.color || "bg-gray-500"} flex items-center gap-1 text-white`}
    >
      <Icon className="h-3 w-3" />
      {statusConfig?.label || status}
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

  const { data: driversData } = useQuery<Driver[]>({
    queryKey: ["compatible-drivers", selectedOrder?._id],
    queryFn: async () => {
      if (!selectedOrder?._id) return [];
      const response = await adminApi.getCompatibleDriversForOrder(
        selectedOrder._id,
      );
      return Array.isArray(response?.data) ? response.data : [];
    },
    enabled: isAssignDriverOpen,
  });

  const drivers: Driver[] = driversData || [];

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
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-linear-to-br from-blue-500 to-blue-600 p-3">
            <ShoppingCart className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
            <p className="text-muted-foreground">
              Track and manage all customer orders
            </p>
          </div>
        </div>
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

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-5">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Total Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
          </CardContent>
        </Card>
        <Card className="border-yellow-200 bg-yellow-50/50 dark:border-yellow-800 dark:bg-yellow-900/10">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-yellow-700 dark:text-yellow-500">
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-500">
              {stats.pending}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Preparing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {stats.preparing}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Ready
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              {stats.ready}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-muted-foreground text-sm font-medium">
              Delivered
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {stats.delivered}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-col gap-4 md:flex-row md:items-center">
            <div className="relative flex-1">
              <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
              <Input
                placeholder="Search by order ID, customer, vendor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Filter className="text-muted-foreground h-4 w-4" />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-45">
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
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardContent className="pt-6">
          {isLoading ? (
            <div className="flex justify-center py-8">
              <RefreshCw className="text-muted-foreground h-8 w-8 animate-spin" />
            </div>
          ) : filteredOrders.length > 0 ? (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Order</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Items</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Driver</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredOrders.map((order) => (
                    <TableRow key={order.id}>
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
                      <TableCell>{order.items?.length || 0} items</TableCell>
                      <TableCell className="font-medium">
                        D{order.totalAmount?.toFixed(2) || "0.00"}
                      </TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
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
                          size="sm"
                          onClick={() => handleViewDetails(order)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {/* Pagination */}
              {paginationInfo.pages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage === 1}
                    onClick={() => setCurrentPage((p) => p - 1)}
                  >
                    Previous
                  </Button>
                  <span className="text-muted-foreground text-sm">
                    Page {paginationInfo.page} of {paginationInfo.pages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={currentPage >= paginationInfo.pages}
                    onClick={() => setCurrentPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Inbox className="h-12 w-12 text-gray-400" />
              <h3 className="mt-4 text-lg font-semibold">No Orders Found</h3>
              <p className="text-muted-foreground mt-1">
                Try adjusting your search or filters.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Details Dialog */}
      <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
            <DialogDescription>
              Order TG{selectedOrder?.id?.slice(-4).toUpperCase()}
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
              {/* Customer Info */}
              <div>
                <h3 className="mb-2 flex items-center gap-2 font-semibold">
                  <User className="h-4 w-4" />
                  {selectedOrder.isGiftOrder
                    ? "Ordering Customer"
                    : "Customer Information"}
                </h3>
                <div className="space-y-1 rounded-lg border p-3">
                  <p className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Name:</span>
                    {selectedOrder.user?.name || "N/A"}
                  </p>
                  <p className="flex items-center gap-2 text-sm">
                    <Phone className="h-3 w-3" />
                    <span className="text-muted-foreground">Phone:</span>
                    {selectedOrder.user?.phoneNumber ||
                      selectedOrder.user?.phone ||
                      "N/A"}
                  </p>
                </div>
              </div>

              {/* Vendor Info */}
              <div>
                <h3 className="mb-2 flex items-center gap-2 font-semibold">
                  <Store className="h-4 w-4" />
                  Vendor
                </h3>
                <div className="space-y-1 rounded-lg border p-3">
                  <p className="flex items-center gap-2 text-sm">
                    <span className="text-muted-foreground">Name:</span>
                    {selectedOrder.vendor?.shopName ||
                      selectedOrder.vendor?.businessName ||
                      "N/A"}
                  </p>
                  <p className="flex items-center gap-2 text-sm">
                    <Phone className="h-3 w-3" />
                    <span className="text-muted-foreground">Phone:</span>
                    {selectedOrder.vendor?.phoneNumber || "N/A"}
                  </p>
                </div>
              </div>

              {/* Delivery */}
              {selectedOrder.deliveryAddress && (
                <div>
                  <h3 className="mb-2 flex items-center gap-2 font-semibold">
                    <MapPin className="h-4 w-4" />
                    Delivery Address
                  </h3>
                  <div className="rounded-lg border p-3 text-sm">
                    {typeof selectedOrder.deliveryAddress === "string"
                      ? selectedOrder.deliveryAddress
                      : (selectedOrder.deliveryAddress?.street ??
                        "No address provided")}
                  </div>
                </div>
              )}

              {/* Gift Recipient */}
              {selectedOrder.isGiftOrder && (
                <div className="rounded-lg border border-pink-200 bg-linear-to-r from-pink-50 to-rose-50 p-3">
                  <h3 className="mb-2 flex items-center gap-2 font-semibold text-pink-800">
                    <Gift className="h-4 w-4" />
                    Gift Recipient
                  </h3>
                  <div className="space-y-1 text-sm">
                    {selectedOrder.recipientName && (
                      <p className="flex items-center gap-2">
                        <span className="text-muted-foreground w-20">
                          Recipient:
                        </span>
                        <span className="font-medium">
                          {selectedOrder.recipientName}
                        </span>
                      </p>
                    )}
                    {selectedOrder.recipientPhone && (
                      <p className="flex items-center gap-2">
                        <Phone className="h-3 w-3 text-pink-500" />
                        <span className="text-muted-foreground w-20">
                          Phone:
                        </span>
                        <span className="font-medium">
                          {selectedOrder.recipientPhone}
                        </span>
                      </p>
                    )}
                  </div>
                </div>
              )}

              {/* Order Items */}
              <div>
                <h3 className="mb-2 flex items-center gap-2 font-semibold">
                  <Package className="h-4 w-4" />
                  Order Items
                </h3>
                <div className="space-y-2">
                  {selectedOrder.items?.map((item) => (
                    <div
                      key={item.product?._id || item._id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div>
                        <p className="font-medium">
                          {item.product?.name || "Product"}
                        </p>
                        <p className="text-muted-foreground text-sm">
                          Qty: {item.quantity} × D{item.price?.toFixed(2)}
                        </p>
                      </div>
                      <p className="font-medium">
                        D{(item.price * item.quantity).toFixed(2)}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Summary */}
              <div className="bg-muted rounded-lg border p-3">
                <div className="mt-2 flex items-center justify-between border-t pt-2">
                  <span className="font-semibold">Total</span>
                  <span className="text-lg font-bold">
                    D{selectedOrder.totalAmount?.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Order Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Status:</span>{" "}
                  {getStatusBadge(selectedOrder.status)}
                </div>
                <div>
                  <span className="text-muted-foreground">Payment:</span>{" "}
                  <Badge variant="outline">
                    {selectedOrder.paymentMethod || "N/A"}
                  </Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Created:</span>{" "}
                  {format(new Date(selectedOrder.createdAt), "PPpp")}
                </div>
              </div>

              {/* Assigned Driver */}
              {selectedOrder.driver && (
                <div className="rounded-lg border p-4 bg-linear-to-r from-blue-50 to-indigo-50">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                      <Truck className="h-4 w-4 text-blue-600" />
                      Assigned Driver
                    </h4>
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
                    <div className="w-12 h-12 rounded-full bg-linear-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-lg border-2 border-blue-200 shadow-md">
                      {selectedOrder.driver.name?.charAt(0)?.toUpperCase()}
                    </div>
                    <div className="flex-1 space-y-1 text-sm">
                      <p className="font-semibold text-gray-800">
                        {selectedOrder.driver.name}
                      </p>
                      <p className="text-gray-600 flex items-center gap-1">
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
                const isDelivery = !!selectedOrder.deliveryAddress;
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
                  <div className="rounded-xl border border-gray-100 overflow-hidden">
                    <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Update Status
                      </p>
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <span>Current:</span>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${
                            ADMIN_STATUS_CONFIG[selectedOrder.status]?.bg ??
                            "bg-gray-50 border-gray-200"
                          } ${ADMIN_STATUS_CONFIG[selectedOrder.status]?.color ?? "text-gray-600"}`}
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
                      <p className="px-4 pb-3 text-xs text-gray-400">
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
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Assign Driver Dialog */}
      <Dialog open={isAssignDriverOpen} onOpenChange={setIsAssignDriverOpen}>
        <DialogContent>
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
            <div className="space-y-2">
              <Label>Available Drivers</Label>
              <Select
                value={selectedDriverId}
                onValueChange={setSelectedDriverId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a driver" />
                </SelectTrigger>
                <SelectContent>
                  {drivers.map((driver) => {
                    const driverName =
                      driver.name ||
                      driver.user?.fullName ||
                      driver.user?.name ||
                      "Unknown";
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
                              className="w-8 h-8 rounded-full object-cover border border-gray-200"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-linear-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-medium text-sm">
                              {driverName.charAt(0).toUpperCase()}
                            </div>
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{driverName}</span>
                              {driver.vehicleType && (
                                <span className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                                  {driver.vehicleType === "BIKE" && "🏍️ Bike"}
                                  {driver.vehicleType === "KEKE_CARGO" &&
                                    "🛺 Keke"}
                                  {driver.vehicleType === "CAR" && "🚗 Car"}
                                  {driver.vehicleType === "VAN" && "🚐 Van"}
                                  {driver.vehicleType === "LORRY" && "🚛 Lorry"}
                                </span>
                              )}
                              {driver.isAvailable && (
                                <span
                                  className="w-2 h-2 bg-green-400 rounded-full"
                                  title="Available"
                                />
                              )}
                            </div>
                            <div className="text-xs text-gray-500">
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
    </div>
  );
}

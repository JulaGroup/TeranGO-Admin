import { useState, useMemo } from "react";
import { format } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  Search,
  Eye,
  RefreshCw,
  Filter,
  Wifi,
  WifiOff,
  Clock,
  CheckCircle,
  XCircle,
  Package,
  Truck,
  ChefHat,
  MapPin,
  Phone,
  User,
  Crown,
  ArrowRight,
  ShoppingBag,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useOrderSocketConnected } from "@/hooks/use-order-notifications";
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
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { TopNav } from "@/components/layout/top-nav";
import { ProfileDropdown } from "@/components/profile-dropdown";
import { ThemeSwitch } from "@/components/theme-switch";

export const Route = createFileRoute(
  "/_authenticated/admin/terango-store/orders",
)({
  component: TerangoStoreOrders,
});

const topNav = [
  { title: "Store Dashboard", href: "/admin/terango-store", isActive: false },
  { title: "Orders", href: "/admin/terango-store/orders", isActive: true },
  { title: "Settings", href: "/admin/terango-store/settings", isActive: false },
  { title: "Products", href: "/admin/terango-products", isActive: false },
];

interface OrderItem {
  id: string;
  quantity: number;
  price: number;
  productId?: string;
  productName?: string;
  productImage?: string;
}

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  totalAmount: number;
  deliveryFee?: number;
  orderType: string;
  paymentMethod: string;
  paymentStatus: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  orderItems: OrderItem[];
  totalWeightKg?: number;
  requiredVehicleType?: string;
  // Gift order fields
  isGiftOrder?: boolean;
  recipientName?: string | null;
  recipientPhone?: string | null;
  recipientAddress?: string | null;
  recipientTown?: string | null;
  user?: {
    id: string;
    name: string;
    phone: string;
  };
  driver?: {
    id: string;
    name: string;
    phone: string;
    profileImageUrl?: string;
    vehicleType?: string;
    vehicleNumber?: string;
    isAvailable?: boolean;
  };
}

interface Driver {
  id: string;
  name: string;
  phone: string;
  phoneNumber?: string;
  vehicleType?: string;
  isAvailable: boolean;
  profileImageUrl?: string;
  vehicleNumber?: string;
  user?: {
    fullName?: string;
    name?: string;
    phone?: string;
    phoneNumber?: string;
  };
}

function getAllowedTransitions(
  current: string,
  isDelivery: boolean,
  paymentStatus?: string,
  isGiftOrder?: boolean,
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

const TS_STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; icon: React.ReactNode }
> = {
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
};

const ORDER_STATUSES = [
  { value: "PENDING", label: "Pending", color: "bg-yellow-500", icon: Clock },
  {
    value: "PROCESSING",
    label: "Processing",
    color: "bg-cyan-500",
    icon: RefreshCw,
  },
  {
    value: "DISPATCHED",
    label: "Dispatched",
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
  {
    value: "ACCEPTED",
    label: "Accepted",
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
];

// Statuses that can be set by admin (DELIVERED requires driver QR scan)
const ADMIN_SETTABLE_STATUSES = [
  "PENDING",
  "PROCESSING",
  "ACCEPTED",
  "PREPARING",
  "READY",
  "DISPATCHED",
  "DELIVERED",
  "CANCELLED",
];

function TerangoStoreOrders() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [assignDriverOpen, setAssignDriverOpen] = useState(false);
  const [selectedDriverId, setSelectedDriverId] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  // Real-time order notifications — the socket/sound/toast is already
  // mounted once, globally, in main.tsx (adminMode). Mounting a SECOND
  // admin socket here caused two competing connections fighting over the
  // same "join_admin_room" + events, which is what made the WebSocket
  // upgrade flap (rapid connect/disconnect) and silenced the notification
  // sound. We just read the shared connection status here, and rely on the
  // global instance's `queryClient.invalidateQueries(["terango-store-orders"])`
  // (fired for every new order regardless of mode) to refresh this list.
  const isConnected = useOrderSocketConnected();

  // Fetch orders
  const {
    data: ordersData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["terango-store-orders", currentPage, statusFilter, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append("page", currentPage.toString());
      params.append("limit", "20");
      if (statusFilter !== "ALL") params.append("status", statusFilter);
      if (searchQuery) params.append("search", searchQuery);

      const response = await api.get(
        `/api/admin/terango-store/orders?${params}`,
      );
      return response.data;
    },
  });

  // Fetch available drivers (or compatible drivers if an order is selected)
  const { data: driversData } = useQuery({
    queryKey: ["terango-store-drivers", selectedOrder?.id],
    queryFn: async () => {
      const orderId = selectedOrder?.id;
      if (orderId) {
        try {
          const response = await api.get(`/api/drivers/compatible/${orderId}`);
          return response.data || [];
        } catch {
          // fallback to all available if compatible endpoint fails
        }
      }
      const response = await api.get(
        "/api/admin/terango-store/available-drivers",
      );
      return response.data.drivers || [];
    },
    enabled: assignDriverOpen,
  });

  const drivers: Driver[] = driversData || [];
  const orders: Order[] = useMemo(
    () => ordersData?.orders || [],
    [ordersData?.orders],
  );
  const pagination = ordersData?.pagination || { page: 1, pages: 1, total: 0 };

  // Update order status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({
      orderId,
      status,
    }: {
      orderId: string;
      status: string;
    }) => {
      const response = await api.patch(
        `/api/admin/terango-store/orders/${orderId}/status`,
        { status },
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["terango-store-orders"] });
      queryClient.invalidateQueries({ queryKey: ["terango-store-dashboard"] });
      toast.success("Order status updated successfully");
      setDetailsOpen(false);
    },
    onError: () => {
      toast.error("Failed to update order status");
    },
  });

  // Assign driver mutation
  const assignDriverMutation = useMutation({
    mutationFn: async ({
      orderId,
      driverId,
    }: {
      orderId: string;
      driverId: string;
    }) => {
      const response = await api.patch(
        `/api/admin/terango-store/orders/${orderId}/assign-driver`,
        { driverId },
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["terango-store-orders"] });
      toast.success("Driver assigned successfully");
      setAssignDriverOpen(false);
      setSelectedDriverId("");
      // Refresh selected order in details dialog if open
      if (detailsOpen && selectedOrder) {
        queryClient.invalidateQueries({ queryKey: ["terango-store-orders"] });
      }
    },
    onError: () => {
      toast.error("Failed to assign driver");
    },
  });

  // Unassign driver mutation
  const unassignDriverMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const response = await api.patch(
        `/api/admin/terango-store/orders/${orderId}/unassign-driver`,
      );
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["terango-store-orders"] });
      toast.success("Driver unassigned successfully");
      // Update the selected order in the detail dialog so the driver section disappears
      setSelectedOrder((prev) =>
        prev ? { ...prev, driver: undefined } : prev,
      );
    },
    onError: () => {
      toast.error("Failed to unassign driver");
    },
  });

  // Stats calculated from orders
  const stats = useMemo(() => {
    return {
      total: pagination.total,
      pending: orders.filter((o) => o.status === "PENDING").length,
      preparing: orders.filter((o) =>
        ["ACCEPTED", "PREPARING"].includes(o.status),
      ).length,
      ready: orders.filter((o) => o.status === "READY").length,
      delivered: orders.filter((o) => o.status === "DELIVERED").length,
    };
  }, [orders, pagination.total]);

  // Filter orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const search = searchQuery.toLowerCase();
      return (
        order.orderNumber.toLowerCase().includes(search) ||
        order.customerName?.toLowerCase().includes(search) ||
        order.customerPhone?.toLowerCase().includes(search)
      );
    });
  }, [orders, searchQuery]);

  const getStatusBadge = (status: string) => {
    const statusConfig = ORDER_STATUSES.find((s) => s.value === status);
    const Icon = statusConfig?.icon || Package;
    const colorMap: Record<string, string> = {
      PENDING: "border-amber-400 text-amber-600 bg-amber-50 dark:bg-amber-950/20",
      ACCEPTED: "border-blue-400 text-blue-600 bg-blue-50 dark:bg-blue-950/20",
      PROCESSING: "border-blue-400 text-blue-600 bg-blue-50 dark:bg-blue-950/20",
      PREPARING: "border-violet-400 text-violet-600 bg-violet-50 dark:bg-violet-950/20",
      READY: "bg-emerald-500 text-white shadow-sm border-emerald-500",
      DISPATCHED: "border-blue-400 text-blue-600 bg-blue-50 dark:bg-blue-950/20",
      DELIVERED: "bg-emerald-500 text-white shadow-sm border-emerald-500",
      CANCELLED: "bg-destructive text-destructive-foreground",
    };
    return (
      <Badge
        variant="outline"
        className={`flex items-center gap-1 ${colorMap[status] || "bg-gray-100 text-gray-700"}`}
      >
        <Icon className="h-3 w-3" />
        {statusConfig?.label || status}
      </Badge>
    );
  };

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order);
    setDetailsOpen(true);
  };

  const handleAssignDriver = (order: Order) => {
    setSelectedOrder(order);
    setSelectedDriverId(order.driver?.id || "");
    setAssignDriverOpen(true);
  };

  const handleStatusUpdate = (status: string) => {
    if (selectedOrder) {
      if (status === "CANCELLED" && selectedOrder.paymentStatus === "PAID") {
        toast.error("Cannot cancel after payment received");
        return;
      }
      const PAID_STATES = [
        "PREPARING",
        "PROCESSING",
        "READY",
        "DISPATCHED",
        "DELIVERED",
      ];
      if (
        PAID_STATES.includes(status) &&
        selectedOrder.paymentStatus !== "PAID" &&
        selectedOrder.paymentMethod !== "CASH"
      ) {
        toast.error("Order must be PAID before you can begin processing");
        return;
      }
      if (status === "CANCELLED" && !window.confirm("Cancel this order?"))
        return;
      updateStatusMutation.mutate({ orderId: selectedOrder.id, status });
    }
  };

  const handleDriverAssign = () => {
    if (selectedOrder && selectedDriverId) {
      assignDriverMutation.mutate({
        orderId: selectedOrder.id,
        driverId: selectedDriverId,
      });
    }
  };

  return (
    <>
      <Header>
        <TopNav links={topNav} />
        <div className="ms-auto flex items-center space-x-4">
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 p-3">
                <Crown className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold tracking-tight">
                  Store Orders
                </h1>
                <p className="text-muted-foreground">
                  Manage TeranGO Official Store orders
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              {/* Connection Status */}
              <div className="flex items-center gap-2">
                {isConnected ? (
                  <>
                    <Wifi className="h-4 w-4 text-green-500" />
                    <span className="text-muted-foreground text-sm">Live</span>
                  </>
                ) : (
                  <>
                    <WifiOff className="h-4 w-4 text-orange-500" />
                    <span className="text-muted-foreground text-sm">
                      Offline
                    </span>
                  </>
                )}
              </div>
              <Button onClick={() => refetch()} variant="outline" size="sm">
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-5">
            <Card className="border-l-4 border-l-primary shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-muted-foreground text-sm font-medium">
                  Total Orders
                </CardTitle>
                <ShoppingBag className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.total}</div>
                <p className="text-xs text-muted-foreground mt-1">All time</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-orange-500 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Pending
                </CardTitle>
                <Clock className="h-4 w-4 text-orange-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">
                  {stats.pending}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Needs attention</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-violet-500 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-muted-foreground text-sm font-medium">
                  Preparing
                </CardTitle>
                <ChefHat className="h-4 w-4 text-violet-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-violet-600">
                  {stats.preparing}
                </div>
                <p className="text-xs text-muted-foreground mt-1">In progress</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-blue-500 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-muted-foreground text-sm font-medium">
                  Ready
                </CardTitle>
                <Package className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {stats.ready}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Awaiting dispatch</p>
              </CardContent>
            </Card>
            <Card className="border-l-4 border-l-emerald-500 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-muted-foreground text-sm font-medium">
                  Delivered
                </CardTitle>
                <CheckCircle className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-emerald-600">
                  {stats.delivered}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Completed</p>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="shadow-sm">
            <CardContent className="pt-4 pb-4">
              <div className="flex flex-col gap-3 md:flex-row md:items-center">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="Search orders by number, customer name or phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <Filter className="text-muted-foreground h-4 w-4" />
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="ALL">All Orders</SelectItem>
                      {ORDER_STATUSES.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Orders Table */}
          <Card className="shadow-sm overflow-hidden">
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex justify-center py-12">
                  <RefreshCw className="text-muted-foreground h-8 w-8 animate-spin" />
                </div>
              ) : filteredOrders.length > 0 ? (
                <>
                  <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableHead>Order #</TableHead>
                        <TableHead>Customer</TableHead>
                        <TableHead>Items</TableHead>
                        <TableHead>Total</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Driver</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredOrders.map((order) => (
                        <TableRow key={order.id} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="font-medium">
                            #{order.orderNumber}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium flex items-center gap-1">
                                {order.customerName || "N/A"}
                                {order.isGiftOrder && (
                                  <span
                                    title={`Gift for ${order.recipientName || "recipient"}`}
                                    className="text-base leading-none"
                                  >
                                    🎁
                                  </span>
                                )}
                              </p>
                              <p className="text-muted-foreground text-xs">
                                {order.customerPhone || "N/A"}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell>
                            {order.orderItems?.length || 0} items
                          </TableCell>
                          <TableCell className="font-medium">
                            D{order.totalAmount.toLocaleString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {order.orderType || "DELIVERY"}
                            </Badge>
                          </TableCell>
                          <TableCell>{getStatusBadge(order.status)}</TableCell>
                          <TableCell>
                            {order.driver ? (
                              <div className="flex items-center gap-1">
                                <span className="text-sm">
                                  {order.driver.name}
                                </span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-6 px-1 text-xs text-blue-600 hover:text-blue-800"
                                  onClick={() => handleAssignDriver(order)}
                                  title="Change driver"
                                >
                                  <RefreshCw className="h-3 w-3" />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleAssignDriver(order)}
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
                  </div>

                  {/* Pagination */}
                  {pagination.pages > 1 && (
                    <div className="flex items-center justify-center gap-2 p-4 border-t">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage === 1}
                        onClick={() => setCurrentPage((p) => p - 1)}
                      >
                        Previous
                      </Button>
                      <span className="text-muted-foreground text-sm">
                        Page {pagination.page} of {pagination.pages}
                      </span>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={currentPage >= pagination.pages}
                        onClick={() => setCurrentPage((p) => p + 1)}
                      >
                        Next
                      </Button>
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <ShoppingBag className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                  <p className="text-lg font-medium">No orders found</p>
                  <p className="text-sm text-muted-foreground mt-1">Try adjusting your search or filter</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </Main>

      {/* Order Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
            <DialogDescription>
              Order #{selectedOrder?.orderNumber}
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className="space-y-4">
              {/* Customer Info */}
              <div>
                <h3 className="mb-2 flex items-center gap-2 font-semibold">
                  <User className="h-4 w-4" />
                  {selectedOrder.isGiftOrder
                    ? "Ordering Customer"
                    : "Customer Information"}
                </h3>
                <div className="space-y-1 rounded-lg border p-3">
                  <p className="flex items-center gap-2">
                    <span className="text-muted-foreground">Name:</span>
                    {selectedOrder.customerName}
                  </p>
                  <p className="flex items-center gap-2">
                    <Phone className="h-3 w-3" />
                    <span className="text-muted-foreground">Phone:</span>
                    {selectedOrder.customerPhone}
                  </p>
                  {selectedOrder.deliveryAddress && (
                    <p className="flex items-center gap-2">
                      <MapPin className="h-3 w-3" />
                      <span className="text-muted-foreground">Address:</span>
                      {selectedOrder.deliveryAddress}
                    </p>
                  )}
                </div>
              </div>

              {/* Gift Order Recipient Info */}
              {selectedOrder.isGiftOrder && (
                <div className="rounded-lg border border-pink-200 bg-gradient-to-r from-pink-50 to-rose-50 p-3">
                  <h3 className="mb-2 flex items-center gap-2 font-semibold text-pink-800">
                    <span>\uD83C\uDF81</span>
                    Gift Order — Recipient Details
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
                    {selectedOrder.recipientAddress && (
                      <p className="flex items-center gap-2">
                        <MapPin className="h-3 w-3 text-pink-500" />
                        <span className="text-muted-foreground w-20">
                          Landmark:
                        </span>
                        <span className="font-medium">
                          {selectedOrder.recipientAddress}
                        </span>
                      </p>
                    )}
                    {selectedOrder.recipientTown && (
                      <p className="flex items-center gap-2">
                        <span className="text-muted-foreground w-20">
                          Town:
                        </span>
                        <span className="font-medium capitalize">
                          {selectedOrder.recipientTown.replace(/_/g, " ")}
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
                  {selectedOrder.orderItems?.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-lg border p-3"
                    >
                      <div className="flex items-center gap-3">
                        {item.productImage && (
                          <img
                            src={item.productImage}
                            alt={item.productName}
                            className="h-10 w-10 rounded object-cover"
                          />
                        )}
                        <div>
                          <p className="font-medium">
                            {item.productName || "Product"}
                          </p>
                          <p className="text-muted-foreground text-sm">
                            Qty: {item.quantity} × D{item.price}
                          </p>
                        </div>
                      </div>
                      <p className="font-medium">
                        D{(item.price * item.quantity).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Order Summary */}
              <div className="bg-muted rounded-lg border p-3">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>
                    D
                    {(
                      selectedOrder.totalAmount -
                      (selectedOrder.deliveryFee || 0)
                    ).toLocaleString()}
                  </span>
                </div>
                {selectedOrder.deliveryFee && (
                  <div className="flex items-center justify-between">
                    <span className="text-muted-foreground">Delivery Fee</span>
                    <span>D{selectedOrder.deliveryFee.toLocaleString()}</span>
                  </div>
                )}
                <div className="mt-2 flex items-center justify-between border-t pt-2">
                  <span className="font-semibold">Total</span>
                  <span className="text-lg font-bold">
                    D{selectedOrder.totalAmount.toLocaleString()}
                  </span>
                </div>
              </div>

              {/* Order Info */}
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-muted-foreground">Order Type:</span>{" "}
                  <Badge variant="outline">{selectedOrder.orderType}</Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Payment:</span>{" "}
                  <Badge variant="outline">{selectedOrder.paymentMethod}</Badge>
                </div>
                <div>
                  <span className="text-muted-foreground">Created:</span>{" "}
                  {format(new Date(selectedOrder.createdAt), "PPpp")}
                </div>
              </div>

              {/* Weight & Vehicle Analysis */}
              {(selectedOrder.totalWeightKg ||
                selectedOrder.requiredVehicleType) && (
                <div className="border rounded-lg p-4 bg-gradient-to-r from-orange-50 to-amber-50">
                  <h4 className="font-semibold mb-3 text-gray-800 flex items-center gap-2">
                    <svg
                      className="h-4 w-4 text-orange-600"
                      fill="currentColor"
                      viewBox="0 0 20 20"
                    >
                      <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
                    </svg>
                    Weight & Vehicle Analysis
                  </h4>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {selectedOrder.totalWeightKg && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">
                          Total Weight:
                        </span>
                        <div className="flex items-center gap-1">
                          <span className="font-medium">
                            {selectedOrder.totalWeightKg}kg
                          </span>
                          {selectedOrder.totalWeightKg > 25 && (
                            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded">
                              Heavy
                            </span>
                          )}
                          {selectedOrder.totalWeightKg <= 25 && (
                            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded">
                              Light
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                    {selectedOrder.requiredVehicleType && (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">
                          Required Vehicle:
                        </span>
                        <div className="flex items-center gap-1">
                          <span>
                            {selectedOrder.requiredVehicleType === "BIKE" &&
                              "🏍️ Motorbike"}
                            {selectedOrder.requiredVehicleType ===
                              "KEKE_CARGO" && "🛺 Keke Cargo"}
                            {selectedOrder.requiredVehicleType === "CAR" &&
                              "🚗 Car"}
                            {selectedOrder.requiredVehicleType === "VAN" &&
                              "🚐 Van"}
                            {selectedOrder.requiredVehicleType === "LORRY" &&
                              "🚛 Mini Lorry"}
                          </span>
                          <Badge
                            variant="outline"
                            className="bg-orange-100 text-orange-700 border-orange-300"
                          >
                            Recommended
                          </Badge>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Enhanced Driver Profile Display */}
              {selectedOrder.driver && (
                <div className="border rounded-lg p-4 bg-gradient-to-r from-blue-50 to-indigo-50">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-gray-800 flex items-center gap-2">
                      <Truck className="h-4 w-4 text-blue-600" />
                      Assigned Driver
                    </h4>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs"
                        onClick={() => {
                          setDetailsOpen(false);
                          handleAssignDriver(selectedOrder);
                        }}
                      >
                        <RefreshCw className="mr-1 h-3 w-3" />
                        Change
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="text-xs text-red-600 border-red-200 hover:bg-red-50"
                        disabled={unassignDriverMutation.isPending}
                        onClick={() =>
                          unassignDriverMutation.mutate(selectedOrder.id)
                        }
                      >
                        <XCircle className="mr-1 h-3 w-3" />
                        {unassignDriverMutation.isPending
                          ? "Removing..."
                          : "Unassign"}
                      </Button>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    {/* Driver Photo */}
                    <div className="relative">
                      {selectedOrder.driver.profileImageUrl ? (
                        <img
                          src={selectedOrder.driver.profileImageUrl}
                          alt={selectedOrder.driver.name}
                          className="w-16 h-16 rounded-full object-cover border-2 border-blue-200 shadow-md"
                        />
                      ) : (
                        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-bold text-xl border-2 border-blue-200 shadow-md">
                          {selectedOrder.driver.name.charAt(0).toUpperCase()}
                        </div>
                      )}
                      {/* Vehicle Type Badge */}
                      {selectedOrder.driver.vehicleType && (
                        <div className="absolute -bottom-1 -right-1 bg-gradient-to-r from-green-400 to-green-600 text-white text-xs px-2 py-1 rounded-full font-medium shadow-sm">
                          {selectedOrder.driver.vehicleType === "BIKE" && "🏍️"}
                          {selectedOrder.driver.vehicleType === "KEKE_CARGO" &&
                            "🛺"}
                          {selectedOrder.driver.vehicleType === "CAR" && "🚗"}
                          {selectedOrder.driver.vehicleType === "VAN" && "🚐"}
                          {selectedOrder.driver.vehicleType === "LORRY" && "🚛"}
                        </div>
                      )}
                    </div>

                    {/* Driver Details */}
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-800">
                          {selectedOrder.driver.name}
                        </span>
                        {selectedOrder.driver.isAvailable && (
                          <Badge
                            variant="outline"
                            className="bg-green-100 text-green-700 border-green-300"
                          >
                            Available
                          </Badge>
                        )}
                      </div>

                      <div className="text-sm text-gray-600 space-y-1">
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground">📞</span>
                          <span>{selectedOrder.driver.phone}</span>
                        </div>

                        {selectedOrder.driver.vehicleType && (
                          <div className="flex items-center gap-1">
                            <span className="text-muted-foreground">🚛</span>
                            <span className="capitalize">
                              {selectedOrder.driver.vehicleType.replace(
                                "_",
                                " ",
                              )}
                            </span>
                            {selectedOrder.driver.vehicleNumber && (
                              <span className="text-xs bg-gray-100 px-2 py-0.5 rounded ml-2">
                                {selectedOrder.driver.vehicleNumber}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
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
                  <div className="rounded-xl border border-gray-100 overflow-hidden">
                    <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100 flex items-center justify-between">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                        Update Status
                      </p>
                      <div className="flex items-center gap-1 text-xs text-gray-400">
                        <span>Current:</span>
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${
                            TS_STATUS_CONFIG[selectedOrder.status]?.bg ??
                            "bg-gray-50 border-gray-200"
                          } ${TS_STATUS_CONFIG[selectedOrder.status]?.color ?? "text-gray-600"}`}
                        >
                          {TS_STATUS_CONFIG[selectedOrder.status]?.icon}
                          {TS_STATUS_CONFIG[selectedOrder.status]?.label ??
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
                        const cfg = TS_STATUS_CONFIG[t];
                        const isCancel = t === "CANCELLED";
                        return (
                          <button
                            key={t}
                            onClick={() => handleStatusUpdate(t)}
                            disabled={updateStatusMutation.isPending}
                            className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold border transition-all disabled:opacity-50 ${
                              isCancel
                                ? "border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
                                : "border-amber-300 bg-amber-500 text-white hover:bg-amber-600 shadow-sm"
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
      <Dialog open={assignDriverOpen} onOpenChange={setAssignDriverOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {selectedOrder?.driver ? "Change Driver" : "Assign Driver"}
            </DialogTitle>
            <DialogDescription>
              {selectedOrder?.driver
                ? `Currently assigned: ${selectedOrder.driver.name}. Select a different driver for order #${selectedOrder?.orderNumber}`
                : `Select a driver for order #${selectedOrder?.orderNumber}`}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Required Vehicle Type Banner */}
            {selectedOrder?.requiredVehicleType && (
              <div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
                <span className="text-lg">
                  {selectedOrder.requiredVehicleType === "BIKE" && "🏍️"}
                  {selectedOrder.requiredVehicleType === "KEKE_CARGO" && "🛺"}
                  {selectedOrder.requiredVehicleType === "CAR" && "🚗"}
                  {selectedOrder.requiredVehicleType === "VAN" && "🚐"}
                  {selectedOrder.requiredVehicleType === "LORRY" && "🚛"}
                </span>
                <div className="flex-1">
                  <p className="text-xs font-semibold text-amber-800">
                    This order requires:{" "}
                    {selectedOrder.requiredVehicleType === "BIKE" && "Bike"}
                    {selectedOrder.requiredVehicleType === "KEKE_CARGO" &&
                      "Keke Cargo"}
                    {selectedOrder.requiredVehicleType === "CAR" && "Car"}
                    {selectedOrder.requiredVehicleType === "VAN" && "Van"}
                    {selectedOrder.requiredVehicleType === "LORRY" && "Lorry"}
                  </p>
                  {selectedOrder.totalWeightKg != null && (
                    <p className="text-xs text-amber-600">
                      Estimated weight: {selectedOrder.totalWeightKg.toFixed(1)}{" "}
                      kg
                    </p>
                  )}
                </div>
              </div>
            )}

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
                    const isCompatible =
                      !selectedOrder?.requiredVehicleType ||
                      driver.vehicleType === selectedOrder?.requiredVehicleType;
                    return (
                      <SelectItem
                        key={driver.id}
                        value={driver.id}
                        className="py-3"
                      >
                        <div className="flex items-center gap-3 w-full">
                          {/* Driver Photo */}
                          {driver.profileImageUrl ? (
                            <img
                              src={driver.profileImageUrl}
                              alt={driverName}
                              className="w-8 h-8 rounded-full object-cover border border-gray-200"
                            />
                          ) : (
                            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-medium text-sm">
                              {driverName.charAt(0).toUpperCase()}
                            </div>
                          )}

                          {/* Driver Info */}
                          <div className="flex-1 min-w-0">
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
                              {isCompatible &&
                                selectedOrder?.requiredVehicleType && (
                                  <span className="text-xs text-green-600 font-medium">
                                    ✓
                                  </span>
                                )}
                              {driver.isAvailable && (
                                <span
                                  className="w-2 h-2 bg-green-400 rounded-full"
                                  title="Available"
                                ></span>
                              )}
                            </div>
                            <div className="text-xs text-gray-500">
                              {driver.phone ||
                                driver.user?.phone ||
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
              onClick={() => setAssignDriverOpen(false)}
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
    </>
  );
}

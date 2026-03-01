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
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useOrderNotifications } from "@/hooks/use-order-notifications";
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
  vehicleType?: string;
  isAvailable: boolean;
  profileImageUrl?: string;
  vehicleNumber?: string;
}

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

  // Real-time order notifications
  const { isConnected } = useOrderNotifications({
    vendorId: "terango-official",
    adminMode: true, // Enable admin mode for global notifications
    enabled: true,
    onNewOrder: () => {
      queryClient.invalidateQueries({ queryKey: ["terango-store-orders"] });
    },
  });

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

  // Fetch available drivers
  const { data: driversData } = useQuery({
    queryKey: ["terango-store-drivers"],
    queryFn: async () => {
      const response = await api.get(
        "/api/admin/terango-store/available-drivers",
      );
      return response.data.drivers || [];
    },
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
    },
    onError: () => {
      toast.error("Failed to assign driver");
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
    return (
      <Badge
        className={`${statusConfig?.color || "bg-gray-500"} flex items-center gap-1`}
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
                    placeholder="Search orders by number, customer name or phone..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
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
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">
                            #{order.orderNumber}
                          </TableCell>
                          <TableCell>
                            <div>
                              <p className="font-medium">
                                {order.customerName || "N/A"}
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
                              <span className="text-sm">
                                {order.driver.name}
                              </span>
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

                  {/* Pagination */}
                  {pagination.pages > 1 && (
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
                <div className="text-muted-foreground py-8 text-center">
                  No orders found
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
                  Customer Information
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
                  <h4 className="font-semibold mb-3 text-gray-800 flex items-center gap-2">
                    <Truck className="h-4 w-4 text-blue-600" />
                    Assigned Driver
                  </h4>
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
              <div>
                <h3 className="mb-2 font-semibold">Update Status</h3>
                <p className="text-muted-foreground mb-2 text-xs">
                  Note: Only drivers can mark orders as Delivered by scanning QR
                  code
                </p>
                <div className="flex flex-wrap gap-2">
                  {ORDER_STATUSES.filter((s) =>
                    ADMIN_SETTABLE_STATUSES.includes(s.value),
                  ).map((status) => (
                    <Button
                      key={status.value}
                      variant={
                        selectedOrder.status === status.value
                          ? "default"
                          : "outline"
                      }
                      size="sm"
                      onClick={() => handleStatusUpdate(status.value)}
                      disabled={
                        updateStatusMutation.isPending ||
                        selectedOrder.status === status.value
                      }
                    >
                      {status.label}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Assign Driver Dialog */}
      <Dialog open={assignDriverOpen} onOpenChange={setAssignDriverOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assign Driver</DialogTitle>
            <DialogDescription>
              Select a driver for order #{selectedOrder?.orderNumber}
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
                  {drivers.map((driver) => (
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
                            alt={driver.name}
                            className="w-8 h-8 rounded-full object-cover border border-gray-200"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-white font-medium text-sm">
                            {driver.name.charAt(0).toUpperCase()}
                          </div>
                        )}

                        {/* Driver Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{driver.name}</span>
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
                              ></span>
                            )}
                          </div>
                          <div className="text-xs text-gray-500">
                            {driver.phone}
                          </div>
                        </div>
                      </div>
                    </SelectItem>
                  ))}
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

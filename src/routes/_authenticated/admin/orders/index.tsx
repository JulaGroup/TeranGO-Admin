// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-nocheck
import { useState, useMemo } from "react";
import { format } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  Search,
  MoreHorizontal,
  Eye,
  ShoppingCart,
  Clock,
  CheckCircle2,
  Truck,
  MapPin,
  User,
  Store,
  Banknote,
  RefreshCw,
  XCircle,
  Package,
  ChevronLeft,
  ChevronRight,
  List,
  LayoutGrid,
  Inbox,
  Gift,
} from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "@/lib/api";
import type { Order, Driver } from "@/lib/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
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
import { cn } from "@/lib/utils";
import { Separator } from "@/components/ui/separator";
import { AxiosError } from "axios";

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

function OrdersPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewLayout, setViewLayout] = useState<"grid" | "list">("grid");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isAssignDriverOpen, setIsAssignDriverOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const { data: ordersResponse, isLoading } = useQuery({
    queryKey: ["orders", currentPage, statusFilter, searchQuery],
    queryFn: async () => {
      const response = await adminApi.getOrders({
        page: currentPage,
        limit: 12, // Adjusted for grid layout
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
      ordersResponse?.pagination || { page: 1, limit: 12, total: 0, pages: 0 },
    [ordersResponse?.pagination],
  );

  const stats = useMemo(() => {
    if (ordersResponse?.stats) {
      return {
        total: paginationInfo.total,
        ...ordersResponse.stats,
      };
    }
    return { total: paginationInfo.total };
  }, [ordersResponse?.stats, paginationInfo.total]);

  const { data: drivers = [] } = useQuery<Driver[]>({
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

  const updateStatusMutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: string }) =>
      adminApi.updateOrderStatus(orderId, status),
    onSuccess: () => {
      toast.success("Order status updated");
      queryClient.invalidateQueries({ queryKey: ["orders"] });
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
    },
    onError: (error: AxiosError<{ message: string }>) => {
      const message =
        error?.response?.data?.message ||
        error.message ||
        "Failed to assign driver";
      toast.error(message);
    },
  });

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order);
    setIsDetailsOpen(true);
  };

  const handleAssignDriverClick = (order: Order) => {
    setSelectedOrder(order);
    setIsAssignDriverOpen(true);
  };

  if (isLoading && orders.length === 0) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="border-primary mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2"></div>
          <p className="text-muted-foreground">Loading orders...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 p-4 md:p-6">
      <header className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Orders</h1>
          <p className="text-muted-foreground">
            Track and manage all customer orders.
          </p>
        </div>
        <Button
          onClick={() =>
            queryClient.invalidateQueries({ queryKey: ["orders"] })
          }
          variant="outline"
          className="flex items-center gap-2"
          disabled={isLoading}
        >
          <RefreshCw className={cn("h-4 w-4", isLoading && "animate-spin")} />
          Refresh
        </Button>
      </header>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          title="Total Orders"
          value={stats.total}
          icon={ShoppingCart}
          color="bg-blue-500"
        />
        <StatCard
          title="Pending"
          value={stats.pending || 0}
          icon={Clock}
          color="bg-yellow-500"
        />
        <StatCard
          title="In Transit"
          value={stats.in_transit || 0}
          icon={Truck}
          color="bg-purple-500"
        />
        <StatCard
          title="Delivered"
          value={stats.delivered || 0}
          icon={CheckCircle2}
          color="bg-green-500"
        />
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1">
              <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
              <Input
                placeholder="Search by Order ID, customer, vendor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="CONFIRMED">Confirmed</SelectItem>
                  <SelectItem value="PREPARING">Preparing</SelectItem>
                  <SelectItem value="READY">Ready</SelectItem>
                  <SelectItem value="IN_TRANSIT">In Transit</SelectItem>
                  <SelectItem value="DELIVERED">Delivered</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center rounded-md bg-gray-100 p-1 dark:bg-gray-800">
                <Button
                  variant={viewLayout === "grid" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setViewLayout("grid")}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewLayout === "list" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setViewLayout("list")}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {orders.length > 0 ? (
        <>
          {viewLayout === "grid" ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
              {orders.map((order: Order) => (
                <OrderCard
                  key={order.id}
                  order={order}
                  onViewDetails={handleViewDetails}
                  onAssignDriver={handleAssignDriverClick}
                  onUpdateStatus={updateStatusMutation.mutate}
                />
              ))}
            </div>
          ) : (
            <OrderTable
              orders={orders}
              onViewDetails={handleViewDetails}
              onAssignDriver={handleAssignDriverClick}
              onUpdateStatus={updateStatusMutation.mutate}
            />
          )}
          <Pagination
            currentPage={paginationInfo.page}
            totalPages={paginationInfo.pages}
            onPageChange={setCurrentPage}
          />
        </>
      ) : (
        <div className="flex h-64 flex-col items-center justify-center rounded-lg border-2 border-dashed bg-gray-50 dark:bg-gray-800/50">
          <Inbox className="h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-semibold">No Orders Found</h3>
          <p className="text-muted-foreground mt-1">
            Try adjusting your search or filters.
          </p>
        </div>
      )}

      {selectedOrder && (
        <OrderDetailsDialog
          isOpen={isDetailsOpen}
          setIsOpen={setIsDetailsOpen}
          order={selectedOrder}
        />
      )}

      {selectedOrder && (
        <AssignDriverDialog
          isOpen={isAssignDriverOpen}
          setIsOpen={setIsAssignDriverOpen}
          order={selectedOrder}
          drivers={drivers}
          onAssign={assignDriverMutation.mutate}
          isAssigning={assignDriverMutation.isPending}
        />
      )}
    </div>
  );
}

// Sub-components
const StatCard = ({
  title,
  value,
  icon: Icon,
  color,
}: {
  title: string;
  value: string;
  icon: any;
  color: string;
}) => (
  <Card>
    <CardContent className="p-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="text-2xl font-bold">{value}</p>
        </div>
        <div className={`rounded-full p-3 ${color}`}>
          <Icon className="h-6 w-6 text-white" />
        </div>
      </div>
    </CardContent>
  </Card>
);

const getStatusConfig = (status: string) => {
  const configs = {
    pending: { icon: Clock, color: "text-yellow-600", bg: "bg-yellow-100" },
    confirmed: {
      icon: CheckCircle2,
      color: "text-blue-600",
      bg: "bg-blue-100",
    },
    preparing: { icon: Store, color: "text-orange-600", bg: "bg-orange-100" },
    ready: { icon: Package, color: "text-purple-600", bg: "bg-purple-100" },
    in_transit: { icon: Truck, color: "text-indigo-600", bg: "bg-indigo-100" },
    delivered: {
      icon: CheckCircle2,
      color: "text-green-600",
      bg: "bg-green-100",
    },
    cancelled: { icon: XCircle, color: "text-red-600", bg: "bg-red-100" },
  };

  const s = (status?.toLowerCase() || "pending") as keyof typeof configs;

  return configs[s] || configs.pending;
};
const StatusBadge = ({ status }: { status: string }) => {
  const config = getStatusConfig(status);
  const Icon = config.icon;
  return (
    <Badge className={cn("flex items-center gap-1.5", config.bg, config.color)}>
      <Icon className="h-3 w-3" />
      {status.replace("_", " ")}
    </Badge>
  );
};

const OrderCard = ({
  order,
  onViewDetails,
  onAssignDriver,
  onUpdateStatus,
}: {
  order: Order;
  onViewDetails: (order: Order) => void;
  onAssignDriver: (order: Order) => void;
  onUpdateStatus: (orderId: string, status: string) => void;
}) => (
  <Card className="flex flex-col justify-between transition-all hover:shadow-lg">
    <CardHeader>
      <div className="flex items-start justify-between">
        <div>
          <CardTitle className="text-base">
            ID: TG{order.id?.slice(-4).toUpperCase()}
          </CardTitle>
          <CardDescription>
            {format(new Date(order.createdAt), "MMM dd, yyyy, HH:mm")}
          </CardDescription>
        </div>
        <StatusBadge status={order.status} />
      </div>
    </CardHeader>
    <CardContent className="space-y-3 text-sm">
      <div className="flex items-center gap-2">
        <Avatar className="h-8 w-8">
          <AvatarFallback>{order.user?.name?.charAt(0) || "U"}</AvatarFallback>
        </Avatar>
        <div>
          <p className="font-medium">{order.user?.name || "Guest"}</p>
          <p className="text-xs text-muted-foreground">
            {order.user?.phoneNumber}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Store className="h-4 w-4 text-muted-foreground" />
        <span>{order.vendor?.shopName || "Unknown Vendor"}</span>
      </div>
      <div className="flex items-center gap-2">
        <Banknote className="h-4 w-4 text-muted-foreground" />
        <span className="font-semibold">
          D{order.totalAmount?.toFixed(2) || "0.00"}
        </span>
      </div>
    </CardContent>
    <CardFooter className="flex justify-between">
      <p className="text-xs text-muted-foreground">
        {order.items?.length || 0} items
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onViewDetails(order)}
        >
          <Eye className="mr-2 h-4 w-4" />
          Details
        </Button>
        <OrderActions
          order={order}
          onAssignDriver={onAssignDriver}
          onUpdateStatus={onUpdateStatus}
        />
      </div>
    </CardFooter>
  </Card>
);

const OrderTable = ({
  orders,
  onViewDetails,
  onAssignDriver,
  onUpdateStatus,
}: {
  orders: Order[];
  onViewDetails: (order: Order) => void;
  onAssignDriver: (order: Order) => void;
  onUpdateStatus: (orderId: string, status: string) => void;
}) => (
  <Card>
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Order</TableHead>
          <TableHead>Customer</TableHead>
          <TableHead>Vendor</TableHead>
          <TableHead>Amount</TableHead>
          <TableHead>Status</TableHead>
          <TableHead>Driver</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {orders.map((order) => (
          <TableRow key={order.id}>
            <TableCell>
              <div className="font-medium">
                TG{order.id?.slice(-4).toUpperCase()}
              </div>
              <div className="text-xs text-muted-foreground">
                {format(new Date(order.createdAt), "PP")}
              </div>
            </TableCell>
            <TableCell>{order.user?.name || "Guest"}</TableCell>
            <TableCell>{order.vendor?.shopName || "Unknown"}</TableCell>
            <TableCell>D{order.totalAmount?.toFixed(2)}</TableCell>
            <TableCell>
              <StatusBadge status={order.status} />
            </TableCell>
            <TableCell>{order.driver?.name || "Unassigned"}</TableCell>
            <TableCell className="text-right">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onViewDetails(order)}
              >
                <Eye className="h-4 w-4" />
              </Button>
              <OrderActions
                order={order}
                onAssignDriver={onAssignDriver}
                onUpdateStatus={onUpdateStatus}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </Card>
);

const OrderActions = ({
  order,
  onAssignDriver,
  onUpdateStatus,
}: {
  order: Order;
  onAssignDriver: (order: Order) => void;
  onUpdateStatus: (orderId: string, status: string) => void;
}) => {
  const status = order.status?.toLowerCase();
  const items = [];

  if (status === "pending") {
    items.push({ label: "Confirm", status: "CONFIRMED", icon: CheckCircle2 });
  }
  if (status === "confirmed") {
    items.push({ label: "Prepare", status: "PREPARING", icon: Store });
  }
  if (status === "preparing") {
    items.push({ label: "Ready", status: "READY", icon: Package });
  }
  if (status === "ready" && !order.driver) {
    items.push({
      label: "Assign Driver",
      action: () => onAssignDriver(order),
      icon: Truck,
    });
  }
  if (status === "ready" && order.driver) {
    items.push({ label: "Dispatch", status: "IN_TRANSIT", icon: Truck });
  }
  if (status !== "delivered" && status !== "cancelled") {
    items.push({ label: "Deliver", status: "DELIVERED", icon: CheckCircle2 });
  }
  if (status !== "cancelled" && status !== "delivered") {
    items.push({
      label: "Cancel",
      status: "CANCELLED",
      icon: XCircle,
      isDestructive: true,
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon">
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.map((item) => (
          <DropdownMenuItem
            key={item.label}
            onClick={() =>
              item.action
                ? item.action()
                : onUpdateStatus({ orderId: order.id, status: item.status })
            }
            className={cn(item.isDestructive && "text-red-500")}
          >
            <item.icon className="mr-2 h-4 w-4" />
            {item.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) => (
  <div className="flex items-center justify-center gap-2">
    <Button
      onClick={() => onPageChange(currentPage - 1)}
      disabled={currentPage === 1}
      variant="outline"
      size="sm"
    >
      <ChevronLeft className="h-4 w-4" />
    </Button>
    <span className="text-sm text-muted-foreground">
      Page {currentPage} of {totalPages}
    </span>
    <Button
      onClick={() => onPageChange(currentPage + 1)}
      disabled={currentPage === totalPages}
      variant="outline"
      size="sm"
    >
      <ChevronRight className="h-4 w-4" />
    </Button>
  </div>
);

const OrderDetailsDialog = ({
  isOpen,
  setIsOpen,
  order,
}: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  order: Order;
}) => (
  <Dialog open={isOpen} onOpenChange={setIsOpen}>
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle className="text-xl">
          Order TG{order.id?.slice(-4).toUpperCase()}
        </DialogTitle>
        <div className="flex items-center justify-between pt-2">
          <StatusBadge status={order.status} />
          <p className="text-sm text-muted-foreground">
            {format(new Date(order.createdAt), "PPpp")}
          </p>
        </div>
      </DialogHeader>
      <div className="grid gap-6 py-4">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <InfoCard
            icon={User}
            title="Customer"
            data={[
              { label: "Name", value: order.user?.name || "N/A" },
              { label: "Phone", value: order.user?.phoneNumber || "N/A" },
            ]}
          />
          <InfoCard
            icon={Store}
            title="Vendor"
            data={[
              {
                label: "Name",
                value:
                  order.vendor?.shopName || order.vendor?.businessName || "N/A",
              },
              { label: "Phone", value: order.vendor?.phoneNumber || "N/A" },
            ]}
          />
        </div>
        {order.isGiftOrder && (
          <InfoCard
            icon={Gift}
            title="Gift Recipient"
            data={[
              { label: "Name", value: order.recipientName || "N/A" },
              { label: "Phone", value: order.recipientPhone || "N/A" },
            ]}
          />
        )}
        <InfoCard
          icon={MapPin}
          title="Delivery"
          data={[
            {
              label: "Address",
              value:
                typeof order.deliveryAddress === "string"
                  ? order.deliveryAddress
                  : (order.deliveryAddress?.street ?? "No address provided"),
            },
            { label: "Driver", value: order.driver?.name || "Unassigned" },
          ]}
        />
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Order Items</CardTitle>
          </CardHeader>
          <CardContent>
            {order.items?.map((item) => (
              <div key={item.product?._id} className="flex justify-between">
                <p>
                  {item.quantity} x {item.product?.name}
                </p>
                <p>D{(item.price * item.quantity).toFixed(2)}</p>
              </div>
            ))}
            <Separator className="my-2" />
            <div className="flex justify-between font-bold">
              <p>Total</p>
              <p>D{order.totalAmount?.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </DialogContent>
  </Dialog>
);

const AssignDriverDialog = ({
  isOpen,
  setIsOpen,
  order,
  drivers,
  onAssign,
  isAssigning,
}: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  order: Order;
  drivers: Driver[];
  onAssign: (data: { orderId: string; driverId: string }) => void;
  isAssigning: boolean;
}) => {
  const [selectedDriverId, setSelectedDriverId] = useState(
    order.driver?.id || "",
  );
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Assign Driver</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p>
            Select a driver for order{" "}
            <strong>TG{order.id?.slice(-4).toUpperCase()}</strong>.
          </p>
          <Select value={selectedDriverId} onValueChange={setSelectedDriverId}>
            <SelectTrigger className="mt-4">
              <SelectValue placeholder="Select a driver" />
            </SelectTrigger>
            <SelectContent>
              {drivers.map((driver) => (
                <SelectItem key={driver.id} value={driver.id || ""}>
                  {driver.name} ({driver.vehicleType})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={() =>
            onAssign({ orderId: order.id, driverId: selectedDriverId } as any)
          }
          disabled={!selectedDriverId || isAssigning}
        >
          {isAssigning ? "Assigning..." : "Assign Driver"}
        </Button>
      </DialogContent>
    </Dialog>
  );
};

const InfoCard = ({
  icon: Icon,
  title,
  data,
}: {
  icon: any;
  title: string;
  data: { label: string; value: string }[];
}) => (
  <Card>
    <CardHeader className="flex-row items-center gap-2 space-y-0 pb-2">
      <Icon className="h-4 w-4 text-muted-foreground" />
      <CardTitle className="text-base">{title}</CardTitle>
    </CardHeader>
    <CardContent className="space-y-1 text-sm">
      {data.map((item) => (
        <div key={item.label} className="flex justify-between">
          <p className="text-muted-foreground">{item.label}</p>
          <p className="font-medium">{item.value || "N/A"}</p>
        </div>
      ))}
    </CardContent>
  </Card>
);

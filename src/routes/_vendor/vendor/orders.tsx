import { useState, useMemo, type ChangeEvent, type ReactNode } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { format, formatDistanceToNow } from "date-fns";
import {
  Package,
  Clock,
  CheckCircle2,
  XCircle,
  RefreshCw,
  QrCode,
  Camera,
  X,
  Bike,
  ShoppingBag,
  ChefHat,
  CreditCard,
  Wifi,
  WifiOff,
  Search,
  ArrowRight,
  Truck,
  User,
  Phone,
  MapPin,
  AlertCircle,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { useVendorProfile } from "@/hooks/use-vendor-profile";
import { useOrderNotifications } from "@/hooks/use-order-notifications";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/_vendor/vendor/orders")({
  component: VendorOrders,
});

interface OrderItem {
  id: string;
  name?: string;
  quantity: number;
  price: number;
  menuItem?: { name: string; imageUrl?: string };
  product?: { name: string; imageUrl?: string };
  medicine?: { name: string; imageUrl?: string };
}

interface Order {
  id: string;
  customerName: string;
  customerPhone?: string;
  deliveryAddress?: string;
  orderType: "PICKUP" | "DELIVERY";
  status:
    | "PENDING"
    | "ACCEPTED"
    | "PROCESSING"
    | "PREPARING"
    | "READY"
    | "DISPATCHED"
    | "DELIVERED"
    | "CANCELLED";
  paymentStatus?: "UNPAID" | "PAID" | "REFUNDED" | "FAILED";
  paymentMethod?: string;
  totalAmount: number;
  subtotalAmount?: number;
  deliveryFee?: number;
  discountAmount?: number;
  notes?: string;
  pickupInstructions?: string;
  createdAt: string;
  driver?: { name?: string } | null;
  orderItems?: OrderItem[];
  items?: OrderItem[];
}

const ORDER_STATUSES = {
  PENDING: { label: "Pending", color: "bg-orange-500", icon: Clock },
  ACCEPTED: { label: "Accepted", color: "bg-blue-500", icon: CheckCircle2 },
  PROCESSING: { label: "Processing", color: "bg-purple-500", icon: Package },
  PREPARING: { label: "Preparing", color: "bg-yellow-500", icon: ChefHat },
  READY: { label: "Ready", color: "bg-green-500", icon: Package },
  DISPATCHED: { label: "Dispatched", color: "bg-indigo-500", icon: Bike },
  DELIVERED: { label: "Delivered", color: "bg-gray-500", icon: CheckCircle2 },
  CANCELLED: { label: "Cancelled", color: "bg-red-500", icon: XCircle },
};

const STATUS_CONFIG: Record<
  string,
  { label: string; color: string; bg: string; icon: ReactNode }
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
    icon: <CheckCircle2 className="w-3 h-3" />,
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
    icon: <CheckCircle2 className="w-3 h-3" />,
  },
  CANCELLED: {
    label: "Cancelled",
    color: "text-red-700",
    bg: "bg-red-50 border-red-200",
    icon: <XCircle className="w-3 h-3" />,
  },
};

const TABS = [
  { key: "active", label: "Active" },
  { key: "completed", label: "Completed" },
];

const PAID_STATES = [
  "PREPARING",
  "PROCESSING",
  "READY",
  "DISPATCHED",
  "DELIVERED",
];

function getAllowedTransitions(current: string, isDelivery: boolean, isPaid: boolean) {
  switch (current) {
    case "PENDING":
      return ["ACCEPTED", "CANCELLED"];
    case "ACCEPTED":
      return isPaid ? ["PROCESSING"] : ["CANCELLED"];
    case "PROCESSING":
      return ["PREPARING", "READY"];
    case "PREPARING":
      return ["READY"];
    case "READY":
      return isDelivery ? ["DISPATCHED"] : ["DELIVERED"];
    default:
      return [];
  }
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CONFIG[status] ?? {
    label: status,
    color: "text-gray-600",
    bg: "bg-gray-50 border-gray-200",
    icon: null,
  };
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${cfg.bg} ${cfg.color}`}
    >
      {cfg.icon}
      {cfg.label}
    </span>
  );
}

function StatCard({
  label,
  value,
  icon,
  accent,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  accent: string;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-4 shadow-sm">
      <div
        className={`w-10 h-10 rounded-lg flex items-center justify-center ${accent}`}
      >
        {icon}
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900 leading-none">{value}</p>
        <p className="text-xs text-gray-500 mt-0.5 font-medium">{label}</p>
      </div>
    </div>
  );
}

export default function VendorOrders() {
  const queryClient = useQueryClient();
  const { vendor } = useVendorProfile();
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("ALL");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsLoading, setDetailsLoading] = useState(false);

  const { isConnected } = useOrderNotifications({
    vendorId: vendor?.id,
    enabled: !!vendor?.id,
    onNewOrder: () => {},
  });

  const {
    data: orders = [],
    isLoading,
    refetch,
  } = useQuery<Order[]>({
    queryKey: ["vendor-orders"],
    queryFn: async () => {
      const response = await api.get("/api/orders/vendor");
      return response.data;
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({
      orderId,
      status,
    }: {
      orderId: string;
      status: string;
    }) => {
      const response = await api.patch(`/api/orders/${orderId}/status`, {
        status,
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-orders"] });
      toast.success("Order updated");
      setDetailsOpen(false);
    },
    onError: () => {
      toast.error("Failed to update order");
    },
  });

  const filteredOrders = useMemo(() => {
    return orders
      .filter((o) => activeTab === "ALL" || o.status === activeTab)
      .filter((o) => {
        const s = searchQuery.toLowerCase();
        return (
          o.id.toLowerCase().includes(s) ||
          o.customerName?.toLowerCase().includes(s) ||
          o.customerPhone?.toLowerCase().includes(s)
        );
      })
      .sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      );
  }, [orders, searchQuery, activeTab]);

  const handleViewDetails = async (order: Order) => {
    setDetailsLoading(true);
    try {
      const resp = await api.get(`/api/orders/${order.id}`);
      setSelectedOrder(resp.data?.order ?? resp.data);
      setDetailsOpen(true);
    } catch {
      toast.error("Failed to load order details");
    } finally {
      setDetailsLoading(false);
    }
  };

  const handleStatusUpdate = (status: string) => {
    if (!selectedOrder) return;
    const isPaid = selectedOrder.paymentStatus === "PAID" || PAID_STATES.includes(selectedOrder.status);
    if (status === "CANCELLED" && isPaid) {
      toast.error("Cannot cancel after payment received");
      return;
    }
    if (status === "CANCELLED" && !window.confirm("Cancel this order?")) return;
    updateStatusMutation.mutate({ orderId: selectedOrder.id, status });
  };

  const stats = {
    total: orders.length,
    pending: orders.filter((o) => o.status === "PENDING").length,
    preparing: orders.filter((o) =>
      ["PREPARING", "PROCESSING"].includes(o.status),
    ).length,
    ready: orders.filter((o) => o.status === "READY").length,
    done: orders.filter((o) => o.status === "DELIVERED").length,
  };

  const tabCounts = useMemo(() => {
    const counts: Record<string, number> = { ALL: orders.length };
    orders.forEach((o) => {
      counts[o.status] = (counts[o.status] || 0) + 1;
    });
    return counts;
  }, [orders]);

  return (
    <div className="flex-1 p-6 md:p-8 bg-zinc-50 dark:bg-zinc-950 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-8">
      {/* ── Header ── */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-zinc-950 dark:text-zinc-50">
            Order Management
          </h1>
          <p className="text-zinc-500 dark:text-zinc-400 mt-1">
            Track and process customer orders in real time.
          </p>
        </div>
        <div className="flex items-center gap-3">
          <div
            className={`flex items-center shadow-sm gap-2 px-4 py-2 rounded-xl text-sm font-medium border ${
              isConnected
                ? "bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-300"
                : "bg-white dark:bg-zinc-900 border-orange-200 dark:border-orange-800 text-orange-600 dark:text-orange-400"
            }`}
          >
            {isConnected ? (
              <Wifi className="w-4 h-4 text-green-500" />
            ) : (
              <WifiOff className="w-3 h-3" />
            )}
            {isConnected ? "Live" : "Offline"}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            className="text-xs h-8 gap-1.5 border-gray-200"
          >
            <RefreshCw className="w-3 h-3" />
            Refresh
          </Button>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <StatCard
          label="Total Orders"
          value={stats.total}
          icon={<Package className="w-5 h-5 text-gray-600" />}
          accent="bg-gray-100"
        />
        <StatCard
          label="Pending"
          value={stats.pending}
          icon={<Clock className="w-5 h-5 text-amber-600" />}
          accent="bg-amber-50"
        />
        <StatCard
          label="Preparing"
          value={stats.preparing}
          icon={<ChefHat className="w-5 h-5 text-purple-600" />}
          accent="bg-purple-50"
        />
        <StatCard
          label="Ready"
          value={stats.ready}
          icon={<ShoppingBag className="w-5 h-5 text-emerald-600" />}
          accent="bg-emerald-50"
        />
        <StatCard
          label="Delivered"
          value={stats.done}
          icon={<CheckCircle2 className="w-5 h-5 text-green-600" />}
          accent="bg-green-50"
        />
      </div>

      {/* ── Search + Tabs ── */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 pt-4 pb-3 border-b border-gray-100">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              placeholder="Search by ID, name or phone…"
              value={searchQuery}
              onChange={(e: ChangeEvent<HTMLInputElement>) =>
                setSearchQuery(e.target.value)
              }
              className="pl-9 h-9 text-sm border-gray-200 bg-gray-50 focus:bg-white"
            />
          </div>
        </div>

        {/* Tab bar */}
        <div className="flex overflow-x-auto border-b border-gray-100 px-4 gap-0">
          {TABS.map((tab) => {
            const count = tabCounts[tab.key] || 0;
            const active = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  active
                    ? "border-amber-500 text-amber-700"
                    : "border-transparent text-gray-500 hover:text-gray-700"
                }`}
              >
                {tab.label}
                {count > 0 && tab.key !== "ALL" && (
                  <span
                    className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${
                      active
                        ? "bg-amber-100 text-amber-700"
                        : "bg-gray-100 text-gray-500"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* ── Table ── */}
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-16 gap-3">
            <RefreshCw className="w-6 h-6 text-gray-300 animate-spin" />
            <p className="text-sm text-gray-400">Loading orders…</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 gap-2">
            <Package className="w-10 h-10 text-gray-200" />
            <p className="text-sm font-medium text-gray-400">No orders found</p>
            {searchQuery && (
              <p className="text-xs text-gray-400">Try clearing your search</p>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="text-left">
                  <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    Order
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    Customer
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    Type
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    Items
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    Payment
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    Status
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                    Time
                  </th>
                  <th className="px-4 py-3 text-xs font-semibold text-gray-400 uppercase tracking-wide"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filteredOrders.map((order: Order) => {
                  const isNew =
                    new Date().getTime() - new Date(order.createdAt).getTime() <
                    5 * 60 * 1000;
                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-gray-50/80 transition-colors group cursor-pointer"
                      onClick={() => handleViewDetails(order)}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {isNew && (
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                          )}
                          <span className="font-mono text-sm font-bold text-gray-800">
                            TG{order.id.slice(-4).toUpperCase()}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <p className="text-sm font-medium text-gray-800">
                          {order.customerName || "—"}
                        </p>
                        <p className="text-xs text-gray-400">
                          {order.customerPhone || ""}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                            order.orderType === "DELIVERY"
                              ? "bg-blue-50 text-blue-700"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {order.orderType === "DELIVERY" ? (
                            <Truck className="w-3 h-3" />
                          ) : (
                            <ShoppingBag className="w-3 h-3" />
                          )}
                          {order.orderType || "N/A"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm text-gray-600">
                          {order.orderItems?.length || 0} items
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-sm font-semibold text-gray-900">
                          D
                          {(
                            order.subtotalAmount ??
                            order.totalAmount ??
                            0
                          ).toFixed(2)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`text-xs font-semibold ${
                            order.paymentStatus === "PAID"
                              ? "text-green-600"
                              : "text-amber-600"
                          }`}
                        >
                          {order.paymentStatus || "UNPAID"}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={order.status} />
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-gray-400">
                          {formatDistanceToNow(new Date(order.createdAt), {
                            addSuffix: true,
                          })}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button className="opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center gap-1 text-xs font-medium text-amber-600 hover:text-amber-700">
                          View <ArrowRight className="w-3 h-3" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Order Details Dialog ── */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto p-0 gap-0">
          {detailsLoading || !selectedOrder ? (
            <div className="flex items-center justify-center py-16">
              <RefreshCw className="w-6 h-6 animate-spin text-gray-300" />
            </div>
          ) : (
            <>
              {/* Dialog header */}
              <div className="px-6 py-5 border-b border-gray-100">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-lg font-bold text-gray-900">
                        TG{selectedOrder.id.slice(-4).toUpperCase()}
                      </span>
                      <StatusBadge status={selectedOrder.status} />
                    </div>
                    <p className="text-xs text-gray-400">
                      {format(
                        new Date(selectedOrder.createdAt),
                        "MMM dd, yyyy 'at' h:mm a",
                      )}
                    </p>
                  </div>
                </div>
              </div>

              <div className="px-6 py-5 space-y-5">
                {/* Meta pills */}
                <div className="flex flex-wrap gap-2">
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border ${
                      selectedOrder.orderType === "DELIVERY"
                        ? "bg-blue-50 border-blue-200 text-blue-700"
                        : "bg-gray-50 border-gray-200 text-gray-600"
                    }`}
                  >
                    {selectedOrder.orderType === "DELIVERY" ? (
                      <Truck className="w-3 h-3" />
                    ) : (
                      <ShoppingBag className="w-3 h-3" />
                    )}
                    {selectedOrder.orderType || "N/A"}
                  </span>
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border ${
                      selectedOrder.paymentStatus === "PAID"
                        ? "bg-green-50 border-green-200 text-green-700"
                        : "bg-amber-50 border-amber-200 text-amber-700"
                    }`}
                  >
                    <CreditCard className="w-3 h-3" />
                    {selectedOrder.paymentStatus || "UNPAID"}
                    {selectedOrder.paymentMethod
                      ? ` · ${selectedOrder.paymentMethod}`
                      : ""}
                  </span>
                  {selectedOrder.driver && (
                    <span className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border bg-indigo-50 border-indigo-200 text-indigo-700">
                      <Truck className="w-3 h-3" />
                      {selectedOrder.driver.name || "Driver assigned"}
                    </span>
                  )}
                </div>

                {/* Customer */}
                <div className="rounded-xl border border-gray-100 overflow-hidden">
                  <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Customer
                    </p>
                  </div>
                  <div className="px-4 py-3 space-y-2">
                    {selectedOrder.customerName && (
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="text-sm font-medium text-gray-800">
                          {selectedOrder.customerName}
                        </span>
                      </div>
                    )}
                    {selectedOrder.customerPhone && (
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        <span className="text-sm text-gray-600">
                          {selectedOrder.customerPhone}
                        </span>
                      </div>
                    )}
                    {selectedOrder.deliveryAddress && (
                      <div className="flex items-start gap-2">
                        <MapPin className="w-3.5 h-3.5 text-gray-400 shrink-0 mt-0.5" />
                        <span className="text-sm text-gray-600">
                          {selectedOrder.deliveryAddress}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Items */}
                <div className="rounded-xl border border-gray-100 overflow-hidden">
                  <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Items
                    </p>
                  </div>
                  <div className="divide-y divide-gray-50">
                    {selectedOrder.orderItems?.map((item: OrderItem) => {
                      const name =
                        item.name ||
                        item.menuItem?.name ||
                        item.product?.name ||
                        item.medicine?.name ||
                        "Item";
                      return (
                        <div
                          key={item.id}
                          className="flex items-center justify-between px-4 py-3"
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-6 h-6 rounded-full bg-gray-100 flex items-center justify-center text-xs font-bold text-gray-500">
                              {item.quantity}
                            </span>
                            <span className="text-sm font-medium text-gray-800">
                              {name}
                            </span>
                          </div>
                          <span className="text-sm font-semibold text-gray-900">
                            D{(item.price * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Totals */}
                <div className="rounded-xl border border-gray-100 overflow-hidden">
                  <div className="px-4 py-2.5 bg-gray-50 border-b border-gray-100">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      Breakdown
                    </p>
                  </div>
                  <div className="px-4 py-3 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500">Subtotal</span>
                      <span className="text-gray-700">
                        D
                        {(
                          selectedOrder.subtotalAmount ??
                          selectedOrder.totalAmount ??
                          0
                        ).toFixed(2)}
                      </span>
                    </div>
                    {selectedOrder.orderType?.toUpperCase() !== "PICKUP" && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Delivery fee</span>
                        <span className="text-gray-500">
                          D{(selectedOrder.deliveryFee ?? 0).toFixed(2)}
                        </span>
                      </div>
                    )}
                    {(selectedOrder.discountAmount ?? 0) > 0 && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-500">Discount</span>
                        <span className="text-green-600">
                          −D{(selectedOrder.discountAmount ?? 0).toFixed(2)}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between pt-2 border-t border-gray-100">
                      <span className="text-sm font-semibold text-gray-800">
                        Your earnings
                      </span>
                      <span className="text-base font-bold text-amber-600">
                        D
                        {(
                          selectedOrder.subtotalAmount ??
                          selectedOrder.totalAmount ??
                          0
                        ).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {(selectedOrder.notes || selectedOrder.pickupInstructions) && (
                  <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 flex gap-2">
                    <AlertCircle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
                    <p className="text-sm text-amber-800">
                      {selectedOrder.notes || selectedOrder.pickupInstructions}
                    </p>
                  </div>
                )}

                {/* Status actions */}
                {(() => {
                  const isDelivery = !!selectedOrder.deliveryAddress;
                  const isPaid =
                    selectedOrder.paymentStatus === "PAID" ||
                    PAID_STATES.includes(selectedOrder.status);
                  const transitions = getAllowedTransitions(
                    selectedOrder.status,
                    isDelivery,
                    isPaid,
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
                          <StatusBadge status={selectedOrder.status} />
                        </div>
                      </div>
                      <div className="px-4 py-3 flex flex-wrap gap-2">
                        {transitions.map((t) => {
                          const cfg = STATUS_CONFIG[t];
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
                          <p className="px-4 pb-3 text-xs font-medium text-amber-600 dark:text-amber-500">
                            Waiting for customer payment before you can begin processing.
                          </p>
                        )}
                      </div>
                    );
                })()}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}

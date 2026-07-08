import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent } from "@/components/ui/card";
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
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Zap,
  Clock,
  TrendingUp,
  Package,
  AlertTriangle,
  CheckCircle2,
  MapPin,
  RefreshCw,
  Phone,
  MessageSquare,
  Eye,
  UserCheck,
  Timer,
  Search,
  XCircle,
  ArrowUpRight,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { adminApi } from "@/lib/api";
import { formatExpressDeliveryId } from "@/lib/formatExpressDeliveryId";
import { DriverMap } from "@/components/driver-map";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExpressMetrics {
  todayStats: {
    totalExpressDeliveries: number;
    averageDeliveryTime: number;
    averageExpressFee: number;
    onTimeRate: number;
  };
  priorityBreakdown: Array<{ priorityLevel: string; _count: { id: number } }>;
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
  driverTransportFee?: number;
  vehicleType?: "BIKE" | "KEKE_CARGO" | "CAR" | "VAN" | "LORRY";
  pickupLatitude?: number | null;
  pickupLongitude?: number | null;
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

// ─── Helpers ──────────────────────────────────────────────────────────────────

const formatCurrency = (amount: number) =>
  `D${Math.round(amount).toLocaleString()}`;

const formatTimeRemaining = (guaranteedTime?: string) => {
  if (!guaranteedTime) return null;
  const diffMins = Math.floor(
    (new Date(guaranteedTime).getTime() - Date.now()) / 60_000,
  );
  if (diffMins <= 0) return { label: "OVERDUE", urgent: true };
  if (diffMins < 60)
    return { label: `${diffMins}m left`, urgent: diffMins < 15 };
  const h = Math.floor(diffMins / 60);
  const m = diffMins % 60;
  return { label: `${h}h ${m}m`, urgent: false };
};

const PRIORITY_CONFIG = {
  URGENT: {
    label: "Urgent",
    className:
      "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
    dot: "bg-red-500",
  },
  EXPRESS: {
    label: "Express",
    className:
      "bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800",
    dot: "bg-orange-500",
  },
  STANDARD: {
    label: "Standard",
    className:
      "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800",
    dot: "bg-emerald-500",
  },
};

const STATUS_CONFIG: Record<string, { label: string; className: string }> = {
  PENDING: {
    label: "Pending",
    className:
      "bg-yellow-100 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800",
  },
  DRIVER_ASSIGNED: {
    label: "Driver Assigned",
    className:
      "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800",
  },
  PICKED_UP: {
    label: "Picked Up",
    className:
      "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-400 dark:border-purple-800",
  },
  IN_TRANSIT: {
    label: "In Transit",
    className:
      "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-900/30 dark:text-indigo-400 dark:border-indigo-800",
  },
  ARRIVED: {
    label: "Arrived",
    className:
      "bg-teal-100 text-teal-700 border-teal-200 dark:bg-teal-900/30 dark:text-teal-400 dark:border-teal-800",
  },
  DELIVERED: {
    label: "Delivered",
    className:
      "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800",
  },
  CANCELLED: {
    label: "Cancelled",
    className:
      "bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
  },
};

const PAYMENT_CONFIG: Record<string, { label: string; className: string }> = {
  PAID: {
    label: "Paid",
    className:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400",
  },
  UNPAID: {
    label: "Unpaid",
    className:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400",
  },
  FAILED: {
    label: "Failed",
    className: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  },
  REFUNDED: {
    label: "Refunded",
    className: "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-400",
  },
};

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  icon: Icon,
  label,
  value,
  sub,
  iconClass,
  loading,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  sub?: string;
  iconClass?: string;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <Card>
        <CardContent className="p-5">
          <Skeleton className="h-4 w-24 mb-3" />
          <Skeleton className="h-7 w-16" />
        </CardContent>
      </Card>
    );
  }
  return (
    <Card>
      <CardContent className="p-5">
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              {label}
            </p>
            <p className="text-2xl font-bold mt-1 tabular-nums">{value}</p>
            {sub && (
              <p className="text-xs text-muted-foreground mt-0.5">{sub}</p>
            )}
          </div>
          <div
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-xl",
              iconClass,
            )}
          >
            <Icon className="h-5 w-5" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Delivery Detail Dialog ───────────────────────────────────────────────────

function DeliveryDetailDialog({
  delivery,
  open,
  onClose,
  onConfirm,
  onCancel,
  onApprove,
  confirmPending,
  cancelPending,
  approvePending,
}: {
  delivery: ExpressDelivery | null;
  open: boolean;
  onClose: () => void;
  onConfirm: (reason: string) => void;
  onCancel: () => void;
  onApprove: () => void;
  confirmPending: boolean;
  cancelPending: boolean;
  approvePending: boolean;
}) {
  if (!delivery) return null;

  const priority =
    PRIORITY_CONFIG[delivery.priorityLevel] ?? PRIORITY_CONFIG.STANDARD;
  const status = STATUS_CONFIG[delivery.status];
  const transport = delivery.driverTransportFee ?? delivery.estimatedFee;
  const platformFees = delivery.estimatedFee - transport;
  const driverEarns = Math.round(transport * 0.75);
  const terango = transport - driverEarns + platformFees;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            {formatExpressDeliveryId(delivery.id)}
          </DialogTitle>
          <DialogDescription>Express delivery details</DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-2">
          {/* Status badges */}
          <div className="flex flex-wrap gap-2">
            <Badge variant="outline" className={priority.className}>
              <span
                className={cn(
                  "mr-1.5 h-1.5 w-1.5 rounded-full inline-block",
                  priority.dot,
                )}
              />
              {priority.label}
            </Badge>
            {status && (
              <Badge variant="outline" className={status.className}>
                {status.label}
              </Badge>
            )}
            {delivery.paymentStatus && (
              <Badge
                variant="secondary"
                className={
                  PAYMENT_CONFIG[delivery.paymentStatus]?.className
                }
              >
                {PAYMENT_CONFIG[delivery.paymentStatus]?.label ??
                  delivery.paymentStatus}
              </Badge>
            )}
          </div>

          {/* Route */}
          <div className="rounded-lg border bg-muted/30 p-3 space-y-2">
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-emerald-500 mt-0.5 shrink-0" />
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                  Pickup
                </p>
                <p className="text-sm">{delivery.pickupAddress}</p>
              </div>
            </div>
            <div className="border-l ml-[7px] h-4 border-dashed border-muted-foreground/30" />
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-primary mt-0.5 shrink-0" />
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide">
                  Dropoff
                </p>
                <p className="text-sm">{delivery.dropoffAddress}</p>
              </div>
            </div>
          </div>

          {/* Contacts */}
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-lg border p-3">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
                Sender
              </p>
              <p className="text-sm font-medium">{delivery.senderName || "—"}</p>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">
                {delivery.senderPhone || "—"}
              </p>
            </div>
            <div className="rounded-lg border p-3">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
                Receiver
              </p>
              <p className="text-sm font-medium">
                {delivery.receiverName || "—"}
              </p>
              <p className="text-xs text-muted-foreground font-mono mt-0.5">
                {delivery.receiverPhone || "—"}
              </p>
            </div>
          </div>

          {/* Package */}
          {delivery.packageDescription && (
            <div className="rounded-lg border p-3">
              <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
                Package
              </p>
              <p className="text-sm">{delivery.packageDescription}</p>
            </div>
          )}

          {/* Fee breakdown */}
          <div className="rounded-lg border p-3 space-y-1.5">
            <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-2">
              Fee Breakdown
            </p>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Transport fee</span>
              <span className="font-mono">{formatCurrency(transport)}</span>
            </div>
            {platformFees > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">
                  Booking &amp; service fees
                </span>
                <span className="font-mono">
                  {formatCurrency(platformFees)}
                </span>
              </div>
            )}
            <div className="flex justify-between text-sm font-semibold border-t pt-1.5">
              <span>Customer pays</span>
              <span className="font-mono">
                {formatCurrency(delivery.estimatedFee)}
              </span>
            </div>
            <div className="flex justify-between text-xs text-emerald-600 dark:text-emerald-400 mt-1">
              <span>Driver earns (75% of transport)</span>
              <span className="font-mono font-semibold">
                {formatCurrency(driverEarns)}
              </span>
            </div>
            <div className="flex justify-between text-xs text-primary">
              <span>TeranGO earns</span>
              <span className="font-mono font-semibold">
                {formatCurrency(terango)}
              </span>
            </div>
          </div>

          {/* Deadline */}
          {delivery.guaranteedDeliveryTime && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="h-4 w-4" />
              Deadline:{" "}
              {new Date(delivery.guaranteedDeliveryTime).toLocaleString()}
            </div>
          )}

          {/* Approve for payment */}
          {delivery.status === "PENDING" &&
            !delivery.adminApprovedForPayment && (
              <Button
                size="sm"
                onClick={onApprove}
                disabled={approvePending}
                className="w-full bg-amber-600 hover:bg-amber-700 text-white"
              >
                <CheckCircle2 className="h-3.5 w-3.5 mr-1.5" />
                Approve for Payment
              </Button>
            )}

          {/* Confirm actions — only relevant once the driver has arrived and
              hasn't completed the handoff yet. verificationStatus defaults to
              PENDING in the DB and is never advanced by the driver app's
              simple "Complete Delivery" flow, so gating on status too avoids
              showing these on deliveries that are already DELIVERED. */}
          {delivery.verificationStatus === "PENDING" &&
            delivery.status === "ARRIVED" && (
            <div className="flex gap-2 pt-1 border-t">
              <Button
                size="sm"
                onClick={() =>
                  onConfirm("Admin confirmed via phone verification")
                }
                disabled={confirmPending}
                className="flex-1"
              >
                <Phone className="h-3.5 w-3.5 mr-1.5" />
                Confirm via Phone
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  onConfirm("Admin confirmed via customer contact")
                }
                disabled={confirmPending}
                className="flex-1"
              >
                <MessageSquare className="h-3.5 w-3.5 mr-1.5" />
                Confirm via SMS
              </Button>
            </div>
          )}
          {delivery.status !== "DELIVERED" &&
            delivery.status !== "CANCELLED" && (
              <Button
                size="sm"
                variant="outline"
                onClick={onCancel}
                disabled={cancelPending}
                className="w-full text-destructive border-destructive/30 hover:bg-destructive/5"
              >
                <XCircle className="h-3.5 w-3.5 mr-1.5" />
                Cancel Delivery
              </Button>
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Assign Driver Dialog ──────────────────────────────────────────────────────
// Lets the admin see available drivers (and their live location on the map)
// and manually pick who gets a delivery, instead of only auto-assigning.

interface DriverListItem {
  id: string;
  name: string;
  phone: string;
  vehicleType: string;
  vehicleNumber: string | null;
  isAvailable: boolean;
  currentLatitude: number | null;
  currentLongitude: number | null;
  lastLocationUpdate: string | null;
}

function AssignDriverDialog({
  delivery,
  onClose,
  onAssign,
  assignPending,
}: {
  delivery: ExpressDelivery | null;
  onClose: () => void;
  onAssign: (driverId: string) => void;
  assignPending: boolean;
}) {
  const [selectedDriverId, setSelectedDriverId] = useState<string | null>(
    null,
  );

  const { data: drivers, isLoading } = useQuery<DriverListItem[]>({
    queryKey: ["assign-drivers"],
    queryFn: () =>
      adminApi.getDrivers().then((res) => {
        const d = res.data;
        return Array.isArray(d) ? d : [];
      }),
    enabled: !!delivery,
    refetchInterval: 15_000,
  });

  if (!delivery) return null;

  const matching = (drivers ?? []).filter(
    (d) => d.isAvailable && d.vehicleType === delivery.vehicleType,
  );
  const others = (drivers ?? []).filter(
    (d) => !(d.isAvailable && d.vehicleType === delivery.vehicleType),
  );

  const getTimeSinceUpdate = (lastUpdate: string | null) => {
    if (!lastUpdate) return "No location yet";
    const seconds = Math.floor(
      (Date.now() - new Date(lastUpdate).getTime()) / 1000,
    );
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  const renderRow = (d: DriverListItem, compatible: boolean) => (
    <button
      key={d.id}
      type="button"
      onClick={() => setSelectedDriverId(d.id)}
      className={cn(
        "w-full text-left rounded-lg border p-3 flex items-center justify-between gap-3 transition-colors",
        selectedDriverId === d.id
          ? "border-primary bg-primary/5"
          : "hover:bg-muted/50",
        !compatible && "opacity-60",
      )}
    >
      <div>
        <div className="flex items-center gap-2">
          <span className="font-medium text-sm">{d.name}</span>
          <Badge
            variant="outline"
            className={cn(
              "text-[10px]",
              d.isAvailable
                ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400"
                : "bg-muted text-muted-foreground",
            )}
          >
            {d.isAvailable ? "Available" : "Busy"}
          </Badge>
          {!compatible && (
            <Badge variant="outline" className="text-[10px]">
              Vehicle mismatch
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {d.vehicleType} · {d.vehicleNumber || "No plate"} · {d.phone}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-[11px] text-muted-foreground flex items-center gap-1 justify-end">
          <Clock className="h-3 w-3" />
          {getTimeSinceUpdate(d.lastLocationUpdate)}
        </p>
      </div>
    </button>
  );

  return (
    <Dialog open={!!delivery} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <UserCheck className="h-4 w-4 text-primary" />
            Assign Driver — {formatExpressDeliveryId(delivery.id)}
          </DialogTitle>
          <DialogDescription>
            Needs a {delivery.vehicleType ?? "matching"} vehicle. Pickup:{" "}
            {delivery.pickupAddress}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg overflow-hidden border shrink-0">
          <DriverMap showControls={false} height="240px" />
        </div>

        <div className="flex-1 overflow-y-auto space-y-4 pr-1">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <RefreshCw className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              <div>
                <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-2">
                  Matching &amp; Available ({matching.length})
                </p>
                {matching.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No available driver has a matching vehicle right now.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {matching.map((d) => renderRow(d, true))}
                  </div>
                )}
              </div>
              {others.length > 0 && (
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-2">
                    Other Drivers
                  </p>
                  <div className="space-y-2">
                    {others.map((d) => renderRow(d, false))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        <div className="flex gap-2 pt-2 border-t shrink-0">
          <Button variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button
            onClick={() => selectedDriverId && onAssign(selectedDriverId)}
            disabled={!selectedDriverId || assignPending}
            className="flex-1"
          >
            {assignPending ? "Assigning..." : "Assign Driver"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

const ExpressDeliveryManagement: React.FC = () => {
  const [activeTab, setActiveTab] = useState("deliveries");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDelivery, setSelectedDelivery] =
    useState<ExpressDelivery | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const queryClient = useQueryClient();

  // ── Queries ──────────────────────────────────────────────────────────────────

  const { data: metrics, isLoading: metricsLoading } =
    useQuery<ExpressMetrics>({
      queryKey: ["express-metrics"],
      queryFn: () =>
        adminApi
          .getExpressMetrics()
          .then((res) => res.data?.data ?? res.data),
      refetchInterval: 60_000,
      retry: 1,
    });

  const {
    data: deliveries,
    isLoading: deliveriesLoading,
    refetch,
  } = useQuery<ExpressDelivery[]>({
    queryKey: ["express-deliveries", statusFilter, priorityFilter],
    queryFn: () =>
      adminApi
        .getExpressDeliveries({
          isExpress: true,
          status: statusFilter !== "ALL" ? statusFilter : undefined,
          priorityLevel: priorityFilter !== "ALL" ? priorityFilter : undefined,
        })
        .then((res) => {
          const d = res.data?.data ?? res.data;
          return Array.isArray(d) ? d : [];
        }),
    refetchInterval: 15_000,
  });

  const { data: urgentDeliveries } = useQuery<ExpressDelivery[]>({
    queryKey: ["urgent-express-deliveries"],
    queryFn: () =>
      adminApi.getUrgentExpressDeliveries().then((res) => {
        const d = res.data?.data ?? res.data;
        return Array.isArray(d) ? d : [];
      }),
    refetchInterval: 10_000,
    retry: 1,
  });

  // ── Mutations ─────────────────────────────────────────────────────────────────

  const approveForPaymentMutation = useMutation({
    mutationFn: (id: string) => adminApi.approveExpressDeliveryForPayment(id),
    onSuccess: () => {
      toast.success("Approved for payment");
      queryClient.invalidateQueries({ queryKey: ["express-deliveries"] });
      queryClient.invalidateQueries({
        queryKey: ["urgent-express-deliveries"],
      });
    },
    onError: (e: any) => toast.error(`Failed: ${e.message}`),
  });

  const assignDeliveryMutation = useMutation({
    mutationFn: ({ id, driverId }: { id: string; driverId?: string }) =>
      adminApi.assignExpressDelivery(id, driverId),
    onSuccess: () => {
      toast.success("Driver assigned");
      queryClient.invalidateQueries({ queryKey: ["express-deliveries"] });
      setAssignDialogDelivery(null);
    },
    onError: (e: any) => toast.error(`Failed: ${e.message}`),
  });

  const [assignDialogDelivery, setAssignDialogDelivery] =
    useState<ExpressDelivery | null>(null);

  const confirmDeliveryMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      adminApi.confirmExpressDelivery(id, reason),
    onSuccess: () => {
      toast.success("Delivery confirmed");
      queryClient.invalidateQueries({ queryKey: ["express-deliveries"] });
      setDetailOpen(false);
    },
    onError: (e: any) => toast.error(`Failed: ${e.message}`),
  });

  const cancelDeliveryMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      adminApi.cancelExpressDelivery(id, reason),
    onSuccess: () => {
      toast.success("Delivery cancelled");
      queryClient.invalidateQueries({ queryKey: ["express-deliveries"] });
      queryClient.invalidateQueries({
        queryKey: ["urgent-express-deliveries"],
      });
      setDetailOpen(false);
    },
    onError: (e: any) => toast.error(`Failed: ${e.message}`),
  });

  // ── Derived ──────────────────────────────────────────────────────────────────

  const filtered = (deliveries ?? []).filter((d) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      d.id.toLowerCase().includes(q) ||
      d.pickupAddress.toLowerCase().includes(q) ||
      d.dropoffAddress.toLowerCase().includes(q) ||
      d.senderName?.toLowerCase().includes(q) ||
      d.receiverName?.toLowerCase().includes(q)
    );
  });

  const today = metrics?.todayStats ?? {
    totalExpressDeliveries: 0,
    averageDeliveryTime: 0,
    averageExpressFee: 0,
    onTimeRate: 0,
  };

  const activeCount = (deliveries ?? []).filter(
    (d) => !["DELIVERED", "CANCELLED"].includes(d.status),
  ).length;

  const openDetail = (d: ExpressDelivery) => {
    setSelectedDelivery(d);
    setDetailOpen(true);
  };

  const handleCancelFromRow = (id: string) => {
    const reason = window.prompt("Reason for cancelling this delivery:");
    if (reason === null) return;
    cancelDeliveryMutation.mutate({ id, reason: reason || undefined });
  };

  // ── Render ───────────────────────────────────────────────────────────────────

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Zap className="h-5 w-5 text-primary" />
            <h1 className="text-xl font-bold tracking-tight">
              Express Delivery
            </h1>
          </div>
          <p className="text-sm text-muted-foreground mt-0.5">
            Real-time management for express &amp; priority deliveries
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          className="gap-2 shrink-0"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
      </div>

      {/* Urgent alert banner */}
      {urgentDeliveries && urgentDeliveries.length > 0 && (
        <div
          className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/40 px-4 py-3 cursor-pointer"
          onClick={() => setActiveTab("urgent")}
        >
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-100 dark:bg-red-900/40 shrink-0">
            <AlertTriangle className="h-4 w-4 text-red-600 dark:text-red-400" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-red-800 dark:text-red-300">
              {urgentDeliveries.length} urgent{" "}
              {urgentDeliveries.length === 1 ? "delivery" : "deliveries"} need
              attention
            </p>
            <p className="text-xs text-red-600 dark:text-red-400">
              Deadlines approaching — click to view urgent queue
            </p>
          </div>
          <ArrowUpRight className="h-4 w-4 text-red-500 shrink-0" />
        </div>
      )}

      {/* Stat cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <StatCard
          icon={Zap}
          label="Total Today"
          value={today.totalExpressDeliveries}
          sub="express deliveries"
          iconClass="bg-primary/10 text-primary"
          loading={metricsLoading}
        />
        <StatCard
          icon={Package}
          label="Active"
          value={activeCount}
          sub="in progress"
          iconClass="bg-blue-500/10 text-blue-600 dark:text-blue-400"
          loading={deliveriesLoading}
        />
        <StatCard
          icon={Clock}
          label="Avg. Delivery"
          value={
            today.averageDeliveryTime ? `${today.averageDeliveryTime}m` : "—"
          }
          sub="minutes"
          iconClass="bg-violet-500/10 text-violet-600 dark:text-violet-400"
          loading={metricsLoading}
        />
        <StatCard
          icon={TrendingUp}
          label="On-Time Rate"
          value={
            today.onTimeRate > 0
              ? `${Math.round(today.onTimeRate * 100)}%`
              : "—"
          }
          sub="delivered on time"
          iconClass="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
          loading={metricsLoading}
        />
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="h-9">
          <TabsTrigger value="deliveries" className="text-sm gap-1.5">
            All Deliveries
            {!deliveriesLoading && (
              <span className="rounded-full bg-muted px-1.5 text-[11px] font-semibold tabular-nums">
                {filtered.length}
              </span>
            )}
          </TabsTrigger>
          <TabsTrigger value="urgent" className="text-sm gap-1.5">
            Urgent Queue
            {urgentDeliveries && urgentDeliveries.length > 0 && (
              <span className="rounded-full bg-red-500 text-white px-1.5 text-[11px] font-bold tabular-nums">
                {urgentDeliveries.length}
              </span>
            )}
          </TabsTrigger>
        </TabsList>

        {/* ─── All Deliveries ─── */}
        <TabsContent value="deliveries" className="mt-4 space-y-4">
          {/* Filters */}
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-48">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search ID, address, sender…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm"
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-36 text-sm">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Status</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="DRIVER_ASSIGNED">Driver Assigned</SelectItem>
                <SelectItem value="PICKED_UP">Picked Up</SelectItem>
                <SelectItem value="IN_TRANSIT">In Transit</SelectItem>
                <SelectItem value="ARRIVED">Arrived</SelectItem>
                <SelectItem value="DELIVERED">Delivered</SelectItem>
                <SelectItem value="CANCELLED">Cancelled</SelectItem>
              </SelectContent>
            </Select>
            <Select value={priorityFilter} onValueChange={setPriorityFilter}>
              <SelectTrigger className="h-9 w-36 text-sm">
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

          {/* Table */}
          <Card>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-xs font-semibold uppercase tracking-wider pl-4 w-28">
                      ID
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider w-24">
                      Priority
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider">
                      Route
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider w-32">
                      Status
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider w-28">
                      Payment
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider w-28">
                      Driver
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider w-24">
                      Deadline
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-right pr-4 w-20">
                      Fee
                    </TableHead>
                    <TableHead className="text-xs font-semibold uppercase tracking-wider text-right pr-4 w-36">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {deliveriesLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}>
                        {Array.from({ length: 9 }).map((_, j) => (
                          <TableCell key={j} className="py-3">
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        ))}
                      </TableRow>
                    ))
                  ) : filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center py-12">
                        <div className="flex flex-col items-center gap-2">
                          <Package className="h-8 w-8 text-muted-foreground/30" />
                          <p className="text-sm font-medium text-muted-foreground">
                            No deliveries found
                          </p>
                          <p className="text-xs text-muted-foreground/60">
                            {searchQuery ||
                            statusFilter !== "ALL" ||
                            priorityFilter !== "ALL"
                              ? "Try adjusting your filters"
                              : "Express deliveries will appear here"}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((delivery) => {
                      const priority =
                        PRIORITY_CONFIG[delivery.priorityLevel] ??
                        PRIORITY_CONFIG.STANDARD;
                      const status = STATUS_CONFIG[delivery.status];
                      const timeInfo = formatTimeRemaining(
                        delivery.guaranteedDeliveryTime,
                      );
                      const payment =
                        PAYMENT_CONFIG[delivery.paymentStatus ?? "UNPAID"];

                      return (
                        <TableRow
                          key={delivery.id}
                          className={cn(
                            "group",
                            delivery.isDelayed &&
                              "bg-red-50/50 dark:bg-red-950/10",
                          )}
                        >
                          <TableCell className="pl-4 py-3">
                            <span className="font-mono text-xs text-muted-foreground">
                              {formatExpressDeliveryId(delivery.id)}
                            </span>
                          </TableCell>
                          <TableCell className="py-3">
                            <Badge
                              variant="outline"
                              className={cn("text-xs gap-1", priority.className)}
                            >
                              <span
                                className={cn(
                                  "h-1.5 w-1.5 rounded-full",
                                  priority.dot,
                                )}
                              />
                              {priority.label}
                            </Badge>
                          </TableCell>
                          <TableCell className="py-3 max-w-[200px]">
                            <p className="text-sm truncate font-medium">
                              {delivery.pickupAddress}
                            </p>
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              → {delivery.dropoffAddress}
                            </p>
                          </TableCell>
                          <TableCell className="py-3">
                            {status && (
                              <Badge
                                variant="outline"
                                className={cn(
                                  "text-xs whitespace-nowrap",
                                  status.className,
                                )}
                              >
                                {status.label}
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="py-3">
                            <div className="flex flex-col gap-1">
                              <span
                                className={cn(
                                  "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                                  payment?.className,
                                )}
                              >
                                {payment?.label ??
                                  delivery.paymentStatus ??
                                  "Unpaid"}
                              </span>
                              {!delivery.adminApprovedForPayment &&
                                delivery.status === "PENDING" && (
                                  <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400">
                                    Needs review
                                  </span>
                                )}
                            </div>
                          </TableCell>
                          <TableCell className="py-3">
                            {delivery.driverName ? (
                              <span className="text-sm">
                                {delivery.driverName}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                Unassigned
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="py-3">
                            {timeInfo ? (
                              <span
                                className={cn(
                                  "text-xs font-medium tabular-nums",
                                  timeInfo.urgent
                                    ? "text-red-600 dark:text-red-400"
                                    : "text-muted-foreground",
                                )}
                              >
                                {timeInfo.label}
                              </span>
                            ) : (
                              <span className="text-xs text-muted-foreground">
                                —
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="py-3 text-right pr-4">
                            <span className="text-sm font-semibold tabular-nums">
                              {formatCurrency(delivery.estimatedFee)}
                            </span>
                          </TableCell>
                          <TableCell className="py-3 pr-4">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7"
                                onClick={() => openDetail(delivery)}
                                title="View details"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </Button>
                              {delivery.status === "PENDING" &&
                                !delivery.adminApprovedForPayment && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20"
                                    onClick={() =>
                                      approveForPaymentMutation.mutate(
                                        delivery.id,
                                      )
                                    }
                                    disabled={
                                      approveForPaymentMutation.isPending
                                    }
                                  >
                                    Approve
                                  </Button>
                                )}
                              {delivery.status === "PENDING" &&
                                !delivery.driverName &&
                                delivery.paymentStatus === "PAID" && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-xs text-primary hover:text-primary hover:bg-primary/10"
                                    onClick={() =>
                                      setAssignDialogDelivery(delivery)
                                    }
                                  >
                                    <UserCheck className="h-3 w-3 mr-1" />
                                    Assign
                                  </Button>
                                )}
                              {delivery.status !== "DELIVERED" &&
                                delivery.status !== "CANCELLED" && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-7 w-7 text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                                    onClick={() =>
                                      handleCancelFromRow(delivery.id)
                                    }
                                    disabled={cancelDeliveryMutation.isPending}
                                    title="Cancel delivery"
                                  >
                                    <XCircle className="h-3.5 w-3.5" />
                                  </Button>
                                )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
          </Card>
        </TabsContent>

        {/* ─── Urgent Queue ─── */}
        <TabsContent value="urgent" className="mt-4 space-y-3">
          {!urgentDeliveries || urgentDeliveries.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-16">
                <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 dark:bg-emerald-900/30 mb-3">
                  <CheckCircle2 className="h-7 w-7 text-emerald-600 dark:text-emerald-400" />
                </div>
                <h3 className="font-semibold">All clear!</h3>
                <p className="text-sm text-muted-foreground mt-1">
                  No urgent deliveries at the moment
                </p>
              </CardContent>
            </Card>
          ) : (
            urgentDeliveries.map((delivery) => {
              const timeInfo = formatTimeRemaining(
                delivery.guaranteedDeliveryTime,
              );
              return (
                <Card
                  key={delivery.id}
                  className="border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/20"
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-sm font-semibold text-red-800 dark:text-red-300">
                            {formatExpressDeliveryId(delivery.id)}
                          </span>
                          <Badge
                            variant="outline"
                            className="text-xs bg-red-100 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800"
                          >
                            {delivery.priorityLevel}
                          </Badge>
                          {timeInfo && (
                            <span
                              className={cn(
                                "text-xs font-bold tabular-nums",
                                timeInfo.urgent
                                  ? "text-red-600 dark:text-red-400"
                                  : "text-muted-foreground",
                              )}
                            >
                              <Timer className="inline h-3 w-3 mr-0.5" />
                              {timeInfo.label}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-red-700 dark:text-red-400">
                          <MapPin className="h-3 w-3 shrink-0" />
                          <span className="truncate">
                            {delivery.pickupAddress} → {delivery.dropoffAddress}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                          {STATUS_CONFIG[delivery.status] && (
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-xs",
                                STATUS_CONFIG[delivery.status].className,
                              )}
                            >
                              {STATUS_CONFIG[delivery.status].label}
                            </Badge>
                          )}
                          <span
                            className={cn(
                              "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                              PAYMENT_CONFIG[
                                delivery.paymentStatus ?? "UNPAID"
                              ]?.className,
                            )}
                          >
                            {PAYMENT_CONFIG[delivery.paymentStatus ?? "UNPAID"]
                              ?.label ?? "Unpaid"}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => openDetail(delivery)}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        {delivery.status === "PENDING" && (
                          <>
                            {!delivery.adminApprovedForPayment && (
                              <Button
                                size="sm"
                                variant="outline"
                                className="h-8 text-xs border-red-300 dark:border-red-700"
                                onClick={() =>
                                  approveForPaymentMutation.mutate(delivery.id)
                                }
                                disabled={approveForPaymentMutation.isPending}
                              >
                                Approve
                              </Button>
                            )}
                            {delivery.paymentStatus === "PAID" && (
                              <Button
                                size="sm"
                                className="h-8 text-xs bg-red-600 hover:bg-red-700"
                                onClick={() => setAssignDialogDelivery(delivery)}
                              >
                                <UserCheck className="h-3.5 w-3.5 mr-1.5" />
                                Assign Now
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>

      {/* Detail dialog */}
      <DeliveryDetailDialog
        delivery={selectedDelivery}
        open={detailOpen}
        onClose={() => setDetailOpen(false)}
        onConfirm={(reason) =>
          selectedDelivery &&
          confirmDeliveryMutation.mutate({
            id: selectedDelivery.id,
            reason,
          })
        }
        onCancel={() =>
          selectedDelivery && handleCancelFromRow(selectedDelivery.id)
        }
        onApprove={() =>
          selectedDelivery &&
          approveForPaymentMutation.mutate(selectedDelivery.id, {
            onSuccess: () => setDetailOpen(false),
          })
        }
        confirmPending={confirmDeliveryMutation.isPending}
        cancelPending={cancelDeliveryMutation.isPending}
        approvePending={approveForPaymentMutation.isPending}
      />

      {/* Assign driver dialog */}
      <AssignDriverDialog
        delivery={assignDialogDelivery}
        onClose={() => setAssignDialogDelivery(null)}
        onAssign={(driverId) =>
          assignDialogDelivery &&
          assignDeliveryMutation.mutate({
            id: assignDialogDelivery.id,
            driverId,
          })
        }
        assignPending={assignDeliveryMutation.isPending}
      />
    </div>
  );
};

export const Route = createFileRoute("/_authenticated/express")({
  component: ExpressDeliveryManagement,
});

export default ExpressDeliveryManagement;

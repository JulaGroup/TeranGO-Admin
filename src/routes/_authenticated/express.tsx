import React, { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
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
  CheckCircle2,
  MapPin,
  RefreshCw,
  Phone,
  MessageSquare,
  Eye,
  UserCheck,
  Search,
  XCircle,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
} from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { adminApi } from "@/lib/api";
import { formatExpressDeliveryId } from "@/lib/formatExpressDeliveryId";
import { DriverMap } from "@/components/driver-map";
import { OrderLocationMap } from "@/components/order-location-map";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { ProfileDropdown } from "@/components/profile-dropdown";
import { ThemeSwitch } from "@/components/theme-switch";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ExpressMetrics {
  todayStats: {
    totalExpressDeliveries: number;
    averageDeliveryTime: number;
    averageExpressFee: number;
    onTimeRate: number;
  };
  totalAllTime?: number;
  statusCounts?: Record<string, number>;
  revenueToday?: number;
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
  dropoffLatitude?: number | null;
  dropoffLongitude?: number | null;
  expressMultiplier: number;
  createdAt: string;
  verificationStatus: string;
  verificationMethod?: string;
  paymentStatus?: "UNPAID" | "PAID" | "FAILED" | "REFUNDED";
  adminApprovedForPayment?: boolean;
  driverName?: string;
  driverEarningAmount?: number | null;
  driverSplitRate?: number | null;
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

const formatCreatedDate = (iso?: string) => {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return format(d, "MMM dd, yyyy");
};

const formatCreatedTime = (iso?: string) => {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return format(d, "HH:mm");
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

/**
 * The one stage an admin may advance a delivery to from its current one.
 * Deliberately a single step: offering the full list would let an admin mark a
 * package delivered that was never picked up.
 *
 * PENDING is absent on purpose — leaving it means assigning a driver, which is
 * its own action.
 */
const ADMIN_NEXT_STAGE: Record<string, { status: string; label: string } | undefined> = {
  DRIVER_ASSIGNED: { status: "PICKED_UP", label: "Picked Up" },
  PICKED_UP: { status: "IN_TRANSIT", label: "In Transit" },
  IN_TRANSIT: { status: "ARRIVED", label: "Arrived" },
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

// ─── Delivery Detail Dialog ───────────────────────────────────────────────────

function DeliveryDetailDialog({
  delivery,
  open,
  onClose,
  onConfirm,
  onCancel,
  onApprove,
  onAssignDriver,
  onAdvanceStatus,
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
  onAssignDriver: () => void;
  onAdvanceStatus: (status: string) => void;
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
  // Server-computed: actual DriverEarning record when delivered, otherwise a
  // projection from the assigned driver's split rate (0 for salaried drivers).
  const driverEarns =
    delivery.driverEarningAmount ?? Math.round(transport * 0.75);
  const driverRatePct = Math.round((delivery.driverSplitRate ?? 0.75) * 100);
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
            {(delivery.pickupLatitude != null ||
              delivery.dropoffLatitude != null) && (
              <OrderLocationMap
                originLatitude={delivery.pickupLatitude}
                originLongitude={delivery.pickupLongitude}
                originLabel={`Pickup: ${delivery.pickupAddress}`}
                originMarkerText="P"
                latitude={delivery.dropoffLatitude}
                longitude={delivery.dropoffLongitude}
                label={`Dropoff: ${delivery.dropoffAddress}`}
                height={200}
              />
            )}
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

          {/* Package & notes */}
          {(delivery.packageDescription || delivery.customerNote) && (
            <div className="rounded-lg border p-3 space-y-2">
              {delivery.packageDescription && (
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
                    Package
                  </p>
                  <p className="text-sm">{delivery.packageDescription}</p>
                </div>
              )}
              {delivery.packageDescription && delivery.customerNote && (
                <div className="border-t" />
              )}
              {delivery.customerNote && (
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-1">
                    Driver Notes
                  </p>
                  <p className="text-sm">{delivery.customerNote}</p>
                </div>
              )}
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
              <span>
                Driver earns
                {driverRatePct > 0
                  ? ` (${driverRatePct}% of transport)`
                  : " (salaried driver)"}
              </span>
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
          {/* Mark the delivery through its stages. Drivers normally advance
              these from their own app, but a rider can forget, lose signal, or
              hand over in person — without this an admin could only approve,
              assign, confirm delivered or cancel, with no way to correct the
              middle of the journey. Only the next stage is offered, so the
              timeline cannot be pushed out of order. */}
          {ADMIN_NEXT_STAGE[delivery.status] &&
            delivery.driverName &&
            delivery.status !== "DELIVERED" &&
            delivery.status !== "CANCELLED" && (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  onAdvanceStatus(ADMIN_NEXT_STAGE[delivery.status]!.status)
                }
                className="w-full"
              >
                <ArrowRight className="h-3.5 w-3.5 mr-1.5" />
                Mark as {ADMIN_NEXT_STAGE[delivery.status]!.label}
              </Button>
            )}

          {delivery.status !== "DELIVERED" &&
            delivery.status !== "CANCELLED" && (
              <Button
                size="sm"
                onClick={onAssignDriver}
                className="w-full"
              >
                <UserCheck className="h-3.5 w-3.5 mr-1.5" />
                {delivery.driverName
                  ? `Change Driver (${delivery.driverName})`
                  : "Assign Driver"}
              </Button>
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

const VEHICLE_FILTER_OPTIONS = [
  { value: "ALL", label: "All", emoji: "🚚" },
  { value: "BIKE", label: "Bike", emoji: "🏍️" },
  { value: "KEKE_CARGO", label: "Keke Cargo", emoji: "🛺" },
  { value: "CAR", label: "Car", emoji: "🚗" },
  { value: "VAN", label: "Van", emoji: "🚙" },
  { value: "LORRY", label: "Lorry", emoji: "🚛" },
] as const;

const VEHICLE_EMOJI: Record<string, string> = {
  BIKE: "🏍️",
  KEKE_CARGO: "🛺",
  CAR: "🚗",
  VAN: "🚙",
  LORRY: "🚛",
};

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
  // Defaults to the vehicle the customer booked; admin can widen to any type
  const [vehicleFilter, setVehicleFilter] = useState<string>("MATCH");

  // Fresh state each time the dialog opens for a (different) delivery
  React.useEffect(() => {
    setSelectedDriverId(null);
    setVehicleFilter("MATCH");
  }, [delivery?.id]);

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

  const activeVehicle =
    vehicleFilter === "MATCH" ? (delivery.vehicleType ?? "ALL") : vehicleFilter;

  const filtered = (drivers ?? []).filter(
    (d) => activeVehicle === "ALL" || d.vehicleType === activeVehicle,
  );
  const matching = filtered.filter((d) => d.isAvailable);
  const others = filtered.filter((d) => !d.isAvailable);

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
            <Badge
              variant="outline"
              className="text-[10px] bg-amber-50 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400"
            >
              Vehicle mismatch
            </Badge>
          )}
        </div>
        <p className="text-xs text-muted-foreground mt-0.5">
          {VEHICLE_EMOJI[d.vehicleType] ?? "🚚"} {d.vehicleType} ·{" "}
          {d.vehicleNumber || "No plate"} · {d.phone}
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
            {delivery.driverName ? "Change Driver" : "Assign Driver"} —{" "}
            {formatExpressDeliveryId(delivery.id)}
          </DialogTitle>
          <DialogDescription>
            Needs a {delivery.vehicleType ?? "matching"} vehicle. Pickup:{" "}
            {delivery.pickupAddress}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-lg overflow-hidden border shrink-0">
          <DriverMap showControls={false} height="240px" />
        </div>

        {/* Vehicle type filter — defaults to the booked vehicle */}
        <div className="flex flex-wrap gap-1.5 shrink-0">
          {VEHICLE_FILTER_OPTIONS.map((opt) => {
            const isBooked = opt.value === delivery.vehicleType;
            const isActive = activeVehicle === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => setVehicleFilter(opt.value)}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs font-medium transition-colors",
                  isActive
                    ? "border-primary bg-primary text-primary-foreground"
                    : "hover:bg-muted",
                )}
              >
                {opt.emoji} {opt.label}
                {isBooked && " ★"}
              </button>
            );
          })}
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
                  Available ({matching.length})
                </p>
                {matching.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    No available{" "}
                    {activeVehicle === "ALL" ? "" : `${activeVehicle} `}
                    driver right now — try another vehicle type or check the
                    Busy list below.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {matching.map((d) =>
                      renderRow(d, d.vehicleType === delivery.vehicleType),
                    )}
                  </div>
                )}
              </div>
              {others.length > 0 && (
                <div>
                  <p className="text-[11px] font-medium text-muted-foreground uppercase tracking-wide mb-2">
                    Busy / Offline ({others.length})
                  </p>
                  <div className="space-y-2">
                    {others.map((d) =>
                      renderRow(d, d.vehicleType === delivery.vehicleType),
                    )}
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

const PAGE_SIZE = 10;

const ExpressDeliveryManagement: React.FC = () => {
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
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

  // Search hits the server so it spans every page, but only after the typing
  // settles — otherwise each keystroke is a query.
  const [debouncedSearch, setDebouncedSearch] = useState("");
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(searchQuery.trim()), 350);
    return () => clearTimeout(t);
  }, [searchQuery]);

  // Any filter change invalidates the page number you were on.
  useEffect(() => {
    setCurrentPage(1);
  }, [statusFilter, priorityFilter, debouncedSearch]);

  const {
    data: deliveryPage,
    isLoading: deliveriesLoading,
    isFetching: deliveriesFetching,
    refetch,
  } = useQuery<{ items: ExpressDelivery[]; total: number; totalPages: number }>({
    queryKey: [
      "express-deliveries",
      statusFilter,
      priorityFilter,
      debouncedSearch,
      currentPage,
    ],
    queryFn: () =>
      adminApi
        .getExpressDeliveries({
          isExpress: true,
          status: statusFilter !== "ALL" ? statusFilter : undefined,
          priorityLevel: priorityFilter !== "ALL" ? priorityFilter : undefined,
          search: debouncedSearch || undefined,
          page: currentPage,
          limit: PAGE_SIZE,
        })
        .then((res) => {
          const body = res.data ?? {};
          const items = Array.isArray(body.data) ? body.data : [];
          const p = body.pagination ?? {};
          return {
            items,
            total: Number(p.total ?? items.length),
            totalPages: Number(p.totalPages ?? 1),
          };
        }),
    refetchInterval: 15_000,
    placeholderData: (prev) => prev,
  });

  // ── Mutations ─────────────────────────────────────────────────────────────────

  const approveForPaymentMutation = useMutation({
    mutationFn: (id: string) => adminApi.approveExpressDeliveryForPayment(id),
    onSuccess: () => {
      toast.success("Approved for payment");
      queryClient.invalidateQueries({ queryKey: ["express-deliveries"] });
    },
    onError: (e: any) => toast.error(`Failed: ${e.message}`),
  });

  const advanceStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      adminApi.updateExpressDeliveryStatus(id, status, {
        note: "Stage marked by admin",
      }),
    onSuccess: (_d, vars) => {
      toast.success(`Marked as ${vars.status.replace("_", " ").toLowerCase()}`);
      queryClient.invalidateQueries({ queryKey: ["express-deliveries"] });
      queryClient.invalidateQueries({ queryKey: ["express-metrics"] });
    },
    onError: (e: any) =>
      toast.error(
        e?.response?.data?.message || e.message || "Could not update the stage",
      ),
  });

  const assignDeliveryMutation = useMutation({
    mutationFn: ({
      id,
      driverId,
      isReassign,
    }: {
      id: string;
      driverId: string;
      isReassign: boolean;
    }) =>
      isReassign
        ? adminApi.reassignExpressDelivery(id, driverId)
        : adminApi.assignExpressDelivery(id, driverId),
    onSuccess: () => {
      toast.success("Driver assigned");
      queryClient.invalidateQueries({ queryKey: ["express-deliveries"] });
      setAssignDialogDelivery(null);
      setDetailOpen(false);
    },
    onError: (e: any) =>
      toast.error(
        `Failed: ${e?.response?.data?.message || e.message || "Could not assign driver"}`,
      ),
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
      setDetailOpen(false);
    },
    onError: (e: any) => toast.error(`Failed: ${e.message}`),
  });

  // ── Derived ──────────────────────────────────────────────────────────────────

  const rows = deliveryPage?.items ?? [];
  const totalMatching = deliveryPage?.total ?? 0;
  const totalPages = deliveryPage?.totalPages ?? 1;
  const hasFilters =
    !!debouncedSearch || statusFilter !== "ALL" || priorityFilter !== "ALL";

  // Counted server-side across the whole table, not the loaded page.
  const counts = metrics?.statusCounts ?? {};
  const sumOf = (...keys: string[]) =>
    keys.reduce((n, k) => n + (counts[k] ?? 0), 0);

  const stats = {
    total: metrics?.totalAllTime ?? 0,
    pending: sumOf("PENDING"),
    active: sumOf("DRIVER_ASSIGNED", "PICKED_UP", "IN_TRANSIT", "ARRIVED"),
    delivered: sumOf("DELIVERED"),
    cancelled: sumOf("CANCELLED"),
    revenueToday: metrics?.revenueToday ?? 0,
    todayCount: metrics?.todayStats?.totalExpressDeliveries ?? 0,
  };


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
          <h1 className="text-2xl font-bold tracking-tight">
            Express Delivery
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Track and manage all express courier deliveries
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() => refetch()}
            variant="outline"
            size="sm"
            disabled={deliveriesFetching}
          >
            <RefreshCw
              className={cn(
                "mr-2 h-4 w-4",
                deliveriesFetching && "animate-spin",
              )}
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
              Total Express
            </CardTitle>
            <Zap className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {metricsLoading ? (
                <Skeleton className="h-7 w-14" />
              ) : (
                stats.total.toLocaleString()
              )}
            </div>
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
            <div className="text-2xl font-bold tabular-nums">
              {metricsLoading ? (
                <Skeleton className="h-7 w-14" />
              ) : (
                stats.pending.toLocaleString()
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Awaiting a driver
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              In Progress
            </CardTitle>
            <Package className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {metricsLoading ? (
                <Skeleton className="h-7 w-14" />
              ) : (
                stats.active.toLocaleString()
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Assigned or on the road
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-emerald-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Delivered
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {metricsLoading ? (
                <Skeleton className="h-7 w-14" />
              ) : (
                stats.delivered.toLocaleString()
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.cancelled > 0
                ? `${stats.cancelled.toLocaleString()} cancelled`
                : "Completed"}
            </p>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-orange-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Revenue Today
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold tabular-nums">
              {metricsLoading ? (
                <Skeleton className="h-7 w-20" />
              ) : (
                formatCurrency(stats.revenueToday)
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              {stats.todayCount} today, paid only
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Deliveries table with integrated filters */}
      <Card className="shadow-sm overflow-hidden">
        <CardHeader className="border-b pb-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                className="pl-9 h-9 w-[260px]"
                placeholder="Search TGEX ref, address, sender..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-[160px]">
                <SelectValue placeholder="Filter by status" />
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
              <SelectTrigger className="h-9 w-[160px]">
                <SelectValue placeholder="Filter by priority" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All Priorities</SelectItem>
                <SelectItem value="URGENT">Urgent</SelectItem>
                <SelectItem value="EXPRESS">Express</SelectItem>
                <SelectItem value="STANDARD">Standard</SelectItem>
              </SelectContent>
            </Select>
            {hasFilters && (
              <Button
                variant="ghost"
                size="sm"
                className="h-9 text-muted-foreground"
                onClick={() => {
                  setSearchQuery("");
                  setStatusFilter("ALL");
                  setPriorityFilter("ALL");
                }}
              >
                <XCircle className="mr-1.5 h-3.5 w-3.5" />
                Clear
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {deliveriesLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground mb-4 opacity-50" />
              <p className="text-sm text-muted-foreground">
                Loading deliveries...
              </p>
            </div>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <Package className="h-10 w-10 text-muted-foreground/30 mb-3" />
              <p className="text-sm font-medium">No deliveries found</p>
              <p className="text-xs text-muted-foreground mt-1">
                {hasFilters
                  ? "Try adjusting your filters"
                  : "Express deliveries will appear here"}
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="bg-muted/50 hover:bg-muted/50">
                      <TableHead>Delivery</TableHead>
                      <TableHead>Route</TableHead>
                      <TableHead>Sender</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead>Driver</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((delivery) => {
                      const priority =
                        PRIORITY_CONFIG[delivery.priorityLevel] ??
                        PRIORITY_CONFIG.STANDARD;
                      const status = STATUS_CONFIG[delivery.status];
                      const payment =
                        PAYMENT_CONFIG[delivery.paymentStatus ?? "UNPAID"];

                      return (
                        <TableRow
                          key={delivery.id}
                          className="hover:bg-muted/30 transition-colors"
                        >
                          {/* Delivery ref + priority */}
                          <TableCell className="align-top">
                            <p className="font-medium whitespace-nowrap">
                              {formatExpressDeliveryId(delivery.id)}
                            </p>
                            <Badge
                              variant="outline"
                              className={cn(
                                "mt-1 text-xs gap-1",
                                priority.className,
                              )}
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

                          {/* Route: pickup above drop-off, the way a courier
                              run actually reads */}
                          <TableCell className="align-top max-w-[260px]">
                            <div className="flex gap-2">
                              <div className="flex flex-col items-center pt-1.5">
                                <span className="h-2 w-2 rounded-full bg-emerald-500 shrink-0" />
                                <span className="w-px flex-1 my-0.5 bg-border" />
                                <span className="h-2 w-2 rounded-full bg-red-500 shrink-0" />
                              </div>
                              <div className="min-w-0 space-y-1">
                                <p className="text-sm truncate">
                                  {delivery.pickupAddress}
                                </p>
                                <p className="text-sm truncate">
                                  {delivery.dropoffAddress}
                                </p>
                              </div>
                            </div>
                            {delivery.vehicleType && (
                              <p className="text-xs text-muted-foreground mt-1.5 flex items-center gap-1">
                                <span>
                                  {VEHICLE_EMOJI[delivery.vehicleType] ?? "🚚"}
                                </span>
                                {delivery.vehicleType.replace("_", " ")}
                              </p>
                            )}
                          </TableCell>

                          {/* Sender */}
                          <TableCell className="align-top">
                            <p className="font-medium text-sm">
                              {delivery.senderName || "Unknown"}
                            </p>
                            {delivery.senderPhone && (
                              <p className="text-muted-foreground text-xs">
                                {delivery.senderPhone}
                              </p>
                            )}
                            {delivery.receiverName && (
                              <p className="text-muted-foreground text-xs mt-0.5 truncate max-w-[140px]">
                                to {delivery.receiverName}
                              </p>
                            )}
                          </TableCell>

                          {/* Amount */}
                          <TableCell className="align-top">
                            <p className="font-semibold text-sm tabular-nums">
                              {formatCurrency(delivery.estimatedFee)}
                            </p>
                            {delivery.driverEarningAmount != null && (
                              <p className="text-xs text-muted-foreground flex items-center gap-1 tabular-nums">
                                <UserCheck className="h-2.5 w-2.5" />
                                {formatCurrency(delivery.driverEarningAmount)}{" "}
                                driver
                              </p>
                            )}
                          </TableCell>

                          {/* Status */}
                          <TableCell className="align-top">
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

                          {/* Payment */}
                          <TableCell className="align-top">
                            <Badge
                              variant="outline"
                              className={cn(
                                "text-xs whitespace-nowrap",
                                payment?.className,
                              )}
                            >
                              {payment?.label ??
                                delivery.paymentStatus ??
                                "Unpaid"}
                            </Badge>
                            {!delivery.adminApprovedForPayment &&
                              delivery.status === "PENDING" && (
                                <p className="text-xs text-amber-600 dark:text-amber-400 mt-1">
                                  Needs review
                                </p>
                              )}
                          </TableCell>

                          {/* Driver */}
                          <TableCell className="align-top">
                            {delivery.driverName ? (
                              <div className="flex items-center gap-1">
                                <span className="text-sm">
                                  {delivery.driverName}
                                </span>
                                {delivery.status !== "DELIVERED" &&
                                  delivery.status !== "CANCELLED" && (
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-6 px-1 text-xs text-blue-600 hover:text-blue-800"
                                      onClick={() =>
                                        setAssignDialogDelivery(delivery)
                                      }
                                      title="Change driver"
                                    >
                                      <RefreshCw className="h-3 w-3" />
                                    </Button>
                                  )}
                              </div>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setAssignDialogDelivery(delivery)}
                                disabled={
                                  delivery.status === "DELIVERED" ||
                                  delivery.status === "CANCELLED"
                                }
                              >
                                <UserCheck className="mr-1 h-3 w-3" />
                                Assign
                              </Button>
                            )}
                          </TableCell>

                          {/* Created */}
                          <TableCell className="align-top">
                            <p className="text-sm whitespace-nowrap">
                              {formatCreatedDate(delivery.createdAt)}
                            </p>
                            <p className="text-xs text-muted-foreground whitespace-nowrap">
                              {formatCreatedTime(delivery.createdAt)}
                            </p>
                          </TableCell>

                          {/* Actions */}
                          <TableCell className="align-top text-right">
                            <div className="flex items-center justify-end gap-1">
                              {delivery.status === "PENDING" &&
                                !delivery.adminApprovedForPayment && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-2 text-xs text-amber-600 hover:text-amber-700 hover:bg-amber-50 dark:hover:bg-amber-900/20"
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
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openDetail(delivery)}
                                title="View details"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {delivery.status !== "DELIVERED" &&
                                delivery.status !== "CANCELLED" && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive/70 hover:text-destructive hover:bg-destructive/10"
                                    onClick={() =>
                                      handleCancelFromRow(delivery.id)
                                    }
                                    disabled={cancelDeliveryMutation.isPending}
                                    title="Cancel delivery"
                                  >
                                    <XCircle className="h-4 w-4" />
                                  </Button>
                                )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3">
                <p className="text-sm text-muted-foreground">
                  Showing{" "}
                  <span className="font-medium text-foreground tabular-nums">
                    {(currentPage - 1) * PAGE_SIZE + 1}
                    {"-"}
                    {Math.min(currentPage * PAGE_SIZE, totalMatching)}
                  </span>{" "}
                  of{" "}
                  <span className="font-medium text-foreground tabular-nums">
                    {totalMatching}
                  </span>
                </p>
                {totalPages > 1 && (
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage === 1 || deliveriesFetching}
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="h-4 w-4 mr-1" />
                      Previous
                    </Button>
                    <span className="text-sm text-muted-foreground tabular-nums px-1">
                      Page {currentPage} of {totalPages}
                    </span>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={currentPage >= totalPages || deliveriesFetching}
                      onClick={() => setCurrentPage((p) => p + 1)}
                    >
                      Next
                      <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                  </div>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>

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
        onAssignDriver={() =>
          selectedDelivery && setAssignDialogDelivery(selectedDelivery)
        }
        onAdvanceStatus={(status) =>
          selectedDelivery &&
          advanceStatusMutation.mutate({ id: selectedDelivery.id, status })
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
            isReassign: !!assignDialogDelivery.driverName,
          })
        }
        assignPending={assignDeliveryMutation.isPending}
      />
    </div>
      </Main>
    </>
  );
};

export const Route = createFileRoute("/_authenticated/express")({
  component: ExpressDeliveryManagement,
});

export default ExpressDeliveryManagement;

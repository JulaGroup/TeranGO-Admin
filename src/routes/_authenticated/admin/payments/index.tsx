import { useState, useMemo } from "react";
import { format } from "date-fns";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  Search,
  MoreHorizontal,
  Eye,
  Banknote,
  Clock,
  CheckCircle2,
  RefreshCw,
  XCircle,
  List,
  LayoutGrid,
  Inbox,
  ChevronLeft,
  ChevronRight,
  ArrowRightLeft,
} from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "@/lib/api";
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
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { ProfileDropdown } from "@/components/profile-dropdown";
import { ThemeSwitch } from "@/components/theme-switch";

type Payment = {
  id: string;
  orderId: string | null;
  customDeliveryId: string | null;
  amount: number;
  currency: string;
  network: string;
  status: "PENDING" | "SUCCEEDED" | "FAILED";
  createdAt: string;
  order?: {
    customerName?: string;
    customerPhone?: string;
    restaurant?: { name?: string; vendorId?: string };
    shop?: { name?: string; vendorId?: string };
    pharmacy?: { name?: string; vendorId?: string };
    payouts?: Array<{ id?: string; amount?: number; status?: string }>;
  } | null;
  customDelivery?: {
    id?: string;
    senderName?: string | null;
    senderPhone?: string | null;
    receiverName?: string | null;
    pickupAddress?: string;
    dropoffAddress?: string;
    isExpress?: boolean;
    paymentStatus?: string;
    status?: string;
  } | null;
};

type PaginatedPayments = {
  data: Payment[];
  total: number;
  page: number;
  limit: number;
  pages: number;
  stats: {
    totalPayments: number;
    totalVolume: number;
    succeeded: number;
    failed: number;
  };
};

export const Route = createFileRoute("/_authenticated/admin/payments/")({
  component: PaymentsPage,
});

function PaymentsPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [networkFilter, setNetworkFilter] = useState("all");
  const [viewLayout, setViewLayout] = useState<"grid" | "list">("grid");
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  const { data: paymentsResponse, isLoading } = useQuery<PaginatedPayments>({
    queryKey: [
      "admin-payments",
      currentPage,
      12,
      searchQuery,
      statusFilter,
      networkFilter,
    ],
    queryFn: async () => {
      const params: any = { page: currentPage, limit: 12 };
      if (searchQuery) params.q = searchQuery;
      if (statusFilter !== "all") params.status = statusFilter;
      if (networkFilter !== "all") params.network = networkFilter;
      const resp = await adminApi.getPayments(params);
      return resp.data;
    },
  });

  const payments = useMemo(
    () => paymentsResponse?.data || [],
    [paymentsResponse],
  );
  const paginationInfo = useMemo(
    () => ({
      page: paymentsResponse?.page || 1,
      limit: paymentsResponse?.limit || 12,
      total: paymentsResponse?.total || 0,
      pages: paymentsResponse?.pages || 1,
    }),
    [paymentsResponse],
  );
  const stats = useMemo(
    () =>
      paymentsResponse?.stats || {
        totalPayments: 0,
        totalVolume: 0,
        succeeded: 0,
        failed: 0,
      },
    [paymentsResponse],
  );

  const handleViewDetails = (payment: Payment) => {
    setSelectedPayment(payment);
    setIsDetailsOpen(true);
  };

  if (isLoading && payments.length === 0) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center">
          <RefreshCw className="mx-auto mb-4 h-8 w-8 animate-spin text-muted-foreground opacity-50" />
          <p className="text-muted-foreground text-sm">Loading payments...</p>
        </div>
      </div>
    );
  }

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
          <h1 className="text-2xl font-bold tracking-tight">Payments</h1>
          <p className="text-muted-foreground text-sm mt-1">
            Monitor all transactions and payouts.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            onClick={() =>
              queryClient.invalidateQueries({ queryKey: ["admin-payments"] })
            }
            variant="outline"
            size="sm"
            disabled={isLoading}
          >
            <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card className="border-l-4 border-l-primary shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Volume
            </CardTitle>
            <Banknote className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              D {stats.totalVolume.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">All transactions</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Payments
            </CardTitle>
            <ArrowRightLeft className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.totalPayments.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">All time count</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Succeeded
            </CardTitle>
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.succeeded.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Successful payments</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-orange-500 shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Failed
            </CardTitle>
            <XCircle className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.failed.toLocaleString()}
            </div>
            <p className="text-xs text-muted-foreground mt-1">Failed transactions</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters + View Toggle */}
      <Card className="shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                className="pl-9 h-9 w-[260px]"
                placeholder="Search by ID, customer, vendor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select value={networkFilter} onValueChange={setNetworkFilter}>
              <SelectTrigger className="h-9 w-[160px]">
                <SelectValue placeholder="Network" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Networks</SelectItem>
                <SelectItem value="wave">Wave</SelectItem>
                <SelectItem value="wave_payout">Wave Payout</SelectItem>
                <SelectItem value="modempay">Modempay</SelectItem>
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="h-9 w-[160px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="SUCCEEDED">Succeeded</SelectItem>
                <SelectItem value="FAILED">Failed</SelectItem>
              </SelectContent>
            </Select>
            <div className="ml-auto flex items-center rounded-md border bg-muted/40 p-0.5">
              <Button
                variant={viewLayout === "grid" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setViewLayout("grid")}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
              </Button>
              <Button
                variant={viewLayout === "list" ? "secondary" : "ghost"}
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => setViewLayout("list")}
              >
                <List className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {payments.length > 0 ? (
        <>
          {viewLayout === "grid" ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {payments.map((payment) => (
                <PaymentCard
                  key={payment.id}
                  payment={payment}
                  onViewDetails={handleViewDetails}
                />
              ))}
            </div>
          ) : (
            <PaymentTable
              payments={payments}
              onViewDetails={handleViewDetails}
            />
          )}
          <Pagination
            currentPage={paginationInfo.page}
            totalPages={paginationInfo.pages}
            onPageChange={setCurrentPage}
          />
        </>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Inbox className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
          <p className="text-lg font-medium">No payments found</p>
          <p className="text-sm text-muted-foreground mt-1">
            Try adjusting your search or filters.
          </p>
        </div>
      )}

      {selectedPayment && (
        <PaymentDetailsDialog
          isOpen={isDetailsOpen}
          setIsOpen={setIsDetailsOpen}
          payment={selectedPayment}
        />
      )}
    </div>
      </Main>
    </>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getPaymentCustomer(payment: Payment): string {
  if (payment.order?.customerName) return payment.order.customerName;
  if (payment.customDelivery?.senderName) return payment.customDelivery.senderName;
  return "—";
}

function getPaymentService(payment: Payment): string {
  if (payment.order) {
    return (
      payment.order.restaurant?.name ||
      payment.order.shop?.name ||
      payment.order.pharmacy?.name ||
      "—"
    );
  }
  if (payment.customDelivery) {
    return payment.customDelivery.isExpress ? "⚡ Express Delivery" : "Custom Delivery";
  }
  return "—";
}

// Sub-components
const StatusBadge = ({ status }: { status: string }) => {
  const s = status?.toUpperCase();
  if (s === "SUCCEEDED") {
    return (
      <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm flex items-center gap-1.5 whitespace-nowrap">
        <CheckCircle2 className="h-3 w-3" />
        {status}
      </Badge>
    );
  }
  if (s === "FAILED") {
    return (
      <Badge variant="destructive" className="flex items-center gap-1.5 whitespace-nowrap">
        <XCircle className="h-3 w-3" />
        {status}
      </Badge>
    );
  }
  return (
    <Badge className="border border-amber-400 text-amber-600 bg-amber-50 dark:bg-amber-950/20 flex items-center gap-1.5 whitespace-nowrap">
      <Clock className="h-3 w-3" />
      {status}
    </Badge>
  );
};

const PaymentCard = ({
  payment,
  onViewDetails,
}: {
  payment: Payment;
  onViewDetails: (payment: Payment) => void;
}) => {
  const vendorName = getPaymentService(payment);

  return (
    <Card className="flex flex-col justify-between shadow-sm hover:shadow-md transition-shadow">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-sm font-mono font-semibold">
              #{payment.id.slice(-8).toUpperCase()}
            </CardTitle>
            <CardDescription className="text-xs mt-0.5">
              {format(new Date(payment.createdAt), "MMM dd, yyyy, HH:mm")}
            </CardDescription>
          </div>
          <StatusBadge status={payment.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-2.5 text-sm pb-3">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-xs">Amount</span>
          <span className="font-semibold">
            D {payment.amount.toLocaleString()}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-xs">Customer</span>
          <span className="font-medium text-xs">{getPaymentCustomer(payment)}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-xs">Vendor</span>
          <span className="font-medium text-xs">{vendorName}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground text-xs">Network</span>
          <Badge variant="outline" className="text-xs">{payment.network}</Badge>
        </div>
      </CardContent>
      <CardFooter className="pt-0">
        <Button
          variant="outline"
          size="sm"
          className="w-full h-8 text-xs"
          onClick={() => onViewDetails(payment)}
        >
          <Eye className="mr-2 h-3.5 w-3.5" />
          View Details
        </Button>
      </CardFooter>
    </Card>
  );
};

const PaymentTable = ({
  payments,
  onViewDetails,
}: {
  payments: any[];
  onViewDetails: (payment: any) => void;
}) => (
  <Card className="shadow-sm overflow-hidden">
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/50 hover:bg-muted/50">
            <TableHead>Payment ID</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Vendor</TableHead>
            <TableHead>Amount</TableHead>
            <TableHead>Network</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Date</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {payments.map((payment) => (
            <TableRow key={payment.id} className="hover:bg-muted/30 transition-colors">
              <TableCell className="font-mono text-xs font-medium">
                #{payment.id.slice(-8).toUpperCase()}
              </TableCell>
              <TableCell>{getPaymentCustomer(payment)}</TableCell>
              <TableCell>{getPaymentService(payment)}</TableCell>
              <TableCell className="font-semibold">
                D {payment.amount.toLocaleString()}
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="text-xs">{payment.network}</Badge>
              </TableCell>
              <TableCell>
                <StatusBadge status={payment.status} />
              </TableCell>
              <TableCell className="text-muted-foreground text-sm">
                {format(new Date(payment.createdAt), "PP")}
              </TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onViewDetails(payment)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  </Card>
);

const Pagination = ({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}) => (
  <div className="flex items-center justify-between">
    <p className="text-sm text-muted-foreground">
      Page {currentPage} of {totalPages}
    </p>
    <div className="flex items-center gap-2">
      <Button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        variant="outline"
        size="sm"
      >
        <ChevronLeft className="h-4 w-4 mr-1" />
        Previous
      </Button>
      <Button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        variant="outline"
        size="sm"
      >
        Next
        <ChevronRight className="h-4 w-4 ml-1" />
      </Button>
    </div>
  </div>
);

const PaymentDetailsDialog = ({
  isOpen,
  setIsOpen,
  payment,
}: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  payment: Payment;
}) => {
  const vendorName = getPaymentService(payment);
  const customerName = getPaymentCustomer(payment);
  const payout = payment.order?.payouts?.[0];
  const isCustomDelivery = !!payment.customDelivery;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="border-b pb-4">
          <DialogTitle className="font-mono text-lg">
            #{payment.id.slice(-8).toUpperCase()}
          </DialogTitle>
          <div className="flex items-center justify-between pt-1">
            <StatusBadge status={payment.status} />
            <p className="text-sm text-muted-foreground">
              {format(new Date(payment.createdAt), "PPpp")}
            </p>
          </div>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <InfoSection title="Transaction Details">
            <InfoRow
              label="Amount"
              value={`D ${payment.amount.toLocaleString()}`}
            />
            <InfoRow label="Network" value={payment.network} />
            <InfoRow label="Currency" value={payment.currency} />
            <InfoRow label="Payment ID" value={payment.id} isMonospace />
          </InfoSection>

          <InfoSection title={isCustomDelivery ? "Delivery Information" : "Order Information"}>
            <InfoRow label={isCustomDelivery ? "Delivery ID" : "Order ID"} value={payment.orderId ?? payment.customDeliveryId} isMonospace />
            <InfoRow label="Customer" value={customerName} />
            <InfoRow label={isCustomDelivery ? "Service" : "Vendor"} value={vendorName} />
            {payment.customDelivery && (
              <>
                <InfoRow label="Pickup" value={payment.customDelivery.pickupAddress} />
                <InfoRow label="Dropoff" value={payment.customDelivery.dropoffAddress} />
              </>
            )}
          </InfoSection>

          {payout && (
            <InfoSection title="Vendor Payout">
              <InfoRow label="Payout Amount" value={`D ${payout.amount}`} />
              <InfoRow label="Payout Status" value={payout.status} />
              <InfoRow label="Payout ID" value={payout.id} isMonospace />
            </InfoSection>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

const InfoSection = ({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) => (
  <div className="rounded-lg border overflow-hidden">
    <div className="bg-muted/50 px-4 py-2.5 border-b">
      <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        {title}
      </p>
    </div>
    <div className="p-4 space-y-2.5 text-sm">{children}</div>
  </div>
);

const InfoRow = ({
  label,
  value,
  isMonospace = false,
}: {
  label: string;
  value?: string | null;
  isMonospace?: boolean;
}) => (
  <div className="flex justify-between items-center">
    <p className="text-muted-foreground">{label}</p>
    <p className={cn("font-medium", isMonospace && "font-mono text-xs")}>
      {value || "N/A"}
    </p>
  </div>
);

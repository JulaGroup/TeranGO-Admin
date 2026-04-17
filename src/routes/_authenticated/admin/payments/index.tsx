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

type Payment = {
  id: string;
  orderId: string | null;
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
  };
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
          <div className="border-primary mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2"></div>
          <p className="text-muted-foreground">Loading payments...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 p-4 md:p-6">
      <header className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Payments</h1>
          <p className="text-muted-foreground">
            Monitor all transactions and payouts.
          </p>
        </div>
        <Button
          onClick={() =>
            queryClient.invalidateQueries({ queryKey: ["admin-payments"] })
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
          title="Total Volume"
          value={`D ${stats.totalVolume.toLocaleString()}`}
          icon={Banknote}
          color="bg-blue-500"
        />
        <StatCard
          title="Total Payments"
          value={stats.totalPayments.toLocaleString()}
          icon={ArrowRightLeft}
          color="bg-purple-500"
        />
        <StatCard
          title="Succeeded"
          value={stats.succeeded.toLocaleString()}
          icon={CheckCircle2}
          color="bg-green-500"
        />
        <StatCard
          title="Failed"
          value={stats.failed.toLocaleString()}
          icon={XCircle}
          color="bg-red-500"
        />
      </div>

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1">
              <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
              <Input
                placeholder="Search by ID, customer, vendor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <Select value={networkFilter} onValueChange={setNetworkFilter}>
                <SelectTrigger className="w-full md:w-[180px]">
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
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="SUCCEEDED">Succeeded</SelectItem>
                  <SelectItem value="FAILED">Failed</SelectItem>
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

      {payments.length > 0 ? (
        <>
          {viewLayout === "grid" ? (
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
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
        <div className="flex h-64 flex-col items-center justify-center rounded-lg border-2 border-dashed bg-gray-50 dark:bg-gray-800/50">
          <Inbox className="h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-semibold">No Payments Found</h3>
          <p className="text-muted-foreground mt-1">
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
  icon: React.ElementType;
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
    PENDING: { icon: Clock, color: "text-yellow-600", bg: "bg-yellow-100" },
    SUCCEEDED: {
      icon: CheckCircle2,
      color: "text-green-600",
      bg: "bg-green-100",
    },
    FAILED: { icon: XCircle, color: "text-red-600", bg: "bg-red-100" },
  };

  const s = (status?.toUpperCase() || "PENDING") as keyof typeof configs;

  return configs[s] || configs.PENDING;
};
const StatusBadge = ({ status }: { status: string }) => {
  const config = getStatusConfig(status);
  const Icon = config.icon;
  return (
    <Badge
      className={cn(
        "flex items-center gap-1.5 whitespace-nowrap",
        config.bg,
        config.color,
      )}
    >
      <Icon className="h-3 w-3" />
      {status}
    </Badge>
  );
};

const PaymentCard = ({
  payment,
  onViewDetails,
}: {
  payment: any;
  onViewDetails: (payment: any) => void;
}) => {
  const vendorName =
    payment.order?.restaurant?.name ||
    payment.order?.shop?.name ||
    payment.order?.pharmacy?.name ||
    "N/A";

  return (
    <Card className="flex flex-col justify-between transition-all hover:shadow-lg">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-base font-mono">
              {payment.id.slice(-8).toUpperCase()}
            </CardTitle>
            <CardDescription>
              {format(new Date(payment.createdAt), "MMM dd, yyyy, HH:mm")}
            </CardDescription>
          </div>
          <StatusBadge status={payment.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Amount</span>
          <span className="font-semibold">
            D {payment.amount.toLocaleString()}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Customer</span>
          <span className="font-medium">
            {payment.order?.customerName || "N/A"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Vendor</span>
          <span className="font-medium">{vendorName}</span>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-muted-foreground">Network</span>
          <Badge variant="outline">{payment.network}</Badge>
        </div>
      </CardContent>
      <CardFooter>
        <Button
          variant="outline"
          size="sm"
          className="w-full"
          onClick={() => onViewDetails(payment)}
        >
          <Eye className="mr-2 h-4 w-4" />
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
  <Card>
    <Table>
      <TableHeader>
        <TableRow>
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
        {payments.map((payment) => {
          const vendorName =
            payment.order?.restaurant?.name ||
            payment.order?.shop?.name ||
            payment.order?.pharmacy?.name ||
            "N/A";
          return (
            <TableRow key={payment.id}>
              <TableCell className="font-mono text-xs">
                {payment.id.slice(-8).toUpperCase()}
              </TableCell>
              <TableCell>{payment.order?.customerName || "N/A"}</TableCell>
              <TableCell>{vendorName}</TableCell>
              <TableCell className="font-semibold">
                D {payment.amount.toLocaleString()}
              </TableCell>
              <TableCell>
                <Badge variant="outline">{payment.network}</Badge>
              </TableCell>
              <TableCell>
                <StatusBadge status={payment.status} />
              </TableCell>
              <TableCell>{format(new Date(payment.createdAt), "PP")}</TableCell>
              <TableCell className="text-right">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onViewDetails(payment)}
                >
                  <Eye className="h-4 w-4" />
                </Button>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
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
  <div className="flex items-center justify-center gap-2">
    <Button
      onClick={() => onPageChange(currentPage - 1)}
      disabled={currentPage <= 1}
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
      disabled={currentPage >= totalPages}
      variant="outline"
      size="sm"
    >
      <ChevronRight className="h-4 w-4" />
    </Button>
  </div>
);

const PaymentDetailsDialog = ({
  isOpen,
  setIsOpen,
  payment,
}: {
  isOpen: boolean;
  setIsOpen: (isOpen: boolean) => void;
  payment: any;
}) => {
  const vendorName =
    payment.order?.restaurant?.name ||
    payment.order?.shop?.name ||
    payment.order?.pharmacy?.name ||
    "N/A";
  const payout = payment.order?.payouts?.[0];

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl font-mono">
            {payment.id.slice(-8).toUpperCase()}
          </DialogTitle>
          <div className="flex items-center justify-between pt-2">
            <StatusBadge status={payment.status} />
            <p className="text-sm text-muted-foreground">
              {format(new Date(payment.createdAt), "PPpp")}
            </p>
          </div>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <InfoSection title="Transaction Details">
            <InfoRow
              label="Amount"
              value={`D ${payment.amount.toLocaleString()}`}
            />
            <InfoRow label="Network" value={payment.network} />
            <InfoRow label="Currency" value={payment.currency} />
            <InfoRow label="Payment ID" value={payment.id} isMonospace />
          </InfoSection>

          <InfoSection title="Order Information">
            <InfoRow label="Order ID" value={payment.orderId} isMonospace />
            <InfoRow label="Customer" value={payment.order?.customerName} />
            <InfoRow label="Vendor" value={vendorName} />
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
  <Card>
    <CardHeader className="pb-2">
      <CardTitle className="text-base">{title}</CardTitle>
    </CardHeader>
    <CardContent className="space-y-2 text-sm">{children}</CardContent>
  </Card>
);

const InfoRow = ({
  label,
  value,
  isMonospace = false,
}: {
  label: string;
  value: string;
  isMonospace?: boolean;
}) => (
  <div className="flex justify-between">
    <p className="text-muted-foreground">{label}</p>
    <p className={cn("font-medium", isMonospace && "font-mono text-xs")}>
      {value || "N/A"}
    </p>
  </div>
);

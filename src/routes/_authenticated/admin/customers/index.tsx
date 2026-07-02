import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  Search,
  MoreHorizontal,
  Eye,
  Users,
  Phone,
  Mail,
  MapPin,
  RefreshCw,
  ShoppingBag,
  LayoutGrid,
  List,
  Inbox,
  TrendingUp,
  Shield,
  Calendar,
} from "lucide-react";
import { adminApi } from "@/lib/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/admin/customers/")({
  component: CustomersPage,
});

interface Customer {
  id: string;
  fullName?: string;
  email?: string;
  phone?: string;
  address?: string;
  city?: string;
  totalOrders: number;
  createdAt: string;
  updatedAt: string;
  avatarUrl?: string;
}

// Deterministic accent so each customer's avatar ring/initial color is
// stable across renders instead of random or uniform.
const AVATAR_RINGS = [
  "ring-violet-200 bg-violet-50 text-violet-700 dark:ring-violet-900 dark:bg-violet-950 dark:text-violet-300",
  "ring-sky-200 bg-sky-50 text-sky-700 dark:ring-sky-900 dark:bg-sky-950 dark:text-sky-300",
  "ring-amber-200 bg-amber-50 text-amber-700 dark:ring-amber-900 dark:bg-amber-950 dark:text-amber-300",
  "ring-rose-200 bg-rose-50 text-rose-700 dark:ring-rose-900 dark:bg-rose-950 dark:text-rose-300",
  "ring-emerald-200 bg-emerald-50 text-emerald-700 dark:ring-emerald-900 dark:bg-emerald-950 dark:text-emerald-300",
];

function avatarTheme(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++)
    hash = (hash + id.charCodeAt(i)) % AVATAR_RINGS.length;
  return AVATAR_RINGS[hash];
}

function initials(name?: string) {
  if (!name) return "C";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase() || "C";
}

function CustomersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [viewLayout, setViewLayout] = useState<"grid" | "list">("grid");
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  const {
    data: allCustomers = [],
    isLoading,
    isFetching,
    refetch,
  } = useQuery<Customer[]>({
    queryKey: ["customers-all"],
    queryFn: async () => {
      const response = await adminApi.getUsers({});
      const users = response.data.users || response.data || [];
      return Array.isArray(users) ? users : [];
    },
  });

  const stats = useMemo(() => {
    const totalOrders = allCustomers.reduce(
      (sum, c) => sum + (c.totalOrders || 0),
      0,
    );
    return {
      totalCustomers: allCustomers.length,
      totalOrders,
      averageOrdersPerCustomer:
        allCustomers.length > 0
          ? Math.round((totalOrders / allCustomers.length) * 10) / 10
          : 0,
    };
  }, [allCustomers]);

  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) return allCustomers;
    const q = searchQuery.toLowerCase();
    return allCustomers.filter((customer) => {
      return (
        customer.fullName?.toLowerCase().includes(q) ||
        customer.email?.toLowerCase().includes(q) ||
        customer.phone?.toLowerCase().includes(q) ||
        customer.city?.toLowerCase().includes(q)
      );
    });
  }, [searchQuery, allCustomers]);

  const handleViewDetails = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsDetailsOpen(true);
  };

  return (
    <div className="container mx-auto max-w-7xl space-y-8 p-4 md:p-8">
      {/* Header */}
      <header className="flex flex-col items-start justify-between gap-4 border-b pb-6 md:flex-row md:items-center">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold tracking-tight">Customers</h1>
          <p className="text-muted-foreground text-sm">
            {isLoading
              ? "Loading your customer base…"
              : `${stats.totalCustomers.toLocaleString()} customer${stats.totalCustomers === 1 ? "" : "s"} on record`}
          </p>
        </div>
        <Button
          onClick={() => refetch()}
          variant="outline"
          size="sm"
          className="gap-2"
          disabled={isFetching}
        >
          <RefreshCw
            className={cn("h-3.5 w-3.5", isFetching && "animate-spin")}
          />
          Refresh
        </Button>
      </header>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Total customers"
          value={stats.totalCustomers.toLocaleString()}
          icon={Users}
          accent="violet"
          loading={isLoading}
        />
        <StatCard
          title="Total orders"
          value={stats.totalOrders.toLocaleString()}
          icon={ShoppingBag}
          accent="sky"
          loading={isLoading}
        />
        <StatCard
          title="Avg. orders / customer"
          value={stats.averageOrdersPerCustomer.toString()}
          icon={TrendingUp}
          accent="emerald"
          loading={isLoading}
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="relative max-w-md flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
          <Input
            placeholder="Search by name, email, phone, or city…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-3">
          {searchQuery && (
            <span className="text-muted-foreground text-sm">
              {filteredCustomers.length} match
              {filteredCustomers.length === 1 ? "" : "es"}
            </span>
          )}
          <div className="bg-muted flex items-center gap-0.5 rounded-lg p-1">
            <Button
              variant={viewLayout === "grid" ? "default" : "ghost"}
              size="icon"
              className="h-7 w-7"
              onClick={() => setViewLayout("grid")}
              aria-label="Grid view"
            >
              <LayoutGrid className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant={viewLayout === "list" ? "default" : "ghost"}
              size="icon"
              className="h-7 w-7"
              onClick={() => setViewLayout("list")}
              aria-label="List view"
            >
              <List className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content */}
      {isLoading ? (
        viewLayout === "grid" ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <CardSkeleton key={i} />
            ))}
          </div>
        ) : (
          <Card>
            <div className="divide-y">
              {Array.from({ length: 6 }).map((_, i) => (
                <RowSkeleton key={i} />
              ))}
            </div>
          </Card>
        )
      ) : filteredCustomers.length > 0 ? (
        viewLayout === "grid" ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {filteredCustomers.map((customer) => (
              <CustomerCard
                key={customer.id}
                customer={customer}
                onViewDetails={() => handleViewDetails(customer)}
              />
            ))}
          </div>
        ) : (
          <CustomerTable
            customers={filteredCustomers}
            onViewDetails={handleViewDetails}
          />
        )
      ) : (
        <EmptyState hasCustomers={allCustomers.length > 0} />
      )}

      {selectedCustomer && (
        <CustomerDetailsDialog
          isOpen={isDetailsOpen}
          setIsOpen={setIsDetailsOpen}
          customer={selectedCustomer}
        />
      )}
    </div>
  );
}

const ACCENT_STYLES: Record<string, { chip: string; text: string }> = {
  violet: {
    chip: "bg-violet-50 dark:bg-violet-950",
    text: "text-violet-600 dark:text-violet-400",
  },
  sky: {
    chip: "bg-sky-50 dark:bg-sky-950",
    text: "text-sky-600 dark:text-sky-400",
  },
  emerald: {
    chip: "bg-emerald-50 dark:bg-emerald-950",
    text: "text-emerald-600 dark:text-emerald-400",
  },
};

const StatCard = ({
  title,
  value,
  icon: Icon,
  accent,
  loading,
}: {
  title: string;
  value: string;
  icon: React.ElementType;
  accent: keyof typeof ACCENT_STYLES;
  loading?: boolean;
}) => {
  const styles = ACCENT_STYLES[accent];
  return (
    <Card className="border-muted-foreground/10">
      <CardContent className="flex items-center justify-between p-5">
        <div className="space-y-1.5">
          <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
            {title}
          </p>
          {loading ? (
            <div className="bg-muted h-7 w-16 animate-pulse rounded" />
          ) : (
            <p className="text-2xl font-semibold tabular-nums">{value}</p>
          )}
        </div>
        <div className={cn("rounded-xl p-2.5", styles.chip)}>
          <Icon className={cn("h-5 w-5", styles.text)} />
        </div>
      </CardContent>
    </Card>
  );
};

const CustomerCard = ({
  customer,
  onViewDetails,
}: {
  customer: Customer;
  onViewDetails: () => void;
}) => (
  <Card
    className="group border-muted-foreground/10 cursor-pointer transition-all hover:-translate-y-0.5 hover:shadow-md"
    onClick={onViewDetails}
  >
    <CardContent className="space-y-4 p-5">
      <div className="flex items-start gap-3">
        <Avatar
          className={cn("h-11 w-11 shrink-0 ring-2", avatarTheme(customer.id))}
        >
          <AvatarImage src={customer.avatarUrl} />
          <AvatarFallback className="bg-transparent font-medium">
            {initials(customer.fullName)}
          </AvatarFallback>
        </Avatar>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">
            {customer.fullName || "Unnamed customer"}
          </p>
          <p className="text-muted-foreground truncate text-xs">
            {customer.email || "No email on file"}
          </p>
        </div>
      </div>

      <div className="text-muted-foreground space-y-1.5 text-xs">
        <div className="flex items-center gap-2">
          <Phone className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{customer.phone || "No phone"}</span>
        </div>
        <div className="flex items-center gap-2">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{customer.city || "No city"}</span>
        </div>
      </div>

      <div className="flex items-center justify-between border-t pt-3">
        <Badge
          variant="secondary"
          className="gap-1.5 bg-violet-50 text-violet-700 hover:bg-violet-50 dark:bg-violet-950 dark:text-violet-300"
        >
          <ShoppingBag className="h-3 w-3" />
          {customer.totalOrders} order{customer.totalOrders === 1 ? "" : "s"}
        </Badge>
        <span className="text-muted-foreground flex items-center gap-1 text-xs opacity-0 transition-opacity group-hover:opacity-100">
          View details
          <Eye className="h-3 w-3" />
        </span>
      </div>
    </CardContent>
  </Card>
);

const CustomerTable = ({
  customers,
  onViewDetails,
}: {
  customers: Customer[];
  onViewDetails: (customer: Customer) => void;
}) => (
  <Card className="border-muted-foreground/10 overflow-hidden p-0">
    <Table>
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>Customer</TableHead>
          <TableHead className="hidden md:table-cell">Contact</TableHead>
          <TableHead className="hidden lg:table-cell">Location</TableHead>
          <TableHead className="text-center">Orders</TableHead>
          <TableHead className="hidden lg:table-cell">Joined</TableHead>
          <TableHead className="w-10 text-right">
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {customers.map((customer) => (
          <TableRow
            key={customer.id}
            className="cursor-pointer"
            onClick={() => onViewDetails(customer)}
          >
            <TableCell>
              <div className="flex items-center gap-3">
                <Avatar
                  className={cn("h-9 w-9 ring-2", avatarTheme(customer.id))}
                >
                  <AvatarImage src={customer.avatarUrl} />
                  <AvatarFallback className="bg-transparent text-xs font-medium">
                    {initials(customer.fullName)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">
                    {customer.fullName || "Unnamed customer"}
                  </p>
                  <p className="text-muted-foreground truncate text-xs">
                    {customer.email || "No email"}
                  </p>
                </div>
              </div>
            </TableCell>
            <TableCell className="hidden md:table-cell">
              <span className="text-muted-foreground text-sm">
                {customer.phone || "—"}
              </span>
            </TableCell>
            <TableCell className="hidden lg:table-cell">
              <span className="text-muted-foreground text-sm">
                {customer.city || "—"}
              </span>
            </TableCell>
            <TableCell className="text-center">
              <Badge
                variant="secondary"
                className="bg-violet-50 text-violet-700 hover:bg-violet-50 dark:bg-violet-950 dark:text-violet-300"
              >
                {customer.totalOrders}
              </Badge>
            </TableCell>
            <TableCell className="hidden lg:table-cell">
              <span className="text-muted-foreground text-sm">
                {new Date(customer.createdAt).toLocaleDateString(undefined, {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </span>
            </TableCell>
            <TableCell
              className="text-right"
              onClick={(e) => e.stopPropagation()}
            >
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onViewDetails(customer)}>
                    <Eye className="mr-2 h-4 w-4" />
                    View details
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Shield className="mr-2 h-4 w-4" />
                    Manage
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  </Card>
);

const CustomerDetailsDialog = ({
  isOpen,
  setIsOpen,
  customer,
}: {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  customer: Customer;
}) => (
  <Dialog open={isOpen} onOpenChange={setIsOpen}>
    <DialogContent className="max-w-md p-0">
      <DialogHeader className="space-y-0 border-b p-6 pb-5">
        <div className="flex items-center gap-4">
          <Avatar className={cn("h-14 w-14 ring-2", avatarTheme(customer.id))}>
            <AvatarImage src={customer.avatarUrl} />
            <AvatarFallback className="bg-transparent text-xl font-medium">
              {initials(customer.fullName)}
            </AvatarFallback>
          </Avatar>
          <div>
            <DialogTitle className="text-xl">
              {customer.fullName || "Unnamed customer"}
            </DialogTitle>
            <p className="text-muted-foreground mt-0.5 flex items-center gap-1.5 text-xs">
              <Calendar className="h-3 w-3" />
              Customer since{" "}
              {new Date(customer.createdAt).toLocaleDateString(undefined, {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
        </div>
      </DialogHeader>

      <div className="space-y-5 p-6 pt-5">
        <div className="grid grid-cols-2 gap-4">
          <InfoItem icon={Mail} label="Email" value={customer.email} />
          <InfoItem icon={Phone} label="Phone" value={customer.phone} />
        </div>
        <InfoItem icon={MapPin} label="Address" value={customer.address} />
        <InfoItem icon={MapPin} label="City" value={customer.city} />

        <div className="bg-muted/50 flex items-center justify-between rounded-lg border p-4">
          <div className="flex items-center gap-2.5">
            <div className="rounded-lg bg-violet-50 p-2 dark:bg-violet-950">
              <ShoppingBag className="h-4 w-4 text-violet-600 dark:text-violet-400" />
            </div>
            <span className="text-sm font-medium">Total orders</span>
          </div>
          <span className="text-lg font-semibold tabular-nums">
            {customer.totalOrders}
          </span>
        </div>
      </div>
    </DialogContent>
  </Dialog>
);

const InfoItem = ({
  icon: Icon,
  label,
  value,
}: {
  icon: React.ElementType;
  label: string;
  value?: string | null;
}) => (
  <div className="space-y-1">
    <p className="text-muted-foreground text-xs font-medium tracking-wide uppercase">
      {label}
    </p>
    <div className="flex items-center gap-2">
      <Icon className="text-muted-foreground h-3.5 w-3.5 shrink-0" />
      <p className="truncate text-sm">{value || "Not provided"}</p>
    </div>
  </div>
);

const EmptyState = ({ hasCustomers }: { hasCustomers: boolean }) => (
  <div className="border-muted-foreground/20 flex h-72 flex-col items-center justify-center rounded-xl border-2 border-dashed">
    <div className="bg-muted rounded-full p-3">
      <Inbox className="text-muted-foreground h-6 w-6" />
    </div>
    <h3 className="mt-4 text-base font-semibold">No customers found</h3>
    <p className="text-muted-foreground mt-1 text-sm">
      {hasCustomers
        ? "Try a different name, email, phone, or city."
        : "New customers will appear here once they place an order."}
    </p>
  </div>
);

const CardSkeleton = () => (
  <Card className="border-muted-foreground/10">
    <CardContent className="space-y-4 p-5">
      <div className="flex items-center gap-3">
        <div className="bg-muted h-11 w-11 animate-pulse rounded-full" />
        <div className="flex-1 space-y-2">
          <div className="bg-muted h-3.5 w-2/3 animate-pulse rounded" />
          <div className="bg-muted h-3 w-1/2 animate-pulse rounded" />
        </div>
      </div>
      <div className="space-y-2">
        <div className="bg-muted h-3 w-1/2 animate-pulse rounded" />
        <div className="bg-muted h-3 w-1/3 animate-pulse rounded" />
      </div>
      <div className="border-t pt-3">
        <div className="bg-muted h-5 w-20 animate-pulse rounded-full" />
      </div>
    </CardContent>
  </Card>
);

const RowSkeleton = () => (
  <div className="flex items-center gap-3 p-4">
    <div className="bg-muted h-9 w-9 animate-pulse rounded-full" />
    <div className="flex-1 space-y-2">
      <div className="bg-muted h-3.5 w-1/4 animate-pulse rounded" />
      <div className="bg-muted h-3 w-1/6 animate-pulse rounded" />
    </div>
  </div>
);

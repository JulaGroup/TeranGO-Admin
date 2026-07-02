import { useState, useEffect, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  Search,
  MoreHorizontal,
  Eye,
  Users,
  Phone,
  MapPin,
  RefreshCw,
  ShoppingCart,
  User,
  LayoutGrid,
  List,
  Inbox,
  Star,
  Shield,
} from "lucide-react";
import { adminApi } from "@/lib/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  avatarUrl?: string; // Assuming an avatar URL might be available
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
    refetch,
  } = useQuery<Customer[]>({
    queryKey: ["customers-all"],
    queryFn: async () => {
      const response = await adminApi.getUsers({});
      // Ensure the response is always an array
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
      totalOrders: totalOrders,
      averageOrdersPerCustomer:
        allCustomers.length > 0
          ? Math.round(totalOrders / allCustomers.length)
          : 0,
    };
  }, [allCustomers]);

  const filteredCustomers = useMemo(() => {
    if (!searchQuery.trim()) {
      return allCustomers;
    }
    const searchLower = searchQuery.toLowerCase();
    return allCustomers.filter((customer) => {
      const fullName = customer.fullName?.toLowerCase() || "";
      const email = customer.email?.toLowerCase() || "";
      const phone = customer.phone?.toLowerCase() || "";
      const city = customer.city?.toLowerCase() || "";
      return (
        fullName.includes(searchLower) ||
        email.includes(searchLower) ||
        phone.includes(searchLower) ||
        city.includes(searchLower)
      );
    });
  }, [searchQuery, allCustomers]);

  const handleViewDetails = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsDetailsOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="text-center">
          <div className="border-primary mx-auto mb-4 h-12 w-12 animate-spin rounded-full border-b-2"></div>
          <p className="text-muted-foreground">Loading customers...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto space-y-6 p-4 md:p-6">
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 p-6 text-white shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div className="max-w-2xl">
            <div className="mb-3 inline-flex items-center rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm font-medium text-slate-100">
              <Users className="mr-2 h-4 w-4" />
              Customer hub
            </div>
            <h1 className="text-3xl font-semibold tracking-tight">Customers</h1>
            <p className="mt-2 text-sm text-slate-300 sm:text-base">
              Track your customer base, review activity, and spot high-value
              repeat buyers at a glance.
            </p>
          </div>
          <Button
            onClick={() => refetch()}
            variant="outline"
            className="border-white/20 bg-white/10 text-white hover:bg-white/20 hover:text-white"
            disabled={isLoading}
          >
            <RefreshCw
              className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")}
            />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Total Customers"
          value={stats.totalCustomers}
          icon={Users}
          color="from-blue-500 to-cyan-500"
          description="Registered profiles"
        />
        <StatCard
          title="Total Orders"
          value={stats.totalOrders}
          icon={ShoppingCart}
          color="from-violet-500 to-fuchsia-500"
          description="Placed by customers"
        />
        <StatCard
          title="Avg. Orders"
          value={stats.averageOrdersPerCustomer}
          icon={Star}
          color="from-emerald-500 to-lime-500"
          description="Per customer"
        />
      </div>

      <Card className="border-slate-200 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="relative flex-1">
              <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform" />
              <Input
                placeholder="Search by name, phone, or city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center rounded-full border border-slate-200 bg-slate-50 p-1 dark:border-slate-700 dark:bg-slate-800">
              <Button
                variant={viewLayout === "grid" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewLayout("grid")}
                className="rounded-full"
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewLayout === "list" ? "secondary" : "ghost"}
                size="sm"
                onClick={() => setViewLayout("list")}
                className="rounded-full"
              >
                <List className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {filteredCustomers.length > 0 ? (
        viewLayout === "grid" ? (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
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
        <div className="flex h-64 flex-col items-center justify-center rounded-lg border-2 border-dashed bg-gray-50 dark:bg-gray-800/50">
          <Inbox className="h-12 w-12 text-gray-400" />
          <h3 className="mt-4 text-lg font-semibold">No Customers Found</h3>
          <p className="text-muted-foreground mt-1">
            {allCustomers.length > 0
              ? "Try adjusting your search."
              : "There are no customers to display yet."}
          </p>
        </div>
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

const StatCard = ({
  title,
  value,
  icon: Icon,
  color,
  description,
}: {
  title: string;
  value: number;
  icon: React.ElementType;
  color: string;
  description: string;
}) => (
  <Card className="overflow-hidden border-slate-200 shadow-sm">
    <div className={cn("h-1 w-full bg-gradient-to-r", color)} />
    <CardContent className="p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
        <div className={cn("rounded-2xl p-3 text-white shadow-sm", color)}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </CardContent>
  </Card>
);

const CustomerCard = ({
  customer,
  onViewDetails,
}: {
  customer: Customer;
  onViewDetails: () => void;
}) => (
  <Card className="flex flex-col justify-between border-slate-200 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:shadow-md">
    <CardHeader className="flex-row items-center gap-4 pb-3">
      <Avatar className="h-12 w-12 ring-2 ring-slate-100">
        <AvatarImage src={customer.avatarUrl} />
        <AvatarFallback className="bg-slate-100 text-slate-700">
          {customer.fullName?.charAt(0).toUpperCase() || "C"}
        </AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <CardTitle className="truncate text-base">
          {customer.fullName || "Unnamed Customer"}
        </CardTitle>
        <CardDescription className="truncate text-slate-500">
          {customer.phone ? "Phone contact available" : "No phone on file"}
        </CardDescription>
      </div>
    </CardHeader>
    <CardContent className="space-y-2.5 text-sm">
      <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-2 text-slate-600">
        <Phone className="h-4 w-4 text-slate-400" />
        <span className="truncate">{customer.phone || "No phone"}</span>
      </div>
      <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-2 text-slate-600">
        <MapPin className="h-4 w-4 text-slate-400" />
        <span className="truncate">{customer.city || "No city"}</span>
      </div>
    </CardContent>
    <CardFooter className="flex items-center justify-between border-t border-slate-100 pt-3">
      <Badge
        variant="outline"
        className="flex items-center gap-1.5 rounded-full bg-slate-50 px-2.5 py-1"
      >
        <ShoppingCart className="h-3 w-3" />
        {customer.totalOrders} Orders
      </Badge>
      <Button variant="outline" size="sm" onClick={onViewDetails}>
        <Eye className="mr-2 h-4 w-4" />
        Details
      </Button>
    </CardFooter>
  </Card>
);

const CustomerTable = ({
  customers,
  onViewDetails,
}: {
  customers: Customer[];
  onViewDetails: (customer: Customer) => void;
}) => (
  <Card className="overflow-hidden border-slate-200 shadow-sm">
    <Table>
      <TableHeader>
        <TableRow className="bg-slate-50 hover:bg-slate-50">
          <TableHead className="font-semibold">Customer</TableHead>
          <TableHead className="hidden md:table-cell">Contact</TableHead>
          <TableHead className="hidden lg:table-cell">Location</TableHead>
          <TableHead className="text-center">Orders</TableHead>
          <TableHead className="hidden lg:table-cell">Joined</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {customers.map((customer) => (
          <TableRow
            key={customer.id}
            className="transition-colors hover:bg-slate-50/70"
          >
            <TableCell>
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10 ring-1 ring-slate-200">
                  <AvatarImage src={customer.avatarUrl} />
                  <AvatarFallback className="bg-slate-100 text-slate-700">
                    {customer.fullName?.charAt(0).toUpperCase() || "C"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium">
                    {customer.fullName || "Unnamed Customer"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {customer.phone
                      ? "Phone contact on file"
                      : "No phone on file"}
                  </p>
                </div>
              </div>
            </TableCell>
            <TableCell className="hidden md:table-cell">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Phone className="h-4 w-4 text-slate-400" />
                <span>{customer.phone || "N/A"}</span>
              </div>
            </TableCell>
            <TableCell className="hidden lg:table-cell">
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <MapPin className="h-4 w-4 text-slate-400" />
                <span>{customer.city || "N/A"}</span>
              </div>
            </TableCell>
            <TableCell className="text-center">
              <Badge variant="secondary" className="rounded-full px-2.5 py-1">
                {customer.totalOrders}
              </Badge>
            </TableCell>
            <TableCell className="hidden lg:table-cell text-slate-500">
              {new Date(customer.createdAt).toLocaleDateString()}
            </TableCell>
            <TableCell className="text-right">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="rounded-full">
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => onViewDetails(customer)}>
                    <Eye className="mr-2 h-4 w-4" />
                    View Details
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
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <div className="flex items-center gap-4 rounded-2xl border border-slate-100 bg-slate-50 p-4">
          <Avatar className="h-16 w-16 ring-2 ring-slate-200">
            <AvatarImage src={customer.avatarUrl} />
            <AvatarFallback className="bg-slate-200 text-2xl text-slate-700">
              {customer.fullName?.charAt(0).toUpperCase() || "C"}
            </AvatarFallback>
          </Avatar>
          <div>
            <DialogTitle className="text-2xl">
              {customer.fullName || "Unnamed Customer"}
            </DialogTitle>
            <p className="text-sm text-muted-foreground">
              Customer since {new Date(customer.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
      </DialogHeader>
      <div className="grid gap-4 py-2">
        <div className="grid gap-4 sm:grid-cols-2">
          <InfoItem icon={Phone} label="Phone" value={customer.phone} />
          <InfoItem
            icon={ShoppingCart}
            label="Total Orders"
            value={customer.totalOrders.toString()}
          />
        </div>
        <InfoItem icon={MapPin} label="Address" value={customer.address} />
        <InfoItem icon={MapPin} label="City" value={customer.city} />
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
  <div>
    <p className="text-sm font-medium text-muted-foreground">{label}</p>
    <div className="flex items-center gap-2">
      <Icon className="h-4 w-4 text-gray-500" />
      <p className="text-base">{value || "N/A"}</p>
    </div>
  </div>
);

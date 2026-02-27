import { useState, useEffect } from "react";
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
  Building2,
  ShoppingCart,
  User,
} from "lucide-react";
import { adminApi } from "@/lib/api";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ConfigDrawer } from "@/components/config-drawer";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { TopNav } from "@/components/layout/top-nav";
import { ProfileDropdown } from "@/components/profile-dropdown";
import { Search as SearchInput } from "@/components/search";
import { ThemeSwitch } from "@/components/theme-switch";

const topNav = [
  { title: "Overview", href: "/admin", isActive: false },
  { title: "Customers", href: "/admin/customers", isActive: true },
  { title: "Orders", href: "/admin/orders", isActive: false },
  { title: "Settings", href: "#", isActive: false },
];

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
}

function CustomersPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [allCustomers, setAllCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(
    null,
  );
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [stats, setStats] = useState({
    totalCustomers: 0,
    totalOrders: 0,
    averageOrdersPerCustomer: 0,
  });

  // Fetch all customers
  const {
    data: customersResponse,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["customers-all"],
    queryFn: async () => {
      const response = await adminApi.getUsers({});
      return response.data.users || response.data || [];
    },
  });

  // Update allCustomers when data changes
  useEffect(() => {
    if (Array.isArray(customersResponse)) {
      setAllCustomers(customersResponse);

      // Calculate stats from fetched customers
      const totalOrders = customersResponse.reduce(
        (sum, c) => sum + (c.totalOrders || 0),
        0,
      );

      setStats({
        totalCustomers: customersResponse.length,
        totalOrders: totalOrders,
        averageOrdersPerCustomer:
          customersResponse.length > 0
            ? Math.round(totalOrders / customersResponse.length)
            : 0,
      });
    }
  }, [customersResponse]);

  // Filter customers based on search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredCustomers(allCustomers);
      return;
    }

    const searchLower = searchQuery.toLowerCase();
    const filtered = allCustomers.filter((customer) => {
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

    setFilteredCustomers(filtered);
  }, [searchQuery, allCustomers]);

  const handleViewDetails = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsDetailsOpen(true);
  };

  return (
    <>
      <Header>
        <TopNav links={topNav} />
        <div className="ms-auto flex items-center space-x-4">
          <SearchInput />
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
              <p className="text-muted-foreground">
                Manage and view all customer accounts
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className="mr-2 h-4 w-4" />
              Refresh
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Customers
                </CardTitle>
                <Users className="text-muted-foreground h-4 w-4" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalCustomers}</div>
                <p className="text-muted-foreground text-xs">
                  All registered customers
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Total Orders
                </CardTitle>
                <ShoppingCart className="h-4 w-4 text-blue-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stats.totalOrders}</div>
                <p className="text-muted-foreground text-xs">
                  Placed by all customers
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">
                  Avg Orders
                </CardTitle>
                <Building2 className="h-4 w-4 text-green-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {stats.averageOrdersPerCustomer}
                </div>
                <p className="text-muted-foreground text-xs">Per customer</p>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <div className="flex flex-col gap-4 md:flex-row">
            <div className="relative flex-1">
              <Search className="text-muted-foreground absolute top-3 left-3 h-4 w-4" />
              <Input
                placeholder="Search by name, email, phone, or city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>

          {/* Customers Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                All Customers ({filteredCustomers.length})
              </CardTitle>
              <CardDescription>
                Showing {filteredCustomers.length} of {stats.totalCustomers}{" "}
                customers
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-muted-foreground">Loading customers...</p>
                </div>
              ) : filteredCustomers.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Customer Name</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Orders</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCustomers.map((customer: Customer) => (
                        <TableRow key={customer.id}>
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <Avatar>
                                <AvatarFallback>
                                  {customer.fullName
                                    ?.substring(0, 2)
                                    .toUpperCase() || "C"}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className="font-medium">
                                  {customer.fullName || "N/A"}
                                </p>
                                <p className="text-muted-foreground text-xs">
                                  {customer.id.substring(0, 8)}...
                                </p>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="flex items-center gap-2 text-sm">
                                <Phone className="h-3 w-3" />
                                {customer.phone || "N/A"}
                              </div>
                              <div className="text-muted-foreground flex items-center gap-2 text-xs">
                                <Mail className="h-3 w-3" />
                                {customer.email || "N/A"}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2 text-sm">
                              <MapPin className="h-3 w-3" />
                              <span className="max-w-[200px] truncate">
                                {customer.city || "N/A"}
                              </span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              {customer.totalOrders} order
                              {customer.totalOrders !== 1 ? "s" : ""}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm">
                              {new Date(
                                customer.createdAt,
                              ).toLocaleDateString()}
                            </span>
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleViewDetails(customer)}
                                >
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <Users className="text-muted-foreground mb-4 h-12 w-12" />
                  <p className="text-muted-foreground">
                    {allCustomers.length === 0
                      ? "No customers registered yet"
                      : "No customers match your search"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Customer Details Dialog */}
          <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
            <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Customer Details</DialogTitle>
                <DialogDescription>
                  Complete information about the customer
                </DialogDescription>
              </DialogHeader>
              {selectedCustomer && (
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-20 w-20">
                      <AvatarFallback>
                        {selectedCustomer.fullName
                          ?.substring(0, 2)
                          .toUpperCase() || "C"}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold">
                        {selectedCustomer.fullName || "N/A"}
                      </h3>
                      <p className="text-muted-foreground text-sm">
                        {selectedCustomer.id}
                      </p>
                      <div className="mt-2">
                        <Badge>Active Customer</Badge>
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <h4 className="mb-2 font-semibold">
                        Contact Information
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Phone className="text-muted-foreground h-4 w-4" />
                          {selectedCustomer.phone || "N/A"}
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="text-muted-foreground h-4 w-4" />
                          {selectedCustomer.email || "N/A"}
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="mb-2 font-semibold">Account Details</h4>
                      <div className="space-y-2 text-sm">
                        <div>
                          <span className="text-muted-foreground">Joined:</span>{" "}
                          {new Date(
                            selectedCustomer.createdAt,
                          ).toLocaleDateString()}
                        </div>
                        <div>
                          <span className="text-muted-foreground">
                            Total Orders:
                          </span>{" "}
                          {selectedCustomer.totalOrders}
                        </div>
                      </div>
                    </div>
                  </div>

                  {selectedCustomer.address && (
                    <div>
                      <h4 className="mb-2 font-semibold">
                        Address Information
                      </h4>
                      <div className="flex items-start gap-2 text-sm">
                        <MapPin className="text-muted-foreground mt-0.5 h-4 w-4" />
                        <div>
                          <p>{selectedCustomer.address}</p>
                          {selectedCustomer.city && (
                            <p className="text-muted-foreground">
                              {selectedCustomer.city}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="bg-muted rounded-md p-4">
                    <div className="flex items-center gap-2">
                      <ShoppingCart className="h-5 w-5 text-blue-600" />
                      <div>
                        <p className="font-semibold">Order History</p>
                        <p className="text-muted-foreground text-sm">
                          This customer has placed{" "}
                          {selectedCustomer.totalOrders} order
                          {selectedCustomer.totalOrders !== 1 ? "s" : ""} with
                          us
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </Main>
    </>
  );
}

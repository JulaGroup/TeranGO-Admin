// @ts-nocheck
import { useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { type ColumnDef } from "@tanstack/react-table";
import {
  MoreHorizontal,
  Eye,
  Store,
  Edit,
  Ban,
  Star,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "@/lib/api";
import { type Vendor } from "@/lib/types";
import { DataTable, DataTableColumnHeader } from "@/components/data-table";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ConfigDrawer } from "@/components/config-drawer";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { TopNav } from "@/components/layout/top-nav";
import { ProfileDropdown } from "@/components/profile-dropdown";
import { Search } from "@/components/search";
import { ThemeSwitch } from "@/components/theme-switch";

const topNav = [
  { title: "Overview", href: "/admin", isActive: false },
  { title: "Vendors", href: "/admin/vendors", isActive: true },
  { title: "Drivers", href: "/admin/drivers", isActive: false },
  { title: "Settings", href: "#", isActive: false },
];

export const Route = createFileRoute(
  "/_authenticated/admin/vendors/index/MODERN",
)({
  component: VendorsPage,
});

function VendorsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["vendors"],
    queryFn: async () => {
      const response = await adminApi.getVendors();
      return response.data;
    },
  });

  const banMutation = useMutation({
    mutationFn: async (vendorId: string) => {
      await adminApi.banVendor(vendorId);
    },
    onSuccess: () => {
      toast.success("Vendor banned successfully");
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
    },
    onError: () => {
      toast.error("Failed to ban vendor");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (vendorId: string) => {
      await adminApi.deleteVendor(vendorId);
    },
    onSuccess: () => {
      toast.success("Vendor deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["vendors"] });
    },
    onError: () => {
      toast.error("Failed to delete vendor");
    },
  });

  const columns: ColumnDef<Vendor>[] = useMemo(
    () => [
      {
        accessorKey: "businessName",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Business Name" />
        ),
        cell: ({ row }) => {
          const vendor = row.original;
          return (
            <div className="flex items-center gap-3">
              <Avatar>
                <AvatarFallback>
                  {vendor.businessName?.charAt(0) || "V"}
                </AvatarFallback>
              </Avatar>
              <div>
                <div className="font-medium">{vendor.businessName}</div>
                <div className="text-sm text-muted-foreground">
                  {vendor.vendorType}
                </div>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: "email",
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Email" />
        ),
      },
      {
        accessorKey: "phoneNumber",
        header: "Phone",
      },
      {
        accessorKey: "vendorType",
        header: "Type",
        cell: ({ row }) => {
          const type = row.getValue("vendorType") as string;
          const icons = {
            RESTAURANT: "🍽️",
            SHOP: "🏪",
            PHARMACY: "💊",
          };
          return (
            <Badge variant="outline">
              {icons[type as keyof typeof icons]} {type}
            </Badge>
          );
        },
        filterFn: (row, id, value) => {
          return value.includes(row.getValue(id));
        },
      },
      {
        accessorKey: "status",
        header: "Status",
        cell: ({ row }) => {
          const status = row.getValue("status") as string;
          return (
            <Badge
              variant={
                status === "ACTIVE"
                  ? "default"
                  : status === "BANNED"
                    ? "destructive"
                    : "secondary"
              }
            >
              {status}
            </Badge>
          );
        },
        filterFn: (row, id, value) => {
          return value.includes(row.getValue(id));
        },
      },
      {
        id: "actions",
        cell: ({ row }) => {
          const vendor = row.original;
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-8 w-8 p-0">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>
                  <Eye className="mr-2 h-4 w-4" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem>
                  <Star className="mr-2 h-4 w-4" />
                  Feature
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => banMutation.mutate(vendor._id)}
                  className="text-orange-600"
                >
                  <Ban className="mr-2 h-4 w-4" />
                  Ban Vendor
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => deleteMutation.mutate(vendor._id)}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
      },
    ],
    [banMutation, deleteMutation],
  );

  const filters = [
    {
      columnId: "vendorType",
      title: "Type",
      options: [
        { label: "Restaurant", value: "RESTAURANT" },
        { label: "Shop", value: "SHOP" },
        { label: "Pharmacy", value: "PHARMACY" },
      ],
    },
    {
      columnId: "status",
      title: "Status",
      options: [
        { label: "Active", value: "ACTIVE" },
        { label: "Inactive", value: "INACTIVE" },
        { label: "Banned", value: "BANNED" },
        { label: "Pending", value: "PENDING" },
      ],
    },
  ];

  return (
    <>
      <Header>
        <TopNav links={topNav} />
        <div className="ms-auto flex items-center space-x-4">
          <Search />
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Vendors</h1>
            <p className="text-muted-foreground">
              Manage all vendors and their businesses
            </p>
          </div>
          <Button>
            <Store className="mr-2 h-4 w-4" />
            Add Vendor
          </Button>
        </div>

        <DataTable
          columns={columns}
          data={data?.vendors || []}
          isLoading={isLoading}
          searchKey="businessName"
          searchPlaceholder="Search vendors..."
          filters={filters}
          enableExport={true}
          exportFileName="vendors"
        />
      </Main>
    </>
  );
}

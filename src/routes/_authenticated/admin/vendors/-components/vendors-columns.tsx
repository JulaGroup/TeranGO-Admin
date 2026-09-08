import type { ColumnDef } from "@tanstack/react-table";
import { DataTableColumnHeader } from "@/components/data-table";
import { formatDate } from "../-lib/vendor-utils";
import type { VendorRow } from "../-lib/vendor-types";
import {
  VendorBusinessesCell,
  VendorIdentityCell,
  VendorPayoutBadge,
  VendorStatusBadge,
  VendorSubscriptionCell,
} from "./vendor-cells";
import {
  VendorRowActions,
  type VendorRowActionHandlers,
} from "./vendor-row-actions";

export function makeVendorColumns(
  handlers: VendorRowActionHandlers,
): ColumnDef<VendorRow>[] {
  return [
    {
      accessorKey: "name",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Vendor" />
      ),
      cell: ({ row }) => <VendorIdentityCell vendor={row.original} />,
      enableHiding: false,
    },
    {
      accessorKey: "phone",
      header: "Contact",
      enableSorting: false,
      meta: { className: "hidden lg:table-cell" },
      cell: ({ row }) => (
        <div className="text-sm">
          <div>{row.original.phone || "—"}</div>
          <div className="text-xs text-muted-foreground">
            {row.original.waveNumber
              ? `Wave ${row.original.waveNumber}`
              : "No Wave number"}
          </div>
        </div>
      ),
    },
    {
      accessorKey: "businessCount",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Businesses" />
      ),
      meta: { className: "hidden md:table-cell" },
      cell: ({ row }) => <VendorBusinessesCell vendor={row.original} />,
    },
    {
      // Not rendered — exists so the business-type facet has a column to filter.
      accessorKey: "businessTypes",
      header: "Type",
      filterFn: "arrIncludesSome",
      enableSorting: false,
      enableHiding: true,
      meta: { className: "hidden" },
      cell: () => null,
    },
    {
      accessorKey: "status",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Status" />
      ),
      cell: ({ row }) => <VendorStatusBadge isActive={row.original.isActive} />,
      filterFn: "arrIncludesSome",
    },
    {
      accessorKey: "payoutMode",
      header: "Payout",
      enableSorting: false,
      meta: { className: "hidden md:table-cell" },
      cell: ({ row }) => <VendorPayoutBadge vendor={row.original} />,
      filterFn: "arrIncludesSome",
    },
    {
      accessorKey: "subscriptionStatus",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Subscription" />
      ),
      meta: { className: "hidden lg:table-cell" },
      cell: ({ row }) => <VendorSubscriptionCell vendor={row.original} />,
      filterFn: "arrIncludesSome",
    },
    {
      accessorKey: "createdAt",
      header: ({ column }) => (
        <DataTableColumnHeader column={column} title="Joined" />
      ),
      meta: { className: "hidden xl:table-cell" },
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {formatDate(row.original.createdAt)}
        </span>
      ),
    },
    {
      id: "actions",
      header: () => <span className="sr-only">Actions</span>,
      enableSorting: false,
      enableHiding: false,
      meta: { className: "w-12 text-right" },
      cell: ({ row }) => (
        // Stop the click bubbling to the row, which opens the details dialog.
        <div
          className="flex justify-end"
          onClick={(e) => e.stopPropagation()}
          role="presentation"
        >
          <VendorRowActions vendor={row.original} handlers={handlers} />
        </div>
      ),
    },
  ];
}

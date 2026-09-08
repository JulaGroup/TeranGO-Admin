import { Link } from "@tanstack/react-router";
import {
  Ban,
  CheckCircle2,
  CreditCard,
  Edit,
  ExternalLink,
  Eye,
  MapPin,
  MoreHorizontal,
  Trash2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { VendorRow } from "../-lib/vendor-types";

export interface VendorRowActionHandlers {
  onViewDetails: (vendor: VendorRow) => void;
  onEdit: (vendor: VendorRow) => void;
  onManageSubscription: (vendor: VendorRow) => void;
  onSetLocation: (vendor: VendorRow) => void;
  onToggleStatus: (vendor: VendorRow) => void;
  onDelete: (vendor: VendorRow) => void;
}

/**
 * The single row action menu. This markup used to be copy-pasted between the
 * card grid and the table, which let the two drift apart.
 */
export function VendorRowActions({
  vendor,
  handlers,
}: {
  vendor: VendorRow;
  handlers: VendorRowActionHandlers;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          aria-label={`Actions for ${vendor.name}`}
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Actions</DropdownMenuLabel>
        <DropdownMenuItem onClick={() => handlers.onViewDetails(vendor)}>
          <Eye className="mr-2 h-4 w-4" />
          Quick view
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/admin/vendors/$vendorId" params={{ vendorId: vendor.id }}>
            <ExternalLink className="mr-2 h-4 w-4" />
            Open full profile
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handlers.onEdit(vendor)}>
          <Edit className="mr-2 h-4 w-4" />
          Edit vendor
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handlers.onManageSubscription(vendor)}>
          <CreditCard className="mr-2 h-4 w-4" />
          Manage subscription
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handlers.onSetLocation(vendor)}
          disabled={vendor.businessCount === 0}
        >
          <MapPin className="mr-2 h-4 w-4" />
          Set business location
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handlers.onToggleStatus(vendor)}>
          {vendor.isActive ? (
            <>
              <Ban className="mr-2 h-4 w-4" />
              Deactivate
            </>
          ) : (
            <>
              <CheckCircle2 className="mr-2 h-4 w-4" />
              Activate
            </>
          )}
        </DropdownMenuItem>
        <DropdownMenuItem
          onClick={() => handlers.onDelete(vendor)}
          className="text-destructive focus:text-destructive"
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Delete vendor
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

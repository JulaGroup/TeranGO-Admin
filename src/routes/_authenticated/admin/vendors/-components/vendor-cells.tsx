import { Crown, TriangleAlert } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { BUSINESS_TYPE_META, initials } from "../-lib/vendor-utils";
import type { VendorRow } from "../-lib/vendor-types";

/** Avatar + name + email. Replaces three copies of this block. */
export function VendorIdentityCell({ vendor }: { vendor: VendorRow }) {
  return (
    <div className="flex items-center gap-3">
      <Avatar className="h-9 w-9 shrink-0">
        <AvatarImage src={vendor.avatarUrl} alt="" />
        <AvatarFallback className="text-xs font-medium">
          {initials(vendor.name)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="truncate font-medium">{vendor.name}</span>
          {vendor.isSystemVendor && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span
                  className="inline-flex"
                  aria-label="TeranGO official store"
                >
                  <Crown className="h-3.5 w-3.5 shrink-0 text-amber-500" />
                </span>
              </TooltipTrigger>
              <TooltipContent>TeranGO official store</TooltipContent>
            </Tooltip>
          )}
        </div>
        <div className="truncate text-xs text-muted-foreground">
          {vendor.email || "No email"}
        </div>
      </div>
    </div>
  );
}

export function VendorStatusBadge({ isActive }: { isActive: boolean }) {
  return isActive ? (
    <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">
      Active
    </Badge>
  ) : (
    <Badge variant="destructive">Inactive</Badge>
  );
}

/**
 * Auto vs manual payout. Flags the one combination that silently does
 * nothing: auto-payout enabled with no Wave number to send to.
 */
export function VendorPayoutBadge({ vendor }: { vendor: VendorRow }) {
  if (vendor.payoutMode === "Manual") {
    return (
      <Badge variant="outline" className="text-muted-foreground">
        Manual
      </Badge>
    );
  }

  return (
    <div className="flex items-center gap-1.5">
      <Badge className="bg-amber-500 text-white hover:bg-amber-500">Auto</Badge>
      {vendor.payoutMisconfigured && (
        <Tooltip>
          <TooltipTrigger asChild>
            <span className="inline-flex" aria-label="Missing Wave number">
              <TriangleAlert className="h-4 w-4 text-destructive" />
            </span>
          </TooltipTrigger>
          <TooltipContent>
            Auto-payout is on but no Wave number is set — payouts will be
            skipped.
          </TooltipContent>
        </Tooltip>
      )}
    </div>
  );
}

export function VendorBusinessesCell({ vendor }: { vendor: VendorRow }) {
  if (vendor.businessCount === 0) {
    return <span className="text-sm text-muted-foreground">No businesses</span>;
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex items-center gap-1">
        {vendor.businessTypes.map((type) => {
          const meta = BUSINESS_TYPE_META[type];
          const Icon = meta.icon;
          return (
            <Tooltip key={type}>
              <TooltipTrigger asChild>
                <span className="inline-flex" aria-label={meta.label}>
                  <Icon className={cn("h-4 w-4", meta.className)} />
                </span>
              </TooltipTrigger>
              <TooltipContent>{meta.label}</TooltipContent>
            </Tooltip>
          );
        })}
      </div>
      <div className="min-w-0 text-sm">
        <span className="font-medium">{vendor.businessCount}</span>{" "}
        <span className="text-muted-foreground">
          {vendor.businessCount === 1 ? "business" : "businesses"}
        </span>
        {vendor.primaryBusiness && (
          <div className="truncate text-xs text-muted-foreground">
            {vendor.primaryBusiness}
            {vendor.businessCount > 1 && ` +${vendor.businessCount - 1} more`}
          </div>
        )}
      </div>
    </div>
  );
}

export function VendorSubscriptionCell({ vendor }: { vendor: VendorRow }) {
  if (vendor.subscriptionStatus === "None") {
    return <span className="text-sm text-muted-foreground">None</span>;
  }

  return (
    <div className="text-sm">
      <div className="flex items-center gap-1.5">
        <span className="truncate font-medium">
          {vendor.packageName || vendor.subscriptionStatus}
        </span>
        {vendor.raw.subscription?.isTrial && (
          <Badge variant="outline" className="px-1.5 py-0 text-[10px]">
            Trial
          </Badge>
        )}
      </div>
      {vendor.subscriptionEndDate && (
        <div className="text-xs text-muted-foreground">
          Expires{" "}
          {new Date(vendor.subscriptionEndDate).toLocaleDateString("en-GB", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })}
        </div>
      )}
    </div>
  );
}

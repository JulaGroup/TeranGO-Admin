import { Inbox, Plus, SearchX } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Context-aware: "nothing exists yet" and "your filters matched nothing" are
 * different problems and need different copy. The old page showed the same
 * message for both — and for a failed request too.
 */
export function VendorsEmptyState({
  hasVendors,
  onCreate,
}: {
  hasVendors: boolean;
  onCreate: () => void;
}) {
  if (hasVendors) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 py-12 text-center">
        <SearchX className="h-10 w-10 text-muted-foreground/50" />
        <p className="text-lg font-medium">No vendors match your filters</p>
        <p className="text-sm text-muted-foreground">
          Try a different search term, or clear the filters above.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-3 py-12 text-center">
      <Inbox className="h-10 w-10 text-muted-foreground/50" />
      <div>
        <p className="text-lg font-medium">No vendors yet</p>
        <p className="text-sm text-muted-foreground">
          Create your first vendor to start onboarding businesses.
        </p>
      </div>
      <Button onClick={onCreate} size="sm">
        <Plus className="mr-2 h-4 w-4" />
        Create Vendor
      </Button>
    </div>
  );
}

import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { adminApi } from "@/lib/api";

type BusinessType = "RESTAURANT" | "SHOP" | "PHARMACY";

interface DayHours {
  key: string;
  day: string;
  closed: boolean;
  open: string;
  close: string;
}

const WEEK_DAYS: { key: string; day: string }[] = [
  { key: "monday", day: "Monday" },
  { key: "tuesday", day: "Tuesday" },
  { key: "wednesday", day: "Wednesday" },
  { key: "thursday", day: "Thursday" },
  { key: "friday", day: "Friday" },
  { key: "saturday", day: "Saturday" },
  { key: "sunday", day: "Sunday" },
];

// Match the format the backend validates + the customer app reads:
// openingHours[day] = { open, close, closed }
function hoursFromRaw(raw: unknown): DayHours[] {
  const r = (raw && typeof raw === "object" ? raw : {}) as Record<
    string,
    { open?: string; close?: string; closed?: boolean; isOpen?: boolean }
  >;
  return WEEK_DAYS.map(({ key, day }) => {
    const v = r[key];
    if (!v) return { key, day, closed: false, open: "08:00", close: "22:00" };
    return {
      key,
      day,
      closed: !!(v.closed ?? !(v.isOpen ?? true)),
      open: v.open ?? "08:00",
      close: v.close ?? "22:00",
    };
  });
}

function hoursToRaw(hours: DayHours[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  hours.forEach(({ key, closed, open, close }) => {
    result[key] = { open, close, closed };
  });
  return result;
}

interface BusinessHoursDialogProps {
  open: boolean;
  onClose: () => void;
  business: {
    id: string;
    type: BusinessType;
    name: string;
    openingHours?: unknown;
  } | null;
  /** Query keys to invalidate after a successful save. */
  invalidateKeys?: unknown[][];
}

export function BusinessHoursDialog({
  open,
  onClose,
  business,
  invalidateKeys = [],
}: BusinessHoursDialogProps) {
  const queryClient = useQueryClient();
  const [hours, setHours] = useState<DayHours[]>(hoursFromRaw(undefined));

  // Reload the editor whenever a different business is opened.
  useEffect(() => {
    if (business) setHours(hoursFromRaw(business.openingHours));
  }, [business?.id, open]);

  const saveMutation = useMutation({
    mutationFn: async () => {
      if (!business) throw new Error("No business selected");
      return adminApi.updateBusiness(business.type, business.id, {
        openingHours: hoursToRaw(hours),
      });
    },
    onSuccess: () => {
      invalidateKeys.forEach((key) =>
        queryClient.invalidateQueries({ queryKey: key }),
      );
      toast.success("Business hours updated");
      onClose();
    },
    onError: (e: Error & { response?: { data?: { error?: string; message?: string } } }) =>
      toast.error(
        e.response?.data?.error ||
          e.response?.data?.message ||
          "Failed to update hours",
      ),
  });

  const setDay = (key: string, patch: Partial<DayHours>) =>
    setHours((prev) =>
      prev.map((d) => (d.key === key ? { ...d, ...patch } : d)),
    );

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Business Hours</DialogTitle>
          <DialogDescription>
            {business ? business.name : ""} — set opening hours per day.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2 py-1">
          {hours.map((d) => (
            <div
              key={d.key}
              className="flex items-center gap-3 rounded-lg border p-2.5"
            >
              <span className="w-24 shrink-0 text-sm font-medium">{d.day}</span>
              {d.closed ? (
                <span className="flex-1 text-sm text-muted-foreground">
                  Closed
                </span>
              ) : (
                <div className="flex flex-1 items-center gap-2">
                  <Input
                    type="time"
                    value={d.open}
                    onChange={(e) => setDay(d.key, { open: e.target.value })}
                    className="h-8"
                  />
                  <span className="text-muted-foreground text-sm">to</span>
                  <Input
                    type="time"
                    value={d.close}
                    onChange={(e) => setDay(d.key, { close: e.target.value })}
                    className="h-8"
                  />
                </div>
              )}
              <div className="flex shrink-0 items-center gap-1.5">
                <Switch
                  checked={!d.closed}
                  onCheckedChange={(openNow) =>
                    setDay(d.key, { closed: !openNow })
                  }
                />
                <span className="text-xs text-muted-foreground w-10">
                  {d.closed ? "Closed" : "Open"}
                </span>
              </div>
            </div>
          ))}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            onClick={() => saveMutation.mutate()}
            disabled={saveMutation.isPending}
          >
            {saveMutation.isPending ? "Saving…" : "Save hours"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// @ts-nocheck
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { format } from "date-fns";
import {
  CalendarCheck,
  Users,
  Ticket,
  RefreshCw,
  CheckCircle2,
  Clock,
  Search,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Phone,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_vendor/vendor/bookings")({
  component: VendorBookingsPage,
});

const ymd = (d: Date) => d.toISOString().slice(0, 10);

/** Times come back as UTC instants; render the wall-clock the venue booked. */
function slotTime(iso: string) {
  const d = new Date(iso);
  let h = d.getUTCHours();
  const m = d.getUTCMinutes();
  const ap = h >= 12 ? "PM" : "AM";
  h = h % 12 || 12;
  return `${h}:${m.toString().padStart(2, "0")} ${ap}`;
}

function buildStrip(anchor: Date, count = 7) {
  return Array.from({ length: count }, (_, i) => {
    const d = new Date(anchor);
    d.setDate(anchor.getDate() + i);
    return d;
  });
}

function VendorBookingsPage() {
  const queryClient = useQueryClient();
  const [anchor, setAnchor] = useState(() => new Date());
  const [date, setDate] = useState(() => ymd(new Date()));
  const [search, setSearch] = useState("");

  const days = useMemo(() => buildStrip(anchor), [anchor]);

  const {
    data: bookings = [],
    isLoading,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ["vendor-bookings", date],
    queryFn: async () => {
      const res = await api.get(`/api/experiences/vendor/bookings?date=${date}`);
      return res.data ?? [];
    },
  });

  const checkInMutation = useMutation({
    mutationFn: (bookingId: string) =>
      api.post(`/api/experiences/vendor/bookings/${bookingId}/check-in`),
    onSuccess: () => {
      toast.success("Guest checked in");
      queryClient.invalidateQueries({ queryKey: ["vendor-bookings"] });
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.error || "Couldn't check in"),
  });

  const isPaid = (b: any) =>
    b.paymentStatus === "PAID" || b.paymentStatus === "SUCCEEDED";

  const live = bookings.filter((b: any) => b.status !== "CANCELLED");
  const paid = live.filter(isPaid);
  const guests = paid.reduce((s: number, b: any) => s + (b.quantity || 0), 0);
  const checkedIn = live.filter((b: any) => b.status === "CHECKED_IN").length;
  const revenue = paid.reduce(
    (s: number, b: any) => s + (b.subtotalAmount ?? b.unitPrice * b.quantity),
    0,
  );

  const filtered = bookings
    .filter((b: any) => {
      const q = search.trim().toLowerCase();
      if (!q) return true;
      return (
        b.userProfile?.user?.fullName?.toLowerCase().includes(q) ||
        b.customerName?.toLowerCase().includes(q) ||
        b.option?.label?.toLowerCase().includes(q) ||
        b.id.slice(-8).toLowerCase().includes(q)
      );
    })
    .sort(
      (a: any, b: any) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    );

  const shiftStrip = (dir: number) => {
    const next = new Date(anchor);
    next.setDate(anchor.getDate() + dir * 7);
    setAnchor(next);
  };

  return (
    <div className="space-y-6 p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Bookings</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Who is coming, and when. Check guests in as they arrive.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="shadow-sm"
          onClick={() => refetch()}
        >
          <RefreshCw
            className={cn("mr-2 h-4 w-4", isFetching && "animate-spin")}
          />
          Refresh
        </Button>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Booked"
          value={paid.length}
          icon={Ticket}
          color="text-primary"
          border="border-l-primary"
        />
        <StatCard
          title="Guests"
          value={guests}
          icon={Users}
          color="text-blue-500"
          border="border-l-blue-500"
        />
        <StatCard
          title="Checked In"
          value={checkedIn}
          icon={CheckCircle2}
          color="text-emerald-500"
          border="border-l-emerald-500"
        />
        <StatCard
          title="Your Earnings"
          value={`D${revenue.toLocaleString()}`}
          icon={CalendarCheck}
          color="text-orange-500"
          border="border-l-orange-500"
        />
      </div>

      {/* Day strip */}
      <Card className="overflow-hidden shadow-sm">
        <CardHeader className="border-b pb-4">
          <div className="flex flex-wrap items-center gap-3">
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={() => shiftStrip(-1)}
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>

            <div className="flex flex-1 flex-wrap gap-2">
              {days.map((d) => {
                const key = ymd(d);
                const active = key === date;
                const today = key === ymd(new Date());
                return (
                  <button
                    key={key}
                    onClick={() => setDate(key)}
                    className={cn(
                      "flex min-w-[68px] flex-col items-center rounded-lg border px-3 py-2 transition-colors",
                      active
                        ? "border-primary bg-primary text-primary-foreground shadow-sm"
                        : "hover:bg-accent",
                    )}
                  >
                    <span className="text-[11px] font-semibold uppercase tracking-wide opacity-80">
                      {today ? "Today" : format(d, "EEE")}
                    </span>
                    <span className="text-lg font-bold leading-tight">
                      {format(d, "d")}
                    </span>
                    <span className="text-[10px] opacity-70">
                      {format(d, "MMM")}
                    </span>
                  </button>
                );
              })}
            </div>

            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9 shrink-0"
              onClick={() => shiftStrip(1)}
            >
              <ChevronRight className="h-4 w-4" />
            </Button>

            <div className="relative">
              <Search className="text-muted-foreground pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" />
              <Input
                className="h-9 w-[240px] pl-9"
                placeholder="Search guest, package or ref..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="text-muted-foreground h-8 w-8 animate-spin" />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <CalendarCheck className="text-muted-foreground mb-4 h-12 w-12 opacity-50" />
              <p className="text-lg font-medium">No bookings for this day</p>
              <p className="text-muted-foreground mt-1 text-sm">
                {search
                  ? "Try a different search."
                  : "Bookings appear here as customers reserve slots."}
              </p>
            </div>
          ) : (
            <div className="divide-y">
              {filtered.map((b: any) => {
                const paidRow = isPaid(b);
                const isCheckedIn = b.status === "CHECKED_IN";
                const cancelled = b.status === "CANCELLED";
                const providerAmount =
                  b.subtotalAmount ?? b.unitPrice * b.quantity;
                return (
                  <div
                    key={b.id}
                    className={cn(
                      "flex flex-wrap items-center gap-4 p-4",
                      cancelled && "opacity-55",
                    )}
                  >
                    {/* Time */}
                    <div className="w-[86px] shrink-0">
                      <div className="text-base font-bold">
                        {slotTime(b.startTime)}
                      </div>
                      <div className="text-muted-foreground text-xs">
                        {b.option?.durationMins} min
                      </div>
                    </div>

                    {/* Guest */}
                    <div className="min-w-[180px] flex-1">
                      <div className="font-medium">
                        {b.userProfile?.user?.fullName ||
                          b.customerName ||
                          "Guest"}
                      </div>
                      <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 text-xs">
                        <span>{b.option?.label}</span>
                        <span>× {b.quantity}</span>
                        {b.userProfile?.user?.phone && (
                          <span className="inline-flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {b.userProfile.user.phone}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Ref */}
                    <div className="hidden sm:block">
                      <div className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
                        Ref
                      </div>
                      <div className="font-mono text-sm font-semibold tracking-widest">
                        {b.id.slice(-8).toUpperCase()}
                      </div>
                    </div>

                    {/* Amount */}
                    <div className="text-right">
                      <div className="text-muted-foreground text-[10px] font-semibold uppercase tracking-wide">
                        You earn
                      </div>
                      <div className="font-semibold">
                        D{providerAmount.toLocaleString()}
                      </div>
                    </div>

                    {/* Status + action */}
                    <div className="flex shrink-0 items-center gap-2">
                      {cancelled ? (
                        <Badge variant="secondary">Cancelled</Badge>
                      ) : isCheckedIn ? (
                        <Badge className="bg-blue-500 text-white shadow-sm hover:bg-blue-600">
                          <CheckCircle2 className="mr-1 h-3 w-3" /> Checked in
                        </Badge>
                      ) : paidRow ? (
                        <>
                          <Badge className="bg-emerald-500 text-white shadow-sm hover:bg-emerald-600">
                            Paid
                          </Badge>
                          <Button
                            size="sm"
                            onClick={() => checkInMutation.mutate(b.id)}
                            disabled={checkInMutation.isPending}
                          >
                            {checkInMutation.isPending &&
                            checkInMutation.variables === b.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              "Check in"
                            )}
                          </Button>
                        </>
                      ) : (
                        <Badge variant="outline" className="text-amber-600">
                          <Clock className="mr-1 h-3 w-3" /> Awaiting payment
                        </Badge>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  title,
  value,
  icon: Icon,
  color,
  border,
}: {
  title: string;
  value: string | number;
  icon: any;
  color?: string;
  border?: string;
}) {
  return (
    <Card className={cn("border-l-4 shadow-sm", border || "border-l-primary")}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-muted-foreground text-sm font-medium">
          {title}
        </CardTitle>
        <Icon className={cn("h-4 w-4", color || "text-primary")} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

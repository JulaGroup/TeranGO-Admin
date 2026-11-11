import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { RefreshCw, Ticket, Search } from "lucide-react";
import { adminApi } from "@/lib/api";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { ProfileDropdown } from "@/components/profile-dropdown";
import { ThemeSwitch } from "@/components/theme-switch";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin/event-tickets/")({
  component: EventTicketsPage,
});

const STATUS: Record<string, string> = {
  CONFIRMED: "bg-emerald-100 text-emerald-700",
  CHECKED_IN: "bg-blue-100 text-blue-700",
  COMPLETED: "bg-slate-100 text-slate-700",
  CANCELLED: "bg-red-100 text-red-700",
  PENDING: "bg-amber-100 text-amber-700",
};

function money(n?: number | null) {
  return n == null ? "—" : `D${Number(n).toLocaleString()}`;
}

function EventTicketsPage() {
  const [onlyPaid, setOnlyPaid] = useState(true);
  const [q, setQ] = useState("");

  const { data: tickets = [], isLoading, refetch, isFetching } = useQuery({
    queryKey: ["admin-event-tickets", onlyPaid],
    queryFn: async () =>
      (await adminApi.getAllEventTickets({ paid: onlyPaid || undefined }))
        .data,
  });

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return tickets;
    return (tickets as any[]).filter((t) => {
      const name = t.experience?.name?.toLowerCase() || "";
      const holder =
        t.customerName?.toLowerCase() ||
        t.userProfile?.user?.fullName?.toLowerCase() ||
        "";
      const phone = t.userProfile?.user?.phone || "";
      return (
        name.includes(s) || holder.includes(s) || phone.includes(s)
      );
    });
  }, [tickets, q]);

  const paidCount = (tickets as any[]).filter(
    (t) => t.paymentStatus === "PAID",
  ).length;
  const totalQty = (tickets as any[])
    .filter((t) => t.paymentStatus === "PAID")
    .reduce((n, t) => n + (t.quantity || 1), 0);
  const revenue = (tickets as any[])
    .filter((t) => t.paymentStatus === "PAID")
    .reduce((n, t) => n + (t.totalAmount || 0), 0);

  return (
    <>
      <Header>
        <div className="ml-auto flex items-center space-x-4">
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
              <Ticket className="h-6 w-6 text-orange-500" /> Event Tickets
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Every ticket sold across all events.
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw
              className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
        </div>

        {/* Stat tiles */}
        <div className="mb-5 grid gap-4 sm:grid-cols-3">
          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">Paid tickets</p>
            <p className="text-2xl font-bold">{paidCount}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">Admissions</p>
            <p className="text-2xl font-bold">{totalQty}</p>
          </div>
          <div className="rounded-lg border p-4">
            <p className="text-xs text-muted-foreground">Revenue (paid)</p>
            <p className="text-2xl font-bold">{money(revenue)}</p>
          </div>
        </div>

        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[220px]">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search event, holder or phone…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <div className="flex gap-1 text-xs">
            <button
              onClick={() => setOnlyPaid(true)}
              className={`rounded px-3 py-1.5 ${onlyPaid ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
            >
              Paid only
            </button>
            <button
              onClick={() => setOnlyPaid(false)}
              className={`rounded px-3 py-1.5 ${!onlyPaid ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
            >
              All
            </button>
          </div>
        </div>

        <div className="rounded-lg border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/40 text-left">
                  <th className="px-4 py-3 font-medium">Event</th>
                  <th className="px-4 py-3 font-medium">Holder</th>
                  <th className="px-4 py-3 font-medium">Tier</th>
                  <th className="px-4 py-3 font-medium text-right">Qty</th>
                  <th className="px-4 py-3 font-medium text-right">Amount</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Scanned</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-4 py-10 text-center">
                      <RefreshCw className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="px-4 py-10 text-center text-muted-foreground"
                    >
                      No tickets yet.
                    </td>
                  </tr>
                ) : (
                  (filtered as any[]).map((t) => (
                    <tr key={t.id} className="border-b last:border-0">
                      <td className="px-4 py-3 font-medium">
                        {t.experience?.name || "Event"}
                      </td>
                      <td className="px-4 py-3">
                        <div>
                          {t.customerName ||
                            t.userProfile?.user?.fullName ||
                            "—"}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {t.userProfile?.user?.phone || ""}
                        </div>
                      </td>
                      <td className="px-4 py-3">{t.option?.label || "—"}</td>
                      <td className="px-4 py-3 text-right tabular-nums">
                        {t.quantity}
                      </td>
                      <td className="px-4 py-3 text-right tabular-nums font-semibold">
                        {money(t.totalAmount)}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          className={STATUS[t.status] || "bg-slate-100"}
                          variant="secondary"
                        >
                          {t.status}
                        </Badge>
                        {t.paymentStatus !== "PAID" && (
                          <span className="ml-1 text-xs text-amber-600">
                            unpaid
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">
                        {t.checkedInAt
                          ? new Date(t.checkedInAt).toLocaleString()
                          : "—"}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </Main>
    </>
  );
}

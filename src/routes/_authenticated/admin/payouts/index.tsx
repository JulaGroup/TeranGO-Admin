import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  CheckCircle,
  ChevronLeft,
  ChevronRight,
  Clock,
  RotateCw,
  Zap,
} from "lucide-react";
import { adminApi } from "@/lib/api";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { TopNav } from "@/components/layout/top-nav";
import { ProfileDropdown } from "@/components/profile-dropdown";
import { Search } from "@/components/search";
import { ThemeSwitch } from "@/components/theme-switch";

export const Route = createFileRoute("/_authenticated/admin/payouts/")({
  component: AdminPayoutsPage,
});

const topNav = [
  { title: "Overview", href: "/admin", isActive: false },
  { title: "Payments", href: "/admin/payments", isActive: false },
  { title: "Payouts", href: "/admin/payouts", isActive: true },
  {
    title: "Vendor Settlements",
    href: "/admin/vendor-settlements",
    isActive: false,
  },
];

const PAGE_SIZE = 25;

function formatGMD(amount?: number | null) {
  return `D${(amount || 0).toFixed(2)}`;
}

function formatDate(dateStr?: string) {
  if (!dateStr) return "—";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function businessName(payout: any) {
  const o = payout.order;
  return (
    o?.restaurant?.name ||
    o?.shop?.name ||
    o?.pharmacy?.name ||
    payout.beneficiaryName ||
    "—"
  );
}

function statusBadge(status: string) {
  if (status === "COMPLETED")
    return (
      <Badge className="bg-green-600 hover:bg-green-600">
        <CheckCircle className="mr-1 h-3 w-3" />
        Paid
      </Badge>
    );
  if (status === "FAILED" || status === "REVERSED")
    return (
      <Badge variant="destructive">
        <AlertTriangle className="mr-1 h-3 w-3" />
        {status === "FAILED" ? "Failed" : "Reversed"}
      </Badge>
    );
  return (
    <Badge variant="outline">
      <Clock className="mr-1 h-3 w-3" />
      {status === "PROCESSING" ? "In flight" : "Queued"}
    </Badge>
  );
}

function AdminPayoutsPage() {
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("all");

  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["admin-payouts", statusFilter, page],
    queryFn: async () => {
      const res = await adminApi.getPayouts({
        page,
        limit: PAGE_SIZE,
        ...(statusFilter !== "all" ? { status: statusFilter } : {}),
      });
      return res.data as { data: any[]; total: number };
    },
  });

  // Small parallel counts so "has anything failed" is answerable at a glance
  // without paging through the list. limit=1 — only `total` is read.
  const counts = useQuery({
    queryKey: ["admin-payouts-counts"],
    queryFn: async () => {
      const [completed, processing, failed] = await Promise.all([
        adminApi.getPayouts({ status: "COMPLETED", limit: 1 }),
        adminApi.getPayouts({ status: "PROCESSING", limit: 1 }),
        adminApi.getPayouts({ status: "FAILED", limit: 1 }),
      ]);
      return {
        completed: completed.data.total as number,
        processing: processing.data.total as number,
        failed: failed.data.total as number,
      };
    },
  });

  const payouts = data?.data || [];
  const total = data?.total || 0;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <>
      <Header>
        <TopNav links={topNav} />
        <div className="ms-auto flex items-center space-x-4">
          <Search />
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight">
                <Zap className="h-6 w-6 text-amber-500" />
                Vendor Payouts
              </h1>
              <p className="text-sm text-muted-foreground">
                Money sent to vendors via Wave automatically after each order is
                paid. Vendors not on auto-payout settle through Vendor
                Settlements instead.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                refetch();
                counts.refetch();
              }}
              disabled={isFetching}
            >
              <RotateCw
                className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`}
              />
              Refresh
            </Button>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Paid
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">
                  {counts.data?.completed ?? "—"}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  In flight
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">
                  {counts.data?.processing ?? "—"}
                </div>
              </CardContent>
            </Card>
            <Card
              className={
                counts.data?.failed ? "border-red-300 bg-red-50/50" : undefined
              }
            >
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Failed
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div
                  className={`text-3xl font-bold ${counts.data?.failed ? "text-red-600" : ""}`}
                >
                  {counts.data?.failed ?? "—"}
                </div>
                {!!counts.data?.failed && (
                  <p className="mt-1 text-xs text-red-600">
                    These vendors fall back to manual settlement.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>All Payouts</CardTitle>
                <CardDescription>
                  {total} payout{total === 1 ? "" : "s"} recorded.
                </CardDescription>
              </div>
              <Select
                value={statusFilter}
                onValueChange={(v) => {
                  setStatusFilter(v);
                  setPage(1);
                }}
              >
                <SelectTrigger className="w-44">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  <SelectItem value="COMPLETED">Paid</SelectItem>
                  <SelectItem value="PROCESSING">In flight</SelectItem>
                  <SelectItem value="PENDING">Queued</SelectItem>
                  <SelectItem value="FAILED">Failed</SelectItem>
                  <SelectItem value="REVERSED">Reversed</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Wave Number</TableHead>
                    <TableHead>Sent</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Wave Ref</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="py-8 text-center text-muted-foreground"
                      >
                        Loading...
                      </TableCell>
                    </TableRow>
                  ) : payouts.length === 0 ? (
                    <TableRow>
                      <TableCell
                        colSpan={7}
                        className="py-8 text-center text-muted-foreground"
                      >
                        No payouts yet. They appear here automatically once a
                        vendor with auto-payout enabled has an order paid.
                      </TableCell>
                    </TableRow>
                  ) : (
                    payouts.map((p: any) => {
                      const err = (p.metadata as any)?.error;
                      return (
                        <TableRow key={p.id}>
                          <TableCell>
                            <div className="font-medium">{businessName(p)}</div>
                            {err && (
                              <div
                                className="max-w-xs truncate text-xs text-red-600"
                                title={String(err)}
                              >
                                {String(err)}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="font-mono text-xs">
                            #{(p.orderId || "").slice(-8).toUpperCase()}
                          </TableCell>
                          <TableCell className="font-bold">
                            {formatGMD(p.amount)}
                          </TableCell>
                          <TableCell className="text-sm">
                            {p.accountNumber || "—"}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {formatDate(p.createdAt)}
                          </TableCell>
                          <TableCell>{statusBadge(p.status)}</TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {p.transferReference || "—"}
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </CardContent>
            <div className="flex items-center justify-between border-t px-6 py-3">
              <div className="text-sm text-muted-foreground">
                Page {page} of {totalPages}
              </div>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1 || isFetching}
                >
                  <ChevronLeft className="h-4 w-4" />
                  Prev
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= totalPages || isFetching}
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        </div>
      </Main>
    </>
  );
}

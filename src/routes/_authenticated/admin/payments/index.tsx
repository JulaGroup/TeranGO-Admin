import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { adminApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
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

export const Route = createFileRoute("/_authenticated/admin/payments/")({
  component: PaymentsPage,
});

const topNav = [
  { title: "Overview", href: "/admin", isActive: false },
  { title: "Payments", href: "/admin/payments", isActive: true },
];

function PaymentsPage() {
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [networkFilter, setNetworkFilter] = useState("all");
  const [page, setPage] = useState(1);
  const limit = 50;

  type Paginated<T> = {
    data: T[];
    total?: number;
    page?: number;
    limit?: number;
  };

  type PaymentRow = {
    id?: string;
    orderId?: string | null;
    amount?: number;
    currency?: string;
    network?: string;
    status?: string;
    createdAt?: string;
    order?: {
      customerName?: string;
      customerPhone?: string;
      restaurant?: { name?: string; vendorId?: string };
      shop?: { name?: string; vendorId?: string };
      pharmacy?: { name?: string; vendorId?: string };
      payouts?: Array<{ id?: string; amount?: number; status?: string }>;
    };
  };

  const { data, isLoading, refetch } = useQuery<Paginated<PaymentRow>>({
    queryKey: [
      "admin-payments",
      page,
      limit,
      query,
      statusFilter,
      networkFilter,
    ],
    queryFn: async () => {
      const params: any = { page, limit };
      if (query) params.q = query;
      if (statusFilter && statusFilter !== "all") params.status = statusFilter;
      if (networkFilter && networkFilter !== "all")
        params.network = networkFilter;
      const resp = await adminApi.getPayments(params);
      return resp.data;
    },
  });

  const payments: PaymentRow[] = (data?.data as PaymentRow[]) || [];

  return (
    <>
      <Header>
        <TopNav links={topNav} />
      </Header>
      <Main>
        <div className="mb-4 flex flex-wrap items-center gap-4">
          <Input
            placeholder="Search by order/payment id, vendor, customer..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="max-w-md"
          />
          <Select value={networkFilter} onValueChange={setNetworkFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Network" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="wave">Wave</SelectItem>
              <SelectItem value="wave_payout">Wave Payout</SelectItem>
              <SelectItem value="modempay">Modempay</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              <SelectItem value="PENDING">PENDING</SelectItem>
              <SelectItem value="SUCCEEDED">SUCCEEDED</SelectItem>
              <SelectItem value="FAILED">FAILED</SelectItem>
            </SelectContent>
          </Select>
          <Button onClick={() => refetch()}>Filter</Button>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Payments</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Payment ID</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Network</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Payout</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8}>Loading...</TableCell>
                  </TableRow>
                ) : payments.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8}>No payments found</TableCell>
                  </TableRow>
                ) : (
                  payments.map((p) => {
                    const order = p.order || {};
                    const vendor =
                      order.restaurant?.name ||
                      order.shop?.name ||
                      order.pharmacy?.name ||
                      "-";
                    const payout = (order.payouts && order.payouts[0]) || null;

                    return (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono text-xs">
                          {p.id ? p.id.slice(0, 8) : "—"}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {p.orderId || "-"}
                        </TableCell>
                        <TableCell>
                          <b>
                            GMD{" "}
                            {p.amount != null ? p.amount.toLocaleString() : "—"}
                          </b>
                        </TableCell>
                        <TableCell>
                          {p.order?.customerName ||
                            p.order?.customerPhone ||
                            "—"}
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">{p.network || "—"}</Badge>
                        </TableCell>
                        <TableCell>
                          <Badge>{p.status}</Badge>
                        </TableCell>
                        <TableCell>{vendor}</TableCell>
                        <TableCell>
                          {payout ? (
                            <div>
                              <div>GMD {payout.amount}</div>
                              <div className="text-xs text-muted-foreground">
                                {payout.status}
                              </div>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {p.createdAt
                            ? new Date(p.createdAt).toLocaleString()
                            : "—"}
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>

            <div className="mt-4 flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Showing {payments.length} results
              </div>
              <div className="flex gap-2">
                <Button
                  disabled={page === 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Prev
                </Button>
                <Button onClick={() => setPage((p) => p + 1)}>Next</Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </Main>
    </>
  );
}

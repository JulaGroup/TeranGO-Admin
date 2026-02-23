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
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { TopNav } from "@/components/layout/top-nav";

export const Route = createFileRoute("/_authenticated/payments/")({
  component: PaymentsPage,
});

const topNav = [
  { title: "Overview", href: "/", isActive: false },
  { title: "Payments", href: "/payments", isActive: true },
];

function PaymentsPage() {
  const [query, setQuery] = useState("");
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
      restaurant?: { name?: string; vendorId?: string };
      shop?: { name?: string; vendorId?: string };
      pharmacy?: { name?: string; vendorId?: string };
      payouts?: Array<{ id?: string; amount?: number; status?: string }>;
    };
  };

  const { data, isLoading, refetch } = useQuery<Paginated<PaymentRow>>({
    queryKey: ["admin-payments", page, limit, query],
    queryFn: async () => {
      const resp = await adminApi.getPayments({ page, limit, q: query });
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
        <div className="mb-4 flex items-center gap-4">
          <Input
            placeholder="Search by order id, payment id, vendor..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="max-w-md"
          />
          <Button onClick={() => refetch()}>Search</Button>
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

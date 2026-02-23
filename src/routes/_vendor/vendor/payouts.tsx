import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { vendorApi } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { TopNav } from "@/components/layout/top-nav";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_vendor/vendor/payouts")({
  component: VendorPayouts,
});

function VendorPayouts() {
  const [page, setPage] = useState(1);
  const limit = 50;

  type Paginated<T> = {
    data: T[];
    total?: number;
    page?: number;
    limit?: number;
  };

  type PayoutRow = {
    id?: string;
    orderId?: string | null;
    amount?: number;
    currency?: string;
    beneficiaryName?: string;
    accountNumber?: string;
    transferReference?: string | null;
    status?: string;
    createdAt?: string;
  };

  const { data, isLoading, refetch } = useQuery<Paginated<PayoutRow>>({
    queryKey: ["vendor-payouts", page, limit],
    queryFn: async () => {
      const resp = await vendorApi.getPayouts({ page, limit });
      return resp.data;
    },
  });

  const payouts: PayoutRow[] = (data?.data as PayoutRow[]) || [];

  const topNav = [
    { title: "Dashboard", href: "/vendor/dashboard", isActive: false },
    { title: "Orders", href: "/vendor/orders", isActive: false },
    { title: "Payouts", href: "/vendor/payouts", isActive: true },
  ];

  return (
    <>
      <Header>
        <TopNav links={topNav} />
      </Header>
      <Main>
        <Card>
          <CardHeader>
            <CardTitle>My Payouts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="mb-4">
              <Button onClick={() => refetch()}>Refresh</Button>
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Payout</TableHead>
                  <TableHead>Order</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Transfer Ref</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6}>Loading...</TableCell>
                  </TableRow>
                ) : payouts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6}>No payouts found</TableCell>
                  </TableRow>
                ) : (
                  payouts.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="font-mono text-xs">
                        {p.id ? p.id.slice(0, 8) : "—"}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {p.orderId || "-"}
                      </TableCell>
                      <TableCell>GMD {p.amount}</TableCell>
                      <TableCell className="text-sm">{p.status}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {p.transferReference || "-"}
                      </TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {p.createdAt
                          ? new Date(p.createdAt).toLocaleString()
                          : "—"}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>

            <div className="mt-4 flex items-center justify-end gap-2">
              <Button
                disabled={page === 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Prev
              </Button>
              <Button onClick={() => setPage((p) => p + 1)}>Next</Button>
            </div>
          </CardContent>
        </Card>
      </Main>
    </>
  );
}

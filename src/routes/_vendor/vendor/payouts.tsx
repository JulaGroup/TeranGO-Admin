import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { api } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { TopNav } from "@/components/layout/top-nav";
import { Button } from "@/components/ui/button";
import { CheckCircle, Clock, RotateCw, Wallet, XCircle } from "lucide-react";
import { toast } from "sonner";
import { ProfileDropdown } from "@/components/profile-dropdown";

export const Route = createFileRoute("/_vendor/vendor/payouts")({
  component: VendorPayouts,
});

function formatGMD(amount: number | null | undefined) {
  return `D${(amount || 0).toFixed(2)}`;
}

function formatDate(dateStr: string) {
  if (!dateStr) return "�";
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function VendorPayouts() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);

  const { data: summary, isLoading: isLoadingSummary } = useQuery({
    queryKey: ["vendor-earnings-summary"],
    queryFn: async () => {
      const res = await api.get("/api/vendor/earnings/summary");
      return res.data;
    },
  });

  const settleMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post("/api/vendor/earnings/settle", {});
      return res.data;
    },
    onSuccess: () => {
      toast.success("Payout request submitted successfully.");
      queryClient.invalidateQueries({ queryKey: ["vendor-earnings-summary"] });
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message || "Failed to request payout");
    },
  });

  const settlements = summary?.allSettlements || [];
  const pendingRequest = summary?.pendingSettlementRequest;

  return (
    <>
      <Header>
        <TopNav links={[{ title: "Dashboard", href: "/vendor/dashboard", isActive: false }, { title: "Orders", href: "/vendor/orders", isActive: false }, { title: "Payouts", href: "/vendor/payouts", isActive: true }]} />
        <div className="ms-auto flex items-center space-x-4">
          <ProfileDropdown />
        </div>
      </Header>
      <Main>
        <div className="mb-6 flex flex-col md:flex-row gap-6">
          <Card className="flex-1 border-green-200 bg-green-50/50">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg flex items-center gap-2 text-green-800">
                <Wallet className="h-5 w-5" />
                Available for Payout
              </CardTitle>
              <CardDescription>Earnings from delivered orders not yet paid out</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-bold text-green-700">
                {isLoadingSummary ? "..." : formatGMD(summary?.pendingUnsettled?.total)}
              </div>
              <p className="text-sm text-green-600 mt-2">
                Includes {summary?.pendingUnsettled?.count || 0} order(s)
              </p>
            </CardContent>
            <CardFooter>
              {pendingRequest ? (
                <Button disabled className="w-full sm:w-auto gap-2" variant="outline">
                  <Clock className="h-4 w-4" />
                  Payout Request Pending
                </Button>
              ) : (
                <Button 
                  onClick={() => settleMutation.mutate()} 
                  disabled={settleMutation.isPending || !summary?.pendingUnsettled?.total || summary?.pendingUnsettled?.total <= 0}
                  className="w-full sm:w-auto bg-green-600 hover:bg-green-700 gap-2"
                >
                  {settleMutation.isPending ? <RotateCw className="h-4 w-4 animate-spin" /> : <Wallet className="h-4 w-4" />}
                  Request Payout
                </Button>
              )}
            </CardFooter>
          </Card>
          <Card className="flex-1">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg text-muted-foreground">Total Earned All Time</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">
                {isLoadingSummary ? "..." : formatGMD(summary?.allTime?.total)}
              </div>
            </CardContent>
          </Card>
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Payout History</CardTitle>
            <CardDescription>Track all your previous withdrawal requests.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Request ID</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Requested At</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reviewed At</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingSummary ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">Loading...</TableCell></TableRow>
                ) : settlements.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-6 text-muted-foreground">No payout history.</TableCell></TableRow>
                ) : (
                  settlements.map((s: any) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono text-xs">{s.id.slice(0, 8)}</TableCell>
                      <TableCell className="font-bold">{formatGMD(s.totalAmount)}</TableCell>
                      <TableCell className="text-sm">{formatDate(s.requestedAt)}</TableCell>
                      <TableCell>
                        <Badge variant={s.status === "APPROVED" ? "default" : "outline"} className={s.status === "APPROVED" ? "bg-green-600" : ""}>
                          {s.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{formatDate(s.reviewedAt)}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Main>
    </>
  );
}

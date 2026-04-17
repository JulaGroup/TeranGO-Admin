import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  CheckCircle,
  XCircle,
  Clock,
  DollarSign,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { TopNav } from "@/components/layout/top-nav";
import { ProfileDropdown } from "@/components/profile-dropdown";
import { Search } from "@/components/search";
import { ThemeSwitch } from "@/components/theme-switch";

export const Route = createFileRoute("/_authenticated/admin/settlements/")({
  component: SettlementsPage,
});

const topNav = [
  { title: "Overview", href: "/admin", isActive: false },
  { title: "Drivers", href: "/admin/drivers", isActive: false },
  { title: "Settlements", href: "/admin/settlements", isActive: true },
];

function formatGMD(amount: number) {
  return `D${amount.toFixed(2)}`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function SettlementsPage() {
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [approveDialog, setApproveDialog] = useState<{
    id: string;
    driverName: string;
    amount: number;
  } | null>(null);
  const [rejectDialog, setRejectDialog] = useState<{
    id: string;
    driverName: string;
    amount: number;
  } | null>(null);
  const [rejectNotes, setRejectNotes] = useState("");

  // ─── Fetch settlements ────────────────────────────────────────────────────
  const { data, isLoading } = useQuery({
    queryKey: ["settlements", statusFilter, page],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        pageSize: "20",
        ...(statusFilter !== "all" && { status: statusFilter }),
      });
      const res = await api.get(`/api/admin/earnings/settlements?${params}`);
      return res.data;
    },
  });

  // ─── Approve mutation ─────────────────────────────────────────────────────
  const approveMutation = useMutation({
    mutationFn: (settlementId: string) =>
      api.post(`/api/admin/earnings/settlements/${settlementId}/approve`),
    onSuccess: (_result, _settlementId) => {
      toast.success(
        "Settlement approved! Remember to manually pay the driver via Wave.",
      );
      queryClient.invalidateQueries({ queryKey: ["settlements"] });
    },
    onError: () => toast.error("Failed to approve settlement"),
  });

  // ─── Reject mutation ──────────────────────────────────────────────────────
  const rejectMutation = useMutation({
    mutationFn: ({ id, notes }: { id: string; notes: string }) =>
      api.post(`/api/admin/earnings/settlements/${id}/reject`, { notes }),
    onSuccess: () => {
      toast.success("Settlement rejected");
      queryClient.invalidateQueries({ queryKey: ["settlements"] });
      setRejectDialog(null);
      setRejectNotes("");
    },
    onError: () => toast.error("Failed to reject settlement"),
  });

  const handleApprove = (settlement: any) => {
    setApproveDialog({
      id: settlement.id,
      driverName: settlement.driver?.user?.fullName || "Driver",
      amount: settlement.totalAmount,
    });
  };

  const settlements = data?.settlements || [];

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
              <h1 className="text-3xl font-bold">Settlement Requests</h1>
              <p className="text-muted-foreground">
                Review and approve driver payout requests. Settle manually via
                Wave.
              </p>
            </div>
            <Select
              value={statusFilter}
              onValueChange={(v) => {
                setStatusFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Requests</SelectItem>
                <SelectItem value="PENDING">Pending</SelectItem>
                <SelectItem value="APPROVED">Approved</SelectItem>
                <SelectItem value="REJECTED">Rejected</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                {statusFilter === "all" ? "All" : statusFilter} Settlements
                {data?.total !== undefined && (
                  <span className="text-muted-foreground text-sm font-normal">
                    ({data.total} total)
                  </span>
                )}
              </CardTitle>
              <CardDescription>
                Drivers are paid manually upon request approval
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-muted-foreground py-12 text-center">
                  Loading...
                </div>
              ) : settlements.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Driver</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Amount</TableHead>
                      <TableHead>Earnings Covered</TableHead>
                      <TableHead>Requested At</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Reviewed At</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {settlements.map((s: any) => (
                      <TableRow key={s.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">
                              {s.driver?.user?.fullName || "Unknown"}
                            </p>
                            <Link
                              to={"/admin/drivers/$driverId" as any}
                              params={{ driverId: s.driverId } as any}
                              className="text-muted-foreground flex items-center gap-1 text-xs hover:underline"
                            >
                              View Driver
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm">
                          {s.driver?.user?.phone || "N/A"}
                        </TableCell>
                        <TableCell className="text-lg font-bold text-green-700">
                          {formatGMD(s.totalAmount)}
                        </TableCell>
                        <TableCell>
                          <Badge variant="secondary">
                            {s.earnings?.length || 0} deliveries
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm">
                          {formatDate(s.requestedAt)}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              s.status === "APPROVED"
                                ? "default"
                                : s.status === "REJECTED"
                                  ? "destructive"
                                  : "outline"
                            }
                            className={
                              s.status === "APPROVED" ? "bg-green-600" : ""
                            }
                          >
                            {s.status === "PENDING" && (
                              <Clock className="mr-1 h-3 w-3" />
                            )}
                            {s.status === "APPROVED" && (
                              <CheckCircle className="mr-1 h-3 w-3" />
                            )}
                            {s.status === "REJECTED" && (
                              <XCircle className="mr-1 h-3 w-3" />
                            )}
                            {s.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-muted-foreground text-sm">
                          {s.reviewedAt ? formatDate(s.reviewedAt) : "—"}
                        </TableCell>
                        <TableCell className="text-right">
                          {s.status === "PENDING" && (
                            <div className="flex justify-end gap-2">
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-green-500 text-green-600 hover:bg-green-50"
                                onClick={() => handleApprove(s)}
                                disabled={approveMutation.isPending}
                              >
                                <CheckCircle className="mr-1 h-3 w-3" />
                                Approve
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                className="border-red-400 text-red-600 hover:bg-red-50"
                                onClick={() =>
                                  setRejectDialog({
                                    id: s.id,
                                    driverName:
                                      s.driver?.user?.fullName || "Driver",
                                    amount: s.totalAmount,
                                  })
                                }
                              >
                                <XCircle className="mr-1 h-3 w-3" />
                                Reject
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-muted-foreground py-12 text-center">
                  No {statusFilter !== "all" ? statusFilter.toLowerCase() : ""}{" "}
                  settlement requests found.
                </div>
              )}

              {/* Pagination */}
              {data?.totalPages > 1 && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-muted-foreground text-sm">
                    Page {page} of {data.totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= data.totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </Main>

      {/* Approve Dialog */}
      <Dialog
        open={!!approveDialog}
        onOpenChange={() => setApproveDialog(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Approve Settlement</DialogTitle>
            <DialogDescription>
              Approve settlement of <strong>D{approveDialog?.amount?.toFixed(2)}</strong> for{" "}
              <strong>{approveDialog?.driverName}</strong>.
            </DialogDescription>
          </DialogHeader>
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
            <p className="text-sm text-yellow-800">
              <strong>⚠️ Important:</strong> You will need to manually pay this driver{" "}
              <strong>via Wave</strong> after approving.
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setApproveDialog(null)}
            >
              Cancel
            </Button>
            <Button
              className="bg-green-600 hover:bg-green-700"
              onClick={() => {
                approveMutation.mutate(approveDialog!.id);
                setApproveDialog(null);
              }}
              disabled={approveMutation.isPending}
            >
              Approve Settlement
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Reject Dialog */}
      <Dialog
        open={!!rejectDialog}
        onOpenChange={() => {
          setRejectDialog(null);
          setRejectNotes("");
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reject Settlement</DialogTitle>
            <DialogDescription>
              Reject {rejectDialog?.driverName}'s settlement request of{" "}
              <strong>D{rejectDialog?.amount?.toFixed(2)}</strong>. Their
              earnings will remain pending for a future request.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label>Reason (optional)</Label>
              <Textarea
                placeholder="e.g. Incorrect bank details, dispute under review..."
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setRejectDialog(null);
                  setRejectNotes("");
                }}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() =>
                  rejectMutation.mutate({
                    id: rejectDialog!.id,
                    notes: rejectNotes,
                  })
                }
                disabled={rejectMutation.isPending}
              >
                Reject Settlement
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

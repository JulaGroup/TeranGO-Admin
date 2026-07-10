import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, CheckCircle2, Wallet, Trash2 } from "lucide-react";
import { toast } from "sonner";
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { ProfileDropdown } from "@/components/profile-dropdown";
import { Search } from "@/components/search";
import { ThemeSwitch } from "@/components/theme-switch";

export const Route = createFileRoute("/_authenticated/admin/staff-advances/")({
  component: StaffAdvancesPage,
});

const CATEGORY_LABELS: Record<string, string> = {
  VENDOR_SETTLEMENT: "Vendor Settlement",
  STORE_PURCHASE: "Store Purchase",
  OTHER: "Other",
};

function formatGMD(amount: number) {
  return `D${amount.toFixed(2)}`;
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function StaffAdvancesPage() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState("all");
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [form, setForm] = useState({
    personName: "",
    amount: "",
    category: "OTHER",
    reason: "",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["staff-advances", statusFilter],
    queryFn: async () => {
      const response = await adminApi.getStaffAdvances({
        status: statusFilter === "all" ? undefined : statusFilter,
      });
      return response.data;
    },
  });

  const advances = data?.advances || [];
  const summary = data?.summary || { totalOwed: 0, owedByPerson: [] };

  const createMutation = useMutation({
    mutationFn: () =>
      adminApi.createStaffAdvance({
        personName: form.personName,
        amount: parseFloat(form.amount),
        category: form.category,
        reason: form.reason,
      }),
    onSuccess: () => {
      toast.success("Advance recorded");
      queryClient.invalidateQueries({ queryKey: ["staff-advances"] });
      setIsAddOpen(false);
      setForm({ personName: "", amount: "", category: "OTHER", reason: "" });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || "Failed to record advance");
    },
  });

  const settleMutation = useMutation({
    mutationFn: (id: string) => adminApi.settleStaffAdvance(id),
    onSuccess: () => {
      toast.success("Marked as settled");
      queryClient.invalidateQueries({ queryKey: ["staff-advances"] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || "Failed to settle advance");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteStaffAdvance(id),
    onSuccess: () => {
      toast.success("Advance deleted");
      queryClient.invalidateQueries({ queryKey: ["staff-advances"] });
    },
    onError: (error: any) => {
      toast.error(error?.response?.data?.error || "Failed to delete advance");
    },
  });

  const handleCreate = () => {
    if (!form.personName || !form.amount || !form.reason) {
      toast.error("Name, amount, and reason are required");
      return;
    }
    createMutation.mutate();
  };

  return (
    <>
      <Header>
        <Search />
        <div className="ml-auto flex items-center gap-4">
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>
      <Main>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Staff Advances
            </h1>
            <p className="text-muted-foreground">
              Track money staff fronted out of pocket (vendor settlements,
              wholesale purchases) so it gets reimbursed.
            </p>
          </div>
          <Button onClick={() => setIsAddOpen(true)}>
            <Plus className="h-4 w-4 mr-1" />
            Record Advance
          </Button>
        </div>

        <div className="grid gap-4 md:grid-cols-3 mb-6">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total Currently Owed</CardDescription>
              <CardTitle className="text-2xl text-amber-600">
                {formatGMD(summary.totalOwed)}
              </CardTitle>
            </CardHeader>
          </Card>
          <Card className="md:col-span-2">
            <CardHeader className="pb-2">
              <CardDescription>Owed By Person</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2 pt-0">
              {summary.owedByPerson.length === 0 ? (
                <span className="text-sm text-muted-foreground">
                  Nobody is currently owed money.
                </span>
              ) : (
                summary.owedByPerson.map((p: any) => (
                  <Badge
                    key={p.personName}
                    variant="outline"
                    className="text-sm border-amber-300 bg-amber-50 text-amber-800"
                  >
                    {p.personName}: {formatGMD(p.amountOwed)}
                  </Badge>
                ))
              )}
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2">
                <Wallet className="h-5 w-5" />
                Advances
              </CardTitle>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="OWED">Owed</SelectItem>
                  <SelectItem value="SETTLED">Settled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Person</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8">
                      Loading...
                    </TableCell>
                  </TableRow>
                ) : advances.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={7}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No advances recorded yet.
                    </TableCell>
                  </TableRow>
                ) : (
                  advances.map((advance: any) => (
                    <TableRow key={advance.id}>
                      <TableCell className="font-medium">
                        {advance.personName}
                      </TableCell>
                      <TableCell>{formatGMD(advance.amount)}</TableCell>
                      <TableCell>
                        <Badge variant="outline">
                          {CATEGORY_LABELS[advance.category] ||
                            advance.category}
                        </Badge>
                      </TableCell>
                      <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                        {advance.reason}
                        {advance.relatedOrder && (
                          <span className="ml-1 text-xs">
                            (Order #
                            {advance.relatedOrder.id.slice(-6).toUpperCase()})
                          </span>
                        )}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatDate(advance.incurredAt)}
                      </TableCell>
                      <TableCell>
                        {advance.status === "SETTLED" ? (
                          <Badge className="bg-emerald-50 text-emerald-700 border-emerald-300">
                            Settled
                          </Badge>
                        ) : (
                          <Badge className="bg-amber-50 text-amber-700 border-amber-300">
                            Owed
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          {advance.status === "OWED" && (
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                settleMutation.mutate(advance.id)
                              }
                              disabled={settleMutation.isPending}
                            >
                              <CheckCircle2 className="h-3.5 w-3.5 mr-1" />
                              Mark Settled
                            </Button>
                          )}
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (
                                confirm(
                                  "Delete this advance record? This cannot be undone.",
                                )
                              ) {
                                deleteMutation.mutate(advance.id);
                              }
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </Main>

      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Record a Staff Advance</DialogTitle>
            <DialogDescription>
              Log money someone fronted on TeranGO's behalf so it doesn't get
              forgotten.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Person's Name</Label>
              <Input
                value={form.personName}
                onChange={(e) =>
                  setForm((f) => ({ ...f, personName: e.target.value }))
                }
                placeholder="e.g. Musa Jallow"
              />
            </div>
            <div className="space-y-2">
              <Label>Amount (GMD)</Label>
              <Input
                type="number"
                value={form.amount}
                onChange={(e) =>
                  setForm((f) => ({ ...f, amount: e.target.value }))
                }
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select
                value={form.category}
                onValueChange={(value) =>
                  setForm((f) => ({ ...f, category: value }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="VENDOR_SETTLEMENT">
                    Vendor Settlement
                  </SelectItem>
                  <SelectItem value="STORE_PURCHASE">
                    Store Purchase
                  </SelectItem>
                  <SelectItem value="OTHER">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Reason</Label>
              <Textarea
                value={form.reason}
                onChange={(e) =>
                  setForm((f) => ({ ...f, reason: e.target.value }))
                }
                placeholder="e.g. Wave balance was low, paid vendor settlement directly for Order #123"
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? "Saving..." : "Save Advance"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

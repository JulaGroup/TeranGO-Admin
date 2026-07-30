import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { vendorApi } from "@/lib/api";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Clock, Plus, Pencil, Trash2, Moon } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_vendor/vendor/shifts")({
  component: VendorShiftsPage,
});

interface Shift {
  id: string;
  name: string;
  startTime: string; // "HH:MM"
  endTime: string;
  isActive: boolean;
}

interface CurrentShift {
  multiUserEnabled: boolean;
  shift: { id: string; name: string; startTime: string; endTime: string } | null;
  stats: { orders: number; sales: number };
}

// "HH:MM" 24h -> 12h display.
function to12h(hm: string): string {
  if (!hm) return "";
  const [h, m] = hm.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const dh = h === 0 ? 12 : h > 12 ? h - 12 : h;
  return `${dh}:${String(m).padStart(2, "0")} ${period}`;
}

function formatGMD(amount: number): string {
  return `D${(amount ?? 0).toLocaleString("en-US", {
    maximumFractionDigits: 0,
  })}`;
}

function VendorShiftsPage() {
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");

  const { data: shifts = [], isLoading } = useQuery<Shift[]>({
    queryKey: ["vendor-shifts"],
    queryFn: () => vendorApi.getShifts().then((r) => r.data.data ?? []),
  });

  const { data: current } = useQuery<CurrentShift | null>({
    queryKey: ["vendor-current-shift"],
    queryFn: () => vendorApi.getCurrentShift().then((r) => r.data.data ?? null),
    refetchInterval: 30_000, // keep the live tally fresh
  });

  const resetForm = () => {
    setEditingId(null);
    setName("");
    setStartTime("");
    setEndTime("");
  };

  const openAdd = () => {
    resetForm();
    setDialogOpen(true);
  };

  const openEdit = (shift: Shift) => {
    setEditingId(shift.id);
    setName(shift.name);
    setStartTime(shift.startTime);
    setEndTime(shift.endTime);
    setDialogOpen(true);
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      const payload = { name: name.trim(), startTime, endTime };
      return editingId
        ? vendorApi.updateShift(editingId, payload).then((r) => r.data)
        : vendorApi.createShift(payload).then((r) => r.data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-shifts"] });
      queryClient.invalidateQueries({ queryKey: ["vendor-current-shift"] });
      toast.success(editingId ? "Shift updated" : "Shift added");
      setDialogOpen(false);
      resetForm();
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message || "Failed to save shift"),
  });

  const removeMutation = useMutation({
    mutationFn: (shiftId: string) =>
      vendorApi.removeShift(shiftId).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-shifts"] });
      queryClient.invalidateQueries({ queryKey: ["vendor-current-shift"] });
      toast.success("Shift removed");
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message || "Failed to remove shift"),
  });

  const canSave =
    name.trim() && startTime && endTime && startTime !== endTime;

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Clock className="h-6 w-6" /> Shifts
          </h1>
          <p className="text-muted-foreground text-sm">
            Set the shift times your cashiers work. Each shift tracks its own
            orders and sales on the cashier's phone, resetting when the next
            shift starts.
          </p>
        </div>
        <Button onClick={openAdd}>
          <Plus className="mr-2 h-4 w-4" />
          Add shift
        </Button>
      </div>

      {/* Live current-shift tally */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Current shift</CardTitle>
          <CardDescription>
            Live tally for the shift running right now.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {current?.shift ? (
            <div className="flex flex-wrap items-center gap-6">
              <div>
                <p className="text-lg font-semibold">{current.shift.name}</p>
                <p className="text-muted-foreground text-sm">
                  {to12h(current.shift.startTime)} –{" "}
                  {to12h(current.shift.endTime)}
                </p>
              </div>
              <div className="ml-auto flex gap-8">
                <div className="text-center">
                  <p className="text-2xl font-bold text-orange-600">
                    {current.stats.orders}
                  </p>
                  <p className="text-muted-foreground text-xs">Orders</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-orange-600">
                    {formatGMD(current.stats.sales)}
                  </p>
                  <p className="text-muted-foreground text-xs">Sales</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="text-muted-foreground flex items-center gap-2 py-2 text-sm">
              <Moon className="h-4 w-4" />
              No active shift right now.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Shift schedule */}
      <Card>
        <CardHeader>
          <CardTitle>Shift schedule ({shifts.length})</CardTitle>
          <CardDescription>
            Overnight shifts (e.g. 4:00 PM – 12:00 AM) are supported.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground py-6 text-center text-sm">
              Loading…
            </p>
          ) : shifts.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">
              No shifts yet. Add one to start tracking each shift.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Starts</TableHead>
                  <TableHead>Ends</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {shifts.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell>{to12h(s.startTime)}</TableCell>
                    <TableCell>{to12h(s.endTime)}</TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openEdit(s)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => removeMutation.mutate(s.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Add / edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit shift" : "Add a shift"}
            </DialogTitle>
            <DialogDescription>
              Give the shift a name and its start and end time.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Shift name</Label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Morning"
                maxLength={40}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label>Starts</Label>
                <Input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Ends</Label>
                <Input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                />
              </div>
            </div>
            {startTime && endTime && startTime === endTime && (
              <p className="text-destructive text-xs">
                Start and end time can't be the same.
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!canSave || saveMutation.isPending}
            >
              {saveMutation.isPending
                ? "Saving…"
                : editingId
                  ? "Save changes"
                  : "Add shift"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

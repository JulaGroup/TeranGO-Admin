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
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus, Trash2, Users, ShieldCheck, ShoppingBag } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_vendor/vendor/staff")({
  component: VendorStaffPage,
});

const MAX_STAFF = 3;
const MAX_ADMINS = 2;

interface StaffMember {
  id: string;
  role: "VENDOR_ADMIN" | "CASHIER";
  user: { id: string; fullName: string | null; phone: string | null };
}

function VendorStaffPage() {
  const queryClient = useQueryClient();
  const [addOpen, setAddOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<"VENDOR_ADMIN" | "CASHIER">("CASHIER");

  const { data: staff = [], isLoading } = useQuery<StaffMember[]>({
    queryKey: ["vendor-staff"],
    queryFn: () => vendorApi.getStaff().then((r) => r.data.data ?? []),
  });

  const adminCount = staff.filter((s) => s.role === "VENDOR_ADMIN").length;
  const atStaffLimit = staff.length >= MAX_STAFF;

  const resetForm = () => {
    setFullName("");
    setPhone("");
    setRole("CASHIER");
  };

  const addMutation = useMutation({
    mutationFn: () =>
      vendorApi.addStaff({ fullName, phone, role }).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-staff"] });
      toast.success("Staff member added");
      setAddOpen(false);
      resetForm();
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message || "Failed to add staff"),
  });

  const roleMutation = useMutation({
    mutationFn: ({ staffId, role }: { staffId: string; role: string }) =>
      vendorApi.updateStaffRole(staffId, role).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-staff"] });
      toast.success("Role updated");
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message || "Failed to update role"),
  });

  const removeMutation = useMutation({
    mutationFn: (staffId: string) =>
      vendorApi.removeStaff(staffId).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["vendor-staff"] });
      toast.success("Staff member removed");
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.message || "Failed to remove staff"),
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold">
            <Users className="h-6 w-6" /> Staff
          </h1>
          <p className="text-muted-foreground text-sm">
            Up to {MAX_STAFF} users, {MAX_ADMINS} admins max. Admins see the full
            dashboard; cashiers only manage orders on the phone app.
          </p>
        </div>

        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button disabled={atStaffLimit}>
              <UserPlus className="mr-2 h-4 w-4" />
              Add staff
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add a staff member</DialogTitle>
              <DialogDescription>
                They log in on the TeranGO phone app with this number.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-1.5">
                <Label>Full name</Label>
                <Input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="e.g. Awa Jallow"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Phone number</Label>
                <Input
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. 3448798"
                  inputMode="tel"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select
                  value={role}
                  onValueChange={(v) => setRole(v as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="CASHIER">
                      Cashier — order management only
                    </SelectItem>
                    <SelectItem
                      value="VENDOR_ADMIN"
                      disabled={adminCount >= MAX_ADMINS}
                    >
                      Admin — full access {adminCount >= MAX_ADMINS ? "(limit reached)" : ""}
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAddOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={() => addMutation.mutate()}
                disabled={!phone.trim() || addMutation.isPending}
              >
                {addMutation.isPending ? "Adding…" : "Add staff"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Team ({staff.length}/{MAX_STAFF})</CardTitle>
          <CardDescription>
            {adminCount}/{MAX_ADMINS} admins in use.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground py-6 text-center text-sm">
              Loading…
            </p>
          ) : staff.length === 0 ? (
            <p className="text-muted-foreground py-6 text-center text-sm">
              No staff yet. Add your first team member.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {staff.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">
                      {m.user.fullName || "—"}
                    </TableCell>
                    <TableCell>{m.user.phone || "—"}</TableCell>
                    <TableCell>
                      {m.role === "VENDOR_ADMIN" ? (
                        <Badge className="gap-1 bg-emerald-500 hover:bg-emerald-600">
                          <ShieldCheck className="h-3 w-3" /> Admin
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="gap-1">
                          <ShoppingBag className="h-3 w-3" /> Cashier
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-2">
                        <Select
                          value={m.role}
                          onValueChange={(v) =>
                            roleMutation.mutate({ staffId: m.id, role: v })
                          }
                        >
                          <SelectTrigger className="h-8 w-[130px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CASHIER">Cashier</SelectItem>
                            <SelectItem
                              value="VENDOR_ADMIN"
                              disabled={
                                m.role !== "VENDOR_ADMIN" &&
                                adminCount >= MAX_ADMINS
                              }
                            >
                              Admin
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="text-destructive"
                          onClick={() => removeMutation.mutate(m.id)}
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
    </div>
  );
}

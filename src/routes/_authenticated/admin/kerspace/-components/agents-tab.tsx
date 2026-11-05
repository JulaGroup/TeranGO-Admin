// @ts-nocheck
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  UserPlus,
  Search,
  Phone,
  MapPin,
  Building2,
  CheckCircle,
  Loader2,
  ShieldCheck,
  ShieldOff,
} from "lucide-react";
import { toast } from "sonner";
import { kerspaceApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";

export function AgentsTab() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState({
    fullName: "",
    phone: "",
    email: "",
    type: "INDIVIDUAL",
    companyName: "",
    licenseNo: "",
    city: "",
  });

  const { data, isLoading } = useQuery({
    queryKey: ["kerspace-agents"],
    queryFn: () => kerspaceApi.getAgents().then((r) => r.data),
  });
  const agents = data?.data || [];

  const createMutation = useMutation({
    mutationFn: () => kerspaceApi.createAgent(form),
    onSuccess: () => {
      toast.success("Agent onboarded");
      setCreateOpen(false);
      setForm({
        fullName: "",
        phone: "",
        email: "",
        type: "INDIVIDUAL",
        companyName: "",
        licenseNo: "",
        city: "",
      });
      qc.invalidateQueries({ queryKey: ["kerspace-agents"] });
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.error || "Failed to add agent"),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) =>
      kerspaceApi.updateAgentStatus(id, data),
    onSuccess: () => {
      toast.success("Agent updated");
      qc.invalidateQueries({ queryKey: ["kerspace-agents"] });
    },
    onError: () => toast.error("Failed to update agent"),
  });

  const filtered = agents.filter((a: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      a.companyName?.toLowerCase().includes(q) ||
      a.user?.fullName?.toLowerCase().includes(q) ||
      a.phone?.toLowerCase().includes(q) ||
      a.city?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search agents…"
            className="pl-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <UserPlus className="h-4 w-4 mr-1" /> Add agent
        </Button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6 space-y-2">
                <Skeleton className="h-5 w-2/3" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <Building2 className="h-10 w-10 text-muted-foreground opacity-50 mb-3" />
          <p className="font-medium">No agents yet</p>
          <p className="text-sm text-muted-foreground mt-1">
            Add an agent directly, or approve an application.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((a: any) => (
            <Card key={a.id} className={!a.isActive ? "opacity-60" : ""}>
              <CardContent className="pt-6 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">
                      {a.companyName || a.user?.fullName || "Agent"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {a.type === "COMPANY" ? "Company" : "Individual"}
                      {a.user?.fullName && a.companyName
                        ? ` · ${a.user.fullName}`
                        : ""}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {a.isVerified && (
                      <Badge className="bg-primary/10 text-primary border-0">
                        <CheckCircle className="h-3 w-3 mr-1" /> Verified
                      </Badge>
                    )}
                    <Badge variant={a.isActive ? "secondary" : "destructive"}>
                      {a.isActive ? "Active" : "Suspended"}
                    </Badge>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground space-y-1">
                  <p className="flex items-center gap-1">
                    <Phone className="h-3 w-3" /> {a.phone}
                  </p>
                  {a.city && (
                    <p className="flex items-center gap-1">
                      <MapPin className="h-3 w-3" /> {a.city}
                    </p>
                  )}
                  <p className="flex items-center gap-1">
                    <Building2 className="h-3 w-3" /> {a._count?.properties ?? 0}{" "}
                    listings
                  </p>
                </div>
                <div className="flex gap-2 pt-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 h-8 text-xs"
                    onClick={() =>
                      statusMutation.mutate({
                        id: a.id,
                        data: { isActive: !a.isActive },
                      })
                    }
                  >
                    {a.isActive ? (
                      <>
                        <ShieldOff className="h-3.5 w-3.5 mr-1" /> Suspend
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="h-3.5 w-3.5 mr-1" /> Reactivate
                      </>
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs"
                    onClick={() =>
                      statusMutation.mutate({
                        id: a.id,
                        data: { isVerified: !a.isVerified },
                      })
                    }
                  >
                    {a.isVerified ? "Unverify" : "Verify"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Add agent dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Onboard an agent</DialogTitle>
            <DialogDescription>
              Creates (or links) the account by phone and gives them agent
              access. They log in with their phone number via OTP.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Full name *</Label>
                <Input
                  value={form.fullName}
                  onChange={(e) =>
                    setForm({ ...form, fullName: e.target.value })
                  }
                />
              </div>
              <div>
                <Label>Phone *</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="3xxxxxx"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Type</Label>
                <Select
                  value={form.type}
                  onValueChange={(v) => setForm({ ...form, type: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INDIVIDUAL">Individual</SelectItem>
                    <SelectItem value="COMPANY">Company</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>City</Label>
                <Input
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                />
              </div>
            </div>
            {form.type === "COMPANY" && (
              <div>
                <Label>Company name</Label>
                <Input
                  value={form.companyName}
                  onChange={(e) =>
                    setForm({ ...form, companyName: e.target.value })
                  }
                />
              </div>
            )}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Email</Label>
                <Input
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                />
              </div>
              <div>
                <Label>License no.</Label>
                <Input
                  value={form.licenseNo}
                  onChange={(e) =>
                    setForm({ ...form, licenseNo: e.target.value })
                  }
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => createMutation.mutate()}
              disabled={
                !form.fullName || !form.phone || createMutation.isPending
              }
            >
              {createMutation.isPending && (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              )}
              Add agent
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

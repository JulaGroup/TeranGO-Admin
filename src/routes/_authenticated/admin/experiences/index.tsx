// @ts-nocheck
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Star,
  Calendar,
  Clock,
  X,
  Loader2,
  CheckCircle2,
  Ban,
  Ticket,
} from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "@/lib/api";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { ProfileDropdown } from "@/components/profile-dropdown";
import { ThemeSwitch } from "@/components/theme-switch";

export const Route = createFileRoute("/_authenticated/admin/experiences/")({
  component: ExperiencesPage,
});

const emptyForm = () => ({
  name: "",
  vendorId: "",
  description: "",
  address: "",
  city: "",
  phone: "",
  imageUrl: "",
  totalUnits: 1,
  unitLabel: "kart",
  slotMinutes: 5,
  openTime: "09:00",
  closeTime: "22:00",
  options: [{ label: "", durationMins: 5, price: 0 }],
});

const DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
];

function buildOpenHours(openTime: string, closeTime: string) {
  const hours: Record<string, unknown> = {};
  for (const d of DAYS) hours[d] = { open: openTime, close: closeTime, closed: false };
  return hours;
}

function ExperiencesPage() {
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [bookingsFor, setBookingsFor] = useState<any | null>(null);

  const { data: experiences = [], isLoading, refetch } = useQuery({
    queryKey: ["admin-experiences"],
    queryFn: async () => (await adminApi.getExperiences()).data,
  });

  const { data: vendors = [] } = useQuery({
    queryKey: ["admin-vendors-for-experiences"],
    queryFn: async () => {
      const res = await adminApi.getVendors();
      return res.data?.vendors || res.data?.data || res.data || [];
    },
  });

  const { data: bookings = [], isLoading: bookingsLoading } = useQuery({
    queryKey: ["admin-experience-bookings", bookingsFor?.id],
    queryFn: async () =>
      (await adminApi.getExperienceBookings(bookingsFor.id)).data,
    enabled: !!bookingsFor,
  });

  const saveMutation = useMutation({
    mutationFn: async () => {
      const payload = {
        name: form.name,
        vendorId: form.vendorId,
        description: form.description,
        address: form.address,
        city: form.city,
        phone: form.phone,
        imageUrl: form.imageUrl,
        totalUnits: Number(form.totalUnits),
        unitLabel: form.unitLabel,
        slotMinutes: Number(form.slotMinutes),
        openHours: buildOpenHours(form.openTime, form.closeTime),
      };
      if (editingId) {
        return adminApi.updateExperience(editingId, payload);
      }
      return adminApi.createExperience({
        ...payload,
        options: form.options
          .filter((o) => o.label && Number(o.price) > 0)
          .map((o, i) => ({
            label: o.label,
            durationMins: Number(o.durationMins),
            price: Number(o.price),
            sortOrder: i,
          })),
      });
    },
    onSuccess: () => {
      toast.success(editingId ? "Experience updated" : "Experience created");
      queryClient.invalidateQueries({ queryKey: ["admin-experiences"] });
      setIsFormOpen(false);
      setEditingId(null);
      setForm(emptyForm());
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.error || "Failed to save experience"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => adminApi.deleteExperience(id),
    onSuccess: () => {
      toast.success("Experience archived");
      queryClient.invalidateQueries({ queryKey: ["admin-experiences"] });
      setDeleteId(null);
    },
    onError: () => toast.error("Failed to archive experience"),
  });

  const addOptionMutation = useMutation({
    mutationFn: ({ id, data }: any) => adminApi.addExperienceOption(id, data),
    onSuccess: () => {
      toast.success("Option added");
      queryClient.invalidateQueries({ queryKey: ["admin-experiences"] });
    },
    onError: () => toast.error("Failed to add option"),
  });

  const deleteOptionMutation = useMutation({
    mutationFn: ({ id, optionId }: any) =>
      adminApi.deleteExperienceOption(id, optionId),
    onSuccess: () => {
      toast.success("Option removed");
      queryClient.invalidateQueries({ queryKey: ["admin-experiences"] });
    },
    onError: () => toast.error("Failed to remove option"),
  });

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setIsFormOpen(true);
  };

  const openEdit = (exp: any) => {
    const anyDay = (exp.openHours || {})["monday"] || {};
    setEditingId(exp.id);
    setForm({
      name: exp.name || "",
      vendorId: exp.vendorId || "",
      description: exp.description || "",
      address: exp.address || "",
      city: exp.city || "",
      phone: exp.phone || "",
      imageUrl: exp.imageUrl || "",
      totalUnits: exp.totalUnits || 1,
      unitLabel: exp.unitLabel || "spot",
      slotMinutes: exp.slotMinutes || 5,
      openTime: anyDay.open || "09:00",
      closeTime: anyDay.close || "22:00",
      options: exp.options?.length
        ? exp.options.map((o: any) => ({
            label: o.label,
            durationMins: o.durationMins,
            price: o.price,
          }))
        : [{ label: "", durationMins: 5, price: 0 }],
    });
    setIsFormOpen(true);
  };

  const vendorName = (v: any) =>
    v?.user?.fullName || v?.shopName || v?.name || v?.id?.slice(-6) || "Vendor";

  const totalBookings = experiences.reduce(
    (s: number, e: any) => s + (e._count?.bookings || 0),
    0,
  );

  return (
    <>
      <Header>
        <div className="ms-auto flex items-center gap-2">
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2">
                <Star className="h-6 w-6 text-amber-500" /> Experiences
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                Bookable activities — go-karting, tours, events. Customers book
                slots and prepay for an e-receipt.
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                <RefreshCw
                  className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`}
                />
                Refresh
              </Button>
              <Button size="sm" onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" /> New Experience
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid gap-4 sm:grid-cols-3">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  Experiences
                </CardTitle>
                <Star className="h-4 w-4 text-amber-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{experiences.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  Active
                </CardTitle>
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {experiences.filter((e: any) => e.isActive).length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm text-muted-foreground">
                  Total Bookings
                </CardTitle>
                <Ticket className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalBookings}</div>
              </CardContent>
            </Card>
          </div>

          {/* List */}
          {isLoading ? (
            <div className="flex justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : experiences.length === 0 ? (
            <Card>
              <CardContent className="py-16 text-center text-muted-foreground">
                <Star className="h-10 w-10 mx-auto mb-3 opacity-40" />
                No experiences yet. Create your first one (e.g. Turbo Tracks).
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2">
              {experiences.map((exp: any) => (
                <Card key={exp.id} className={!exp.isActive ? "opacity-60" : ""}>
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <CardTitle className="text-lg flex items-center gap-2">
                          {exp.name}
                          {exp.isActive ? (
                            <Badge variant="secondary" className="text-emerald-600">
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="outline">Archived</Badge>
                          )}
                        </CardTitle>
                        <p className="text-xs text-muted-foreground mt-1">
                          {vendorName(exp.vendor)} · {exp.totalUnits}{" "}
                          {exp.unitLabel}
                          {exp.totalUnits === 1 ? "" : "s"} · {exp.slotMinutes}
                          -min grid
                        </p>
                      </div>
                      <div className="flex gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openEdit(exp)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setDeleteId(exp.id)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {/* Options */}
                    <div>
                      <p className="text-xs font-medium text-muted-foreground uppercase mb-1">
                        Options
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {exp.options?.filter((o: any) => o.isActive).length ? (
                          exp.options
                            .filter((o: any) => o.isActive)
                            .map((o: any) => (
                              <span
                                key={o.id}
                                className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs"
                              >
                                {o.label} · D{o.price}
                                <button
                                  onClick={() =>
                                    deleteOptionMutation.mutate({
                                      id: exp.id,
                                      optionId: o.id,
                                    })
                                  }
                                  className="ml-1 text-muted-foreground hover:text-destructive"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </span>
                            ))
                        ) : (
                          <span className="text-xs text-muted-foreground">
                            No options yet
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Ticket className="h-3.5 w-3.5" />
                        {exp._count?.bookings || 0} bookings
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setBookingsFor(exp)}
                      >
                        <Calendar className="mr-2 h-4 w-4" /> View bookings
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </Main>

      {/* Create / Edit dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Experience" : "New Experience"}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? "Update the venue details and capacity."
                : "Create a bookable activity under a vendor account."}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Turbo Tracks"
              />
            </div>

            <div className="space-y-2">
              <Label>Owner (vendor account)</Label>
              <Select
                value={form.vendorId}
                onValueChange={(v) => setForm({ ...form, vendorId: v })}
                disabled={!!editingId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select the vendor that owns this" />
                </SelectTrigger>
                <SelectContent>
                  {vendors.map((v: any) => (
                    <SelectItem key={v.id} value={v.id}>
                      {vendorName(v)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                This vendor sees bookings & earnings in their dashboard. Set once.
              </p>
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                rows={2}
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Address</Label>
                <Input
                  value={form.address}
                  onChange={(e) =>
                    setForm({ ...form, address: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>City</Label>
                <Input
                  value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Image URL</Label>
                <Input
                  value={form.imageUrl}
                  onChange={(e) =>
                    setForm({ ...form, imageUrl: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Total units</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.totalUnits}
                  onChange={(e) =>
                    setForm({ ...form, totalUnits: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Unit label</Label>
                <Input
                  value={form.unitLabel}
                  onChange={(e) =>
                    setForm({ ...form, unitLabel: e.target.value })
                  }
                  placeholder="kart"
                />
              </div>
              <div className="space-y-2">
                <Label>Slot grid (min)</Label>
                <Input
                  type="number"
                  min={1}
                  value={form.slotMinutes}
                  onChange={(e) =>
                    setForm({ ...form, slotMinutes: e.target.value })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" /> Opens
                </Label>
                <Input
                  type="time"
                  value={form.openTime}
                  onChange={(e) =>
                    setForm({ ...form, openTime: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-1">
                  <Clock className="h-3.5 w-3.5" /> Closes
                </Label>
                <Input
                  type="time"
                  value={form.closeTime}
                  onChange={(e) =>
                    setForm({ ...form, closeTime: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Options editor — only on create (edit manages options from the card) */}
            {!editingId && (
              <div className="space-y-2">
                <Label>Booking options (price per unit)</Label>
                {form.options.map((o, i) => (
                  <div key={i} className="flex gap-2 items-center">
                    <Input
                      className="flex-1"
                      placeholder="5 min / 6 laps"
                      value={o.label}
                      onChange={(e) => {
                        const next = [...form.options];
                        next[i] = { ...o, label: e.target.value };
                        setForm({ ...form, options: next });
                      }}
                    />
                    <Input
                      className="w-20"
                      type="number"
                      placeholder="min"
                      value={o.durationMins}
                      onChange={(e) => {
                        const next = [...form.options];
                        next[i] = { ...o, durationMins: e.target.value };
                        setForm({ ...form, options: next });
                      }}
                    />
                    <Input
                      className="w-24"
                      type="number"
                      placeholder="price"
                      value={o.price}
                      onChange={(e) => {
                        const next = [...form.options];
                        next[i] = { ...o, price: e.target.value };
                        setForm({ ...form, options: next });
                      }}
                    />
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={() =>
                        setForm({
                          ...form,
                          options: form.options.filter((_, j) => j !== i),
                        })
                      }
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() =>
                    setForm({
                      ...form,
                      options: [
                        ...form.options,
                        { label: "", durationMins: 5, price: 0 },
                      ],
                    })
                  }
                >
                  <Plus className="mr-2 h-4 w-4" /> Add option
                </Button>
              </div>
            )}

            {editingId && (
              <AddOptionInline
                onAdd={(data) =>
                  addOptionMutation.mutate({ id: editingId, data })
                }
                pending={addOptionMutation.isPending}
              />
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={
                !form.name || !form.vendorId || saveMutation.isPending
              }
            >
              {saveMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {editingId ? "Save changes" : "Create experience"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Bookings dialog */}
      <Dialog open={!!bookingsFor} onOpenChange={() => setBookingsFor(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bookings — {bookingsFor?.name}</DialogTitle>
          </DialogHeader>
          {bookingsLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : bookings.length === 0 ? (
            <p className="text-center text-muted-foreground py-10">
              No bookings yet.
            </p>
          ) : (
            <div className="space-y-2">
              {bookings.map((b: any) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between rounded-lg border p-3 text-sm"
                >
                  <div>
                    <p className="font-medium">
                      {b.userProfile?.user?.fullName || "Customer"} ·{" "}
                      {b.option?.label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(b.startTime).toLocaleString()} · x{b.quantity} ·
                      D{b.totalAmount}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={
                        b.paymentStatus === "PAID" ? "secondary" : "outline"
                      }
                      className={
                        b.paymentStatus === "PAID" ? "text-emerald-600" : ""
                      }
                    >
                      {b.paymentStatus}
                    </Badge>
                    <Badge variant="outline">{b.status}</Badge>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this experience?</AlertDialogTitle>
            <AlertDialogDescription>
              It will stop accepting bookings and be hidden from customers.
              Existing bookings and earnings stay intact.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteId && deleteMutation.mutate(deleteId)}
            >
              Archive
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}

function AddOptionInline({
  onAdd,
  pending,
}: {
  onAdd: (data: any) => void;
  pending: boolean;
}) {
  const [label, setLabel] = useState("");
  const [durationMins, setDurationMins] = useState(5);
  const [price, setPrice] = useState(0);
  return (
    <div className="space-y-2 rounded-lg border p-3">
      <Label className="text-xs">Add an option</Label>
      <div className="flex gap-2 items-center">
        <Input
          className="flex-1"
          placeholder="5 min / 6 laps"
          value={label}
          onChange={(e) => setLabel(e.target.value)}
        />
        <Input
          className="w-20"
          type="number"
          placeholder="min"
          value={durationMins}
          onChange={(e) => setDurationMins(e.target.value)}
        />
        <Input
          className="w-24"
          type="number"
          placeholder="price"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />
        <Button
          size="sm"
          disabled={!label || !price || pending}
          onClick={() => {
            onAdd({
              label,
              durationMins: Number(durationMins),
              price: Number(price),
            });
            setLabel("");
            setDurationMins(5);
            setPrice(0);
          }}
        >
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Add"}
        </Button>
      </div>
    </div>
  );
}

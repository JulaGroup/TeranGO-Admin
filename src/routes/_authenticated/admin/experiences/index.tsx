// @ts-nocheck
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  Calendar,
  Clock,
  X,
  Loader2,
  CheckCircle2,
  Ban,
  Ticket,
  Upload,
  Image as ImageIcon,
  Search,
  MoreHorizontal,
  Eye,
  MapPin,
  Phone,
  Users,
  Sparkles,
  ToggleLeft,
  ToggleRight,
  Copy,
  Tag,
  Timer,
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { ProfileDropdown } from "@/components/profile-dropdown";
import { ThemeSwitch } from "@/components/theme-switch";
import { cn } from "@/lib/utils";

const CLOUDINARY_CLOUD_NAME = "dkpi5ij2t";
const CLOUDINARY_UPLOAD_PRESET = "unsigned_preset";

// Curated experience categories (keep in sync with the app's list in
// terango/constants/experienceCategories.ts).
const EXPERIENCE_CATEGORIES = [
  "Activities",
  "Tours",
  "Beach & Water",
  "Sports",
  "Wellness",
  "Arts & Culture",
  "Events",
];

const topNav = [
  { title: "Overview", href: "/admin", isActive: false },
  { title: "Restaurants", href: "/admin/restaurants", isActive: false },
  { title: "Shops", href: "/admin/shops", isActive: false },
  { title: "Experiences", href: "/admin/experiences", isActive: true },
];

export const Route = createFileRoute("/_authenticated/admin/experiences/")({
  component: ExperiencesPage,
});

// ── Opening hours (per day, same shape the availability service reads) ────────
interface DayHours {
  key: string;
  day: string;
  closed: boolean;
  open: string;
  close: string;
}

const WEEK_DAYS: { key: string; day: string; short: string }[] = [
  { key: "monday", day: "Monday", short: "Mon" },
  { key: "tuesday", day: "Tuesday", short: "Tue" },
  { key: "wednesday", day: "Wednesday", short: "Wed" },
  { key: "thursday", day: "Thursday", short: "Thu" },
  { key: "friday", day: "Friday", short: "Fri" },
  { key: "saturday", day: "Saturday", short: "Sat" },
  { key: "sunday", day: "Sunday", short: "Sun" },
];

const DEFAULT_HOURS: DayHours[] = WEEK_DAYS.map(({ key, day }) => ({
  key,
  day,
  closed: false,
  open: "09:00",
  close: "22:00",
}));

function hoursFromRaw(raw: any): DayHours[] {
  if (!raw || typeof raw !== "object")
    return DEFAULT_HOURS.map((d) => ({ ...d }));
  return WEEK_DAYS.map(({ key, day }) => {
    const v = raw[key];
    if (!v) return { key, day, closed: true, open: "09:00", close: "22:00" };
    return {
      key,
      day,
      closed: !!(v.closed ?? !(v.isOpen ?? true)),
      open: v.open ?? "09:00",
      close: v.close ?? "22:00",
    };
  });
}

function hoursToRaw(hours: DayHours[]): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  hours.forEach(({ key, closed, open, close }) => {
    result[key] = { open, close, closed };
  });
  return result;
}

/** Human summary like "Mon–Fri 09:00–22:00 · Sat 10:00–23:00 · Sun closed" */
function summarizeHours(raw: any): string {
  const hours = hoursFromRaw(raw);
  const parts: string[] = [];
  let i = 0;
  while (i < hours.length) {
    const cur = hours[i];
    let j = i;
    while (
      j + 1 < hours.length &&
      hours[j + 1].closed === cur.closed &&
      hours[j + 1].open === cur.open &&
      hours[j + 1].close === cur.close
    )
      j++;
    const label =
      i === j
        ? WEEK_DAYS[i].short
        : `${WEEK_DAYS[i].short}–${WEEK_DAYS[j].short}`;
    parts.push(cur.closed ? `${label} closed` : `${label} ${cur.open}–${cur.close}`);
    i = j + 1;
  }
  return parts.join(" · ");
}

const emptyForm = () => ({
  name: "",
  vendorId: "",
  category: "",
  description: "",
  address: "",
  city: "",
  phone: "",
  imageUrl: "",
  totalUnits: 1,
  unitLabel: "kart",
  slotMinutes: 5,
  options: [{ label: "", durationMins: 5, price: 0 }],
});

function ExperiencesPage() {
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [hours, setHours] = useState<DayHours[]>(
    DEFAULT_HOURS.map((d) => ({ ...d })),
  );
  const [formTab, setFormTab] = useState("basics");
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [bookingsFor, setBookingsFor] = useState<any | null>(null);
  const [detailsFor, setDetailsFor] = useState<any | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState<
    "all" | "active" | "archived"
  >("all");

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    setIsUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: "POST", body: fd },
      );
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      if (data.secure_url) {
        setForm((prev) => ({ ...prev, imageUrl: data.secure_url }));
        toast.success("Image uploaded");
      }
    } catch {
      toast.error("Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  };

  const {
    data: experiences = [],
    isLoading,
    refetch,
  } = useQuery({
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
        category: form.category,
        description: form.description,
        address: form.address,
        city: form.city,
        phone: form.phone,
        imageUrl: form.imageUrl,
        totalUnits: Number(form.totalUnits),
        unitLabel: form.unitLabel,
        slotMinutes: Number(form.slotMinutes),
        openHours: hoursToRaw(hours),
      };
      if (editingId) return adminApi.updateExperience(editingId, payload);
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

  const toggleMutation = useMutation({
    mutationFn: ({ id, data }: any) => adminApi.updateExperience(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-experiences"] });
      toast.success("Updated");
    },
    onError: () => toast.error("Failed to update"),
  });

  const addOptionMutation = useMutation({
    mutationFn: ({ id, data }: any) => adminApi.addExperienceOption(id, data),
    onSuccess: () => {
      toast.success("Package added");
      queryClient.invalidateQueries({ queryKey: ["admin-experiences"] });
    },
    onError: () => toast.error("Failed to add package"),
  });

  const deleteOptionMutation = useMutation({
    mutationFn: ({ id, optionId }: any) =>
      adminApi.deleteExperienceOption(id, optionId),
    onSuccess: () => {
      toast.success("Package removed");
      queryClient.invalidateQueries({ queryKey: ["admin-experiences"] });
    },
    onError: () => toast.error("Failed to remove package"),
  });

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm());
    setHours(DEFAULT_HOURS.map((d) => ({ ...d })));
    setFormTab("basics");
    setIsFormOpen(true);
  };

  const openEdit = (exp: any) => {
    setEditingId(exp.id);
    setForm({
      name: exp.name || "",
      vendorId: exp.vendorId || "",
      category: exp.category || "",
      description: exp.description || "",
      address: exp.address || "",
      city: exp.city || "",
      phone: exp.phone || "",
      imageUrl: exp.imageUrl || "",
      totalUnits: exp.totalUnits || 1,
      unitLabel: exp.unitLabel || "spot",
      slotMinutes: exp.slotMinutes || 5,
      options: exp.options?.length
        ? exp.options.map((o: any) => ({
            label: o.label,
            durationMins: o.durationMins,
            price: o.price,
          }))
        : [{ label: "", durationMins: 5, price: 0 }],
    });
    setHours(hoursFromRaw(exp.openHours));
    setFormTab("basics");
    setIsFormOpen(true);
  };

  const vendorName = (v: any) =>
    v?.user?.fullName || v?.shopName || v?.name || v?.id?.slice(-6) || "Vendor";

  const filtered = experiences.filter((e: any) => {
    const q = search.trim().toLowerCase();
    const matchSearch =
      !q ||
      e.name?.toLowerCase().includes(q) ||
      e.category?.toLowerCase().includes(q) ||
      e.city?.toLowerCase().includes(q) ||
      vendorName(e.vendor).toLowerCase().includes(q);
    const matchStatus =
      filterStatus === "all" ||
      (filterStatus === "active" && e.isActive) ||
      (filterStatus === "archived" && !e.isActive);
    return matchSearch && matchStatus;
  });

  const totalBookings = experiences.reduce(
    (s: number, e: any) => s + (e._count?.bookings || 0),
    0,
  );
  const totalCapacity = experiences.reduce(
    (s: number, e: any) => s + (e.totalUnits || 0),
    0,
  );

  // Hours helpers
  const setDay = (index: number, patch: Partial<DayHours>) =>
    setHours((prev) => prev.map((d, i) => (i === index ? { ...d, ...patch } : d)));
  const copyFirstToAll = () => {
    const first = hours[0];
    setHours((prev) =>
      prev.map((d) => ({
        ...d,
        closed: first.closed,
        open: first.open,
        close: first.close,
      })),
    );
    toast.success("Monday's hours copied to every day");
  };

  return (
    <>
      <Header>
        <TopNav links={topNav} />
        <div className="ms-auto flex items-center gap-4">
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className="space-y-6">
          {/* Page header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Experiences</h1>
              <p className="text-muted-foreground text-sm mt-1">
                Bookable activities — karting, tours, events. Customers reserve a
                slot, prepay, and get an e-receipt.
              </p>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="shadow-sm"
                onClick={() => refetch()}
              >
                <RefreshCw
                  className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")}
                />
                Refresh
              </Button>
              <Button size="sm" className="shadow-sm" onClick={openCreate}>
                <Plus className="mr-2 h-4 w-4" /> New Experience
              </Button>
            </div>
          </div>

          {/* Stats */}
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <StatCard
              title="Total"
              value={experiences.length}
              icon={Sparkles}
              iconColor="text-primary"
              borderColor="border-l-primary"
            />
            <StatCard
              title="Active"
              value={experiences.filter((e: any) => e.isActive).length}
              icon={CheckCircle2}
              iconColor="text-emerald-500"
              borderColor="border-l-emerald-500"
            />
            <StatCard
              title="Total Bookings"
              value={totalBookings}
              icon={Ticket}
              iconColor="text-blue-500"
              borderColor="border-l-blue-500"
            />
            <StatCard
              title="Total Capacity"
              value={totalCapacity}
              icon={Users}
              iconColor="text-orange-500"
              borderColor="border-l-orange-500"
            />
          </div>

          {/* Filter + grid */}
          <Card className="shadow-sm overflow-hidden">
            <CardHeader className="border-b pb-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    className="pl-9 h-9 w-[280px]"
                    placeholder="Search by name, category, city, or vendor..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  {(["all", "active", "archived"] as const).map((s) => (
                    <Button
                      key={s}
                      size="sm"
                      variant={filterStatus === s ? "default" : "outline"}
                      onClick={() => setFilterStatus(s)}
                      className="capitalize"
                    >
                      {s}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4">
              {isLoading ? (
                <div className="flex h-48 items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <Sparkles className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                  <p className="text-lg font-medium">No experiences found</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {experiences.length === 0
                      ? "Create your first one (e.g. Turbo Tracks)."
                      : "Try adjusting your search or filter."}
                  </p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
                  {filtered.map((exp: any) => (
                    <ExperienceCard
                      key={exp.id}
                      exp={exp}
                      vendorName={vendorName}
                      onEdit={openEdit}
                      onView={setDetailsFor}
                      onBookings={setBookingsFor}
                      onDelete={setDeleteId}
                      onToggleActive={(id, isActive) =>
                        toggleMutation.mutate({ id, data: { isActive } })
                      }
                      onToggleBookings={(id, acceptsBookings) =>
                        toggleMutation.mutate({ id, data: { acceptsBookings } })
                      }
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </Main>

      {/* ── Details dialog ───────────────────────────────────────────────── */}
      {detailsFor && (
        <Dialog open={!!detailsFor} onOpenChange={() => setDetailsFor(null)}>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{detailsFor.name}</DialogTitle>
              <DialogDescription>Experience details</DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              {detailsFor.imageUrl ? (
                <img
                  src={detailsFor.imageUrl}
                  alt={detailsFor.name}
                  className="h-40 w-full rounded-lg object-cover"
                />
              ) : (
                <div className="flex h-40 w-full items-center justify-center rounded-lg bg-muted">
                  <Sparkles className="h-10 w-10 text-muted-foreground/40" />
                </div>
              )}

              <div className="flex flex-wrap gap-2">
                <Badge
                  className={
                    detailsFor.isActive
                      ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm"
                      : undefined
                  }
                  variant={detailsFor.isActive ? undefined : "secondary"}
                >
                  {detailsFor.isActive ? "Active" : "Archived"}
                </Badge>
                {detailsFor.category && (
                  <Badge variant="outline">{detailsFor.category}</Badge>
                )}
                {detailsFor.acceptsBookings === false && (
                  <Badge variant="outline" className="text-amber-600">
                    Bookings paused
                  </Badge>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 text-sm">
                <InfoRow
                  icon={MapPin}
                  label="Address"
                  value={
                    [detailsFor.address, detailsFor.city]
                      .filter(Boolean)
                      .join(", ") || "—"
                  }
                />
                <InfoRow
                  icon={Phone}
                  label="Phone"
                  value={detailsFor.phone || "—"}
                />
                <InfoRow
                  icon={Users}
                  label="Capacity"
                  value={`${detailsFor.totalUnits} ${detailsFor.unitLabel}${
                    detailsFor.totalUnits === 1 ? "" : "s"
                  }`}
                />
                <InfoRow
                  icon={Timer}
                  label="Slot grid"
                  value={`${detailsFor.slotMinutes} min`}
                />
                <InfoRow
                  icon={Ticket}
                  label="Bookings"
                  value={String(detailsFor._count?.bookings ?? 0)}
                />
                <InfoRow
                  icon={Users}
                  label="Vendor"
                  value={vendorName(detailsFor.vendor)}
                />
              </div>

              {detailsFor.description && (
                <p className="text-sm text-muted-foreground">
                  {detailsFor.description}
                </p>
              )}

              {/* Hours */}
              <div className="rounded-lg border p-3">
                <p className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <Clock className="h-4 w-4" /> Opening hours
                </p>
                <div className="space-y-1">
                  {hoursFromRaw(detailsFor.openHours).map((d) => (
                    <div
                      key={d.key}
                      className="flex items-center justify-between text-sm"
                    >
                      <span className="text-muted-foreground">{d.day}</span>
                      <span
                        className={cn(
                          "font-medium",
                          d.closed && "text-muted-foreground",
                        )}
                      >
                        {d.closed ? "Closed" : `${d.open} – ${d.close}`}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Packages */}
              <div className="rounded-lg border p-3">
                <p className="mb-2 flex items-center gap-2 text-sm font-medium">
                  <Tag className="h-4 w-4" /> Packages
                </p>
                {detailsFor.options?.filter((o: any) => o.isActive).length ? (
                  <div className="space-y-1">
                    {detailsFor.options
                      .filter((o: any) => o.isActive)
                      .map((o: any) => (
                        <div
                          key={o.id}
                          className="flex items-center justify-between text-sm"
                        >
                          <span className="text-muted-foreground">
                            {o.label}{" "}
                            <span className="text-xs">({o.durationMins} min)</span>
                          </span>
                          <span className="font-medium">D{o.price}</span>
                        </div>
                      ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No packages yet</p>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDetailsFor(null)}>
                Close
              </Button>
              <Button
                onClick={() => {
                  const e = detailsFor;
                  setDetailsFor(null);
                  openEdit(e);
                }}
              >
                <Edit className="mr-2 h-4 w-4" /> Edit
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* ── Create / Edit dialog ─────────────────────────────────────────── */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingId ? "Edit Experience" : "New Experience"}
            </DialogTitle>
            <DialogDescription>
              {editingId
                ? `Update ${form.name || "this experience"} — details, capacity, hours and packages.`
                : "Create a bookable activity under a vendor account."}
            </DialogDescription>
          </DialogHeader>

          <Tabs value={formTab} onValueChange={setFormTab} className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="basics">Details</TabsTrigger>
              <TabsTrigger value="hours">Capacity & Hours</TabsTrigger>
              <TabsTrigger value="packages">Packages</TabsTrigger>
            </TabsList>

            {/* ---- Details ---- */}
            <TabsContent value="basics" className="space-y-5 py-4">
              {/* Image */}
              <div className="space-y-2">
                <Label>Cover image</Label>
                <div
                  className="relative flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 transition-colors hover:border-muted-foreground/40"
                  onClick={() => document.getElementById("exp-img-input")?.click()}
                >
                  {form.imageUrl ? (
                    <img
                      src={form.imageUrl}
                      className="h-32 w-full rounded-lg object-cover"
                    />
                  ) : isUploading ? (
                    <>
                      <Loader2 className="mb-2 h-8 w-8 animate-spin text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Uploading…
                      </span>
                    </>
                  ) : (
                    <>
                      <Upload className="mb-2 h-8 w-8 text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">
                        Click to upload a cover photo
                      </span>
                      <span className="text-xs text-muted-foreground/70 mt-1">
                        Shown on the browse & detail screens. Max 5MB.
                      </span>
                    </>
                  )}
                  {form.imageUrl && (
                    <button
                      type="button"
                      className="absolute right-2 top-2 rounded-full bg-destructive p-1 text-destructive-foreground"
                      onClick={(e) => {
                        e.stopPropagation();
                        setForm((f) => ({ ...f, imageUrl: "" }));
                      }}
                    >
                      <X className="h-3 w-3" />
                    </button>
                  )}
                </div>
                <input
                  id="exp-img-input"
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageUpload}
                  disabled={isUploading}
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1">
                  <Label>Name *</Label>
                  <Input
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="Turbo Tracks"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Category</Label>
                  <Select
                    value={form.category}
                    onValueChange={(v) => setForm({ ...form, category: v })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {EXPERIENCE_CATEGORIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label>Owner (vendor account) *</Label>
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
                    This vendor sees bookings & earnings in their dashboard. Set
                    once — it can't be changed later.
                  </p>
                </div>
                <div className="space-y-1">
                  <Label>Phone</Label>
                  <Input
                    value={form.phone}
                    placeholder="+220..."
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>City</Label>
                  <Input
                    value={form.city}
                    placeholder="e.g. Serrekunda"
                    onChange={(e) => setForm({ ...form, city: e.target.value })}
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label>Address</Label>
                  <Input
                    value={form.address}
                    onChange={(e) =>
                      setForm({ ...form, address: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-1 sm:col-span-2">
                  <Label>Description</Label>
                  <Textarea
                    rows={3}
                    placeholder="What is this experience? Shown under 'About' in the app."
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                  />
                </div>
              </div>
            </TabsContent>

            {/* ---- Capacity & Hours ---- */}
            <TabsContent value="hours" className="space-y-5 py-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="space-y-1">
                  <Label>Total units</Label>
                  <Input
                    type="number"
                    min={1}
                    value={form.totalUnits}
                    onChange={(e) =>
                      setForm({ ...form, totalUnits: e.target.value })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    How many can run at once
                  </p>
                </div>
                <div className="space-y-1">
                  <Label>Unit label</Label>
                  <Input
                    value={form.unitLabel}
                    placeholder="kart"
                    onChange={(e) =>
                      setForm({ ...form, unitLabel: e.target.value })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    e.g. kart, seat, board
                  </p>
                </div>
                <div className="space-y-1">
                  <Label>Slot grid (min)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={form.slotMinutes}
                    onChange={(e) =>
                      setForm({ ...form, slotMinutes: e.target.value })
                    }
                  />
                  <p className="text-xs text-muted-foreground">
                    Start times every N min
                  </p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="flex items-center gap-2 text-sm font-medium">
                    <Clock className="h-4 w-4" /> Opening hours
                  </Label>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={copyFirstToAll}
                  >
                    <Copy className="mr-2 h-3.5 w-3.5" /> Copy Mon to all
                  </Button>
                </div>
                <div className="space-y-2 rounded-lg border p-3">
                  {hours.map((d, index) => (
                    <div
                      key={d.key}
                      className={cn(
                        "flex items-center gap-3 rounded-md px-1 py-1.5",
                        d.closed && "opacity-60",
                      )}
                    >
                      <div className="w-24 shrink-0">
                        <span className="text-sm font-medium">{d.day}</span>
                      </div>
                      <Switch
                        checked={!d.closed}
                        onCheckedChange={(checked) =>
                          setDay(index, { closed: !checked })
                        }
                      />
                      {!d.closed ? (
                        <>
                          <input
                            type="time"
                            value={d.open}
                            onChange={(e) =>
                              setDay(index, { open: e.target.value })
                            }
                            className="h-8 w-28 rounded-md border bg-background px-2 text-sm"
                          />
                          <span className="text-muted-foreground text-sm">to</span>
                          <input
                            type="time"
                            value={d.close}
                            onChange={(e) =>
                              setDay(index, { close: e.target.value })
                            }
                            className="h-8 w-28 rounded-md border bg-background px-2 text-sm"
                          />
                        </>
                      ) : (
                        <span className="text-sm text-muted-foreground">
                          Closed all day
                        </span>
                      )}
                    </div>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Customers only see time slots inside these windows. Days toggled
                  off show "No times available".
                </p>
              </div>
            </TabsContent>

            {/* ---- Packages ---- */}
            <TabsContent value="packages" className="space-y-4 py-4">
              {!editingId ? (
                <div className="space-y-3">
                  <div>
                    <Label>Booking packages</Label>
                    <p className="text-xs text-muted-foreground mt-1">
                      What a customer picks and pays for — e.g. "5 min / 6 laps".
                      Price is per {form.unitLabel || "unit"}.
                    </p>
                  </div>
                  {form.options.map((o, i) => (
                    <div
                      key={i}
                      className="grid gap-2 rounded-lg border p-3 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end"
                    >
                      <div className="space-y-1">
                        <Label className="text-xs">Label</Label>
                        <Input
                          placeholder="5 min / 6 laps"
                          value={o.label}
                          onChange={(e) => {
                            const next = [...form.options];
                            next[i] = { ...o, label: e.target.value };
                            setForm({ ...form, options: next });
                          }}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Minutes</Label>
                        <Input
                          className="w-24"
                          type="number"
                          value={o.durationMins}
                          onChange={(e) => {
                            const next = [...form.options];
                            next[i] = { ...o, durationMins: e.target.value };
                            setForm({ ...form, options: next });
                          }}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Price (D)</Label>
                        <Input
                          className="w-28"
                          type="number"
                          value={o.price}
                          onChange={(e) => {
                            const next = [...form.options];
                            next[i] = { ...o, price: e.target.value };
                            setForm({ ...form, options: next });
                          }}
                        />
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive"
                        onClick={() =>
                          setForm({
                            ...form,
                            options: form.options.filter((_, j) => j !== i),
                          })
                        }
                      >
                        <Trash2 className="h-4 w-4" />
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
                    <Plus className="mr-2 h-4 w-4" /> Add package
                  </Button>
                </div>
              ) : (
                <ManageOptions
                  experience={experiences.find((e: any) => e.id === editingId)}
                  unitLabel={form.unitLabel}
                  onAdd={(data) =>
                    addOptionMutation.mutate({ id: editingId, data })
                  }
                  onRemove={(optionId) =>
                    deleteOptionMutation.mutate({ id: editingId, optionId })
                  }
                  pending={addOptionMutation.isPending}
                />
              )}
            </TabsContent>
          </Tabs>

          <DialogFooter>
            <Button variant="outline" onClick={() => setIsFormOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => saveMutation.mutate()}
              disabled={!form.name || !form.vendorId || saveMutation.isPending}
            >
              {saveMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {editingId ? "Save changes" : "Create experience"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Bookings dialog ──────────────────────────────────────────────── */}
      <Dialog open={!!bookingsFor} onOpenChange={() => setBookingsFor(null)}>
        <DialogContent className="sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Bookings — {bookingsFor?.name}</DialogTitle>
            <DialogDescription>
              Every reservation for this experience, newest first.
            </DialogDescription>
          </DialogHeader>
          {bookingsLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : bookings.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center">
              <Ticket className="h-10 w-10 text-muted-foreground mb-3 opacity-50" />
              <p className="font-medium">No bookings yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                They'll appear here as customers reserve slots.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {bookings.map((b: any) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between rounded-lg border p-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">
                      {b.userProfile?.user?.fullName || "Customer"} ·{" "}
                      {b.option?.label}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(b.startTime).toLocaleString()} · x{b.quantity} ·
                      D{b.totalAmount}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Badge
                      className={
                        b.paymentStatus === "PAID"
                          ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm"
                          : undefined
                      }
                      variant={b.paymentStatus === "PAID" ? undefined : "outline"}
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

      {/* ── Archive confirm ──────────────────────────────────────────────── */}
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

// ── Card ─────────────────────────────────────────────────────────────────────
function ExperienceCard({
  exp,
  vendorName,
  onEdit,
  onView,
  onBookings,
  onDelete,
  onToggleActive,
  onToggleBookings,
}: any) {
  const activeOptions = exp.options?.filter((o: any) => o.isActive) || [];
  const prices = activeOptions.map((o: any) => o.price).filter(Boolean);
  const fromPrice = prices.length ? Math.min(...prices) : null;

  return (
    <Card
      className={cn(
        "shadow-sm transition-all hover:shadow-md",
        !exp.isActive && "opacity-60",
      )}
    >
      <div className="relative h-32 overflow-hidden rounded-t-lg bg-muted">
        {exp.imageUrl ? (
          <img
            src={exp.imageUrl}
            alt={exp.name}
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full items-center justify-center">
            <Sparkles className="h-12 w-12 text-muted-foreground/40" />
          </div>
        )}
        <div className="absolute right-2 top-2 flex gap-1">
          <Badge
            className={cn(
              "text-xs",
              exp.isActive
                ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm"
                : "bg-muted text-muted-foreground",
            )}
          >
            {exp.isActive ? "Active" : "Archived"}
          </Badge>
          {exp.acceptsBookings === false && (
            <Badge variant="outline" className="bg-background/80 text-xs">
              Paused
            </Badge>
          )}
        </div>
        {exp.category && (
          <Badge
            variant="outline"
            className="absolute left-2 top-2 bg-background/90 text-xs"
          >
            {exp.category}
          </Badge>
        )}
      </div>

      <CardHeader className="pb-2 pt-3">
        <div className="flex items-start justify-between">
          <div className="min-w-0 flex-1">
            <CardTitle className="truncate text-base">{exp.name}</CardTitle>
            <p className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3 shrink-0" />
              {exp.city || exp.address || "The Gambia"}
            </p>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7 shrink-0">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => onView(exp)}>
                <Eye className="mr-2 h-4 w-4" /> View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(exp)}>
                <Edit className="mr-2 h-4 w-4" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onBookings(exp)}>
                <Calendar className="mr-2 h-4 w-4" /> View Bookings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onToggleActive(exp.id, !exp.isActive)}
              >
                {exp.isActive ? (
                  <>
                    <Ban className="mr-2 h-4 w-4" /> Deactivate
                  </>
                ) : (
                  <>
                    <CheckCircle2 className="mr-2 h-4 w-4" /> Activate
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() =>
                  onToggleBookings(exp.id, exp.acceptsBookings === false)
                }
              >
                {exp.acceptsBookings === false ? (
                  <>
                    <ToggleRight className="mr-2 h-4 w-4" /> Resume Bookings
                  </>
                ) : (
                  <>
                    <ToggleLeft className="mr-2 h-4 w-4" /> Pause Bookings
                  </>
                )}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => onDelete(exp.id)}
              >
                <Trash2 className="mr-2 h-4 w-4" /> Archive
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardHeader>

      <CardContent className="space-y-2 pb-3">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3" />
            {exp.totalUnits} {exp.unitLabel}
            {exp.totalUnits === 1 ? "" : "s"}
          </span>
          <span className="flex items-center gap-1">
            <Ticket className="h-3 w-3" />
            {exp._count?.bookings ?? 0} bookings
          </span>
          <span className="flex items-center gap-1">
            <Timer className="h-3 w-3" />
            {exp.slotMinutes}m grid
          </span>
        </div>

        <p className="truncate text-xs text-muted-foreground">
          <Clock className="mr-1 inline h-3 w-3" />
          {summarizeHours(exp.openHours)}
        </p>

        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground truncate">
            {activeOptions.length} package
            {activeOptions.length === 1 ? "" : "s"}
            {fromPrice != null && (
              <span className="text-foreground font-medium"> · from D{fromPrice}</span>
            )}
          </span>
          <span className="text-muted-foreground truncate">
            {vendorName(exp.vendor)}
          </span>
        </div>

        <div className="flex gap-2 pt-1">
          <Button
            size="sm"
            variant="outline"
            className="flex-1 h-7 text-xs"
            onClick={() => onEdit(exp)}
          >
            <Edit className="mr-1 h-3 w-3" /> Edit
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="flex-1 h-7 text-xs"
            onClick={() => onView(exp)}
          >
            <Eye className="mr-1 h-3 w-3" /> View
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ── Manage packages (edit mode) ──────────────────────────────────────────────
function ManageOptions({
  experience,
  unitLabel,
  onAdd,
  onRemove,
  pending,
}: {
  experience: any;
  unitLabel: string;
  onAdd: (data: any) => void;
  onRemove: (optionId: string) => void;
  pending: boolean;
}) {
  const [label, setLabel] = useState("");
  const [durationMins, setDurationMins] = useState(5);
  const [price, setPrice] = useState(0);
  const existing = experience?.options?.filter((o: any) => o.isActive) || [];

  return (
    <div className="space-y-4">
      <div>
        <Label>Current packages</Label>
        <p className="text-xs text-muted-foreground mt-1">
          Changes here save immediately. Price is per {unitLabel || "unit"}.
        </p>
      </div>

      {existing.length === 0 ? (
        <div className="rounded-lg border border-dashed p-6 text-center">
          <Tag className="mx-auto mb-2 h-7 w-7 text-muted-foreground opacity-50" />
          <p className="text-sm text-muted-foreground">
            No packages yet — add one below.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {existing.map((o: any) => (
            <div
              key={o.id}
              className="flex items-center justify-between rounded-lg border p-3"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium truncate">{o.label}</p>
                <p className="text-xs text-muted-foreground">
                  {o.durationMins} min · per {unitLabel || "unit"}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="text-sm font-semibold">D{o.price}</span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="h-8 w-8 text-destructive"
                  onClick={() => onRemove(o.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="space-y-3 rounded-lg border bg-muted/30 p-3">
        <Label className="text-xs uppercase tracking-wide text-muted-foreground">
          Add a package
        </Label>
        <div className="grid gap-2 sm:grid-cols-[1fr_auto_auto_auto] sm:items-end">
          <div className="space-y-1">
            <Label className="text-xs">Label</Label>
            <Input
              placeholder="5 min / 6 laps"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Minutes</Label>
            <Input
              className="w-24"
              type="number"
              value={durationMins}
              onChange={(e) => setDurationMins(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Price (D)</Label>
            <Input
              className="w-28"
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
          <Button
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
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Plus className="mr-1 h-4 w-4" /> Add
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

// ── Small shared bits ────────────────────────────────────────────────────────
function StatCard({
  title,
  value,
  icon: Icon,
  iconColor,
  borderColor,
}: {
  title: string;
  value: string | number;
  icon: any;
  iconColor?: string;
  borderColor?: string;
}) {
  return (
    <Card
      className={cn("border-l-4 shadow-sm", borderColor || "border-l-primary")}
    >
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className={cn("h-4 w-4", iconColor || "text-primary")} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
}: {
  icon: any;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-2">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium truncate">{value}</p>
      </div>
    </div>
  );
}

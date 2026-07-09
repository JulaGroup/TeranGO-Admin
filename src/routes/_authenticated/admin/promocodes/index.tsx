import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  MoreHorizontal,
  Plus,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  Tag,
  Search,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableHeader,
  TableBody,
  TableCell,
  TableRow,
  TableHead,
} from "@/components/ui/table";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { TopNav } from "@/components/layout/top-nav";

// route
export const Route = createFileRoute("/_authenticated/admin/promocodes/")({
  component: PromoCodesPage,
});

interface PromoCode {
  id: string;
  code: string;
  description?: string;
  type: string;
  value: number;
  isActive: boolean;
  validFrom?: string;
  validUntil?: string;
  usageLimit?: number;
  perUserLimit?: number;
  usageCount?: number;
  createdAt?: string;
  minOrderAmount?: number;
  maxDiscountAmount?: number;
  freeDelivery?: boolean;
}

const topNav = [
  { title: "Overview", href: "/admin", isActive: false },
  { title: "Promo Codes", href: "/admin/promocodes", isActive: true },
];

function PromoCodesPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editing, setEditing] = useState<PromoCode | null>(null);
  const [formData, setFormData] = useState<any>({
    code: "",
    description: "",
    type: "PERCENTAGE",
    value: 0,
    isActive: true,
    validFrom: "",
    validUntil: "",
    usageLimit: "",
    perUserLimit: "",
  });

  const { data: promoData = { promoCodes: [] } } = useQuery({
    queryKey: ["promocodes"],
    queryFn: async () => {
      const res = await api.get("/api/promocodes");
      return res.data;
    },
  });

  const promoCodes = useMemo(
    () => (Array.isArray(promoData.promoCodes) ? promoData.promoCodes : []),
    [promoData],
  );

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return promoCodes;
    const lower = searchQuery.toLowerCase();
    return promoCodes.filter(
      (p: PromoCode) =>
        p.code.toLowerCase().includes(lower) ||
        (p.description && p.description.toLowerCase().includes(lower)),
    );
  }, [promoCodes, searchQuery]);

  const createMutation = useMutation({
    mutationFn: async (data: any) => api.post("/api/promocodes", data),
    onSuccess: () => {
      toast.success("Promo code created");
      queryClient.invalidateQueries({ queryKey: ["promocodes"] });
      setIsFormOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to create promo code");
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: any) =>
      api.put(`/api/promocodes/${data.id}`, data),
    onSuccess: () => {
      toast.success("Promo code updated");
      queryClient.invalidateQueries({ queryKey: ["promocodes"] });
      setIsFormOpen(false);
      setEditing(null);
      resetForm();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.error || "Failed to update");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/api/promocodes/${id}`),
    onSuccess: () => {
      toast.success("Deleted");
      queryClient.invalidateQueries({ queryKey: ["promocodes"] });
    },
    onError: () => toast.error("Failed to delete"),
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/api/promocodes/${id}/toggle`),
    onSuccess: () =>
      queryClient.invalidateQueries({ queryKey: ["promocodes"] }),
  });

  function resetForm() {
    setFormData({
      code: "",
      description: "",
      type: "PERCENTAGE",
      value: 0,
      isActive: true,
      validFrom: "",
      validUntil: "",
      usageLimit: "",
      perUserLimit: "",
    });
  }

  const openNew = () => {
    resetForm();
    setEditing(null);
    setIsFormOpen(true);
  };

  const openEdit = (promo: PromoCode) => {
    setEditing(promo);
    // only copy writable fields into formData to avoid sending Prisma-specific props
    setFormData({
      code: promo.code,
      description: promo.description || "",
      type: promo.type,
      value: promo.value,
      minOrderAmount: promo.minOrderAmount ?? 0,
      maxDiscountAmount: promo.maxDiscountAmount ?? 0,
      freeDelivery: promo.freeDelivery,
      isActive: promo.isActive,
      usageLimit: promo.usageLimit ?? "",
      perUserLimit: promo.perUserLimit ?? "",
      validFrom: promo.validFrom ? promo.validFrom.split("T")[0] : "",
      validUntil: promo.validUntil ? promo.validUntil.split("T")[0] : "",
    });
    setIsFormOpen(true);
  };

  const handleSubmit = () => {
    // build a clean payload; convert date strings to full ISO
    const payload: any = {
      code: formData.code,
      description: formData.description,
      type: formData.type,
      value: formData.value,
      minOrderAmount: formData.minOrderAmount || 0,
      maxDiscountAmount: formData.maxDiscountAmount || 0,
      freeDelivery: formData.freeDelivery,
      isActive: formData.isActive,
      usageLimit: formData.usageLimit || null,
      perUserLimit: formData.perUserLimit || null,
    };
    if (formData.validFrom) {
      payload.validFrom = new Date(formData.validFrom).toISOString();
    }
    if (formData.validUntil) {
      payload.validUntil = new Date(formData.validUntil).toISOString();
    }

    if (editing) {
      updateMutation.mutate({ id: editing.id, ...payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <>
      <Header />
      <TopNav links={topNav} />
      <Main>
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Promo Codes</h1>
              <p className="text-muted-foreground text-sm mt-1">
                Manage discount codes, offers, and promotional campaigns.
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={openNew} size="sm">
                <Plus className="h-4 w-4 mr-1" />
                New Code
              </Button>
            </div>
          </div>

          <Card className="shadow-sm overflow-hidden">
            <CardHeader className="border-b pb-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    className="pl-9 h-9 w-[260px]"
                    placeholder="Search promo codes..."
                    value={searchQuery}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                      setSearchQuery(e.target.value)
                    }
                  />
                </div>
                {filtered.length !== promoCodes.length && (
                  <span className="text-sm text-muted-foreground">
                    {filtered.length} of {promoCodes.length} codes
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {filtered.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableHead>Code</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Value</TableHead>
                        <TableHead>Created</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filtered.map((p: PromoCode) => (
                        <TableRow key={p.id} className="hover:bg-muted/30 transition-colors">
                          <TableCell>
                            <span className="font-mono bg-muted px-2 py-0.5 rounded text-sm">
                              {p.code}
                            </span>
                            {p.description && (
                              <p className="text-xs text-muted-foreground mt-1">{p.description}</p>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {p.type.replace("_", " ")}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="text-lg font-bold text-primary">
                              {p.type === "PERCENTAGE" ? `${p.value}%` : p.type === "FIXED_AMOUNT" ? `D${p.value}` : "—"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {p.createdAt
                                ? new Date(p.createdAt).toLocaleDateString()
                                : "-"}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span className="text-sm text-muted-foreground">
                              {p.validUntil
                                ? new Date(p.validUntil).toLocaleDateString()
                                : "-"}
                            </span>
                          </TableCell>
                          <TableCell>
                            {p.isActive ? (
                              <Badge className="bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm">
                                <CheckCircle className="mr-1 h-3 w-3" />
                                Active
                              </Badge>
                            ) : (
                              <Badge variant="destructive">
                                <XCircle className="mr-1 h-3 w-3" />
                                Inactive
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => openEdit(p)}>
                                  <Edit className="mr-2 h-4 w-4" /> Edit
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => deleteMutation.mutate(p.id)}
                                  className="text-destructive focus:text-destructive"
                                >
                                  <Trash2 className="mr-2 h-4 w-4" /> Delete
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => toggleMutation.mutate(p.id)}
                                >
                                  {p.isActive ? "Deactivate" : "Activate"}
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <Tag className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                  <p className="text-lg font-medium">No promo codes found</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {searchQuery
                      ? "Try adjusting your search query."
                      : "Create your first promo code to get started."}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </Main>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader className="border-b pb-4 mb-2">
            <DialogTitle>{editing ? "Edit" : "New"} Promo Code</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <Input
              placeholder="Code (e.g. SUMMER20)"
              value={formData.code}
              onChange={(e) =>
                setFormData({ ...formData, code: e.target.value.toUpperCase() })
              }
            />
            <Input
              placeholder="Description"
              value={formData.description}
              onChange={(e) =>
                setFormData({ ...formData, description: e.target.value })
              }
            />
            <select
              value={formData.type}
              onChange={(e) =>
                setFormData({ ...formData, type: e.target.value })
              }
              className="input w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <option value="PERCENTAGE">Percentage</option>
              <option value="FIXED_AMOUNT">Fixed Amount</option>
              <option value="FREE_DELIVERY">Free Delivery</option>
              <option value="FIRST_ORDER">First Order</option>
            </select>
            <Input
              type="number"
              placeholder="Value"
              value={formData.value}
              onChange={(e) =>
                setFormData({ ...formData, value: Number(e.target.value) })
              }
            />
            <div className="flex gap-2">
              <Input
                type="date"
                value={formData.validFrom?.split("T")[0] || ""}
                onChange={(e) =>
                  setFormData({ ...formData, validFrom: e.target.value })
                }
              />
              <Input
                type="date"
                value={formData.validUntil?.split("T")[0] || ""}
                onChange={(e) =>
                  setFormData({ ...formData, validUntil: e.target.value })
                }
              />
            </div>
            <Input
              type="number"
              placeholder="Usage Limit"
              value={formData.usageLimit}
              onChange={(e) =>
                setFormData({ ...formData, usageLimit: e.target.value })
              }
            />
            <Input
              type="number"
              placeholder="Per-user Limit"
              value={formData.perUserLimit}
              onChange={(e) =>
                setFormData({ ...formData, perUserLimit: e.target.value })
              }
            />
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={formData.isActive}
                onChange={(e) =>
                  setFormData({ ...formData, isActive: e.target.checked })
                }
              />
              <span className="text-sm">Active</span>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setIsFormOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit}>
                {editing ? "Update" : "Create"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

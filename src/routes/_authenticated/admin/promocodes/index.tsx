import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  Search,
  MoreHorizontal,
  Plus,
  Edit,
  Trash2,
  RefreshCw,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import {
  Table,
  TableHeader,
  TableBody,
  TableCell,
  TableRow,
} from "@/components/ui/table";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { TopNav } from "@/components/layout/top-nav";
import { ProfileDropdown } from "@/components/profile-dropdown";
import { Search as SearchInput } from "@/components/search";
import { ThemeSwitch } from "@/components/theme-switch";

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

  const { data: promoData = { promoCodes: [] }, isLoading } = useQuery({
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
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-bold">Promo Codes</h2>
          <div className="flex gap-2">
            <SearchInput
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            <Button onClick={openNew} icon={<Plus />}>
              New
            </Button>
          </div>
        </div>
        <Card>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableCell>Code</TableCell>
                  <TableCell>Type</TableCell>
                  <TableCell>Value</TableCell>
                  <TableCell>Created</TableCell>
                  <TableCell>Expires</TableCell>
                  <TableCell>Active</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p: PromoCode) => (
                  <TableRow key={p.id}>
                    <TableCell>{p.code}</TableCell>
                    <TableCell>{p.type}</TableCell>
                    <TableCell>{p.value}</TableCell>
                    <TableCell>
                      {p.createdAt
                        ? new Date(p.createdAt).toLocaleDateString()
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {p.validUntil
                        ? new Date(p.validUntil).toLocaleDateString()
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {p.isActive ? <CheckCircle /> : <XCircle />}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent>
                          <DropdownMenuItem onClick={() => openEdit(p)}>
                            <Edit /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => deleteMutation.mutate(p.id)}
                          >
                            <Trash2 /> Delete
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
          </CardContent>
        </Card>
      </Main>

      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? "Edit" : "New"} Promo Code</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <Input
              placeholder="Code"
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
              className="input"
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
              <span>Active</span>
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setIsFormOpen(false)}>
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

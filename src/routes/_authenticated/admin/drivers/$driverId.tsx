import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft,
  Star,
  DollarSign,
  TrendingUp,
  Clock,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { TopNav } from "@/components/layout/top-nav";
import { ProfileDropdown } from "@/components/profile-dropdown";
import { Search } from "@/components/search";
import { ThemeSwitch } from "@/components/theme-switch";

export const Route = createFileRoute("/_authenticated/admin/drivers/$driverId")(
  {
    component: DriverDetailPage,
  },
);

const topNav = [
  { title: "Overview", href: "/admin", isActive: false },
  { title: "Drivers", href: "/admin/drivers", isActive: true },
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

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          className={`h-4 w-4 ${
            s <= rating ? "fill-yellow-400 text-yellow-400" : "text-gray-300"
          }`}
        />
      ))}
      <span className="ml-1 font-medium">{rating}</span>
    </div>
  );
}

function DriverDetailPage() {
  const { driverId } = Route.useParams();
  const queryClient = useQueryClient();
  const [earningsPage, setEarningsPage] = useState(1);
  const [earningsStatus, setEarningsStatus] = useState<string>("all");
  const [ratingsPage, setRatingsPage] = useState(1);
  const [isEditTypeOpen, setIsEditTypeOpen] = useState(false);
  const [editTypeForm, setEditTypeForm] = useState({
    driverType: "SYSTEM",
    thirdPartyRate: "",
  });

  // ─── Fetch driver profile ─────────────────────────────────────────────────
  const { data: driver, isLoading: driverLoading } = useQuery({
    queryKey: ["driver", driverId],
    queryFn: async () => {
      const res = await adminApi.getDrivers({});
      const list = Array.isArray(res?.data)
        ? res.data
        : res?.data?.data || res?.data?.drivers || [];
      return list.find((d: any) => d.id === driverId || d._id === driverId);
    },
  });

  // ─── Fetch earnings summary ────────────────────────────────────────────────
  const { data: summary } = useQuery({
    queryKey: ["driver-earnings-summary", driverId],
    queryFn: async () => {
      const res = await api.get(
        `/api/admin/earnings/drivers/${driverId}/summary`,
      );
      return res.data;
    },
  });

  // ─── Fetch earnings history ────────────────────────────────────────────────
  const { data: earningsData } = useQuery({
    queryKey: [
      "driver-earnings-history",
      driverId,
      earningsPage,
      earningsStatus,
    ],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(earningsPage),
        pageSize: "15",
        ...(earningsStatus !== "all" && { status: earningsStatus }),
      });
      const res = await api.get(
        `/api/admin/earnings/drivers/${driverId}/history?${params}`,
      );
      return res.data;
    },
  });

  // ─── Fetch ratings ────────────────────────────────────────────────────────
  const { data: ratingsData } = useQuery({
    queryKey: ["driver-ratings", driverId, ratingsPage],
    queryFn: async () => {
      const res = await api.get(
        `/api/admin/drivers/${driverId}/ratings?page=${ratingsPage}&pageSize=15`,
      );
      return res.data;
    },
  });

  // ─── Update driver type mutation ──────────────────────────────────────────
  const updateTypeMutation = useMutation({
    mutationFn: (data: any) =>
      api.patch(`/api/admin/drivers/${driverId}/type`, data),
    onSuccess: () => {
      toast.success("Driver type updated");
      queryClient.invalidateQueries({ queryKey: ["driver", driverId] });
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      setIsEditTypeOpen(false);
    },
    onError: () => toast.error("Failed to update driver type"),
  });

  if (driverLoading) {
    return (
      <div className="flex h-96 items-center justify-center">
        <p className="text-muted-foreground">Loading driver...</p>
      </div>
    );
  }

  const driverName = driver?.name || driver?.user?.fullName || "Unknown Driver";

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
          {/* Back */}
          <div className="flex items-center gap-3">
            <Link to="/admin/drivers">
              <Button variant="outline" size="sm">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Drivers
              </Button>
            </Link>
            <div>
              <h1 className="text-2xl font-bold">{driverName}</h1>
              <p className="text-muted-foreground text-sm">
                Driver earnings, ratings &amp; settlement history
              </p>
            </div>
          </div>

          {/* Driver type badge + quick stats */}
          <div className="flex flex-wrap items-center gap-3">
            <Badge
              variant={
                driver?.driverType === "THIRD_PARTY" ? "outline" : "default"
              }
              className={
                driver?.driverType === "THIRD_PARTY"
                  ? "border-orange-500 text-orange-600 text-sm px-3 py-1"
                  : "bg-blue-600 text-sm px-3 py-1"
              }
            >
              {driver?.driverType === "THIRD_PARTY"
                ? "Third-Party Driver"
                : "TeranGO Driver (Salaried)"}
            </Badge>
            {driver?.driverType === "THIRD_PARTY" && driver?.thirdPartyRate && (
              <Badge variant="secondary">
                Split Rate: {Math.round((driver.thirdPartyRate ?? 0.7) * 100)}%
                driver /{" "}
                {Math.round((1 - (driver.thirdPartyRate ?? 0.7)) * 100)}%
                platform
              </Badge>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setEditTypeForm({
                  driverType: driver?.driverType || "SYSTEM",
                  thirdPartyRate: driver?.thirdPartyRate
                    ? String(driver.thirdPartyRate)
                    : "",
                });
                setIsEditTypeOpen(true);
              }}
            >
              Change Type
            </Button>
          </div>

          {/* Summary Cards */}
          {summary && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">Today</CardTitle>
                  <Clock className="text-muted-foreground h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatGMD(summary.today.total)}
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {summary.today.deliveries} deliveries
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">
                    This Month
                  </CardTitle>
                  <TrendingUp className="text-muted-foreground h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatGMD(summary.thisMonth.total)}
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {summary.thisMonth.deliveries} deliveries
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">
                    All Time
                  </CardTitle>
                  <DollarSign className="text-muted-foreground h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatGMD(summary.allTime.total)}
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {summary.allTime.deliveries} total deliveries
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardTitle className="text-sm font-medium">
                    Pending Unsettled
                  </CardTitle>
                  <AlertCircle className="h-4 w-4 text-orange-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-orange-600">
                    {formatGMD(summary.pendingUnsettled.total)}
                  </div>
                  <p className="text-muted-foreground text-xs">
                    {summary.pendingUnsettled.count} earnings pending
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Tabs */}
          <Tabs defaultValue="earnings">
            <TabsList>
              <TabsTrigger value="earnings">Earnings</TabsTrigger>
              <TabsTrigger value="ratings">Ratings</TabsTrigger>
            </TabsList>

            {/* ─── Earnings Tab ────────────────────────────────────────── */}
            <TabsContent value="earnings" className="space-y-4">
              {driver?.driverType === "SYSTEM" && (
                <div className="rounded-md border border-blue-200 bg-blue-50 p-4 text-sm text-blue-800">
                  This is a salaried TeranGO driver. Delivery earnings are
                  tracked for records only. Driver share is GMD 0 for all
                  orders.
                </div>
              )}
              <Card>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle>Earnings History</CardTitle>
                    <CardDescription>
                      All delivery earning records
                    </CardDescription>
                  </div>
                  <Select
                    value={earningsStatus}
                    onValueChange={(v) => {
                      setEarningsStatus(v);
                      setEarningsPage(1);
                    }}
                  >
                    <SelectTrigger className="w-[160px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      <SelectItem value="PENDING">Pending</SelectItem>
                      <SelectItem value="SETTLED">Settled</SelectItem>
                    </SelectContent>
                  </Select>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Order</TableHead>
                        <TableHead>Delivery Fee</TableHead>
                        <TableHead>Driver Share</TableHead>
                        <TableHead>Platform Share</TableHead>
                        <TableHead>Rate</TableHead>
                        <TableHead>Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {earningsData?.earnings?.length > 0 ? (
                        earningsData.earnings.map((e: any) => (
                          <TableRow key={e.id}>
                            <TableCell className="text-sm">
                              {formatDate(e.createdAt)}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              #
                              {(e.orderId || e.customDeliveryId || "").slice(
                                -6,
                              )}
                            </TableCell>
                            <TableCell>{formatGMD(e.deliveryFee)}</TableCell>
                            <TableCell className="font-semibold text-green-700">
                              {formatGMD(e.driverShare)}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {formatGMD(e.platformShare)}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-sm">
                              {e.driverType === "SYSTEM"
                                ? "Salaried"
                                : `${Math.round(e.splitRate * 100)}%`}
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  e.status === "SETTLED" ? "default" : "outline"
                                }
                                className={
                                  e.status === "SETTLED"
                                    ? "bg-green-600"
                                    : "border-orange-400 text-orange-600"
                                }
                              >
                                {e.status}
                              </Badge>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell
                            colSpan={7}
                            className="text-muted-foreground py-8 text-center"
                          >
                            No earnings found
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                  {/* Pagination */}
                  {earningsData?.totalPages > 1 && (
                    <div className="mt-4 flex items-center justify-between">
                      <p className="text-muted-foreground text-sm">
                        Page {earningsPage} of {earningsData.totalPages}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={earningsPage <= 1}
                          onClick={() => setEarningsPage((p) => p - 1)}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={earningsPage >= earningsData.totalPages}
                          onClick={() => setEarningsPage((p) => p + 1)}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* ─── Ratings Tab ──────────────────────────────────────────── */}
            <TabsContent value="ratings" className="space-y-4">
              {ratingsData && (
                <div className="grid gap-4 md:grid-cols-3">
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Average Rating</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-2">
                        <span className="text-4xl font-bold">
                          {ratingsData.average?.toFixed(1) || "0.0"}
                        </span>
                        <Star className="h-8 w-8 fill-yellow-400 text-yellow-400" />
                      </div>
                      <p className="text-muted-foreground text-sm">
                        from {ratingsData.totalRatings} reviews
                      </p>
                    </CardContent>
                  </Card>
                  <Card className="md:col-span-2">
                    <CardHeader className="pb-2">
                      <CardTitle className="text-sm">Star Breakdown</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1">
                      {[5, 4, 3, 2, 1].map((star) => {
                        const count = ratingsData.distribution?.[star] || 0;
                        const pct =
                          ratingsData.totalRatings > 0
                            ? Math.round(
                                (count / ratingsData.totalRatings) * 100,
                              )
                            : 0;
                        return (
                          <div
                            key={star}
                            className="flex items-center gap-2 text-sm"
                          >
                            <span className="w-4 text-right">{star}</span>
                            <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                            <div className="h-2 flex-1 rounded-full bg-gray-100">
                              <div
                                className="h-2 rounded-full bg-yellow-400"
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                            <span className="text-muted-foreground w-8 text-right">
                              {pct}%
                            </span>
                            <span className="text-muted-foreground w-6 text-right">
                              ({count})
                            </span>
                          </div>
                        );
                      })}
                    </CardContent>
                  </Card>
                </div>
              )}

              <Card>
                <CardHeader>
                  <CardTitle>Individual Reviews</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Order</TableHead>
                        <TableHead>Rating</TableHead>
                        <TableHead>Review</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {ratingsData?.ratings?.length > 0 ? (
                        ratingsData.ratings.map((r: any) => (
                          <TableRow key={r.id}>
                            <TableCell className="text-sm">
                              {formatDate(r.createdAt)}
                            </TableCell>
                            <TableCell className="font-mono text-xs">
                              #{(r.order?.id || "").slice(-6)}
                            </TableCell>
                            <TableCell>
                              <StarDisplay rating={r.rating} />
                            </TableCell>
                            <TableCell className="text-muted-foreground max-w-xs text-sm">
                              {r.review || (
                                <span className="italic">No review</span>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell
                            colSpan={4}
                            className="text-muted-foreground py-8 text-center"
                          >
                            No ratings yet
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                  {ratingsData?.totalPages > 1 && (
                    <div className="mt-4 flex items-center justify-between">
                      <p className="text-muted-foreground text-sm">
                        Page {ratingsPage} of {ratingsData.totalPages}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={ratingsPage <= 1}
                          onClick={() => setRatingsPage((p) => p - 1)}
                        >
                          <ChevronLeft className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          disabled={ratingsPage >= ratingsData.totalPages}
                          onClick={() => setRatingsPage((p) => p + 1)}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </Main>

      {/* ─── Edit Driver Type Dialog ──────────────────────────────────── */}
      <Dialog open={isEditTypeOpen} onOpenChange={setIsEditTypeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Change Driver Type</DialogTitle>
            <DialogDescription>
              SYSTEM drivers are salaried — no per-order earnings are tracked.
              THIRD_PARTY drivers earn a % of the delivery fee.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Driver Type</Label>
              <Select
                value={editTypeForm.driverType}
                onValueChange={(v) =>
                  setEditTypeForm((prev) => ({ ...prev, driverType: v }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="SYSTEM">TeranGO (Salaried)</SelectItem>
                  <SelectItem value="THIRD_PARTY">
                    Third-Party (Commission)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            {editTypeForm.driverType === "THIRD_PARTY" && (
              <div>
                <Label>
                  Custom Split Rate (optional)
                  <span className="text-muted-foreground ml-2 text-xs">
                    Leave blank to use global default
                  </span>
                </Label>
                <div className="relative">
                  <Input
                    type="number"
                    min="0.1"
                    max="1"
                    step="0.05"
                    placeholder="e.g. 0.70 for 70%"
                    value={editTypeForm.thirdPartyRate}
                    onChange={(e) =>
                      setEditTypeForm((prev) => ({
                        ...prev,
                        thirdPartyRate: e.target.value,
                      }))
                    }
                  />
                </div>
                {editTypeForm.thirdPartyRate && (
                  <p className="text-muted-foreground mt-1 text-xs">
                    Driver gets{" "}
                    {Math.round(Number(editTypeForm.thirdPartyRate) * 100)}% —
                    Platform keeps{" "}
                    {Math.round(
                      (1 - Number(editTypeForm.thirdPartyRate)) * 100,
                    )}
                    %
                  </p>
                )}
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => setIsEditTypeOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={() =>
                  updateTypeMutation.mutate({
                    driverType: editTypeForm.driverType,
                    thirdPartyRate: editTypeForm.thirdPartyRate
                      ? Number(editTypeForm.thirdPartyRate)
                      : null,
                  })
                }
                disabled={updateTypeMutation.isPending}
              >
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

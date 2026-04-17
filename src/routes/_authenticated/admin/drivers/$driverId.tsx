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
  Edit,
  Upload,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { adminApi, api } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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

const CLOUDINARY_CLOUD_NAME = "dkpi5ij2t";
const CLOUDINARY_UPLOAD_PRESET = "unsigned_preset";

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

  // ─── Full edit dialog state ───────────────────────────────────────────────
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phoneNumber: "",
    vehicleType: "BIKE",
    vehicleNumber: "",
    vehicleColor: "",
    profileImage: "",
    status: "approved",
    driverType: "SYSTEM",
    thirdPartyRate: "",
  });

  // ─── Fetch driver profile ─────────────────────────────────────────────────
  const { data: driver, isLoading: driverLoading } = useQuery({
    queryKey: ["driver", driverId],
    queryFn: async () => {
      try {
        const res = await adminApi.getDriverById(driverId);
        return res?.data?.data || res?.data || null;
      } catch {
        // fallback: search full list
        const res = await adminApi.getDrivers({});
        const list = Array.isArray(res?.data)
          ? res.data
          : res?.data?.data || res?.data?.drivers || [];
        return list.find((d: any) => d.id === driverId || d._id === driverId);
      }
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

  // ─── Full update driver mutation ──────────────────────────────────────────
  const updateDriverMutation = useMutation({
    mutationFn: (data: any) => adminApi.updateDriver(driverId, data),
    onSuccess: () => {
      toast.success("Driver updated successfully");
      queryClient.invalidateQueries({ queryKey: ["driver", driverId] });
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      setIsEditOpen(false);
    },
    onError: () => toast.error("Failed to update driver"),
  });

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: "POST", body: formData },
      );
      const data = await res.json();
      if (data.secure_url) {
        setEditForm((prev) => ({ ...prev, profileImage: data.secure_url }));
      } else {
        toast.error("Image upload failed");
      }
    } catch {
      toast.error("Image upload failed");
    } finally {
      setIsUploading(false);
    }
  };

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

          {/* Driver type badge + rating + edit button */}
          {/* Driver Info */}
          <div className="grid gap-4 md:grid-cols-3 items-start">
            <Card className="md:col-span-1">
              <CardContent className="flex flex-col items-center gap-3">
                <Avatar className="h-24 w-24">
                  <AvatarImage
                    src={
                      driver?.profileImage ||
                      driver?.profileImageUrl ||
                      driver?.user?.avatarUrl
                    }
                  />
                  <AvatarFallback>
                    {(driver?.name || driver?.user?.fullName || "DR")
                      .slice(0, 2)
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <h2 className="text-lg font-semibold">{driverName}</h2>
                <p className="text-sm text-muted-foreground">
                  {driver?.user?.email || driver?.email || "—"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {driver?.user?.phone ||
                    driver?.phone ||
                    driver?.phoneNumber ||
                    "—"}
                </p>
              </CardContent>
            </Card>
            <Card className="md:col-span-2">
              <CardContent>
                <div className="grid gap-2 md:grid-cols-3">
                  <div>
                    <p className="text-xs text-muted-foreground">Vehicle</p>
                    <p className="font-medium">
                      {driver?.vehicleNumber || driver?.vehicleNo || "—"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {driver?.vehicleType || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Status</p>
                    <p className="font-medium">
                      {(driver as any)?.status ||
                        (driver?.isAvailable ? "Available" : "Unavailable")}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Driver Type: {driver?.driverType || "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Location</p>
                    <p className="font-medium">
                      {driver?.currentLatitude && driver?.currentLongitude
                        ? `${driver.currentLatitude.toFixed(5)}, ${driver.currentLongitude.toFixed(5)}`
                        : "No location"}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {driver?.lastLocationUpdate
                        ? formatDate(driver.lastLocationUpdate)
                        : ""}
                    </p>
                  </div>
                </div>
                <div className="mt-4 grid gap-2 md:grid-cols-2">
                  <div>
                    <p className="text-xs text-muted-foreground">Joined</p>
                    <p className="font-medium">
                      {driver?.createdAt ? formatDate(driver.createdAt) : "—"}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">
                      Recent Orders
                    </p>
                    <p className="font-medium">
                      {driver?.recentOrders?.length ?? 0}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
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
            {/* ─── Average Rating Display ─────────────────────────── */}
            {(driver?.rating != null || ratingsData?.average != null) && (
              <div className="flex items-center gap-1.5 rounded-full border border-yellow-300 bg-yellow-50 px-3 py-1">
                {[1, 2, 3, 4, 5].map((s) => {
                  const avg = driver?.rating ?? ratingsData?.average ?? 0;
                  return (
                    <Star
                      key={s}
                      className={`h-3.5 w-3.5 ${
                        s <= Math.round(avg)
                          ? "fill-yellow-400 text-yellow-400"
                          : "text-gray-300"
                      }`}
                    />
                  );
                })}
                <span className="text-sm font-bold text-yellow-700">
                  {(driver?.rating ?? ratingsData?.average ?? 0).toFixed(1)}
                </span>
                {(driver?.totalRatings ?? ratingsData?.totalRatings) !=
                  null && (
                  <span className="text-muted-foreground text-xs">
                    ({driver?.totalRatings ?? ratingsData?.totalRatings}{" "}
                    reviews)
                  </span>
                )}
              </div>
            )}
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                setEditForm({
                  name: driver?.name || driver?.user?.fullName || "",
                  email: driver?.email || driver?.user?.email || "",
                  phoneNumber:
                    driver?.phoneNumber ||
                    driver?.phone ||
                    driver?.user?.phone ||
                    "",
                  vehicleType: driver?.vehicleType || "BIKE",
                  vehicleNumber:
                    driver?.vehicleNumber || driver?.vehicleNo || "",
                  vehicleColor: (driver as any)?.vehicleColor || "",
                  profileImage:
                    driver?.profileImage || driver?.profileImageUrl || "",
                  status: (driver as any)?.status || "approved",
                  driverType: (driver as any)?.driverType || "SYSTEM",
                  thirdPartyRate: (driver as any)?.thirdPartyRate
                    ? String((driver as any).thirdPartyRate)
                    : "",
                });
                setIsEditOpen(true);
              }}
            >
              <Edit className="mr-2 h-4 w-4" />
              Edit Driver
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

      {/* ─── Edit Driver Dialog (full) ──────────────────────────────────── */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Driver</DialogTitle>
            <DialogDescription>
              Update all driver details including type, vehicle info and status.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6">
            {/* Avatar upload */}
            <div className="flex flex-col items-center gap-3">
              <Avatar className="h-20 w-20">
                <AvatarImage src={editForm.profileImage} />
                <AvatarFallback>
                  {editForm.name.slice(0, 2).toUpperCase() || "DR"}
                </AvatarFallback>
              </Avatar>
              <Label htmlFor="edit-img" className="cursor-pointer">
                <div className="flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm hover:bg-muted">
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4" />
                  )}
                  {isUploading ? "Uploading…" : "Change Photo"}
                </div>
              </Label>
              <Input
                id="edit-img"
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                className="hidden"
                disabled={isUploading}
              />
            </div>

            {/* Basic info */}
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>Full Name</Label>
                <Input
                  value={editForm.name}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="Driver full name"
                />
              </div>
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  value={editForm.email}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, email: e.target.value }))
                  }
                  placeholder="driver@example.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone Number</Label>
                <Input
                  value={editForm.phoneNumber}
                  onChange={(e) =>
                    setEditForm((p) => ({ ...p, phoneNumber: e.target.value }))
                  }
                  placeholder="+2207xxxxxx"
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={editForm.status}
                  onValueChange={(v) =>
                    setEditForm((p) => ({ ...p, status: v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Vehicle info */}
            <div>
              <h4 className="mb-3 font-semibold">Vehicle Information</h4>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Vehicle Type</Label>
                  <Select
                    value={editForm.vehicleType}
                    onValueChange={(v) =>
                      setEditForm((p) => ({ ...p, vehicleType: v }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BIKE">🏍️ Motorbike</SelectItem>
                      <SelectItem value="KEKE_CARGO">🛺 Keke Cargo</SelectItem>
                      <SelectItem value="CAR">🚗 Car</SelectItem>
                      <SelectItem value="VAN">🚐 Van</SelectItem>
                      <SelectItem value="LORRY">🚚 Lorry</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Vehicle Number</Label>
                  <Input
                    value={editForm.vehicleNumber}
                    onChange={(e) =>
                      setEditForm((p) => ({
                        ...p,
                        vehicleNumber: e.target.value,
                      }))
                    }
                    placeholder="ABC-123"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Vehicle Color</Label>
                  <Input
                    value={editForm.vehicleColor}
                    onChange={(e) =>
                      setEditForm((p) => ({
                        ...p,
                        vehicleColor: e.target.value,
                      }))
                    }
                    placeholder="Red, Blue, White…"
                  />
                </div>
              </div>
            </div>

            {/* Driver type & earnings split */}
            <div>
              <h4 className="mb-3 font-semibold">Driver Type &amp; Earnings</h4>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Driver Type</Label>
                  <Select
                    value={editForm.driverType}
                    onValueChange={(v) =>
                      setEditForm((p) => ({ ...p, driverType: v }))
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
                  <p className="text-muted-foreground text-xs">
                    {editForm.driverType === "SYSTEM"
                      ? "Salaried — no per-order earnings tracked."
                      : "Earns a % of the delivery fee per order."}
                  </p>
                </div>
                {editForm.driverType === "THIRD_PARTY" && (
                  <div className="space-y-2">
                    <Label>
                      Split Rate
                      <span className="text-muted-foreground ml-2 text-xs">
                        Leave blank for global default
                      </span>
                    </Label>
                    <Input
                      type="number"
                      min="0.1"
                      max="1"
                      step="0.05"
                      placeholder="e.g. 0.70 for 70%"
                      value={editForm.thirdPartyRate}
                      onChange={(e) =>
                        setEditForm((p) => ({
                          ...p,
                          thirdPartyRate: e.target.value,
                        }))
                      }
                    />
                    {editForm.thirdPartyRate && (
                      <p className="text-muted-foreground text-xs">
                        Driver gets{" "}
                        {Math.round(Number(editForm.thirdPartyRate) * 100)}% —
                        Platform keeps{" "}
                        {Math.round(
                          (1 - Number(editForm.thirdPartyRate)) * 100,
                        )}
                        %
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" onClick={() => setIsEditOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={async () => {
                  const normalizedThirdPartyRate =
                    editForm.driverType === "THIRD_PARTY"
                      ? editForm.thirdPartyRate === ""
                        ? null
                        : Number(editForm.thirdPartyRate)
                      : null;

                  await adminApi.updateDriverType(driverId, {
                    driverType: editForm.driverType as "SYSTEM" | "THIRD_PARTY",
                    thirdPartyRate: normalizedThirdPartyRate,
                  });

                  updateDriverMutation.mutate({
                    ...editForm,
                    thirdPartyRate: normalizedThirdPartyRate,
                  });
                }}
                disabled={updateDriverMutation.isPending}
              >
                {updateDriverMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : null}
                Save Changes
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

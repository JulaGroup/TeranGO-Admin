import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  Search,
  MoreHorizontal,
  Eye,
  Bike,
  Phone,
  Mail,
  MapPin,
  CheckCircle,
  XCircle,
  TrendingUp,
  Star,
  Edit,
  Upload,
  Loader2,
  Save,
  UserPlus,
  DollarSign,
} from "lucide-react";
import { toast } from "sonner";
import { adminApi } from "@/lib/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  Dialog,
  DialogContent,
  DialogDescription,
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Label } from "@/components/ui/label";
import { ConfigDrawer } from "@/components/config-drawer";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { TopNav } from "@/components/layout/top-nav";
import { ProfileDropdown } from "@/components/profile-dropdown";
import { Search as SearchInput } from "@/components/search";
import { ThemeSwitch } from "@/components/theme-switch";
import type { Driver } from "@/lib/types";

const topNav = [
  { title: "Overview", href: "/admin", isActive: false },
  { title: "Drivers", href: "/admin/drivers", isActive: true },
  { title: "Vendors", href: "/admin/vendors", isActive: false },
  { title: "Settings", href: "#", isActive: false },
];

// Cloudinary configuration
const CLOUDINARY_CLOUD_NAME = "dkpi5ij2t";
const CLOUDINARY_UPLOAD_PRESET = "unsigned_preset";

export const Route = createFileRoute("/_authenticated/admin/drivers/")({
  component: DriversPage,
});

function DriversPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isCreateUploading, setIsCreateUploading] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: "",
    email: "",
    phone: "",
    vehicleType: "BIKE",
    vehicleNumber: "",
    vehicleColor: "",
    profileImage: "",
    password: "",
    driverType: "SYSTEM",
    thirdPartyRate: "",
  });
  const [editForm, setEditForm] = useState({
    name: "",
    email: "",
    phoneNumber: "",
    vehicleType: "",
    vehicleNumber: "",
    vehicleColor: "",
    profileImage: "",
    status: "",
    driverType: "SYSTEM",
    thirdPartyRate: "",
  });

  // Fetch drivers
  const { data: driversData = [], isLoading } = useQuery({
    queryKey: ["drivers", statusFilter, typeFilter, searchQuery],
    queryFn: async () => {
      const response = await adminApi.getDrivers({
        status: statusFilter === "all" ? undefined : statusFilter,
        search: searchQuery || undefined,
        driverType: typeFilter === "all" ? undefined : typeFilter,
      });
      const driversList = Array.isArray(response?.data)
        ? response.data
        : response?.data?.data || response?.data?.drivers || [];
      return driversList;
    },
  });

  const drivers = Array.isArray(driversData) ? driversData : [];

  // Create driver mutation
  const createMutation = useMutation({
    mutationFn: (data: any) => adminApi.createDriver(data),
    onSuccess: (response: any) => {
      const defaultPwd = response?.data?.data?.defaultPassword;
      toast.success(
        defaultPwd
          ? `Driver created! Default password: ${defaultPwd}`
          : "Driver created successfully",
        { duration: 8000 },
      );
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      setIsCreateOpen(false);
      setCreateForm({
        name: "",
        email: "",
        phone: "",
        vehicleType: "BIKE",
        vehicleNumber: "",
        vehicleColor: "",
        profileImage: "",
        password: "",
        driverType: "SYSTEM",
        thirdPartyRate: "",
      });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.error || "Failed to create driver");
    },
  });

  // Approve driver mutation
  const approveMutation = useMutation({
    mutationFn: (driverId: string) => adminApi.approveDriver(driverId),
    onSuccess: () => {
      toast.success("Driver approved successfully");
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to approve driver");
    },
  });

  // Reject driver mutation
  const rejectMutation = useMutation({
    mutationFn: (driverId: string) => adminApi.rejectDriver(driverId),
    onSuccess: () => {
      toast.success("Driver rejected");
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to reject driver");
    },
  });

  // Update driver mutation
  const updateMutation = useMutation({
    mutationFn: ({ driverId, data }: { driverId: string; data: any }) =>
      adminApi.updateDriver(driverId, data),
    onSuccess: () => {
      toast.success("Driver updated successfully");
      queryClient.invalidateQueries({ queryKey: ["drivers"] });
      setIsEditOpen(false);
      setEditingDriver(null);
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update driver");
    },
  });

  const handleViewDetails = (driver: Driver) => {
    setSelectedDriver(driver);
    setIsDetailsOpen(true);
  };

  const handleEditDriver = (driver: Driver) => {
    setEditingDriver(driver);
    setEditForm({
      name: driver.name || driver.user?.fullName || "",
      email: driver.email || driver.user?.email || "",
      phoneNumber:
        driver.phoneNumber || driver.phone || driver.user?.phone || "",
      vehicleType: driver.vehicleType || "BIKE",
      vehicleNumber: driver.vehicleNumber || "",
      vehicleColor: (driver as any).vehicleColor || "",
      profileImage: driver.profileImage || driver.profileImageUrl || "",
      status: (driver as any).status || "approved",
      driverType: (driver as any).driverType || "SYSTEM",
      thirdPartyRate: (driver as any).thirdPartyRate
        ? String((driver as any).thirdPartyRate)
        : "",
    });
    setIsEditOpen(true);
  };
  const handleCreateImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsCreateUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);
      const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;
      const uploadResponse = await fetch(cloudinaryUrl, {
        method: "POST",
        body: formData,
      });
      const uploadData = await uploadResponse.json();
      if (uploadData.secure_url) {
        setCreateForm((prev) => ({
          ...prev,
          profileImage: uploadData.secure_url,
        }));
        toast.success("Image uploaded successfully");
      } else {
        throw new Error("Upload failed");
      }
    } catch (error) {
      toast.error("Failed to upload image");
    } finally {
      setIsCreateUploading(false);
    }
  };
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

      const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

      const uploadResponse = await fetch(cloudinaryUrl, {
        method: "POST",
        body: formData,
      });

      const uploadData = await uploadResponse.json();

      if (uploadData.secure_url) {
        setEditForm((prev) => ({
          ...prev,
          profileImage: uploadData.secure_url,
        }));
        toast.success("Image uploaded successfully");
      } else {
        throw new Error("Upload failed");
      }
    } catch (error) {
      console.error("Error uploading image:", error);
      toast.error("Failed to upload image");
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpdateDriver = async () => {
    if (!editingDriver) return;

    try {
      const driverId = (editingDriver.id || editingDriver._id) as string;
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

      await updateMutation.mutateAsync({
        driverId,
        data: {
          ...editForm,
          thirdPartyRate: normalizedThirdPartyRate,
        },
      });
    } catch (error) {
      // Error is handled by the mutation
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<
      string,
      {
        variant: "default" | "secondary" | "destructive" | "outline";
        label: string;
      }
    > = {
      approved: { variant: "default", label: "Approved" },
      pending: { variant: "secondary", label: "Pending" },
      rejected: { variant: "destructive", label: "Rejected" },
      suspended: { variant: "outline", label: "Suspended" },
    };
    const config = variants[status] || {
      variant: "outline" as const,
      label: status,
    };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const getAvailabilityBadge = (isAvailable: boolean, isOnline: boolean) => {
    if (!isOnline) {
      return <Badge variant="outline">Offline</Badge>;
    }
    return isAvailable ? (
      <Badge variant="default" className="bg-green-600">
        Available
      </Badge>
    ) : (
      <Badge variant="secondary">Busy</Badge>
    );
  };

  return (
    <>
      <Header>
        <TopNav links={topNav} />
        <div className="ms-auto flex items-center space-x-4">
          <SearchInput />
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className="space-y-6">
          {/* Header */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Drivers</h1>
              <p className="text-muted-foreground">
                Manage all delivery drivers and applications
              </p>
            </div>
            <Button
              onClick={() => setIsCreateOpen(true)}
              className="flex items-center gap-2"
            >
              <UserPlus className="h-4 w-4" />
              Create Driver
            </Button>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filter Drivers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-4 md:flex-row">
                <div className="relative flex-1">
                  <Search className="text-muted-foreground absolute top-3 left-3 h-4 w-4" />
                  <Input
                    placeholder="Search by name, phone, or vehicle..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-[200px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Statuses</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                    <SelectItem value="suspended">Suspended</SelectItem>
                  </SelectContent>
                </Select>
                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger className="w-full md:w-[200px]">
                    <SelectValue placeholder="Filter by type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Types</SelectItem>
                    <SelectItem value="SYSTEM">TeranGO (Salaried)</SelectItem>
                    <SelectItem value="THIRD_PARTY">Third-Party</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Drivers Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bike className="h-5 w-5" />
                All Drivers ({drivers?.length || 0})
              </CardTitle>
              <CardDescription>
                View and manage all registered drivers
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-muted-foreground">Loading drivers...</p>
                </div>
              ) : drivers && drivers.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Driver</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Availability</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Deliveries</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {drivers.map((driver: any) => (
                      <TableRow key={driver._id || driver.id}>
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <Avatar>
                              <AvatarImage
                                src={
                                  driver.profileImage || driver.profileImageUrl
                                }
                                alt={driver.name || driver.user?.fullName}
                              />
                              <AvatarFallback>
                                {(driver.name || driver.user?.fullName || "D")
                                  .substring(0, 2)
                                  .toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">
                                {driver.name || driver.user?.fullName}
                              </p>
                              <p className="text-muted-foreground text-sm">
                                ID:{" "}
                                {(driver._id || driver.id || "N/A").substring(
                                  0,
                                  8,
                                )}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="space-y-1">
                            <div className="flex items-center gap-2 text-sm">
                              <Phone className="h-3 w-3" />
                              {driver.phoneNumber ||
                                driver.phone ||
                                driver.user?.phone ||
                                "N/A"}
                            </div>
                            <div className="text-muted-foreground flex items-center gap-2 text-sm">
                              <Mail className="h-3 w-3" />
                              {driver.email || driver.user?.email || "N/A"}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm">
                            <div className="flex items-center gap-2">
                              <span className="text-lg">
                                {(() => {
                                  const vehicleType =
                                    driver.vehicleType || "BIKE";
                                  const vehicleEmojis: {
                                    [key: string]: string;
                                  } = {
                                    BIKE: "🏍️",
                                    KEKE_CARGO: "🛺",
                                    CAR: "🚗",
                                    VAN: "🚐",
                                    LORRY: "🚚",
                                  };
                                  return vehicleEmojis[vehicleType] || "🚛";
                                })()}
                              </span>
                              <div>
                                <p className="font-medium">
                                  {(driver.vehicleType || "BIKE").replace(
                                    "_",
                                    " ",
                                  )}
                                </p>
                                <p className="text-muted-foreground text-xs">
                                  {driver.vehicleNo ||
                                    driver.vehicleNumber ||
                                    "No plate"}
                                </p>
                                {(driver.vehicleColor ||
                                  driver.vehicle_color) && (
                                  <p className="text-muted-foreground text-xs">
                                    {driver.vehicleColor ||
                                      driver.vehicle_color}
                                  </p>
                                )}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(driver.status || "approved")}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              driver.driverType === "THIRD_PARTY"
                                ? "outline"
                                : "default"
                            }
                            className={
                              driver.driverType === "THIRD_PARTY"
                                ? "border-orange-500 text-orange-600"
                                : "bg-blue-600"
                            }
                          >
                            {driver.driverType === "THIRD_PARTY"
                              ? "Third-Party"
                              : "TeranGO"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {getAvailabilityBadge(
                            driver.isAvailable ?? true,
                            driver.isOnline ?? true,
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span className="font-medium">
                              {driver.rating?.toFixed(1) || "N/A"}
                            </span>
                            <span className="text-muted-foreground text-xs">
                              (
                              {driver.totalRatings ||
                                driver.orders?.length ||
                                0}
                              )
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="font-medium">
                            {driver.totalDeliveries ||
                              driver.orders?.length ||
                              0}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuLabel>Actions</DropdownMenuLabel>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleViewDetails(driver)}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  navigate({
                                    to: "/admin/drivers/$driverId" as any,
                                    params: {
                                      driverId: driver._id || driver.id,
                                    } as any,
                                  })
                                }
                              >
                                <DollarSign className="mr-2 h-4 w-4" />
                                Earnings &amp; Ratings
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleEditDriver(driver)}
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Edit Driver
                              </DropdownMenuItem>
                              {driver.status === "pending" && (
                                <>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      approveMutation.mutate(
                                        driver._id || driver.id,
                                      )
                                    }
                                  >
                                    <CheckCircle className="mr-2 h-4 w-4 text-green-600" />
                                    Approve
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      rejectMutation.mutate(
                                        driver._id || driver.id,
                                      )
                                    }
                                    className="text-red-600"
                                  >
                                    <XCircle className="mr-2 h-4 w-4" />
                                    Reject
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <Bike className="text-muted-foreground mb-4 h-12 w-12" />
                  <p className="text-muted-foreground">No drivers found</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Driver Details Dialog */}
          <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
            <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Driver Details</DialogTitle>
                <DialogDescription>
                  Complete information about the driver
                </DialogDescription>
              </DialogHeader>
              {selectedDriver && (
                <div className="space-y-6">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-20 w-20">
                      <AvatarImage
                        src={
                          selectedDriver.profileImage ||
                          selectedDriver.profileImageUrl
                        }
                        alt={
                          selectedDriver.name || selectedDriver.user?.fullName
                        }
                      />
                      <AvatarFallback>
                        {(
                          selectedDriver.name ||
                          selectedDriver.user?.fullName ||
                          "D"
                        )
                          .substring(0, 2)
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <h3 className="text-2xl font-bold">
                        {selectedDriver.name || selectedDriver.user?.fullName}
                      </h3>
                      <p className="text-muted-foreground">
                        Driver ID:{" "}
                        {(
                          selectedDriver._id ||
                          selectedDriver.id ||
                          "N/A"
                        ).substring(0, 12)}
                      </p>
                      <div className="mt-2 flex gap-2">
                        {getStatusBadge(selectedDriver.status || "approved")}
                        {getAvailabilityBadge(
                          selectedDriver.isAvailable ?? true,
                          selectedDriver.isOnline ?? true,
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <h4 className="mb-2 font-semibold">
                        Contact Information
                      </h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Phone className="text-muted-foreground h-4 w-4" />
                          {selectedDriver.phoneNumber ||
                            (selectedDriver as any).phone ||
                            selectedDriver.user?.phone ||
                            "N/A"}
                        </div>
                        <div className="flex items-center gap-2">
                          <Mail className="text-muted-foreground h-4 w-4" />
                          {selectedDriver.email ||
                            selectedDriver.user?.email ||
                            "N/A"}
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className="mb-2 font-semibold">Performance</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span>
                            Rating: {selectedDriver.rating?.toFixed(1) || "N/A"}{" "}
                            (
                            {selectedDriver.totalRatings ||
                              selectedDriver.orders?.length ||
                              0}{" "}
                            reviews)
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <TrendingUp className="text-muted-foreground h-4 w-4" />
                          <span>
                            Total Deliveries:{" "}
                            {selectedDriver.totalDeliveries ||
                              selectedDriver.orders?.length ||
                              0}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-600" />
                          <span>
                            Completed: {selectedDriver.completedDeliveries || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="mb-2 font-semibold">Vehicle Information</h4>
                    <div className="space-y-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Type:</span>{" "}
                        <span className="font-medium">
                          {selectedDriver.vehicleType || "N/A"}
                        </span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Number:</span>{" "}
                        <span className="font-medium">
                          {selectedDriver.vehicleNumber ||
                            selectedDriver.vehicleNo ||
                            "N/A"}
                        </span>
                      </div>
                      {selectedDriver.vehicleColor && (
                        <div>
                          <span className="text-muted-foreground">Color:</span>{" "}
                          <span className="font-medium">
                            {selectedDriver.vehicleColor}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedDriver.address && (
                    <div>
                      <h4 className="mb-2 font-semibold">Address</h4>
                      <div className="flex items-start gap-2 text-sm">
                        <MapPin className="text-muted-foreground mt-0.5 h-4 w-4" />
                        <div>
                          <p>{selectedDriver.address.street}</p>
                          {selectedDriver.address.city && (
                            <p className="text-muted-foreground">
                              {selectedDriver.address.city},{" "}
                              {selectedDriver.address.state}{" "}
                              {selectedDriver.address.zipCode}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedDriver.currentLocation && (
                    <div>
                      <h4 className="mb-2 font-semibold">Current Location</h4>
                      <div className="text-muted-foreground text-sm">
                        Lat:{" "}
                        {selectedDriver.currentLocation.coordinates[1].toFixed(
                          6,
                        )}
                        , Lng:{" "}
                        {selectedDriver.currentLocation.coordinates[0].toFixed(
                          6,
                        )}
                      </div>
                    </div>
                  )}

                  {selectedDriver.status === "pending" && (
                    <div className="flex gap-2 border-t pt-4">
                      <Button
                        className="flex-1"
                        onClick={() => {
                          if (selectedDriver._id || selectedDriver.id) {
                            approveMutation.mutate(
                              selectedDriver._id || selectedDriver.id!,
                            );
                          }
                          setIsDetailsOpen(false);
                        }}
                        disabled={approveMutation.isPending}
                      >
                        <CheckCircle className="mr-2 h-4 w-4" />
                        Approve Driver
                      </Button>
                      <Button
                        variant="destructive"
                        className="flex-1"
                        onClick={() => {
                          if (selectedDriver._id || selectedDriver.id) {
                            rejectMutation.mutate(
                              selectedDriver._id || selectedDriver.id!,
                            );
                          }
                          setIsDetailsOpen(false);
                        }}
                        disabled={rejectMutation.isPending}
                      >
                        <XCircle className="mr-2 h-4 w-4" />
                        Reject Driver
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Edit Driver Dialog */}
          <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
            <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Driver</DialogTitle>
                <DialogDescription>
                  Update driver information and profile image
                </DialogDescription>
              </DialogHeader>
              {editingDriver && (
                <div className="space-y-6">
                  <div className="space-y-4">
                    {/* Profile Image Upload */}
                    <div className="flex flex-col items-center gap-4">
                      <Avatar className="h-24 w-24">
                        <AvatarImage
                          src={editForm.profileImage}
                          alt={editForm.name}
                        />
                        <AvatarFallback>
                          {editForm.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col items-center gap-2">
                        <Label
                          htmlFor="profile-image"
                          className="cursor-pointer"
                        >
                          <div className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 transition-colors">
                            {isUploading ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Upload className="h-4 w-4" />
                            )}
                            {isUploading ? "Uploading..." : "Upload Image"}
                          </div>
                        </Label>
                        <Input
                          id="profile-image"
                          type="file"
                          accept="image/*"
                          onChange={handleImageUpload}
                          className="hidden"
                          disabled={isUploading}
                        />
                        <p className="text-xs text-muted-foreground text-center">
                          Upload a profile image (JPG, PNG, GIF)
                        </p>
                      </div>
                    </div>

                    {/* Basic Information */}
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="name">Full Name</Label>
                        <Input
                          id="name"
                          value={editForm.name}
                          onChange={(e) =>
                            setEditForm((prev) => ({
                              ...prev,
                              name: e.target.value,
                            }))
                          }
                          placeholder="Driver full name"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                          id="email"
                          type="email"
                          value={editForm.email}
                          onChange={(e) =>
                            setEditForm((prev) => ({
                              ...prev,
                              email: e.target.value,
                            }))
                          }
                          placeholder="driver@example.com"
                        />
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="space-y-2">
                        <Label htmlFor="phone">Phone Number</Label>
                        <Input
                          id="phone"
                          value={editForm.phoneNumber}
                          onChange={(e) =>
                            setEditForm((prev) => ({
                              ...prev,
                              phoneNumber: e.target.value,
                            }))
                          }
                          placeholder="+1234567890"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="status">Status</Label>
                        <Select
                          value={editForm.status}
                          onValueChange={(value) =>
                            setEditForm((prev) => ({ ...prev, status: value }))
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

                    {/* Vehicle Information */}
                    <div className="space-y-4">
                      <h4 className="font-semibold">Vehicle Information</h4>
                      <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                          <Label htmlFor="vehicleType">Vehicle Type</Label>
                          <Select
                            value={editForm.vehicleType}
                            onValueChange={(value) =>
                              setEditForm((prev) => ({
                                ...prev,
                                vehicleType: value,
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select vehicle type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="BIKE">🏍️ Motorbike</SelectItem>
                              <SelectItem value="KEKE_CARGO">
                                🛺 Keke Cargo
                              </SelectItem>
                              <SelectItem value="CAR">🚗 Car</SelectItem>
                              <SelectItem value="VAN">🚐 Van</SelectItem>
                              <SelectItem value="LORRY">🚚 Lorry</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="vehicleNumber">Vehicle Number</Label>
                          <Input
                            id="vehicleNumber"
                            value={editForm.vehicleNumber}
                            onChange={(e) =>
                              setEditForm((prev) => ({
                                ...prev,
                                vehicleNumber: e.target.value,
                              }))
                            }
                            placeholder="ABC-123"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="vehicleColor">Vehicle Color</Label>
                        <Input
                          id="vehicleColor"
                          value={editForm.vehicleColor}
                          onChange={(e) =>
                            setEditForm((prev) => ({
                              ...prev,
                              vehicleColor: e.target.value,
                            }))
                          }
                          placeholder="Red, Blue, White, etc."
                        />
                      </div>
                    </div>

                    {/* Driver Type & Earnings */}
                    <div className="space-y-4">
                      <h4 className="font-semibold">
                        Driver Type &amp; Earnings
                      </h4>
                      <div className="grid gap-4 sm:grid-cols-2">
                        <div className="space-y-2">
                          <Label>Driver Type</Label>
                          <Select
                            value={editForm.driverType}
                            onValueChange={(v) =>
                              setEditForm((prev) => ({
                                ...prev,
                                driverType: v,
                              }))
                            }
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Select driver type" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="SYSTEM">
                                TeranGO (Salaried)
                              </SelectItem>
                              <SelectItem value="THIRD_PARTY">
                                Third-Party (Commission)
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <p className="text-muted-foreground text-xs">
                            {editForm.driverType === "SYSTEM"
                              ? "Salaried — no per-order earnings tracked."
                              : "Earns a commission % per delivery."}
                          </p>
                        </div>
                        {editForm.driverType === "THIRD_PARTY" && (
                          <div className="space-y-2">
                            <Label htmlFor="thirdPartyRate">
                              Third-Party Rate (Commission)
                            </Label>
                            <Input
                              id="thirdPartyRate"
                              type="number"
                              value={editForm.thirdPartyRate}
                              onChange={(e) =>
                                setEditForm((prev) => ({
                                  ...prev,
                                  thirdPartyRate: e.target.value,
                                }))
                              }
                              placeholder="e.g., 0.75 for 75%"
                            />
                            <p className="text-xs text-muted-foreground">
                              Driver gets{" "}
                              {isNaN(parseFloat(editForm.thirdPartyRate))
                                ? "0"
                                : (
                                    parseFloat(editForm.thirdPartyRate) * 100
                                  ).toFixed(0)}
                              % of the delivery fee.
                            </p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-3 border-t pt-4">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => setIsEditOpen(false)}
                        disabled={updateMutation.isPending}
                      >
                        Cancel
                      </Button>
                      <Button
                        className="flex-1"
                        onClick={handleUpdateDriver}
                        disabled={updateMutation.isPending || isUploading}
                      >
                        {updateMutation.isPending ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Updating...
                          </>
                        ) : (
                          <>
                            <Save className="mr-2 h-4 w-4" />
                            Update Driver
                          </>
                        )}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Create Driver Dialog */}
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <UserPlus className="h-5 w-5" />
                  Create New Driver
                </DialogTitle>
                <DialogDescription>
                  Add a new driver to the system. Leave password blank to use
                  default (1234).
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-5 py-2">
                {/* Profile Image */}
                <div className="flex flex-col items-center gap-3">
                  <div className="relative">
                    <div className="h-24 w-24 rounded-full overflow-hidden border-2 border-border bg-muted flex items-center justify-center">
                      {createForm.profileImage ? (
                        <img
                          src={createForm.profileImage}
                          alt="Preview"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <UserPlus className="h-10 w-10 text-muted-foreground" />
                      )}
                    </div>
                    <label
                      htmlFor="create-profile-image"
                      className="absolute bottom-0 right-0 cursor-pointer bg-primary text-primary-foreground rounded-full p-1.5 shadow"
                    >
                      {isCreateUploading ? (
                        <Loader2 className="h-3 w-3 animate-spin" />
                      ) : (
                        <Upload className="h-3 w-3" />
                      )}
                    </label>
                    <input
                      id="create-profile-image"
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleCreateImageUpload}
                      disabled={isCreateUploading}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Click the upload icon to add profile photo
                  </p>
                </div>

                {/* Name + Email */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="create-name">Full Name *</Label>
                    <Input
                      id="create-name"
                      placeholder="John Doe"
                      value={createForm.name}
                      onChange={(e) =>
                        setCreateForm((prev) => ({
                          ...prev,
                          name: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="create-email">Email *</Label>
                    <Input
                      id="create-email"
                      type="email"
                      placeholder="driver@example.com"
                      value={createForm.email}
                      onChange={(e) =>
                        setCreateForm((prev) => ({
                          ...prev,
                          email: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                {/* Phone + Password */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="create-phone">Phone *</Label>
                    <Input
                      id="create-phone"
                      placeholder="+220 123 4567"
                      value={createForm.phone}
                      onChange={(e) =>
                        setCreateForm((prev) => ({
                          ...prev,
                          phone: e.target.value,
                        }))
                      }
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="create-password">Password</Label>
                    <Input
                      id="create-password"
                      type="password"
                      placeholder="Leave blank for default (1234)"
                      value={createForm.password}
                      onChange={(e) =>
                        setCreateForm((prev) => ({
                          ...prev,
                          password: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                {/* Vehicle Type + Vehicle Number */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="create-vehicleType">Vehicle Type *</Label>
                    <Select
                      value={createForm.vehicleType}
                      onValueChange={(value) =>
                        setCreateForm((prev) => ({
                          ...prev,
                          vehicleType: value,
                        }))
                      }
                    >
                      <SelectTrigger id="create-vehicleType">
                        <SelectValue placeholder="Select vehicle type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BIKE">🏍️ Motorbike</SelectItem>
                        <SelectItem value="KEKE_CARGO">
                          🛺 Keke Cargo
                        </SelectItem>
                        <SelectItem value="CAR">🚗 Car</SelectItem>
                        <SelectItem value="VAN">🚐 Van</SelectItem>
                        <SelectItem value="LORRY">🚛 Lorry</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="create-vehicleNumber">Plate Number</Label>
                    <Input
                      id="create-vehicleNumber"
                      placeholder="ABC-123"
                      value={createForm.vehicleNumber}
                      onChange={(e) =>
                        setCreateForm((prev) => ({
                          ...prev,
                          vehicleNumber: e.target.value,
                        }))
                      }
                    />
                  </div>
                </div>

                {/* Vehicle Color */}
                <div className="space-y-2">
                  <Label htmlFor="create-vehicleColor">Vehicle Color</Label>
                  <Input
                    id="create-vehicleColor"
                    placeholder="Red, Blue, White, etc."
                    value={createForm.vehicleColor}
                    onChange={(e) =>
                      setCreateForm((prev) => ({
                        ...prev,
                        vehicleColor: e.target.value,
                      }))
                    }
                  />
                </div>

                {/* Driver Type & Earnings */}
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Driver Type</Label>
                      <Select
                        value={createForm.driverType}
                        onValueChange={(v) =>
                          setCreateForm((prev) => ({
                            ...prev,
                            driverType: v,
                          }))
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select driver type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="SYSTEM">
                            TeranGO (Salaried)
                          </SelectItem>
                          <SelectItem value="THIRD_PARTY">
                            Third-Party
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-muted-foreground text-xs">
                        {createForm.driverType === "SYSTEM"
                          ? "Salaried — no per-order earnings tracked."
                          : "Earns a commission % per delivery."}
                      </p>
                    </div>
                    {createForm.driverType === "THIRD_PARTY" && (
                      <div className="space-y-2">
                        <Label htmlFor="create-thirdPartyRate">
                          Third-Party Rate (Commission)
                        </Label>
                        <Input
                          id="create-thirdPartyRate"
                          type="number"
                          value={createForm.thirdPartyRate}
                          onChange={(e) =>
                            setCreateForm((prev) => ({
                              ...prev,
                              thirdPartyRate: e.target.value,
                            }))
                          }
                          placeholder="e.g., 0.75 for 75%"
                        />
                        <p className="text-xs text-muted-foreground">
                          Driver gets{" "}
                          {isNaN(parseFloat(createForm.thirdPartyRate))
                            ? "0"
                            : (
                                parseFloat(createForm.thirdPartyRate) * 100
                              ).toFixed(0)}
                          % of the delivery fee.
                        </p>
                      </div>
                    )}
                  </div>

                  {/* <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="thirdPartyRate">
                        Third-Party Rate (Commission)
                      </Label>
                      <Input
                        id="thirdPartyRate"
                        type="number"
                        value={editForm.thirdPartyRate}
                        onChange={(e) =>
                          setEditForm((prev) => ({
                            ...prev,
                            thirdPartyRate: e.target.value,
                          }))
                        }
                        placeholder="e.g., 0.75 for 75%"
                      />
                      <p className="text-xs text-muted-foreground">
                        Driver gets{" "}
                        {isNaN(parseFloat(editForm.thirdPartyRate))
                          ? "0"
                          : (parseFloat(editForm.thirdPartyRate) * 100).toFixed(
                              0,
                            )}
                        % of the delivery fee.
                      </p>
                    </div>
                  </div> */}

                  <div className="flex gap-3 border-t pt-4">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => setIsCreateOpen(false)}
                      disabled={createMutation.isPending}
                    >
                      Cancel
                    </Button>
                    <Button
                      className="flex-1"
                      onClick={() => {
                        if (
                          !createForm.name ||
                          !createForm.email ||
                          !createForm.phone
                        ) {
                          toast.error("Name, email, and phone are required");
                          return;
                        }
                        const payload: any = { ...createForm };
                        if (!payload.password) delete payload.password;
                        createMutation.mutate(payload);
                      }}
                      disabled={createMutation.isPending || isCreateUploading}
                    >
                      {createMutation.isPending ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Creating...
                        </>
                      ) : (
                        <>
                          <UserPlus className="mr-2 h-4 w-4" />
                          Create Driver
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </Main>
    </>
  );
}

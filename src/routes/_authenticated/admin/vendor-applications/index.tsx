import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  Clock,
  CheckCircle,
  XCircle,
  Users,
  FileText,
  RefreshCw,
  Search,
  Eye,
  Building2,
  Mail,
  Phone,
  MoreVertical,
  List,
  LayoutGrid,
  Inbox,
  Star,
  Briefcase,
  FileDown,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { ProfileDropdown } from "@/components/profile-dropdown";
import { ThemeSwitch } from "@/components/theme-switch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
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
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";

// Data Interfaces
interface VendorApplication {
  id: string;
  businessName: string;
  businessType: "RESTAURANT" | "SHOP" | "PHARMACY";
  description?: string;
  businessAddress: string;
  businessPhone?: string;
  businessEmail?: string;
  experience?: string;
  documents?: Record<string, unknown>;
  status: "PENDING" | "APPROVED" | "REJECTED" | "WAITING_LIST";
  reviewNotes?: string;
  createdAt: string;
  updatedAt: string;
  reviewedAt?: string;
  user: {
    id: string;
    fullName: string | null;
    email: string | null;
    phone: string;
  };
  category?: {
    id: string;
    name: string;
  } | null;
}

interface ApplicationStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  waitingList: number;
}

// Route Definition
export const Route = createFileRoute(
  "/_authenticated/admin/vendor-applications/",
)({
  component: VendorApplicationsPage,
});

// Main Page Component
function VendorApplicationsPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [viewLayout, setViewLayout] = useState<"grid" | "list">("grid");
  const [selectedApplication, setSelectedApplication] =
    useState<VendorApplication | null>(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{
    type: "approve" | "reject" | "waitlist";
    applicationId: string;
    businessName: string;
  } | null>(null);
  const [reviewNotes, setReviewNotes] = useState("");
  const queryClient = useQueryClient();

  // Data Fetching
  const {
    data: applicationsData,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ["vendor-applications"],
    queryFn: async () => {
      const response = await api.get(
        `/api/vendor-applications/admin/all?limit=200`,
      );
      return response.data.applications as VendorApplication[];
    },
  });

  const stats: ApplicationStats = useMemo(() => {
    const apps = applicationsData || [];
    return {
      total: apps.length,
      pending: apps.filter((a) => a.status === "PENDING").length,
      approved: apps.filter((a) => a.status === "APPROVED").length,
      rejected: apps.filter((a) => a.status === "REJECTED").length,
      waitingList: apps.filter((a) => a.status === "WAITING_LIST").length,
    };
  }, [applicationsData]);

  // Mutations
  const updateStatusMutation = useMutation({
    mutationFn: async ({
      applicationId,
      status,
      notes,
    }: {
      applicationId: string;
      status: VendorApplication["status"];
      notes?: string;
    }) => {
      const response = await api.patch(
        `/api/vendor-applications/admin/${applicationId}/status`,
        { status, reviewNotes: notes },
      );
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["vendor-applications"] });
      toast.success(
        `Application status updated to ${variables.status.replace("_", " ")}`,
      );
      setShowDetailsDialog(false);
      setShowConfirmDialog(false);
      setReviewNotes("");
      setConfirmAction(null);
    },
    onError: (error) => {
      console.error("Failed to update status:", error);
      toast.error("Failed to update application status. Please try again.");
      setShowConfirmDialog(false);
    },
  });

  // Filtering Logic
  const filteredApplications = useMemo(() => {
    return (applicationsData || []).filter((app) => {
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch =
        app.businessName.toLowerCase().includes(searchLower) ||
        (app.user.fullName &&
          app.user.fullName.toLowerCase().includes(searchLower)) ||
        (app.user.email &&
          app.user.email.toLowerCase().includes(searchLower)) ||
        app.businessType.toLowerCase().includes(searchLower);

      const matchesStatus =
        statusFilter === "all" || app.status === statusFilter.toUpperCase();

      return matchesSearch && matchesStatus;
    });
  }, [applicationsData, searchQuery, statusFilter]);

  // Event Handlers
  const handleAction = (
    type: "approve" | "reject" | "waitlist",
    application: VendorApplication,
  ) => {
    setConfirmAction({
      type,
      applicationId: application.id,
      businessName: application.businessName,
    });
    setReviewNotes(application.reviewNotes || "");
    setShowConfirmDialog(true);
  };

  const handleConfirmAction = () => {
    if (!confirmAction) return;

    const statusMap = {
      approve: "APPROVED",
      reject: "REJECTED",
      waitlist: "WAITING_LIST",
    };
    const status = statusMap[confirmAction.type] as VendorApplication["status"];
    const notes = reviewNotes || `Application ${status.toLowerCase()}`;

    updateStatusMutation.mutate({
      applicationId: confirmAction.applicationId,
      status,
      notes,
    });
  };

  const handleViewDetails = (application: VendorApplication) => {
    setSelectedApplication(application);
    setReviewNotes(application.reviewNotes || "");
    setShowDetailsDialog(true);
  };

  // UI Components
  const StatCard = ({
    title,
    value,
    icon,
    color,
    borderColor,
    onClick,
  }: {
    title: string;
    value: number;
    icon: React.ElementType;
    color: string;
    borderColor: string;
    onClick: () => void;
  }) => {
    const Icon = icon;
    const isActive = statusFilter.toUpperCase() === title.toUpperCase();
    return (
      <Card
        className={cn(
          "border-l-4 shadow-sm cursor-pointer transition-all hover:shadow-md",
          borderColor,
          isActive && "ring-2 ring-offset-1 ring-primary/30",
        )}
        onClick={onClick}
      >
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
          <Icon className={cn("h-4 w-4", color)} />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{value}</div>
        </CardContent>
      </Card>
    );
  };

  if (isLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-center">
          <RefreshCw className="h-8 w-8 animate-spin text-muted-foreground" />
          <p className="text-muted-foreground text-sm">Loading applications...</p>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider>
      <Header fixed>
        <div className="ms-auto flex items-center gap-2">
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
      <div className="container mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold tracking-tight">
              Vendor Applications
            </h1>
            <p className="text-muted-foreground text-sm mt-1">
              Review and manage new vendor partnerships.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              onClick={() => refetch()}
              variant="outline"
              size="sm"
              className="shadow-sm"
              disabled={isLoading}
            >
              <RefreshCw className={cn("mr-2 h-4 w-4", isLoading && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
          <StatCard
            title="Total"
            value={stats.total}
            icon={FileText}
            color="text-primary"
            borderColor="border-l-primary"
            onClick={() => setStatusFilter("all")}
          />
          <StatCard
            title="Pending"
            value={stats.pending}
            icon={Clock}
            color="text-amber-500"
            borderColor="border-l-amber-500"
            onClick={() => setStatusFilter("pending")}
          />
          <StatCard
            title="Waiting List"
            value={stats.waitingList}
            icon={Eye}
            color="text-blue-500"
            borderColor="border-l-blue-500"
            onClick={() => setStatusFilter("waiting_list")}
          />
          <StatCard
            title="Approved"
            value={stats.approved}
            icon={CheckCircle}
            color="text-emerald-500"
            borderColor="border-l-emerald-500"
            onClick={() => setStatusFilter("approved")}
          />
          <StatCard
            title="Rejected"
            value={stats.rejected}
            icon={XCircle}
            color="text-destructive"
            borderColor="border-l-destructive"
            onClick={() => setStatusFilter("rejected")}
          />
        </div>

        {/* Filters & View Toggle */}
        <Card className="shadow-sm overflow-hidden">
          <CardHeader className="border-b pb-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Search by business, applicant, email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 w-[260px]"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="h-9 w-[180px]">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="WAITING_LIST">Waiting List</SelectItem>
                  <SelectItem value="APPROVED">Approved</SelectItem>
                  <SelectItem value="REJECTED">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <div className="flex items-center rounded-md bg-muted p-1">
                <Button
                  variant={viewLayout === "grid" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setViewLayout("grid")}
                >
                  <LayoutGrid className="h-4 w-4" />
                </Button>
                <Button
                  variant={viewLayout === "list" ? "secondary" : "ghost"}
                  size="sm"
                  onClick={() => setViewLayout("list")}
                >
                  <List className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {/* Applications List/Grid */}
        {filteredApplications && filteredApplications.length > 0 ? (
          <div
            className={cn(
              "grid gap-6",
              viewLayout === "grid"
                ? "grid-cols-1 md:grid-cols-2 lg:grid-cols-3"
                : "grid-cols-1",
            )}
          >
            {filteredApplications.map((app) => (
              <ApplicationCard
                key={app.id}
                application={app}
                onViewDetails={() => handleViewDetails(app)}
                onAction={handleAction}
                layout={viewLayout}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-center">
            <Inbox className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
            <p className="text-lg font-medium">No Applications Found</p>
            <p className="text-sm text-muted-foreground mt-1">
              Try adjusting your search or filter criteria.
            </p>
          </div>
        )}

        {/* Dialogs */}
        {selectedApplication && (
          <ApplicationDetailsDialog
            isOpen={showDetailsDialog}
            setIsOpen={setShowDetailsDialog}
            application={selectedApplication}
            reviewNotes={reviewNotes}
            setReviewNotes={setReviewNotes}
            onAction={handleAction}
            isUpdating={updateStatusMutation.isPending}
          />
        )}

        {confirmAction && (
          <ConfirmationDialog
            isOpen={showConfirmDialog}
            setIsOpen={setShowConfirmDialog}
            action={confirmAction}
            onConfirm={handleConfirmAction}
            reviewNotes={reviewNotes}
            setReviewNotes={setReviewNotes}
            isConfirming={updateStatusMutation.isPending}
          />
        )}
      </div>
      </Main>
    </TooltipProvider>
  );
}

// Application Card Component
const ApplicationCard = ({
  application,
  onViewDetails,
  onAction,
  layout,
}: {
  application: VendorApplication;
  onViewDetails: () => void;
  onAction: (
    type: "approve" | "reject" | "waitlist",
    app: VendorApplication,
  ) => void;
  layout: "grid" | "list";
}) => {
  const StatusBadge = ({ status }: { status: VendorApplication["status"] }) => {
    const variants: Record<VendorApplication["status"], string> = {
      APPROVED: "bg-emerald-500 hover:bg-emerald-600 text-white shadow-sm",
      REJECTED: "bg-destructive text-destructive-foreground shadow-sm",
      WAITING_LIST: "border-blue-400 text-blue-600 bg-blue-50 dark:bg-blue-950/20",
      PENDING: "border-amber-400 text-amber-600 bg-amber-50 dark:bg-amber-950/20",
    };
    const icons = {
      APPROVED: CheckCircle,
      REJECTED: XCircle,
      WAITING_LIST: Eye,
      PENDING: Clock,
    };
    const Icon = icons[status];
    const isOutline = status === "WAITING_LIST" || status === "PENDING";
    return (
      <Badge variant={isOutline ? "outline" : undefined} className={cn("flex items-center gap-1.5", variants[status])}>
        <Icon className="h-3 w-3" />
        {status.replace("_", " ")}
      </Badge>
    );
  };

  const content = (
    <>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div className="flex-1">
          <CardTitle className="text-lg">{application.businessName}</CardTitle>
          <CardDescription className="flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            {application.businessType}
          </CardDescription>
        </div>
        <div className="flex-shrink-0">
          <StatusBadge status={application.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex items-center gap-2">
          <Users className="h-4 w-4 text-muted-foreground" />
          <span>{application.user.fullName || "N/A"}</span>
        </div>
        <div className="flex items-center gap-2">
          <Mail className="h-4 w-4 text-muted-foreground" />
          <span>{application.user.email || "N/A"}</span>
        </div>
        <div className="flex items-center gap-2">
          <Phone className="h-4 w-4 text-muted-foreground" />
          <span>{application.user.phone}</span>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <p className="text-xs text-muted-foreground">
          Applied: {new Date(application.createdAt).toLocaleDateString()}
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={onViewDetails}>
            <Eye className="mr-2 h-4 w-4" />
            Details
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {application.status === "PENDING" && (
                <>
                  <DropdownMenuItem
                    onClick={() => onAction("approve", application)}
                  >
                    <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                    Approve
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onAction("waitlist", application)}
                  >
                    <Eye className="mr-2 h-4 w-4 text-blue-500" />
                    Add to Waitlist
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onAction("reject", application)}
                    className="text-red-500 focus:text-red-500"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Reject
                  </DropdownMenuItem>
                </>
              )}
              {application.status === "WAITING_LIST" && (
                <>
                  <DropdownMenuItem
                    onClick={() => onAction("approve", application)}
                  >
                    <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                    Approve
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => onAction("reject", application)}
                    className="text-red-500 focus:text-red-500"
                  >
                    <XCircle className="mr-2 h-4 w-4" />
                    Reject
                  </DropdownMenuItem>
                </>
              )}
              {application.status === "APPROVED" && (
                <DropdownMenuItem disabled>
                  <CheckCircle className="mr-2 h-4 w-4 text-gray-400" />
                  Already Approved
                </DropdownMenuItem>
              )}
              {application.status === "REJECTED" && (
                <DropdownMenuItem disabled>
                  <XCircle className="mr-2 h-4 w-4 text-gray-400" />
                  Already Rejected
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </CardFooter>
    </>
  );

  if (layout === "list") {
    return (
      <Card className="shadow-sm transition-all hover:shadow-md">
        <div className="flex items-center justify-between">
          <div className="flex flex-1 items-center">
            <div className="p-4">
              <p className="font-semibold">{application.businessName}</p>
              <p className="text-sm text-muted-foreground">
                {application.user.fullName}
              </p>
            </div>
            <Separator orientation="vertical" className="h-16" />
            <div className="hidden p-4 md:block">
              <p className="text-sm font-semibold">Contact</p>
              <p className="text-sm text-muted-foreground">
                {application.user.email}
              </p>
            </div>
            <Separator
              orientation="vertical"
              className="h-16 hidden md:block"
            />
            <div className="hidden p-4 lg:block">
              <p className="text-sm font-semibold">Applied</p>
              <p className="text-sm text-muted-foreground">
                {new Date(application.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
          <div className="p-4 flex items-center gap-4">
            <StatusBadge status={application.status} />
            <Button variant="outline" size="sm" onClick={onViewDetails}>
              <Eye className="mr-2 h-4 w-4" />
              Details
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => onAction("approve", application)}
                >
                  <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                  Approve
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onAction("waitlist", application)}
                >
                  <Eye className="mr-2 h-4 w-4 text-blue-500" />
                  Add to Waitlist
                </DropdownMenuItem>
                <DropdownMenuItem
                  onClick={() => onAction("reject", application)}
                  className="text-red-500 focus:text-red-500"
                >
                  <XCircle className="mr-2 h-4 w-4" />
                  Reject
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <Card className="flex flex-col justify-between shadow-sm transition-all hover:shadow-md">
      {content}
    </Card>
  );
};

// Details Dialog Component
const ApplicationDetailsDialog = ({
  isOpen,
  setIsOpen,
  application,
  reviewNotes,
  setReviewNotes,
  onAction,
  isUpdating,
}: {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  application: VendorApplication;
  reviewNotes: string;
  setReviewNotes: (notes: string) => void;
  onAction: (
    type: "approve" | "reject" | "waitlist",
    app: VendorApplication,
  ) => void;
  isUpdating: boolean;
}) => {
  const InfoRow = ({
    label,
    value,
    icon,
  }: {
    label: string;
    value?: string | null;
    icon: React.ElementType;
  }) => {
    const Icon = icon;
    return (
      <div>
        <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Icon className="h-4 w-4" /> {label}
        </p>
        <p className="pl-6 font-medium">{value || "N/A"}</p>
      </div>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl">
            {application.businessName}
          </DialogTitle>
          <DialogDescription>
            Application submitted on{" "}
            {new Date(application.createdAt).toLocaleString()}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-8 py-4 md:grid-cols-2">
          {/* Left Column */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" /> Business Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <InfoRow
                  label="Business Type"
                  value={application.businessType}
                  icon={Briefcase}
                />
                <InfoRow
                  label="Category"
                  value={application.category?.name}
                  icon={Star}
                />
                <InfoRow
                  label="Address"
                  value={application.businessAddress}
                  icon={Mail}
                />
                <div className="col-span-2">
                  <p className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <FileText className="h-4 w-4" /> Description
                  </p>
                  <p className="pl-6 text-sm">
                    {application.description || "No description provided."}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" /> Applicant Details
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <InfoRow
                  label="Full Name"
                  value={application.user.fullName}
                  icon={Users}
                />
                <InfoRow
                  label="Contact Phone"
                  value={application.user.phone}
                  icon={Phone}
                />
                <InfoRow
                  label="Contact Email"
                  value={application.user.email}
                  icon={Mail}
                />
              </CardContent>
            </Card>
          </div>

          {/* Right Column */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Review & Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium" htmlFor="reviewNotes">
                    Review Notes
                  </label>
                  <Textarea
                    id="reviewNotes"
                    placeholder="Add internal notes about this application..."
                    value={reviewNotes}
                    onChange={(e) => setReviewNotes(e.target.value)}
                    rows={5}
                    className="mt-1"
                  />
                  {application.reviewNotes && (
                    <p className="text-muted-foreground mt-2 text-xs">
                      <strong>Previous notes:</strong> {application.reviewNotes}
                    </p>
                  )}
                </div>
                {application.documents && (
                  <Button variant="outline" className="w-full">
                    <FileDown className="mr-2 h-4 w-4" />
                    Download Documents
                  </Button>
                )}
              </CardContent>
            </Card>

            {application.status !== "APPROVED" && (
              <div className="space-y-2">
                <Button
                  onClick={() => onAction("approve", application)}
                  className="w-full bg-emerald-500 hover:bg-emerald-600 shadow-sm"
                  disabled={isUpdating}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Approve Application
                </Button>
                <div className="flex gap-2">
                  {application.status !== "WAITING_LIST" && (
                    <Button
                      onClick={() => onAction("waitlist", application)}
                      variant="secondary"
                      className="flex-1"
                      disabled={isUpdating}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Waitlist
                    </Button>
                  )}
                  {application.status !== "REJECTED" && (
                    <Button
                      onClick={() => onAction("reject", application)}
                      variant="destructive"
                      className="flex-1"
                      disabled={isUpdating}
                    >
                      <XCircle className="mr-2 h-4 w-4" />
                      Reject
                    </Button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// Confirmation Dialog Component
const ConfirmationDialog = ({
  isOpen,
  setIsOpen,
  action,
  onConfirm,
  reviewNotes,
  setReviewNotes,
  isConfirming,
}: {
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  action: {
    type: "approve" | "reject" | "waitlist";
    businessName: string;
  };
  onConfirm: () => void;
  reviewNotes: string;
  setReviewNotes: (notes: string) => void;
  isConfirming: boolean;
}) => {
  const details = {
    approve: {
      title: "Confirm Approval",
      icon: CheckCircle,
      color: "green",
      description:
        "The vendor will be granted access to the platform and a vendor account will be created.",
    },
    reject: {
      title: "Confirm Rejection",
      icon: XCircle,
      color: "red",
      description:
        "This will permanently reject the application. This action cannot be undone.",
    },
    waitlist: {
      title: "Confirm Waitlist",
      icon: Eye,
      color: "blue",
      description:
        "The application will be moved to the waiting list for future consideration.",
    },
  };
  const current = details[action.type];
  const Icon = current.icon;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Icon className={`h-5 w-5 text-${current.color}-600`} />
            {current.title}
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <p>
            You are about to {action.type} the application for{" "}
            <strong className="font-semibold">{action.businessName}</strong>.
          </p>
          <p className="text-muted-foreground text-sm">{current.description}</p>
          <div>
            <label htmlFor="confirmReviewNotes" className="text-sm font-medium">
              Add or update review notes (optional)
            </label>
            <Textarea
              id="confirmReviewNotes"
              value={reviewNotes}
              onChange={(e) => setReviewNotes(e.target.value)}
              placeholder="e.g., Approved due to high demand in the area."
              className="mt-1"
            />
          </div>
        </div>
        <DialogFooter className="gap-2 sm:justify-end">
          <Button
            type="button"
            variant="secondary"
            onClick={() => setIsOpen(false)}
            disabled={isConfirming}
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isConfirming}
            className={`bg-${current.color}-600 hover:bg-${current.color}-700`}
          >
            {isConfirming ? "Processing..." : `Yes, ${action.type}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

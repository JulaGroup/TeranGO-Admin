// @ts-nocheck
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Phone,
  Mail,
  MapPin,
  Building2,
  Check,
  X,
  Clock,
  ListChecks,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import { kerspaceApi } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const STATUS_META: Record<string, { label: string; cls: string }> = {
  PENDING: { label: "Pending", cls: "bg-amber-100 text-amber-800" },
  APPROVED: { label: "Approved", cls: "bg-green-100 text-green-800" },
  REJECTED: { label: "Rejected", cls: "bg-red-100 text-red-800" },
  WAITING_LIST: { label: "Waitlisted", cls: "bg-slate-100 text-slate-700" },
};

export function AgentApplicationsTab() {
  const qc = useQueryClient();
  const [filter, setFilter] = useState("PENDING");

  const { data, isLoading } = useQuery({
    queryKey: ["kerspace-agent-applications", filter],
    queryFn: () =>
      kerspaceApi
        .getAgentApplications(filter === "ALL" ? {} : { status: filter })
        .then((r) => r.data),
  });
  const applications = data?.data || [];

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      kerspaceApi.updateAgentApplicationStatus(id, { status }),
    onSuccess: (_d, v) => {
      toast.success(
        v.status === "APPROVED"
          ? "Approved — agent account created"
          : "Application updated",
      );
      qc.invalidateQueries({ queryKey: ["kerspace-agent-applications"] });
      qc.invalidateQueries({ queryKey: ["kerspace-agents"] });
    },
    onError: (e: any) =>
      toast.error(e?.response?.data?.error || "Failed to update application"),
  });

  const FILTERS = ["PENDING", "APPROVED", "WAITING_LIST", "REJECTED", "ALL"];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <Button
            key={f}
            variant={filter === f ? "default" : "outline"}
            size="sm"
            onClick={() => setFilter(f)}
          >
            {f === "ALL" ? "All" : STATUS_META[f]?.label || f}
          </Button>
        ))}
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i}>
              <CardContent className="pt-6">
                <Skeleton className="h-5 w-1/3 mb-2" />
                <Skeleton className="h-4 w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : applications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <ListChecks className="h-10 w-10 text-muted-foreground opacity-50 mb-3" />
          <p className="font-medium">No applications</p>
          <p className="text-sm text-muted-foreground mt-1">
            Agent applications from the app show up here for review.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {applications.map((app: any) => {
            const meta = STATUS_META[app.status] || STATUS_META.PENDING;
            return (
              <Card key={app.id}>
                <CardContent className="pt-6">
                  <div className="flex flex-col md:flex-row md:items-center gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-semibold">
                          {app.companyName || app.fullName}
                        </p>
                        <Badge className={`border-0 ${meta.cls}`}>
                          {meta.label}
                        </Badge>
                        <Badge variant="outline">
                          {app.type === "COMPANY" ? "Company" : "Individual"}
                        </Badge>
                      </div>
                      <div className="mt-1 text-xs text-muted-foreground flex flex-wrap gap-x-4 gap-y-1">
                        <span className="flex items-center gap-1">
                          <Phone className="h-3 w-3" /> {app.phone}
                        </span>
                        {app.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" /> {app.email}
                          </span>
                        )}
                        {app.city && (
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" /> {app.city}
                          </span>
                        )}
                        {app.licenseNo && (
                          <span className="flex items-center gap-1">
                            <Building2 className="h-3 w-3" /> Lic.{" "}
                            {app.licenseNo}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {new Date(app.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    {app.status === "PENDING" && (
                      <div className="flex gap-2 shrink-0">
                        <Button
                          size="sm"
                          onClick={() =>
                            statusMutation.mutate({
                              id: app.id,
                              status: "APPROVED",
                            })
                          }
                          disabled={statusMutation.isPending}
                        >
                          {statusMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="h-4 w-4 mr-1" />
                          )}
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            statusMutation.mutate({
                              id: app.id,
                              status: "WAITING_LIST",
                            })
                          }
                        >
                          Waitlist
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-destructive"
                          onClick={() =>
                            statusMutation.mutate({
                              id: app.id,
                              status: "REJECTED",
                            })
                          }
                        >
                          <X className="h-4 w-4 mr-1" /> Reject
                        </Button>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

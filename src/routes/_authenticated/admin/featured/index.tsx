import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
import { toast } from "sonner";
import { Star, Eye, TrendingUp, Calendar } from "lucide-react";
import axios from "axios";
import { useState } from "react";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

interface FeaturedVendor {
  id: string;
  vendorId: string;
  featureType: string;
  startDate: string;
  endDate: string;
  priority: number;
  isActive: boolean;
  viewCount: number;
  clickCount: number;
  vendor: {
    id: string;
    businessName: string;
    storeType: string;
  };
}

interface Vendor {
  id: string;
  businessName: string;
  storeType: string;
  email: string;
}

export const Route = createFileRoute("/_authenticated/admin/featured/")({
  component: AdminFeaturedPage,
});

function AdminFeaturedPage() {
  const queryClient = useQueryClient();
  const [selectedVendorId, setSelectedVendorId] = useState("");
  const [featureType, setFeatureType] = useState("HOMEPAGE_BANNER");
  const [priority, setPriority] = useState("5");
  const [durationDays, setDurationDays] = useState("30");

  // Fetch all vendors
  const { data: vendors } = useQuery({
    queryKey: ["all-vendors"],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_URL}/api/admin/vendors`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data.vendors as Vendor[];
    },
  });

  // Fetch featured vendors
  const { data: featuredVendors, isLoading } = useQuery({
    queryKey: ["featured-vendors"],
    queryFn: async () => {
      const token = localStorage.getItem("token");
      const response = await axios.get(`${API_URL}/api/subscriptions/admin/featured`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return response.data.featured as FeaturedVendor[];
    },
  });

  // Set featured vendor mutation
  const setFeaturedMutation = useMutation({
    mutationFn: async () => {
      const token = localStorage.getItem("token");
      const response = await axios.post(
        `${API_URL}/api/subscriptions/admin/featured/vendor`,
        {
          vendorId: selectedVendorId,
          featureType,
          priority: parseInt(priority),
          durationDays: parseInt(durationDays),
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    },
    onSuccess: () => {
      toast.success("Vendor featured successfully!");
      queryClient.invalidateQueries({ queryKey: ["featured-vendors"] });
      setSelectedVendorId("");
      setFeatureType("HOMEPAGE_BANNER");
      setPriority("5");
      setDurationDays("30");
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || "Failed to feature vendor");
    },
  });

  // Remove featured mutation
  const removeFeaturedMutation = useMutation({
    mutationFn: async (featuredId: string) => {
      const token = localStorage.getItem("token");
      const response = await axios.delete(
        `${API_URL}/api/subscriptions/admin/featured/${featuredId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      return response.data;
    },
    onSuccess: () => {
      toast.success("Featured status removed");
      queryClient.invalidateQueries({ queryKey: ["featured-vendors"] });
    },
    onError: (error: Error & { response?: { data?: { message?: string } } }) => {
      toast.error(error.response?.data?.message || "Failed to remove featured status");
    },
  });

  const stats = {
    totalFeatured: featuredVendors?.length || 0,
    active: featuredVendors?.filter((f) => f.isActive).length || 0,
    totalViews: featuredVendors?.reduce((sum, f) => sum + f.viewCount, 0) || 0,
    totalClicks: featuredVendors?.reduce((sum, f) => sum + f.clickCount, 0) || 0,
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading featured vendors...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Featured Vendors Management</h1>
        <p className="text-muted-foreground">
          Manage featured placements and priority listings for vendors
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Featured
            </CardTitle>
            <Star className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalFeatured}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Now
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{stats.active}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Views
            </CardTitle>
            <Eye className="h-4 w-4 text-blue-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{stats.totalViews.toLocaleString()}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Click Rate
            </CardTitle>
            <Calendar className="h-4 w-4 text-purple-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-purple-600">
              {stats.totalViews > 0
                ? ((stats.totalClicks / stats.totalViews) * 100).toFixed(1)
                : 0}%
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Add Featured Form */}
      <Card>
        <CardHeader>
          <CardTitle>Feature a Vendor</CardTitle>
          <CardDescription>
            Select a vendor and configure their featured placement
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="space-y-2">
              <Label>Vendor</Label>
              <Select value={selectedVendorId} onValueChange={setSelectedVendorId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  {vendors?.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id}>
                      {vendor.businessName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Feature Type</Label>
              <Select value={featureType} onValueChange={setFeatureType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HOMEPAGE_BANNER">Homepage Banner</SelectItem>
                  <SelectItem value="CATEGORY_FEATURED">Category Featured</SelectItem>
                  <SelectItem value="TOP_PLACEMENT">Top Placement</SelectItem>
                  <SelectItem value="VENDOR_SPOTLIGHT">Vendor Spotlight</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Priority (1-10)</Label>
              <Input
                type="number"
                min="1"
                max="10"
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label>Duration (Days)</Label>
              <Input
                type="number"
                min="1"
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value)}
              />
            </div>

            <div className="flex items-end">
              <Button
                className="w-full"
                onClick={() => setFeaturedMutation.mutate()}
                disabled={!selectedVendorId || setFeaturedMutation.isPending}
              >
                {setFeaturedMutation.isPending ? "Adding..." : "Feature Vendor"}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Featured Vendors Table */}
      <Card>
        <CardHeader>
          <CardTitle>Featured Vendors List</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendor</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Feature Type</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Start Date</TableHead>
                <TableHead>End Date</TableHead>
                <TableHead className="text-right">Views</TableHead>
                <TableHead className="text-right">Clicks</TableHead>
                <TableHead className="text-right">CTR</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {featuredVendors?.map((featured) => {
                const ctr = featured.viewCount > 0
                  ? ((featured.clickCount / featured.viewCount) * 100).toFixed(1)
                  : "0.0";

                return (
                  <TableRow key={featured.id}>
                    <TableCell className="font-medium">
                      {featured.vendor.businessName}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">{featured.vendor.storeType}</Badge>
                    </TableCell>
                    <TableCell>{featured.featureType}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{featured.priority}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={featured.isActive ? "default" : "secondary"}>
                        {featured.isActive ? "Active" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(featured.startDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      {new Date(featured.endDate).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">{featured.viewCount}</TableCell>
                    <TableCell className="text-right">{featured.clickCount}</TableCell>
                    <TableCell className="text-right">{ctr}%</TableCell>
                    <TableCell>
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={() => removeFeaturedMutation.mutate(featured.id)}
                        disabled={removeFeaturedMutation.isPending}
                      >
                        Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {featuredVendors?.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No featured vendors yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

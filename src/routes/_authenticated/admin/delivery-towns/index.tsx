import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/lib/api";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { TopNav } from "@/components/layout/top-nav";
import { ProfileDropdown } from "@/components/profile-dropdown";
import { ThemeSwitch } from "@/components/theme-switch";
import { ConfigDrawer } from "@/components/config-drawer";
import { Search as SearchInput } from "@/components/search";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { MapPin, Plus, Edit, Trash2, Search, ToggleLeft, ToggleRight, Map } from "lucide-react";
import { DeliveryTownsMap } from "@/components/delivery-towns-map";

export const Route = createFileRoute("/_authenticated/admin/delivery-towns/")({
  component: DeliveryTownsPage,
});

interface DeliveryTown {
  id: string;
  name: string;
  area: string;
  latitude: number;
  longitude: number;
  deliveryZone: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

const topNav = [
  { title: "Overview", href: "/admin", isActive: false },
  { title: "Delivery Towns", href: "/admin/delivery-towns", isActive: true },
  { title: "Settings", href: "/admin/settings", isActive: false },
];

function DeliveryTownsPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [zoneFilter, setZoneFilter] = useState<string>("all");
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingTown, setEditingTown] = useState<DeliveryTown | null>(null);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    area: "",
    latitude: "",
    longitude: "",
    deliveryZone: "zone1",
  });

  // Fetch towns
  const { data: townsData, isLoading, error } = useQuery({
    queryKey: ["delivery-towns", zoneFilter, searchQuery],
    queryFn: async () => {
      const params = new URLSearchParams();
      if (zoneFilter !== "all") params.append("deliveryZone", zoneFilter);
      if (searchQuery) params.append("search", searchQuery);

      const response = await adminApi.get(`/api/admin/delivery-towns?${params.toString()}`);
      console.log("API Response:", response.data);
      return response.data;
    },
  });

  const towns = townsData?.data || [];
  
  // Debug logging
  if (error) {
    console.error("Query error:", error);
  }

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await adminApi.post("/api/admin/delivery-towns", data);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Delivery town created successfully");
      queryClient.invalidateQueries({ queryKey: ["delivery-towns"] });
      setIsCreateOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to create delivery town");
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await adminApi.put(`/api/admin/delivery-towns/${id}`, data);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Delivery town updated successfully");
      queryClient.invalidateQueries({ queryKey: ["delivery-towns"] });
      setIsEditOpen(false);
      setEditingTown(null);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to update delivery town");
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await adminApi.delete(`/api/admin/delivery-towns/${id}`);
      return response.data;
    },
    onSuccess: () => {
      toast.success("Delivery town deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["delivery-towns"] });
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to delete delivery town");
    },
  });

  // Toggle active mutation
  const toggleMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await adminApi.patch(`/api/admin/delivery-towns/${id}/toggle`);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["delivery-towns"] });
      toast.success("Town status updated");
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || "Failed to toggle status");
    },
  });

  const resetForm = () => {
    setFormData({
      name: "",
      area: "",
      latitude: "",
      longitude: "",
      deliveryZone: "zone1",
    });
    setSelectedLocation(null);
  };

  const handleCloseCreate = (open: boolean) => {
    setIsCreateOpen(open);
    if (!open) {
      resetForm();
    }
  };

  const handleCloseEdit = (open: boolean) => {
    setIsEditOpen(open);
    if (!open) {
      resetForm();
      setEditingTown(null);
    }
  };

  const handleCreate = () => {
    if (!formData.name || !formData.area || !formData.latitude || !formData.longitude) {
      toast.error("Please fill all required fields");
      return;
    }
    
    const payload = {
      name: formData.name,
      area: formData.area,
      latitude: parseFloat(formData.latitude),
      longitude: parseFloat(formData.longitude),
      deliveryZone: formData.deliveryZone,
    };
    
    console.log("Creating town with payload:", payload);
    createMutation.mutate(payload);
  };

  const handleEdit = (town: DeliveryTown) => {
    setEditingTown(town);
    setFormData({
      name: town.name,
      area: town.area,
      latitude: town.latitude.toString(),
      longitude: town.longitude.toString(),
      deliveryZone: town.deliveryZone,
    });
    setSelectedLocation({ lat: town.latitude, lng: town.longitude });
    setIsEditOpen(true);
  };

  const handleUpdate = () => {
    if (!editingTown) return;
    if (!formData.name || !formData.area || !formData.latitude || !formData.longitude) {
      toast.error("Please fill all required fields");
      return;
    }
    
    const payload = {
      name: formData.name,
      area: formData.area,
      latitude: parseFloat(formData.latitude),
      longitude: parseFloat(formData.longitude),
      deliveryZone: formData.deliveryZone,
    };
    
    console.log("Updating town with payload:", payload);
    updateMutation.mutate({ id: editingTown.id, data: payload });
  };

  const handleMapClick = (lat: number, lng: number) => {
    setSelectedLocation({ lat, lng });
    setFormData({
      ...formData,
      latitude: lat.toFixed(6),
      longitude: lng.toFixed(6),
    });
    toast.success(`Coordinates set: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
  };

  const handleDelete = (id: string, name: string) => {
    if (window.confirm(`Are you sure you want to delete "${name}"?`)) {
      deleteMutation.mutate(id);
    }
  };

  const getZoneBadgeColor = (zone: string) => {
    switch (zone) {
      case "zone1":
        return "default";
      case "zone2":
        return "secondary";
      case "zone3":
        return "outline";
      default:
        return "default";
    }
  };

  const getZoneLabel = (zone: string) => {
    switch (zone) {
      case "zone1":
        return "Zone 1";
      case "zone2":
        return "Zone 2";
      case "zone3":
        return "Zone 3";
      default:
        return zone;
    }
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">
                Delivery Towns
              </h1>
              <p className="text-muted-foreground text-sm mt-1">
                Manage delivery locations for "Order for someone else" feature
              </p>
            </div>
            <Button onClick={() => { resetForm(); setIsCreateOpen(true); }}>
              <Plus className="mr-2 h-4 w-4" />
              Add New Town
            </Button>
          </div>

          {/* Filters */}
          <Card className="shadow-sm">
            <CardContent className="pt-4 pb-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    placeholder="Search towns..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-9"
                  />
                </div>
                <Select value={zoneFilter} onValueChange={setZoneFilter}>
                  <SelectTrigger className="w-[180px] h-9">
                    <SelectValue placeholder="Filter by zone" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Zones</SelectItem>
                    <SelectItem value="zone1">Zone 1</SelectItem>
                    <SelectItem value="zone2">Zone 2</SelectItem>
                    <SelectItem value="zone3">Zone 3</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Map View */}
          {!error && towns.length > 0 && (
            <Card className="shadow-sm overflow-hidden">
              <CardHeader className="border-b pb-4">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <Map className="h-5 w-5 text-primary" />
                      Delivery Zones Map
                    </CardTitle>
                    <CardDescription>Visual overview of all delivery towns by zone</CardDescription>
                  </div>
                  <div className="flex gap-4">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-green-500 shrink-0"></div>
                      <span className="text-xs text-muted-foreground">Zone 1</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-blue-500 shrink-0"></div>
                      <span className="text-xs text-muted-foreground">Zone 2</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-amber-500 shrink-0"></div>
                      <span className="text-xs text-muted-foreground">Zone 3</span>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-0">
                <div className="h-[500px] w-full overflow-hidden">
                  <DeliveryTownsMap towns={towns} />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Towns Table */}
          <Card className="shadow-sm overflow-hidden">
            <CardHeader className="border-b pb-4">
              <div className="flex flex-wrap items-center gap-3">
                <div>
                  <CardTitle className="text-base font-semibold">Delivery Towns ({towns.length})</CardTitle>
                  <CardDescription>All configured delivery locations</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {error && (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <MapPin className="h-12 w-12 text-destructive mb-4 opacity-50" />
                  <p className="font-semibold text-destructive">Error loading delivery towns</p>
                  <p className="text-sm text-muted-foreground mt-1">{error instanceof Error ? error.message : 'Unknown error'}</p>
                  <Button onClick={() => queryClient.invalidateQueries({ queryKey: ["delivery-towns"] })} className="mt-4" variant="outline">
                    Retry
                  </Button>
                </div>
              )}
              {!error && isLoading ? (
                <div className="flex flex-col items-center justify-center py-20">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mb-3" />
                  <p className="text-sm text-muted-foreground">Loading towns...</p>
                </div>
              ) : !error && towns.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <MapPin className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                  <p className="text-lg font-medium">No delivery towns found</p>
                  <p className="text-sm text-muted-foreground mt-1">Add a town to get started</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableHead>Town Name</TableHead>
                        <TableHead>Area</TableHead>
                        <TableHead>Zone</TableHead>
                        <TableHead>Coordinates</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {towns.map((town: DeliveryTown) => (
                        <TableRow key={town.id} className="hover:bg-muted/30 transition-colors">
                          <TableCell className="font-medium">{town.name}</TableCell>
                          <TableCell className="text-muted-foreground">{town.area}</TableCell>
                          <TableCell>
                            <Badge variant={getZoneBadgeColor(town.deliveryZone)}>
                              {getZoneLabel(town.deliveryZone)}
                            </Badge>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {town.latitude.toFixed(6)}, {town.longitude.toFixed(6)}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => toggleMutation.mutate(town.id)}
                              className="gap-1 h-7 px-2"
                            >
                              {town.isActive ? (
                                <>
                                  <ToggleRight className="h-4 w-4 text-emerald-600" />
                                  <span className="text-emerald-600 text-xs font-medium">Active</span>
                                </>
                              ) : (
                                <>
                                  <ToggleLeft className="h-4 w-4 text-muted-foreground" />
                                  <span className="text-muted-foreground text-xs">Inactive</span>
                                </>
                              )}
                            </Button>
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="sm" onClick={() => handleEdit(town)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(town.id, town.name)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </Main>

      {/* Create Dialog */}
      <Dialog open={isCreateOpen} onOpenChange={handleCloseCreate}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Delivery Town</DialogTitle>
            <DialogDescription>Create a new delivery location for customers</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Town Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Serrekunda"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="area">Area / Description *</Label>
              <Input
                id="area"
                value={formData.area}
                onChange={(e) => setFormData({ ...formData, area: e.target.value })}
                placeholder="e.g., Zone 1 - Central Area"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="latitude">Latitude *</Label>
                <Input
                  id="latitude"
                  type="number"
                  step="0.000001"
                  value={formData.latitude}
                  onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                  placeholder="13.4532"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="longitude">Longitude *</Label>
                <Input
                  id="longitude"
                  type="number"
                  step="0.000001"
                  value={formData.longitude}
                  onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                  placeholder="-16.5753"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Click on map to set coordinates</Label>
              <div className="h-[250px] w-full rounded-lg overflow-hidden border">
                <DeliveryTownsMap 
                  towns={[]} 
                  onMapClick={handleMapClick} 
                  clickable={true}
                  selectedLocation={selectedLocation}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="zone">Delivery Zone *</Label>
              <Select value={formData.deliveryZone} onValueChange={(v) => setFormData({ ...formData, deliveryZone: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="zone1">Zone 1 - Lower delivery fee</SelectItem>
                  <SelectItem value="zone2">Zone 2 - Medium fee</SelectItem>
                  <SelectItem value="zone3">Zone 3 - Higher fee</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => handleCloseCreate(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending} className="flex-1">
              {createMutation.isPending ? "Creating..." : "Create Town"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={isEditOpen} onOpenChange={handleCloseEdit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Delivery Town</DialogTitle>
            <DialogDescription>Update delivery location details</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-name">Town Name *</Label>
              <Input
                id="edit-name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-area">Area / Description *</Label>
              <Input
                id="edit-area"
                value={formData.area}
                onChange={(e) => setFormData({ ...formData, area: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-latitude">Latitude *</Label>
                <Input
                  id="edit-latitude"
                  type="number"
                  step="0.000001"
                  value={formData.latitude}
                  onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-longitude">Longitude *</Label>
                <Input
                  id="edit-longitude"
                  type="number"
                  step="0.000001"
                  value={formData.longitude}
                  onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Click on map to update coordinates</Label>
              <div className="h-[250px] w-full rounded-lg overflow-hidden border">
                <DeliveryTownsMap 
                  towns={editingTown ? [editingTown] : []} 
                  onMapClick={handleMapClick} 
                  clickable={true}
                  selectedLocation={selectedLocation}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-zone">Delivery Zone *</Label>
              <Select value={formData.deliveryZone} onValueChange={(v) => setFormData({ ...formData, deliveryZone: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="zone1">Zone 1</SelectItem>
                  <SelectItem value="zone2">Zone 2</SelectItem>
                  <SelectItem value="zone3">Zone 3</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex gap-3">
            <Button variant="outline" onClick={() => handleCloseEdit(false)} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleUpdate} disabled={updateMutation.isPending} className="flex-1">
              {updateMutation.isPending ? "Updating..." : "Update Town"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

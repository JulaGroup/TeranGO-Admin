import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  Search,
  MoreHorizontal,
  Plus,
  Tag,
  Edit,
  Trash2,
  Eye,
  RefreshCw,
  Folder,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
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
import { ConfigDrawer } from "@/components/config-drawer";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { TopNav } from "@/components/layout/top-nav";
import { ProfileDropdown } from "@/components/profile-dropdown";
import { Search as SearchInput } from "@/components/search";
import { ThemeSwitch } from "@/components/theme-switch";

const topNav = [
  { title: "Overview", href: "/admin", isActive: false },
  { title: "Customers", href: "/admin/customers", isActive: false },
  { title: "Products", href: "/admin/subcategories", isActive: true },
  { title: "Settings", href: "#", isActive: false },
];

export const Route = createFileRoute("/_authenticated/admin/subcategories/")({
  component: SubCategoriesPage,
});

interface Category {
  id: string;
  name: string;
  imageUrl?: string;
}

interface SubCategory {
  id: string;
  name: string;
  imageUrl?: string;
  categoryId: string;
  category?: Category;
  _count?: {
    services: number;
  };
  createdAt?: string;
}

// Cloudinary configuration
const CLOUDINARY_CLOUD_NAME = "dkpi5ij2t";
const CLOUDINARY_UPLOAD_PRESET = "unsigned_preset";

function SubCategoriesPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedSubCategory, setSelectedSubCategory] =
    useState<SubCategory | null>(null);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    categoryId: "",
    imageUrl: "",
  });
  const [editingSubCategory, setEditingSubCategory] =
    useState<SubCategory | null>(null);
  const [imageLoading, setImageLoading] = useState(false);
  const [imageInputType, setImageInputType] = useState<"upload" | "url">(
    "upload",
  );

  // Fetch categories
  const { data: categoriesData = [] } = useQuery({
    queryKey: ["categories-select"],
    queryFn: async () => {
      const response = await api.get("/api/categories");
      return response.data || [];
    },
  });

  const categories = useMemo(
    () => (Array.isArray(categoriesData) ? categoriesData : []),
    [categoriesData],
  );

  // Fetch subcategories
  const { data: subCategoriesData = [], isLoading } = useQuery({
    queryKey: ["subcategories", categoryFilter],
    queryFn: async () => {
      const response = await api.get("/api/subcategories");
      return response.data || [];
    },
  });

  const subCategories = useMemo(
    () => (Array.isArray(subCategoriesData) ? subCategoriesData : []),
    [subCategoriesData],
  );

  // Filter subcategories
  const filteredSubCategories = useMemo(() => {
    let filtered = subCategories;

    // Filter by category
    if (categoryFilter !== "all") {
      filtered = filtered.filter((sub) => sub.categoryId === categoryFilter);
    }

    // Filter by search term
    if (searchQuery.trim()) {
      const searchLower = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (sub) =>
          sub.name.toLowerCase().includes(searchLower) ||
          sub.category?.name.toLowerCase().includes(searchLower),
      );
    }

    return filtered;
  }, [subCategories, searchQuery, categoryFilter]);

  // Image upload handler
  const handleImageUpload = async (file: File): Promise<string> => {
    try {
      setImageLoading(true);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", CLOUDINARY_UPLOAD_PRESET);

      const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`;

      const uploadResponse = await fetch(cloudinaryUrl, {
        method: "POST",
        body: formData,
      });

      if (!uploadResponse.ok) {
        throw new Error("Upload failed");
      }

      const data = await uploadResponse.json();
      setImageLoading(false);
      return data.secure_url;
    } catch (_err) {
      setImageLoading(false);
      toast.error("Failed to upload image");
      return "";
    }
  };

  // Create subcategory mutation
  const createMutation = useMutation({
    mutationFn: async (data: {
      name: string;
      categoryId: string;
      imageUrl?: string;
    }) => {
      return api.post("/api/subcategories", data);
    },
    onSuccess: () => {
      toast.success("Subcategory created successfully");
      queryClient.invalidateQueries({ queryKey: ["subcategories"] });
      setIsFormOpen(false);
      setFormData({ name: "", categoryId: "", imageUrl: "" });
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(
        error.response?.data?.message || "Failed to create subcategory",
      );
    },
  });

  // Update subcategory mutation
  const updateMutation = useMutation({
    mutationFn: async (data: {
      id: string;
      name: string;
      categoryId: string;
      imageUrl?: string;
    }) => {
      return api.put(`/api/subcategories/${data.id}`, {
        name: data.name,
        categoryId: data.categoryId,
        imageUrl: data.imageUrl,
      });
    },
    onSuccess: () => {
      toast.success("Subcategory updated successfully");
      queryClient.invalidateQueries({ queryKey: ["subcategories"] });
      setIsFormOpen(false);
      setEditingSubCategory(null);
      setFormData({ name: "", categoryId: "", imageUrl: "" });
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(
        error.response?.data?.message || "Failed to update subcategory",
      );
    },
  });

  // Delete subcategory mutation
  const deleteMutation = useMutation({
    mutationFn: (subCategoryId: string) =>
      api.delete(`/api/subcategories/${subCategoryId}`),
    onSuccess: () => {
      toast.success("Subcategory deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["subcategories"] });
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(
        error.response?.data?.message || "Failed to delete subcategory",
      );
    },
  });

  const handleAddSubCategory = () => {
    setEditingSubCategory(null);
    setFormData({ name: "", categoryId: "", imageUrl: "" });
    setImageInputType("upload");
    setIsFormOpen(true);
  };

  const handleEditSubCategory = (subCategory: SubCategory) => {
    setEditingSubCategory(subCategory);
    setFormData({
      name: subCategory.name,
      categoryId: subCategory.categoryId,
      imageUrl: subCategory.imageUrl || "",
    });
    // Auto-detect if editing has a URL, set to url mode
    setImageInputType(subCategory.imageUrl ? "url" : "upload");
    setIsFormOpen(true);
  };

  const handleSaveSubCategory = async () => {
    if (!formData.name.trim()) {
      toast.error("Subcategory name is required");
      return;
    }

    if (!formData.categoryId) {
      toast.error("Category is required");
      return;
    }

    if (editingSubCategory) {
      updateMutation.mutate({
        id: editingSubCategory.id,
        name: formData.name,
        categoryId: formData.categoryId,
        imageUrl: formData.imageUrl,
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleViewDetails = (subCategory: SubCategory) => {
    setSelectedSubCategory(subCategory);
    setIsDetailsOpen(true);
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = await handleImageUpload(file);
      if (url) {
        setFormData({ ...formData, imageUrl: url });
      }
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
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Subcategories
              </h1>
              <p className="text-muted-foreground">
                Manage product subcategories
              </p>
            </div>
            <Button onClick={handleAddSubCategory} className="gap-2">
              <Plus className="h-4 w-4" />
              Add Subcategory
            </Button>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm">
                      Total Subcategories
                    </p>
                    <p className="text-3xl font-bold">{subCategories.length}</p>
                  </div>
                  <Tag className="h-12 w-12 text-blue-500 opacity-20" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm">
                      Total Categories
                    </p>
                    <p className="text-3xl font-bold">{categories.length}</p>
                  </div>
                  <Folder className="h-12 w-12 text-purple-500 opacity-20" />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-muted-foreground text-sm">
                      Created Today
                    </p>
                    <p className="text-3xl font-bold">
                      {
                        subCategories.filter((sub) => {
                          const today = new Date();
                          const subDate = sub.createdAt
                            ? new Date(sub.createdAt)
                            : null;
                          return (
                            subDate &&
                            subDate.toDateString() === today.toDateString()
                          );
                        }).length
                      }
                    </p>
                  </div>
                  <RefreshCw className="h-12 w-12 text-green-500 opacity-20" />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Search and Filter */}
          <Card>
            <CardHeader>
              <CardTitle>Search & Filter</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex gap-4">
                <div className="relative flex-1">
                  <Search className="text-muted-foreground absolute top-3 left-3 h-4 w-4" />
                  <Input
                    placeholder="Search by name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select
                  value={categoryFilter}
                  onValueChange={setCategoryFilter}
                >
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Filter by category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category.id} value={category.id}>
                        {category.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Subcategories Table */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Tag className="h-5 w-5" />
                  All Subcategories
                </div>
                <Badge variant="outline">
                  {filteredSubCategories.length} total
                </Badge>
              </CardTitle>
              <CardDescription>
                View and manage all product subcategories
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <p className="text-muted-foreground">
                    Loading subcategories...
                  </p>
                </div>
              ) : filteredSubCategories.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Category</TableHead>
                      <TableHead>Image</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSubCategories.map((subCategory) => (
                      <TableRow key={subCategory.id}>
                        <TableCell>
                          <div className="font-medium">{subCategory.name}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline">
                            {subCategory.category?.name || "N/A"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {subCategory.imageUrl ? (
                            <Avatar>
                              <AvatarImage
                                src={subCategory.imageUrl}
                                alt={subCategory.name}
                              />
                              <AvatarFallback>
                                {subCategory.name.substring(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                          ) : (
                            <span className="text-muted-foreground text-xs">
                              No image
                            </span>
                          )}
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
                                onClick={() => handleViewDetails(subCategory)}
                              >
                                <Eye className="mr-2 h-4 w-4" />
                                View Details
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() =>
                                  handleEditSubCategory(subCategory)
                                }
                              >
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() =>
                                  deleteMutation.mutate(subCategory.id)
                                }
                                className="text-red-600"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="flex flex-col items-center justify-center py-12">
                  <Tag className="text-muted-foreground mb-4 h-12 w-12" />
                  <p className="text-muted-foreground">
                    {searchQuery || categoryFilter !== "all"
                      ? "No subcategories match your filters"
                      : "No subcategories yet"}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Subcategory Details Dialog */}
          <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Subcategory Details</DialogTitle>
                <DialogDescription>
                  View subcategory information
                </DialogDescription>
              </DialogHeader>
              {selectedSubCategory && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-bold">
                      {selectedSubCategory.name}
                    </h3>
                    {selectedSubCategory.imageUrl && (
                      <div className="bg-muted relative mt-4 h-48 w-full overflow-hidden rounded-lg">
                        <img
                          src={selectedSubCategory.imageUrl}
                          alt={selectedSubCategory.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    )}
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-muted-foreground text-sm">Category</p>
                      <p className="text-lg font-medium">
                        {selectedSubCategory.category?.name || "N/A"}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-sm">Created</p>
                      <p className="text-sm font-medium">
                        {selectedSubCategory.createdAt
                          ? new Date(
                              selectedSubCategory.createdAt,
                            ).toLocaleDateString()
                          : "N/A"}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Add/Edit Subcategory Dialog */}
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingSubCategory
                    ? "Edit Subcategory"
                    : "Add New Subcategory"}
                </DialogTitle>
                <DialogDescription>
                  {editingSubCategory
                    ? "Update subcategory information"
                    : "Create a new product subcategory"}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">
                    Subcategory Name
                  </label>
                  <Input
                    placeholder="Enter subcategory name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Category</label>
                  <Select
                    value={formData.categoryId}
                    onValueChange={(value) =>
                      setFormData({ ...formData, categoryId: value })
                    }
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue placeholder="Select a category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((category) => (
                        <SelectItem key={category.id} value={category.id}>
                          {category.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-sm font-medium">
                    Subcategory Image
                  </label>
                  <div className="mt-2 flex gap-2">
                    <Button
                      type="button"
                      variant={
                        imageInputType === "upload" ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() => setImageInputType("upload")}
                    >
                      Upload Image
                    </Button>
                    <Button
                      type="button"
                      variant={imageInputType === "url" ? "default" : "outline"}
                      size="sm"
                      onClick={() => setImageInputType("url")}
                    >
                      Image URL
                    </Button>
                  </div>

                  {imageInputType === "upload" ? (
                    <>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleImageChange}
                        className="mt-2"
                        disabled={imageLoading}
                      />
                      {imageLoading && (
                        <p className="text-muted-foreground mt-2 text-sm">
                          Uploading image to Cloudinary...
                        </p>
                      )}
                    </>
                  ) : (
                    <Input
                      type="url"
                      placeholder="https://example.com/image.jpg"
                      value={formData.imageUrl}
                      onChange={(e) =>
                        setFormData({ ...formData, imageUrl: e.target.value })
                      }
                      className="mt-2"
                    />
                  )}

                  {formData.imageUrl && !imageLoading && (
                    <div className="mt-3">
                      <p className="text-muted-foreground mb-2 text-xs">
                        Preview:
                      </p>
                      <img
                        src={formData.imageUrl}
                        alt="Preview"
                        className="h-32 w-32 rounded-lg border object-cover"
                        onError={(e) => {
                          e.currentTarget.src = "";
                          e.currentTarget.alt = "Invalid image URL";
                        }}
                      />
                    </div>
                  )}
                </div>
                <div className="flex justify-end gap-3 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => setIsFormOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={handleSaveSubCategory}
                    disabled={
                      createMutation.isPending ||
                      updateMutation.isPending ||
                      imageLoading
                    }
                  >
                    {createMutation.isPending || updateMutation.isPending
                      ? "Saving..."
                      : "Save"}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </Main>
    </>
  );
}

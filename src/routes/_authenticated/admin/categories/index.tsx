import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
  Search,
  MoreHorizontal,
  Plus,
  Folder,
  Edit,
  Trash2,
  Eye,
  RefreshCw,
  Package,
} from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
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
  { title: "Products", href: "/admin/categories", isActive: true },
  { title: "Settings", href: "#", isActive: false },
];

export const Route = createFileRoute("/_authenticated/admin/categories/")({
  component: CategoriesPage,
});

interface Category {
  id: string;
  name: string;
  imageUrl?: string;
  subCategories?: Array<{
    id: string;
    name: string;
  }>;
  _count?: {
    subCategories: number;
    services: number;
  };
  createdAt?: string;
}

// Cloudinary configuration
const CLOUDINARY_CLOUD_NAME = "dkpi5ij2t";
const CLOUDINARY_UPLOAD_PRESET = "unsigned_preset";

function CategoriesPage() {
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(
    null,
  );
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formData, setFormData] = useState({ name: "", imageUrl: "" });
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [imageLoading, setImageLoading] = useState(false);

  // Fetch categories
  const { data: categoriesData = [], isLoading } = useQuery({
    queryKey: ["categories"],
    queryFn: async () => {
      const response = await api.get("/api/categories");
      return response.data || [];
    },
  });

  const categories = useMemo(
    () => (Array.isArray(categoriesData) ? categoriesData : []),
    [categoriesData],
  );

  // Filter categories based on search
  const filteredCategories = useMemo(() => {
    if (!searchQuery.trim()) return categories;

    const searchLower = searchQuery.toLowerCase();
    return categories.filter((category: Category) =>
      category.name.toLowerCase().includes(searchLower),
    );
  }, [categories, searchQuery]);

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

  // Create category mutation
  const createMutation = useMutation({
    mutationFn: async (data: { name: string; imageUrl?: string }) => {
      return api.post("/api/categories", data);
    },
    onSuccess: () => {
      toast.success("Category created successfully");
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setIsFormOpen(false);
      setFormData({ name: "", imageUrl: "" });
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || "Failed to create category");
    },
  });

  // Update category mutation
  const updateMutation = useMutation({
    mutationFn: async (data: {
      id: string;
      name: string;
      imageUrl?: string;
    }) => {
      return api.put(`/api/categories/${data.id}`, {
        name: data.name,
        imageUrl: data.imageUrl,
      });
    },
    onSuccess: () => {
      toast.success("Category updated successfully");
      queryClient.invalidateQueries({ queryKey: ["categories"] });
      setIsFormOpen(false);
      setEditingCategory(null);
      setFormData({ name: "", imageUrl: "" });
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || "Failed to update category");
    },
  });

  // Delete category mutation
  const deleteMutation = useMutation({
    mutationFn: (categoryId: string) =>
      api.delete(`/api/categories/${categoryId}`),
    onSuccess: () => {
      toast.success("Category deleted successfully");
      queryClient.invalidateQueries({ queryKey: ["categories"] });
    },
    onError: (err: unknown) => {
      const error = err as { response?: { data?: { message?: string } } };
      toast.error(error.response?.data?.message || "Failed to delete category");
    },
  });

  const handleAddCategory = () => {
    setEditingCategory(null);
    setFormData({ name: "", imageUrl: "" });
    setIsFormOpen(true);
  };

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      imageUrl: category.imageUrl || "",
    });
    setIsFormOpen(true);
  };

  const handleSaveCategory = async () => {
    if (!formData.name.trim()) {
      toast.error("Category name is required");
      return;
    }

    if (editingCategory) {
      updateMutation.mutate({
        id: editingCategory.id,
        name: formData.name,
        imageUrl: formData.imageUrl,
      });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleViewDetails = (category: Category) => {
    setSelectedCategory(category);
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
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold tracking-tight">Categories</h1>
              <p className="text-muted-foreground text-sm mt-1">
                Manage product categories and subcategories
              </p>
            </div>
            <div className="flex gap-2">
              <Button onClick={handleAddCategory} className="gap-2">
                <Plus className="h-4 w-4" />
                Add Category
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="border-l-4 border-l-primary shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Categories
                </CardTitle>
                <Folder className="h-4 w-4 text-primary" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{categories.length}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  All product categories
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-blue-500 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Total Subcategories
                </CardTitle>
                <Package className="h-4 w-4 text-blue-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {categories.reduce(
                    (sum, cat) => sum + (cat._count?.subCategories || 0),
                    0,
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Across all categories
                </p>
              </CardContent>
            </Card>

            <Card className="border-l-4 border-l-emerald-500 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  Created Today
                </CardTitle>
                <RefreshCw className="h-4 w-4 text-emerald-500" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {
                    categories.filter((cat) => {
                      const today = new Date();
                      const catDate = cat.createdAt
                        ? new Date(cat.createdAt)
                        : null;
                      return (
                        catDate &&
                        catDate.toDateString() === today.toDateString()
                      );
                    }).length
                  }
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  New additions today
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Categories Table */}
          <Card className="shadow-sm overflow-hidden">
            <CardHeader className="border-b pb-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  <Folder className="h-5 w-5 text-muted-foreground shrink-0" />
                  <CardTitle className="text-base">All Categories</CardTitle>
                  <Badge variant="outline">
                    {filteredCategories.length} total
                  </Badge>
                </div>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  <Input
                    className="pl-9 h-9 w-[260px]"
                    placeholder="Search categories..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex items-center justify-center py-16">
                  <p className="text-muted-foreground">Loading categories...</p>
                </div>
              ) : filteredCategories.length > 0 ? (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-muted/50 hover:bg-muted/50">
                        <TableHead>Name</TableHead>
                        <TableHead>Image</TableHead>
                        <TableHead>Subcategories</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredCategories.map((category) => (
                        <TableRow
                          key={category.id}
                          className="hover:bg-muted/30 transition-colors"
                        >
                          <TableCell>
                            <div className="font-medium">{category.name}</div>
                          </TableCell>
                          <TableCell>
                            {category.imageUrl ? (
                              <Avatar>
                                <AvatarImage
                                  src={category.imageUrl}
                                  alt={category.name}
                                />
                                <AvatarFallback>
                                  {category.name.substring(0, 2).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            ) : (
                              <span className="text-muted-foreground text-xs">
                                No image
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary">
                              {category._count?.subCategories || 0}
                            </Badge>
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
                                  onClick={() => handleViewDetails(category)}
                                >
                                  <Eye className="mr-2 h-4 w-4" />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleEditCategory(category)}
                                >
                                  <Edit className="mr-2 h-4 w-4" />
                                  Edit
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() =>
                                    deleteMutation.mutate(category.id)
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
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <Folder className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                  <p className="text-lg font-medium">
                    {searchQuery
                      ? "No categories match your search"
                      : "No categories yet"}
                  </p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {searchQuery
                      ? "Try a different search term"
                      : "Get started by creating your first category"}
                  </p>
                  {!searchQuery && (
                    <Button
                      className="mt-4"
                      size="sm"
                      onClick={handleAddCategory}
                    >
                      Add Category
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Category Details Dialog */}
          <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader className="border-b pb-4 mb-2">
                <DialogTitle>Category Details</DialogTitle>
                <DialogDescription>
                  View category information and subcategories
                </DialogDescription>
              </DialogHeader>
              {selectedCategory && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-bold">
                      {selectedCategory.name}
                    </h3>
                    {selectedCategory.imageUrl && (
                      <div className="bg-muted relative mt-4 h-48 w-full overflow-hidden rounded-lg">
                        <img
                          src={selectedCategory.imageUrl}
                          alt={selectedCategory.name}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    )}
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <div>
                      <p className="text-muted-foreground text-sm">
                        Subcategories
                      </p>
                      <p className="text-2xl font-bold">
                        {selectedCategory._count?.subCategories || 0}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground text-sm">Created</p>
                      <p className="text-sm font-medium">
                        {selectedCategory.createdAt
                          ? new Date(
                              selectedCategory.createdAt,
                            ).toLocaleDateString()
                          : "N/A"}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Add/Edit Category Dialog */}
          <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader className="border-b pb-4 mb-2">
                <DialogTitle>
                  {editingCategory ? "Edit Category" : "Add New Category"}
                </DialogTitle>
                <DialogDescription>
                  {editingCategory
                    ? "Update category information"
                    : "Create a new product category"}
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Category Name</label>
                  <Input
                    placeholder="Enter category name"
                    value={formData.name}
                    onChange={(e) =>
                      setFormData({ ...formData, name: e.target.value })
                    }
                    className="mt-1"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Image Upload</label>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={handleImageChange}
                    className="mt-1"
                    disabled={imageLoading}
                  />
                  {imageLoading && (
                    <p className="text-muted-foreground mt-2 text-sm">
                      Uploading image...
                    </p>
                  )}
                  {formData.imageUrl && !imageLoading && (
                    <div className="mt-2">
                      <img
                        src={formData.imageUrl}
                        alt="Preview"
                        className="h-32 w-32 rounded object-cover"
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
                    onClick={handleSaveCategory}
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

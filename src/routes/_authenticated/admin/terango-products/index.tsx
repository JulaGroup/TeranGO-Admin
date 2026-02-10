import { useState, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import {
  Search,
  Package,
  Plus,
  Edit,
  Trash2,
  MoreVertical,
  Star,
  RefreshCw,
  Upload,
  Crown,
  TrendingUp,
  Box,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'

// Cloudinary config
const CLOUDINARY_CLOUD_NAME = 'dkpi5ij2t'
const CLOUDINARY_UPLOAD_PRESET = 'unsigned_preset'

// Types
interface TerangoProduct {
  id: string
  name: string
  price: number
  discountedPrice?: number
  imageUrl?: string
  subCategoryId?: string
  category?: string
  description?: string
  brand?: string
  sku?: string
  stock?: number
  isAvailable: boolean
  isOfficial: boolean
  isFeatured: boolean
  priority: number
  shop?: {
    id: string
    name: string
  }
  subCategory?: {
    id: string
    name: string
  }
  createdAt: string
  updatedAt: string
}

interface ProductStats {
  totalProducts: number
  availableProducts: number
  outOfStockProducts: number
  featuredProducts: number
  totalStock: number
}

interface SubCategory {
  id: string
  name: string
}

export const Route = createFileRoute('/_authenticated/admin/terango-products/')(
  {
    component: TerangoProductsPage,
  }
)

function TerangoProductsPage() {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [filterSubCategory, setFilterSubCategory] = useState<string>('all')
  const [filterAvailability, setFilterAvailability] = useState<string>('all')
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingProduct, setEditingProduct] = useState<TerangoProduct | null>(
    null
  )
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isUploadingImage, setIsUploadingImage] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    price: '',
    discountedPrice: '',
    imageUrl: '',
    subCategoryId: '',
    category: '',
    description: '',
    brand: '',
    sku: '',
    stock: '0',
    isFeatured: false,
    priority: '50',
  })

  // Fetch products
  const { data: productsData, isLoading } = useQuery({
    queryKey: [
      'terango-products',
      searchQuery,
      filterSubCategory,
      filterAvailability,
    ],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (searchQuery) params.append('search', searchQuery)
      if (filterSubCategory !== 'all')
        params.append('subCategoryId', filterSubCategory)
      if (filterAvailability !== 'all')
        params.append('isAvailable', filterAvailability)
      params.append('limit', '100')

      const response = await api.get(`/api/admin/terango-products?${params}`)
      return response.data
    },
  })

  // Fetch stats
  const { data: stats } = useQuery<ProductStats>({
    queryKey: ['terango-products-stats'],
    queryFn: async () => {
      const response = await api.get('/api/admin/terango-products/stats')
      return response.data
    },
  })

  // Fetch subcategories
  const { data: subCategories } = useQuery<SubCategory[]>({
    queryKey: ['subcategories'],
    queryFn: async () => {
      const response = await api.get('/api/categories')
      const categories = response.data.categories || response.data || []
      const subs: SubCategory[] = []
      categories.forEach((cat: { subCategories?: SubCategory[] }) => {
        if (cat.subCategories) {
          subs.push(...cat.subCategories)
        }
      })
      return subs
    },
  })

  // Create product mutation
  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const response = await api.post('/api/admin/terango-products', {
        ...data,
        price: parseFloat(data.price),
        discountedPrice: data.discountedPrice
          ? parseFloat(data.discountedPrice)
          : undefined,
        stock: parseInt(data.stock),
        priority: parseInt(data.priority),
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terango-products'] })
      queryClient.invalidateQueries({ queryKey: ['terango-products-stats'] })
      toast.success('Product created successfully')
      closeDialog()
    },
    onError: () => {
      toast.error('Failed to create product')
    },
  })

  // Update product mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: typeof formData }) => {
      const response = await api.put(`/api/admin/terango-products/${id}`, {
        ...data,
        price: parseFloat(data.price),
        discountedPrice: data.discountedPrice
          ? parseFloat(data.discountedPrice)
          : null,
        stock: parseInt(data.stock),
        priority: parseInt(data.priority),
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terango-products'] })
      queryClient.invalidateQueries({ queryKey: ['terango-products-stats'] })
      toast.success('Product updated successfully')
      closeDialog()
    },
    onError: () => {
      toast.error('Failed to update product')
    },
  })

  // Delete product mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/admin/terango-products/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terango-products'] })
      queryClient.invalidateQueries({ queryKey: ['terango-products-stats'] })
      toast.success('Product deleted successfully')
    },
    onError: () => {
      toast.error('Failed to delete product')
    },
  })

  // Toggle featured mutation
  const toggleFeaturedMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await api.patch(
        `/api/admin/terango-products/${id}/toggle-featured`
      )
      return response.data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['terango-products'] })
      queryClient.invalidateQueries({ queryKey: ['terango-products-stats'] })
      toast.success(
        data.product.isFeatured ? 'Product featured' : 'Product unfeatured'
      )
    },
    onError: () => {
      toast.error('Failed to toggle featured status')
    },
  })

  // Setup TeranGO store mutation
  const setupMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/api/admin/terango-products/setup')
      return response.data
    },
    onSuccess: () => {
      toast.success('TeranGO Official Store setup completed')
    },
    onError: () => {
      toast.error('Failed to setup TeranGO store')
    },
  })

  // Image upload handler
  const handleImageUpload = async (
    event: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = event.target.files?.[0]
    if (!file) return

    setIsUploadingImage(true)
    try {
      const uploadFormData = new FormData()
      uploadFormData.append('file', file)
      uploadFormData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)
      uploadFormData.append('folder', 'terango-products')

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        { method: 'POST', body: uploadFormData }
      )

      const data = await response.json()
      if (data.secure_url) {
        setFormData({ ...formData, imageUrl: data.secure_url })
        setImagePreview(data.secure_url)
        toast.success('Image uploaded successfully')
      } else {
        throw new Error('Upload failed')
      }
    } catch {
      toast.error('Failed to upload image')
    } finally {
      setIsUploadingImage(false)
    }
  }

  const openCreateDialog = () => {
    setEditingProduct(null)
    setFormData({
      name: '',
      price: '',
      discountedPrice: '',
      imageUrl: '',
      subCategoryId: '',
      category: '',
      description: '',
      brand: '',
      sku: '',
      stock: '0',
      isFeatured: false,
      priority: '50',
    })
    setImagePreview(null)
    setIsDialogOpen(true)
  }

  const openEditDialog = (product: TerangoProduct) => {
    setEditingProduct(product)
    setFormData({
      name: product.name,
      price: product.price.toString(),
      discountedPrice: product.discountedPrice?.toString() || '',
      imageUrl: product.imageUrl || '',
      subCategoryId: product.subCategoryId || '',
      category: product.category || '',
      description: product.description || '',
      brand: product.brand || '',
      sku: product.sku || '',
      stock: (product.stock || 0).toString(),
      isFeatured: product.isFeatured,
      priority: product.priority.toString(),
    })
    setImagePreview(product.imageUrl || null)
    setIsDialogOpen(true)
  }

  const closeDialog = () => {
    setIsDialogOpen(false)
    setEditingProduct(null)
    setImagePreview(null)
  }

  const handleSubmit = () => {
    if (!formData.name || !formData.price) {
      toast.error('Name and price are required')
      return
    }

    if (editingProduct) {
      updateMutation.mutate({ id: editingProduct.id, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const products = productsData?.products || []

  return (
    <div className='container mx-auto space-y-6 p-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='flex items-center gap-2 text-3xl font-bold'>
            <Crown className='h-8 w-8 text-yellow-500' />
            TeranGO Official Products
          </h1>
          <p className='text-muted-foreground mt-1'>
            Manage products sold directly by TeranGO
          </p>
        </div>
        <div className='flex gap-2'>
          <Button variant='outline' onClick={() => setupMutation.mutate()}>
            <RefreshCw className='mr-2 h-4 w-4' />
            Setup Store
          </Button>
          <Button onClick={openCreateDialog}>
            <Plus className='mr-2 h-4 w-4' />
            Add Product
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className='grid gap-4 md:grid-cols-5'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Total Products
            </CardTitle>
            <Package className='text-muted-foreground h-4 w-4' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {stats?.totalProducts || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Available</CardTitle>
            <CheckCircle className='h-4 w-4 text-green-500' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-green-600'>
              {stats?.availableProducts || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Out of Stock</CardTitle>
            <XCircle className='h-4 w-4 text-red-500' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-red-600'>
              {stats?.outOfStockProducts || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Featured</CardTitle>
            <Star className='h-4 w-4 text-yellow-500' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-yellow-600'>
              {stats?.featuredProducts || 0}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Total Stock</CardTitle>
            <Box className='text-muted-foreground h-4 w-4' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{stats?.totalStock || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Products</CardTitle>
          <CardDescription>
            Products sold directly by TeranGO with priority placement
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className='mb-4 flex flex-wrap gap-4'>
            <div className='relative flex-1'>
              <Search className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2' />
              <Input
                placeholder='Search products...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className='pl-10'
              />
            </div>
            <Select
              value={filterSubCategory}
              onValueChange={setFilterSubCategory}
            >
              <SelectTrigger className='w-[180px]'>
                <SelectValue placeholder='Sub Category' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All Categories</SelectItem>
                {subCategories?.map((sub) => (
                  <SelectItem key={sub.id} value={sub.id}>
                    {sub.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={filterAvailability}
              onValueChange={setFilterAvailability}
            >
              <SelectTrigger className='w-[180px]'>
                <SelectValue placeholder='Availability' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All</SelectItem>
                <SelectItem value='true'>Available</SelectItem>
                <SelectItem value='false'>Out of Stock</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Products Table */}
          {isLoading ? (
            <div className='flex items-center justify-center py-8'>
              <RefreshCw className='h-6 w-6 animate-spin' />
            </div>
          ) : products.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Price</TableHead>
                  <TableHead>Stock</TableHead>
                  <TableHead>Priority</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className='text-right'>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {products.map((product: TerangoProduct) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <div className='flex items-center gap-3'>
                        {product.imageUrl ? (
                          <img
                            src={product.imageUrl}
                            alt={product.name}
                            className='h-12 w-12 rounded-md object-cover'
                          />
                        ) : (
                          <div className='bg-muted flex h-12 w-12 items-center justify-center rounded-md'>
                            <Package className='text-muted-foreground h-6 w-6' />
                          </div>
                        )}
                        <div>
                          <div className='flex items-center gap-2 font-medium'>
                            {product.name}
                            {product.isFeatured && (
                              <Star className='h-4 w-4 fill-yellow-400 text-yellow-400' />
                            )}
                          </div>
                          <div className='text-muted-foreground text-sm'>
                            {product.brand || 'No brand'} •{' '}
                            {product.subCategory?.name || 'Uncategorized'}
                          </div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div>
                        <div className='font-medium'>
                          GMD {product.price.toLocaleString()}
                        </div>
                        {product.discountedPrice && (
                          <div className='text-sm text-green-600'>
                            Sale: GMD {product.discountedPrice.toLocaleString()}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          product.stock && product.stock > 0
                            ? 'default'
                            : 'destructive'
                        }
                      >
                        {product.stock || 0} units
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className='flex items-center gap-1'>
                        <TrendingUp className='h-4 w-4 text-blue-500' />
                        <span>{product.priority}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={product.isAvailable ? 'default' : 'secondary'}
                      >
                        {product.isAvailable ? 'Available' : 'Unavailable'}
                      </Badge>
                    </TableCell>
                    <TableCell className='text-right'>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant='ghost' size='icon'>
                            <MoreVertical className='h-4 w-4' />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align='end'>
                          <DropdownMenuItem
                            onClick={() => openEditDialog(product)}
                          >
                            <Edit className='mr-2 h-4 w-4' />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() =>
                              toggleFeaturedMutation.mutate(product.id)
                            }
                          >
                            <Star className='mr-2 h-4 w-4' />
                            {product.isFeatured ? 'Unfeature' : 'Feature'}
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={() => {
                              if (
                                confirm(
                                  'Are you sure you want to delete this product?'
                                )
                              ) {
                                deleteMutation.mutate(product.id)
                              }
                            }}
                            className='text-red-600'
                          >
                            <Trash2 className='mr-2 h-4 w-4' />
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
            <div className='flex flex-col items-center justify-center py-12'>
              <Crown className='text-muted-foreground mb-4 h-16 w-16' />
              <h3 className='text-lg font-medium'>No Official Products Yet</h3>
              <p className='text-muted-foreground mt-1'>
                Click "Setup Store" first, then add products to sell directly
                from TeranGO
              </p>
              <Button onClick={openCreateDialog} className='mt-4'>
                <Plus className='mr-2 h-4 w-4' />
                Add First Product
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className='max-h-[90vh] max-w-2xl overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? 'Edit Product' : 'Add Official Product'}
            </DialogTitle>
            <DialogDescription>
              {editingProduct
                ? 'Update the product details'
                : "Add a new product to TeranGO's official store"}
            </DialogDescription>
          </DialogHeader>

          <div className='grid gap-4 py-4'>
            {/* Image Upload */}
            <div className='space-y-2'>
              <Label>Product Image</Label>
              <div className='flex items-center gap-4'>
                {imagePreview ? (
                  <img
                    src={imagePreview}
                    alt='Preview'
                    className='h-24 w-24 rounded-md object-cover'
                  />
                ) : (
                  <div className='bg-muted flex h-24 w-24 items-center justify-center rounded-md'>
                    <Package className='text-muted-foreground h-8 w-8' />
                  </div>
                )}
                <div className='flex flex-col gap-2'>
                  <Button
                    type='button'
                    variant='outline'
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploadingImage}
                  >
                    <Upload className='mr-2 h-4 w-4' />
                    {isUploadingImage ? 'Uploading...' : 'Upload Image'}
                  </Button>
                  <input
                    title='Upload Image'
                    ref={fileInputRef}
                    type='file'
                    accept='image/*'
                    onChange={handleImageUpload}
                    className='hidden'
                  />
                  <Input
                    placeholder='Or paste image URL'
                    value={formData.imageUrl}
                    onChange={(e) => {
                      setFormData({ ...formData, imageUrl: e.target.value })
                      setImagePreview(e.target.value)
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Basic Info */}
            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label htmlFor='name'>Product Name *</Label>
                <Input
                  id='name'
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  placeholder='Product name'
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='brand'>Brand</Label>
                <Input
                  id='brand'
                  value={formData.brand}
                  onChange={(e) =>
                    setFormData({ ...formData, brand: e.target.value })
                  }
                  placeholder='Brand name'
                />
              </div>
            </div>

            {/* Pricing */}
            <div className='grid grid-cols-3 gap-4'>
              <div className='space-y-2'>
                <Label htmlFor='price'>Price (GMD) *</Label>
                <Input
                  id='price'
                  type='number'
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: e.target.value })
                  }
                  placeholder='0.00'
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='discountedPrice'>Sale Price (GMD)</Label>
                <Input
                  id='discountedPrice'
                  type='number'
                  value={formData.discountedPrice}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      discountedPrice: e.target.value,
                    })
                  }
                  placeholder='Optional'
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='stock'>Stock</Label>
                <Input
                  id='stock'
                  type='number'
                  value={formData.stock}
                  onChange={(e) =>
                    setFormData({ ...formData, stock: e.target.value })
                  }
                  placeholder='0'
                />
              </div>
            </div>

            {/* Category & SKU */}
            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label htmlFor='subCategoryId'>Sub Category</Label>
                <Select
                  value={formData.subCategoryId || 'none'}
                  onValueChange={(value) =>
                    setFormData({
                      ...formData,
                      subCategoryId: value === 'none' ? '' : value,
                    })
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder='Select category' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='none'>None</SelectItem>
                    {subCategories?.map((sub) => (
                      <SelectItem key={sub.id} value={sub.id}>
                        {sub.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className='space-y-2'>
                <Label htmlFor='sku'>SKU</Label>
                <Input
                  id='sku'
                  value={formData.sku}
                  onChange={(e) =>
                    setFormData({ ...formData, sku: e.target.value })
                  }
                  placeholder='Optional product code'
                />
              </div>
            </div>

            {/* Description */}
            <div className='space-y-2'>
              <Label htmlFor='description'>Description</Label>
              <Textarea
                id='description'
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder='Product description...'
                rows={3}
              />
            </div>

            {/* Priority & Featured */}
            <div className='grid grid-cols-2 gap-4'>
              <div className='space-y-2'>
                <Label htmlFor='priority'>Priority (0-100)</Label>
                <Input
                  id='priority'
                  type='number'
                  min='0'
                  max='100'
                  value={formData.priority}
                  onChange={(e) =>
                    setFormData({ ...formData, priority: e.target.value })
                  }
                  placeholder='50'
                />
                <p className='text-muted-foreground text-xs'>
                  Higher priority = shown first (official products default to
                  50)
                </p>
              </div>
              <div className='flex items-center space-x-2 pt-6'>
                <Switch
                  id='isFeatured'
                  checked={formData.isFeatured}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isFeatured: checked })
                  }
                />
                <Label htmlFor='isFeatured'>Featured Product</Label>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant='outline' onClick={closeDialog}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending
                ? 'Saving...'
                : editingProduct
                  ? 'Update Product'
                  : 'Create Product'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

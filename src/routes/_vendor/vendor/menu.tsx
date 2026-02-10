import { useState, useEffect, useRef } from 'react'
import {
  useInfiniteQuery,
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Plus, Search, Edit, Trash2, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type { VendorShop } from '@/lib/vendor'
import { useVendorProfile } from '@/hooks/use-vendor-profile'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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
import { Textarea } from '@/components/ui/textarea'
import ProductCard from '@/components/product-card'
import { ProductsGridSkeleton } from '@/components/product-skeleton'

export const Route = createFileRoute('/_vendor/vendor/menu')({
  component: VendorMenu,
})

interface MenuItem {
  id: string
  name: string
  description?: string
  price: number
  discountedPrice?: number
  imageUrl?: string
  isAvailable: boolean
  mealTime?: string
  preparationTime?: number
  subCategoryId?: string
}

interface SubCategory {
  id: string
  name: string
}

interface MenuItemPayload {
  name: string
  description?: string
  price: number
  discountedPrice?: number
  imageUrl?: string
  isAvailable: boolean
  mealTime?: string
  subCategoryId?: string
  preparationTime?: number
  restaurantId?: string
}

export interface ShopProduct {
  id: string
  name: string
  description?: string
  price: number
  discountedPrice?: number | null
  imageUrl?: string | null
  stock?: number | null
  isAvailable: boolean
  subCategoryId?: string | null
}

interface ShopProductPayload {
  name: string
  description?: string
  price: number
  discountedPrice?: number | null
  stock?: number
  subCategoryId?: string
  shopId: string
  imageUrl?: string
  isAvailable: boolean
}

interface ShopProductFormState {
  name: string
  description: string
  price: string
  discountedPrice: string
  stock: string
  subCategoryId: string
  isAvailable: boolean
}

const MEAL_TIMES = ['BREAKFAST', 'LUNCH', 'DINNER', 'SNACK']

const fileToBase64 = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = (error) => reject(error)
    reader.readAsDataURL(file)
  })

async function uploadMenuImage(file: File) {
  const base64 = await fileToBase64(file)
  const response = await api.post('/api/uploads/menu-item-image', {
    image: { data: base64 },
  })
  return response.data.imageUrl as string
}

async function uploadProductImage(file: File) {
  const base64 = await fileToBase64(file)
  const response = await api.post('/api/uploads/product-images', {
    images: [
      {
        data: base64,
        alt: file.name || 'Product image',
        isPrimary: true,
      },
    ],
  })
  const uploaded = response.data?.images?.[0]
  return uploaded?.url as string | undefined
}

function VendorMenu() {
  const queryClient = useQueryClient()
  const { vendor, isLoading: vendorLoading } = useVendorProfile()
  const restaurant = vendor?.restaurants?.[0]
  const shop = vendor?.shops?.[0]
  const [activeView, setActiveView] = useState<'MENU' | 'PRODUCTS'>(() =>
    restaurant ? 'MENU' : shop ? 'PRODUCTS' : 'MENU'
  )

  const hasBothBusinessTypes = Boolean(restaurant && shop)
  const effectiveView =
    activeView === 'MENU' && !restaurant && shop
      ? 'PRODUCTS'
      : activeView === 'PRODUCTS' && !shop && restaurant
        ? 'MENU'
        : activeView
  const viewSwitcher = hasBothBusinessTypes ? (
    <div className='flex justify-end'>
      <div className='text-muted-foreground flex items-center gap-3 text-sm'>
        <span>View</span>
        <Select
          value={activeView}
          onValueChange={(value) => setActiveView(value as 'MENU' | 'PRODUCTS')}
        >
          <SelectTrigger className='w-[220px]'>
            <SelectValue placeholder='Select view' />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value='MENU'>Restaurant Menu</SelectItem>
            <SelectItem value='PRODUCTS'>Shop Products</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  ) : null
  const [searchQuery, setSearchQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [selectedItem, setSelectedItem] = useState<MenuItem | null>(null)
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string>('')

  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    discountedPrice: '',
    mealTime: '',
    subCategoryId: '',
    preparationTime: '',
    isAvailable: true,
  })

  const {
    data: menuItems,
    isLoading,
    refetch,
  } = useQuery<MenuItem[]>({
    queryKey: ['vendor-menu', restaurant?.id],
    queryFn: async () => {
      if (!restaurant?.id) return []
      const response = await api.get(
        `/api/menuItem/restaurant/${restaurant.id}`
      )
      return response.data
    },
    enabled: Boolean(restaurant?.id),
  })

  const { data: subCategories } = useQuery<SubCategory[]>({
    queryKey: ['subcategories'],
    queryFn: async () => {
      const response = await api.get('/api/subcategories')
      return response.data
    },
  })

  const createMutation = useMutation({
    mutationFn: async (data: FormData) => {
      if (!restaurant?.id) {
        throw new Error('No restaurant found for this vendor')
      }

      const payload: MenuItemPayload = {
        name: String(data.get('name') || ''),
        description: (data.get('description') as string) || undefined,
        price: Number(data.get('price') || 0),
        discountedPrice: data.get('discountedPrice')
          ? Number(data.get('discountedPrice'))
          : undefined,
        mealTime: (data.get('mealTime') as string) || undefined,
        subCategoryId: (data.get('subCategoryId') as string) || undefined,
        preparationTime: data.get('preparationTime')
          ? Number(data.get('preparationTime'))
          : undefined,
        isAvailable: data.get('isAvailable') !== 'false',
        restaurantId: restaurant.id,
      }

      const rawImage = data.get('image')
      if (rawImage instanceof File && rawImage.size > 0) {
        payload.imageUrl = await uploadMenuImage(rawImage)
      }

      const response = await api.post('/api/menuItem', payload)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-menu'] })
      toast.success('Menu item created successfully')
      handleCloseModal()
    },
    onError: () => {
      toast.error('Failed to create menu item')
    },
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: FormData }) => {
      const payload: MenuItemPayload = {
        name: String(data.get('name') || ''),
        description: (data.get('description') as string) || undefined,
        price: Number(data.get('price') || 0),
        discountedPrice: data.get('discountedPrice')
          ? Number(data.get('discountedPrice'))
          : undefined,
        mealTime: (data.get('mealTime') as string) || undefined,
        subCategoryId: (data.get('subCategoryId') as string) || undefined,
        preparationTime: data.get('preparationTime')
          ? Number(data.get('preparationTime'))
          : undefined,
        isAvailable: data.get('isAvailable') !== 'false',
      }

      const rawImage = data.get('image')
      if (rawImage instanceof File && rawImage.size > 0) {
        payload.imageUrl = await uploadMenuImage(rawImage)
      }

      const response = await api.put(`/api/menuItem/${id}`, payload)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-menu'] })
      toast.success('Menu item updated successfully')
      handleCloseModal()
    },
    onError: () => {
      toast.error('Failed to update menu item')
    },
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/api/menuItem/${id}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-menu'] })
      toast.success('Menu item deleted successfully')
    },
    onError: () => {
      toast.error('Failed to delete menu item')
    },
  })

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setImageFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const data = new FormData()
    data.append('name', formData.name)
    data.append('description', formData.description)
    data.append('price', formData.price)
    if (formData.discountedPrice)
      data.append('discountedPrice', formData.discountedPrice)
    if (formData.mealTime) data.append('mealTime', formData.mealTime)
    if (formData.subCategoryId)
      data.append('subCategoryId', formData.subCategoryId)
    if (formData.preparationTime)
      data.append('preparationTime', formData.preparationTime)
    data.append('isAvailable', String(formData.isAvailable))
    if (imageFile) data.append('image', imageFile)

    if (editMode && selectedItem) {
      updateMutation.mutate({ id: selectedItem.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const handleEdit = (item: MenuItem) => {
    setSelectedItem(item)
    setEditMode(true)
    setFormData({
      name: item.name,
      description: item.description || '',
      price: String(item.price),
      discountedPrice: item.discountedPrice ? String(item.discountedPrice) : '',
      mealTime: item.mealTime || '',
      subCategoryId: item.subCategoryId || '',
      preparationTime: item.preparationTime ? String(item.preparationTime) : '',
      isAvailable: item.isAvailable,
    })
    setImagePreview(item.imageUrl || '')
    setModalOpen(true)
  }

  const handleDelete = (id: string) => {
    if (confirm('Are you sure you want to delete this item?')) {
      deleteMutation.mutate(id)
    }
  }

  const handleCloseModal = () => {
    setModalOpen(false)
    setEditMode(false)
    setSelectedItem(null)
    setImageFile(null)
    setImagePreview('')
    setFormData({
      name: '',
      description: '',
      price: '',
      discountedPrice: '',
      mealTime: '',
      subCategoryId: '',
      preparationTime: '',
      isAvailable: true,
    })
  }

  const filteredItems = menuItems?.filter((item) =>
    item.name.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (vendorLoading) {
    return (
      <div className='flex justify-center py-12'>
        <RefreshCw className='text-muted-foreground h-8 w-8 animate-spin' />
      </div>
    )
  }

  if (!restaurant && !shop) {
    return (
      <div className='rounded-lg border border-dashed p-6 text-center'>
        <h2 className='text-lg font-semibold'>No businesses found</h2>
        <p className='text-muted-foreground text-sm'>
          Link a restaurant or shop to your vendor profile to manage menu items
          or products.
        </p>
      </div>
    )
  }

  if (effectiveView === 'PRODUCTS') {
    if (!shop) {
      return (
        <div className='space-y-6'>
          {viewSwitcher}
          <div className='rounded-lg border border-dashed p-6 text-center'>
            <h2 className='text-lg font-semibold'>No shop found</h2>
            <p className='text-muted-foreground text-sm'>
              Link a shop to your vendor profile to manage products.
            </p>
          </div>
        </div>
      )
    }

    return (
      <div className='space-y-6'>
        {viewSwitcher}
        <ShopProductManager shop={shop} />
      </div>
    )
  }

  if (!restaurant) {
    return (
      <div className='space-y-6'>
        {viewSwitcher}
        <div className='rounded-lg border border-dashed p-6 text-center'>
          <h2 className='text-lg font-semibold'>No restaurant found</h2>
          <p className='text-muted-foreground text-sm'>
            Link a restaurant to your vendor profile to manage menu items.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className='space-y-6'>
      {viewSwitcher}
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight'>Menu & Products</h1>
          <p className='text-muted-foreground'>
            Manage menu items for {restaurant.name}
          </p>
        </div>
        <div className='flex gap-2'>
          <Button onClick={() => refetch()} variant='outline' size='sm'>
            <RefreshCw className='mr-2 h-4 w-4' />
            Refresh
          </Button>
          <Button onClick={() => setModalOpen(true)}>
            <Plus className='mr-2 h-4 w-4' />
            Add Item
          </Button>
        </div>
      </div>

      {/* Search */}
      <Card>
        <CardContent className='pt-6'>
          <div className='relative'>
            <Search className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2' />
            <Input
              placeholder='Search menu items...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className='pl-10'
            />
          </div>
        </CardContent>
      </Card>

      {/* Menu Items Grid */}
      {isLoading ? (
        <div className='flex justify-center py-8'>
          <RefreshCw className='text-muted-foreground h-8 w-8 animate-spin' />
        </div>
      ) : filteredItems && filteredItems.length > 0 ? (
        <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
          {filteredItems.map((item) => (
            <Card key={item.id}>
              <CardContent className='p-4'>
                {item.imageUrl && (
                  <img
                    src={item.imageUrl}
                    alt={item.name}
                    className='mb-3 h-40 w-full rounded-lg object-cover'
                  />
                )}
                <div className='space-y-2'>
                  <div className='flex items-start justify-between'>
                    <h3 className='font-semibold'>{item.name}</h3>
                    <Switch checked={item.isAvailable} disabled />
                  </div>
                  {item.description && (
                    <p className='text-muted-foreground line-clamp-2 text-sm'>
                      {item.description}
                    </p>
                  )}
                  <div className='flex items-center gap-2'>
                    <span className='text-lg font-bold'>
                      D{item.price.toFixed(2)}
                    </span>
                    {item.discountedPrice && (
                      <span className='text-muted-foreground text-sm line-through'>
                        D{item.discountedPrice.toFixed(2)}
                      </span>
                    )}
                  </div>
                  {item.mealTime && (
                    <span className='text-muted-foreground text-xs'>
                      {item.mealTime}
                    </span>
                  )}
                  <div className='flex gap-2 pt-2'>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => handleEdit(item)}
                      className='flex-1'
                    >
                      <Edit className='mr-2 h-3 w-3' />
                      Edit
                    </Button>
                    <Button
                      variant='outline'
                      size='sm'
                      onClick={() => handleDelete(item.id)}
                      className='flex-1 text-red-600 hover:text-red-700'
                    >
                      <Trash2 className='mr-2 h-3 w-3' />
                      Delete
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className='text-muted-foreground py-8 text-center'>
          No menu items found
        </div>
      )}

      {/* Add/Edit Dialog */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className='max-h-[90vh] max-w-2xl overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>{editMode ? 'Edit' : 'Add'} Menu Item</DialogTitle>
            <DialogDescription>
              {editMode
                ? 'Update the details of your menu item'
                : 'Add a new item to your menu'}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className='space-y-4'>
            {/* Image Upload */}
            <div className='space-y-2'>
              <Label>Image</Label>
              <div className='flex items-center gap-4'>
                {imagePreview && (
                  <img
                    src={imagePreview}
                    alt='Preview'
                    className='h-20 w-20 rounded-lg object-cover'
                  />
                )}
                <div className='flex-1'>
                  <Input
                    type='file'
                    accept='image/*'
                    onChange={handleImageChange}
                  />
                </div>
              </div>
            </div>

            {/* Name */}
            <div className='space-y-2'>
              <Label htmlFor='name'>Name *</Label>
              <Input
                id='name'
                value={formData.name}
                onChange={(e) =>
                  setFormData({ ...formData, name: e.target.value })
                }
                required
              />
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
                rows={3}
              />
            </div>

            {/* Price */}
            <div className='grid gap-4 md:grid-cols-2'>
              <div className='space-y-2'>
                <Label htmlFor='price'>Price *</Label>
                <Input
                  id='price'
                  type='number'
                  step='0.01'
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: e.target.value })
                  }
                  required
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='discountedPrice'>Discounted Price</Label>
                <Input
                  id='discountedPrice'
                  type='number'
                  step='0.01'
                  value={formData.discountedPrice}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      discountedPrice: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            {/* Meal Time & Preparation Time */}
            <div className='grid gap-4 md:grid-cols-2'>
              <div className='space-y-2'>
                <Label htmlFor='mealTime'>Meal Time</Label>
                <Select
                  value={formData.mealTime}
                  onValueChange={(value) =>
                    setFormData({ ...formData, mealTime: value })
                  }
                >
                  <SelectTrigger id='mealTime'>
                    <SelectValue placeholder='Select meal time' />
                  </SelectTrigger>
                  <SelectContent>
                    {MEAL_TIMES.map((time) => (
                      <SelectItem key={time} value={time}>
                        {time}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className='space-y-2'>
                <Label htmlFor='preparationTime'>Prep Time (mins)</Label>
                <Input
                  id='preparationTime'
                  type='number'
                  value={formData.preparationTime}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      preparationTime: e.target.value,
                    })
                  }
                />
              </div>
            </div>

            {/* Sub Category */}
            <div className='space-y-2'>
              <Label htmlFor='subCategory'>Sub Category</Label>
              <Select
                value={formData.subCategoryId}
                onValueChange={(value) =>
                  setFormData({ ...formData, subCategoryId: value })
                }
              >
                <SelectTrigger id='subCategory'>
                  <SelectValue placeholder='Select sub category' />
                </SelectTrigger>
                <SelectContent>
                  {subCategories?.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id}>
                      {cat.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Availability */}
            <div className='flex items-center space-x-2'>
              <Switch
                id='available'
                checked={formData.isAvailable}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isAvailable: checked })
                }
              />
              <Label htmlFor='available'>Available for customers</Label>
            </div>

            <DialogFooter>
              <Button
                type='button'
                variant='outline'
                onClick={handleCloseModal}
              >
                Cancel
              </Button>
              <Button
                type='submit'
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {createMutation.isPending || updateMutation.isPending
                  ? 'Saving...'
                  : 'Save'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

function ShopProductManager({ shop }: { shop: VendorShop }) {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [modalOpen, setModalOpen] = useState(false)
  const [editMode, setEditMode] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<ShopProduct | null>(
    null
  )
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState('')

  const initialFormState: ShopProductFormState = {
    name: '',
    description: '',
    price: '',
    discountedPrice: '',
    stock: '',
    subCategoryId: '',
    isAvailable: true,
  }
  const [formData, setFormData] =
    useState<ShopProductFormState>(initialFormState)
  const loadMoreRef = useRef<HTMLDivElement>(null)

  const PRODUCTS_PER_PAGE = 12

  const {
    data,
    isLoading,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ['vendor-shop-products', shop.id, searchQuery, PRODUCTS_PER_PAGE],
    queryFn: async ({ pageParam = 0 }) => {
      const params = new URLSearchParams({
        skip: String(pageParam),
        take: String(PRODUCTS_PER_PAGE),
      })
      if (searchQuery) {
        params.append('search', searchQuery)
      }
      const response = await api.get(`/api/products/shop/${shop.id}?${params}`)
      return response.data as ShopProduct[]
    },
    getNextPageParam: (lastPage, allPages) => {
      if (!lastPage || lastPage.length < PRODUCTS_PER_PAGE) {
        return undefined
      }
      return allPages.length * PRODUCTS_PER_PAGE
    },
    initialPageParam: 0,
    enabled: Boolean(shop.id),
  })

  const products = data?.pages.flat() ?? []

  const { data: subCategories = [] } = useQuery<SubCategory[]>({
    queryKey: ['subcategories'],
    queryFn: async () => {
      const response = await api.get('/api/subcategories')
      return response.data
    },
  })

  // Intersection observer for infinite scroll with better performance
  useEffect(() => {
    if (!hasNextPage || isFetchingNextPage) return

    const observer = new IntersectionObserver(
      (entries) => {
        const first = entries[0]
        if (first.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      {
        threshold: 0.1,
        rootMargin: '100px', // Load earlier for smoother experience
      }
    )

    const currentRef = loadMoreRef.current
    if (currentRef) {
      observer.observe(currentRef)
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef)
      }
    }
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const resetFormState = () => {
    setFormData(initialFormState)
    setImageFile(null)
    setImagePreview('')
    setSelectedProduct(null)
    setEditMode(false)
  }

  const handleCloseModal = () => {
    setModalOpen(false)
    resetFormState()
  }

  const handleAddProduct = () => {
    resetFormState()
    setModalOpen(true)
  }

  const handleEditProduct = (product: ShopProduct) => {
    setSelectedProduct(product)
    setEditMode(true)
    setFormData({
      name: product.name,
      description: product.description || '',
      price: product.price ? String(product.price) : '',
      discountedPrice: product.discountedPrice
        ? String(product.discountedPrice)
        : '',
      stock: product.stock ? String(product.stock) : '',
      subCategoryId: product.subCategoryId || '',
      isAvailable: product.isAvailable,
    })
    setImagePreview(product.imageUrl || '')
    setModalOpen(true)
  }

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    setImageFile(file)
    const reader = new FileReader()
    reader.onloadend = () => setImagePreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const handleRemoveImage = () => {
    setImageFile(null)
    setImagePreview('')
  }

  const buildPayload = async (): Promise<ShopProductPayload> => {
    const trimmedName = formData.name.trim()
    if (!trimmedName) {
      throw new Error('Product name is required')
    }

    const priceValue = Number(formData.price)
    if (Number.isNaN(priceValue) || priceValue <= 0) {
      throw new Error('Enter a valid price greater than 0')
    }

    const stockValue = formData.stock ? Number(formData.stock) : 0
    if (Number.isNaN(stockValue) || stockValue < 0) {
      throw new Error('Enter a valid stock quantity')
    }

    let discountedValue: number | null = null
    if (formData.discountedPrice) {
      discountedValue = Number(formData.discountedPrice)
      if (Number.isNaN(discountedValue) || discountedValue <= 0) {
        throw new Error('Enter a valid discounted price')
      }
      if (discountedValue >= priceValue) {
        throw new Error('Discounted price must be less than the base price')
      }
    }

    let imageUrl = imagePreview
    if (imageFile) {
      const uploadedUrl = await uploadProductImage(imageFile)
      if (!uploadedUrl) {
        throw new Error('Failed to upload product image')
      }
      imageUrl = uploadedUrl
    }

    const payload: ShopProductPayload = {
      name: trimmedName,
      description: formData.description.trim() || undefined,
      price: priceValue,
      discountedPrice: discountedValue,
      stock: stockValue,
      subCategoryId: formData.subCategoryId || undefined,
      shopId: shop.id,
      isAvailable: formData.isAvailable,
    }

    if (imageUrl) {
      payload.imageUrl = imageUrl
    }

    return payload
  }

  const createProductMutation = useMutation({
    mutationFn: async (payload: ShopProductPayload) => {
      const response = await api.post('/api/products', payload)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-shop-products'] })
      toast.success('Product created successfully')
      handleCloseModal()
    },
    onError: () => {
      toast.error('Failed to create product')
    },
  })

  const updateProductMutation = useMutation({
    mutationFn: async ({
      id,
      payload,
    }: {
      id: string
      payload: ShopProductPayload
    }) => {
      const response = await api.put(`/api/products/${id}`, payload)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-shop-products'] })
      toast.success('Product updated successfully')
      handleCloseModal()
    },
    onError: () => {
      toast.error('Failed to update product')
    },
  })

  const deleteProductMutation = useMutation({
    mutationFn: async (productId: string) => {
      await api.delete(`/api/products/${productId}`)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-shop-products'] })
      toast.success('Product deleted successfully')
    },
    onError: () => {
      toast.error('Failed to delete product')
    },
  })

  const availabilityMutation = useMutation({
    mutationFn: async ({
      id,
      isAvailable,
    }: {
      id: string
      isAvailable: boolean
    }) => {
      const response = await api.put(`/api/products/${id}`, { isAvailable })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-shop-products'] })
      toast.success('Product visibility updated')
    },
    onError: () => {
      toast.error('Failed to update product visibility')
    },
  })

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    try {
      const payload = await buildPayload()
      if (editMode && selectedProduct) {
        updateProductMutation.mutate({ id: selectedProduct.id, payload })
      } else {
        createProductMutation.mutate(payload)
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Failed to save product'
      toast.error(message)
    }
  }

  const handleDelete = (productId: string) => {
    if (!window.confirm('Delete this product? This action cannot be undone.')) {
      return
    }
    deleteProductMutation.mutate(productId)
  }

  const handleToggleAvailability = (product: ShopProduct) => {
    availabilityMutation.mutate({
      id: product.id,
      isAvailable: !product.isAvailable,
    })
  }

  // Search is handled server-side via query params
  const filteredProducts = products

  const isSaving =
    createProductMutation.isPending || updateProductMutation.isPending

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight'>
            Product Management
          </h1>
          <p className='text-muted-foreground'>
            Manage products for {shop.name}
          </p>
        </div>
        <div className='flex gap-2'>
          <Button onClick={() => refetch()} variant='outline' size='sm'>
            <RefreshCw className='mr-2 h-4 w-4' />
            Refresh
          </Button>
          <Button onClick={handleAddProduct}>
            <Plus className='mr-2 h-4 w-4' />
            Add Product
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className='pt-6'>
          <div className='relative'>
            <Search className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2' />
            <Input
              placeholder='Search products...'
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className='pl-10'
            />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <ProductsGridSkeleton count={12} />
      ) : filteredProducts.length > 0 ? (
        <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-3'>
          {filteredProducts.map((product) => {
            const toggling =
              availabilityMutation.isPending &&
              availabilityMutation.variables?.id === product.id
            const deleting =
              deleteProductMutation.isPending &&
              deleteProductMutation.variables === product.id

            return (
              <ProductCard
                key={product.id}
                product={product}
                onEdit={handleEditProduct}
                onDelete={handleDelete}
                onToggleAvailability={handleToggleAvailability}
                isToggling={toggling}
                isDeleting={deleting}
              />
            )
          })}
        </div>
      ) : (
        <div className='rounded-lg border border-dashed p-6 text-center'>
          <h3 className='text-lg font-semibold'>No products yet</h3>
          <p className='text-muted-foreground text-sm'>
            Use “Add Product” to create your first item.
          </p>
        </div>
      )}

      {/* Load more trigger */}
      {filteredProducts.length > 0 && (
        <div ref={loadMoreRef} className='flex justify-center py-4'>
          {isFetchingNextPage && (
            <div className='grid w-full gap-4 md:grid-cols-2 lg:grid-cols-3'>
              <ProductsGridSkeleton count={3} />
            </div>
          )}
          {!hasNextPage &&
            !isFetchingNextPage &&
            filteredProducts.length >= PRODUCTS_PER_PAGE && (
              <p className='text-muted-foreground text-sm'>
                All products loaded ({filteredProducts.length} total)
              </p>
            )}
        </div>
      )}

      <Dialog
        open={modalOpen}
        onOpenChange={(open) =>
          open ? setModalOpen(true) : handleCloseModal()
        }
      >
        <DialogContent className='max-w-2xl'>
          <DialogHeader>
            <DialogTitle>
              {editMode ? 'Edit product' : 'Add product'}
            </DialogTitle>
            <DialogDescription>
              {editMode
                ? 'Update product details for your shop.'
                : 'Create a new product for your shop.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className='space-y-6'>
            <div className='grid gap-4 md:grid-cols-2'>
              <div className='space-y-2'>
                <Label htmlFor='productName'>Product Name</Label>
                <Input
                  id='productName'
                  value={formData.name}
                  onChange={(e) =>
                    setFormData({ ...formData, name: e.target.value })
                  }
                  disabled={isSaving}
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='productPrice'>Price</Label>
                <Input
                  id='productPrice'
                  type='number'
                  min='0'
                  step='0.01'
                  value={formData.price}
                  onChange={(e) =>
                    setFormData({ ...formData, price: e.target.value })
                  }
                  disabled={isSaving}
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='discountedPrice'>Discounted Price</Label>
                <Input
                  id='discountedPrice'
                  type='number'
                  min='0'
                  step='0.01'
                  value={formData.discountedPrice}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      discountedPrice: e.target.value,
                    })
                  }
                  disabled={isSaving}
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='stock'>Stock</Label>
                <Input
                  id='stock'
                  type='number'
                  min='0'
                  value={formData.stock}
                  onChange={(e) =>
                    setFormData({ ...formData, stock: e.target.value })
                  }
                  disabled={isSaving}
                />
              </div>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='subCategory'>Subcategory</Label>
              <Select
                value={formData.subCategoryId}
                onValueChange={(value) =>
                  setFormData({ ...formData, subCategoryId: value })
                }
                disabled={isSaving}
              >
                <SelectTrigger id='subCategory'>
                  <SelectValue placeholder='Select a subcategory' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value=''>None</SelectItem>
                  {subCategories.map((subCategory) => (
                    <SelectItem key={subCategory.id} value={subCategory.id}>
                      {subCategory.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='description'>Description</Label>
              <Textarea
                id='description'
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                rows={4}
                placeholder='Describe your product...'
                disabled={isSaving}
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='productImage'>Product Image</Label>
              <Input
                id='productImage'
                type='file'
                accept='image/*'
                onChange={handleImageChange}
                disabled={isSaving}
              />
              {imagePreview && (
                <div className='space-y-2'>
                  <img
                    src={imagePreview}
                    alt='Product preview'
                    className='h-40 w-full rounded-lg object-cover'
                  />
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={handleRemoveImage}
                    disabled={isSaving}
                  >
                    Remove image
                  </Button>
                </div>
              )}
            </div>

            <div className='flex items-center justify-between rounded-lg border p-4'>
              <div>
                <p className='font-medium'>Available for ordering</p>
                <p className='text-muted-foreground text-sm'>
                  Toggle to make this product visible to customers
                </p>
              </div>
              <Switch
                checked={formData.isAvailable}
                onCheckedChange={(checked) =>
                  setFormData({ ...formData, isAvailable: checked })
                }
                disabled={isSaving}
              />
            </div>

            <DialogFooter>
              <Button type='submit' disabled={isSaving}>
                {isSaving
                  ? 'Saving...'
                  : editMode
                    ? 'Save changes'
                    : 'Create product'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}

import { useState, useRef, useMemo } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import {
  Save,
  Loader2,
  Camera,
  Crown,
  Store,
  MapPin,
  Phone,
  Mail,
  Clock,
  Image as ImageIcon,
  CheckCircle,
  XCircle,
} from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { TopNav } from '@/components/layout/top-nav'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { ThemeSwitch } from '@/components/theme-switch'
import { Skeleton } from '@/components/ui/skeleton'

export const Route = createFileRoute(
  '/_authenticated/admin/terango-store/settings'
)({
  component: TerangoStoreSettings,
})

const topNav = [
  { title: 'Store Dashboard', href: '/admin/terango-store', isActive: false },
  { title: 'Orders', href: '/admin/terango-store/orders', isActive: false },
  { title: 'Settings', href: '/admin/terango-store/settings', isActive: true },
  { title: 'Products', href: '/admin/terango-products', isActive: false },
]

// Cloudinary config
const CLOUDINARY_CLOUD_NAME = 'dkpi5ij2t'
const CLOUDINARY_UPLOAD_PRESET = 'unsigned_preset'

interface StoreData {
  vendor: {
    id: string
    isSystemVendor: boolean
    isActive: boolean
    user: {
      id: string
      email: string
      fullName: string
    } | null
  } | null
  shop: {
    id: string
    name: string
    description: string
    address: string
    city: string
    phone: string
    email: string
    imageUrl: string
    bannerUrl: string
    isActive: boolean
    acceptsOrders: boolean
    openingHours: Record<string, { open: string; close: string; closed: boolean }>
  } | null
}

interface BusinessHours {
  day: string
  isOpen: boolean
  openTime: string
  closeTime: string
}

const DAYS = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
]

function parseOpeningHours(
  openingHours?: Record<string, { open?: string; close?: string; closed?: boolean }>
): BusinessHours[] {
  return DAYS.map((day) => {
    const dayKey = day.toLowerCase()
    const dayData = openingHours?.[dayKey]

    if (dayData && typeof dayData === 'object') {
      return {
        day,
        isOpen: !dayData.closed,
        openTime: dayData.open || '09:00',
        closeTime: dayData.close || '18:00',
      }
    }

    return {
      day,
      isOpen: true,
      openTime: '09:00',
      closeTime: '18:00',
    }
  })
}

function TerangoStoreSettings() {
  const queryClient = useQueryClient()
  const imageInputRef = useRef<HTMLInputElement>(null)
  const bannerInputRef = useRef<HTMLInputElement>(null)

  const [isEditing, setIsEditing] = useState(false)
  const [imageUploading, setImageUploading] = useState(false)
  const [bannerUploading, setBannerUploading] = useState(false)

  // Fetch store data
  const { data: storeData, isLoading, error } = useQuery<StoreData>({
    queryKey: ['terango-store-settings'],
    queryFn: async () => {
      const response = await api.get('/api/admin/terango-store')
      return response.data
    },
  })

  // Derive initial form data from store data
  const initialFormData = useMemo(() => {
    const shop = storeData?.shop
    return {
      name: shop?.name || '',
      description: shop?.description || '',
      address: shop?.address || '',
      city: shop?.city || '',
      phone: shop?.phone || '',
      email: shop?.email || '',
      isActive: shop?.isActive ?? true,
      acceptsOrders: shop?.acceptsOrders ?? true,
      imageUrl: shop?.imageUrl || '',
      bannerUrl: shop?.bannerUrl || '',
    }
  }, [storeData?.shop])

  const initialBusinessHours = useMemo(() => {
    return parseOpeningHours(storeData?.shop?.openingHours)
  }, [storeData?.shop?.openingHours])

  // Form state - initialize from initial values
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    address: '',
    city: '',
    phone: '',
    email: '',
    isActive: true,
    acceptsOrders: true,
    imageUrl: '',
    bannerUrl: '',
  })
  const [businessHours, setBusinessHours] = useState<BusinessHours[]>(
    parseOpeningHours()
  )
  const [hasAppliedInitialData, setHasAppliedInitialData] = useState(false)

  // Apply initial data once when loaded
  if (storeData?.shop && !hasAppliedInitialData) {
    setFormData(initialFormData)
    setBusinessHours(initialBusinessHours)
    setHasAppliedInitialData(true)
  }

  // Upload image to Cloudinary
  const uploadToCloudinary = async (file: File): Promise<string | null> => {
    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)

      const response = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`,
        {
          method: 'POST',
          body: formData,
        }
      )

      const data = await response.json()
      return data.secure_url || null
    } catch {
      return null
    }
  }

  // Handle image upload
  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    type: 'image' | 'banner'
  ) => {
    const file = e.target.files?.[0]
    if (!file) return

    const setUploading = type === 'image' ? setImageUploading : setBannerUploading

    setUploading(true)
    try {
      const url = await uploadToCloudinary(file)
      if (url) {
        setFormData((prev) => ({
          ...prev,
          [type === 'image' ? 'imageUrl' : 'bannerUrl']: url,
        }))
        toast.success(`${type === 'image' ? 'Logo' : 'Banner'} uploaded successfully`)
      } else {
        toast.error('Failed to upload image')
      }
    } catch {
      toast.error('Failed to upload image')
    }
    setUploading(false)
  }

  // Update settings mutation
  const updateMutation = useMutation({
    mutationFn: async () => {
      const openingHours: Record<
        string,
        { open: string; close: string; closed: boolean }
      > = {}
      businessHours.forEach((day) => {
        const dayName = day.day.toLowerCase()
        openingHours[dayName] = {
          open: day.openTime,
          close: day.closeTime,
          closed: !day.isOpen,
        }
      })

      const response = await api.put('/api/admin/terango-store/settings', {
        ...formData,
        openingHours,
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terango-store-settings'] })
      queryClient.invalidateQueries({ queryKey: ['terango-store-dashboard'] })
      setIsEditing(false)
      toast.success('Store settings updated successfully')
    },
    onError: () => {
      toast.error('Failed to update settings')
    },
  })

  // Setup store if not exists
  const setupMutation = useMutation({
    mutationFn: async () => {
      const response = await api.post('/api/admin/terango-products/setup')
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['terango-store-settings'] })
      toast.success('Store setup completed')
    },
    onError: () => {
      toast.error('Failed to setup store')
    },
  })

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    updateMutation.mutate()
  }

  const updateBusinessHour = (
    index: number,
    field: keyof BusinessHours,
    value: string | boolean
  ) => {
    setBusinessHours((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  if (isLoading) {
    return (
      <>
        <Header>
          <TopNav links={topNav} />
          <div className='ms-auto flex items-center space-x-4'>
            <ThemeSwitch />
            <ProfileDropdown />
          </div>
        </Header>
        <Main>
          <div className='space-y-6'>
            <Skeleton className='h-10 w-64' />
            <div className='grid gap-6 md:grid-cols-2'>
              <Skeleton className='h-96' />
              <Skeleton className='h-96' />
            </div>
          </div>
        </Main>
      </>
    )
  }

  if (error || !storeData?.shop) {
    return (
      <>
        <Header>
          <TopNav links={topNav} />
          <div className='ms-auto flex items-center space-x-4'>
            <ThemeSwitch />
            <ProfileDropdown />
          </div>
        </Header>
        <Main>
          <Card className='mx-auto max-w-md'>
            <CardContent className='pt-6'>
              <div className='flex flex-col items-center text-center'>
                <XCircle className='mb-4 h-12 w-12 text-red-500' />
                <h2 className='text-lg font-semibold'>Store not set up</h2>
                <p className='text-muted-foreground mt-2 text-sm'>
                  Initialize the TeranGO Official Store to configure settings.
                </p>
                <Button
                  className='mt-4'
                  onClick={() => setupMutation.mutate()}
                  disabled={setupMutation.isPending}
                >
                  {setupMutation.isPending ? (
                    <>
                      <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                      Setting up...
                    </>
                  ) : (
                    'Setup Store'
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </Main>
      </>
    )
  }

  return (
    <>
      <Header>
        <TopNav links={topNav} />
        <div className='ms-auto flex items-center space-x-4'>
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <form onSubmit={handleSave} className='space-y-6'>
          {/* Header */}
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-3'>
              <div className='rounded-lg bg-gradient-to-br from-orange-500 to-orange-600 p-3'>
                <Crown className='h-6 w-6 text-white' />
              </div>
              <div>
                <h1 className='text-3xl font-bold tracking-tight'>
                  Store Settings
                </h1>
                <p className='text-muted-foreground'>
                  Configure your TeranGO Official Store
                </p>
              </div>
            </div>
            <div className='flex gap-2'>
              {isEditing ? (
                <>
                  <Button
                    type='button'
                    variant='outline'
                    onClick={() => setIsEditing(false)}
                  >
                    Cancel
                  </Button>
                  <Button type='submit' disabled={updateMutation.isPending}>
                    {updateMutation.isPending ? (
                      <>
                        <Loader2 className='mr-2 h-4 w-4 animate-spin' />
                        Saving...
                      </>
                    ) : (
                      <>
                        <Save className='mr-2 h-4 w-4' />
                        Save Changes
                      </>
                    )}
                  </Button>
                </>
              ) : (
                <Button type='button' onClick={() => setIsEditing(true)}>
                  Edit Settings
                </Button>
              )}
            </div>
          </div>

          <div className='grid gap-6 lg:grid-cols-2'>
            {/* Store Images */}
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <ImageIcon className='h-5 w-5' />
                  Store Images
                </CardTitle>
                <CardDescription>
                  Upload your store logo and banner
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-6'>
                {/* Logo */}
                <div className='space-y-2'>
                  <Label>Store Logo</Label>
                  <div className='flex items-center gap-4'>
                    <div
                      className='relative h-24 w-24 cursor-pointer overflow-hidden rounded-lg border-2 border-dashed'
                      onClick={() => isEditing && imageInputRef.current?.click()}
                    >
                      {formData.imageUrl ? (
                        <img
                          src={formData.imageUrl}
                          alt='Store logo'
                          className='h-full w-full object-cover'
                        />
                      ) : (
                        <div className='flex h-full w-full items-center justify-center bg-gray-100'>
                          <Camera className='h-8 w-8 text-gray-400' />
                        </div>
                      )}
                      {imageUploading && (
                        <div className='absolute inset-0 flex items-center justify-center bg-black/50'>
                          <Loader2 className='h-6 w-6 animate-spin text-white' />
                        </div>
                      )}
                    </div>
                    <div className='flex-1'>
                      <p className='text-muted-foreground text-sm'>
                        Recommended: 200x200px, square image
                      </p>
                      {isEditing && (
                        <Button
                          type='button'
                          variant='outline'
                          size='sm'
                          className='mt-2'
                          onClick={() => imageInputRef.current?.click()}
                          disabled={imageUploading}
                        >
                          Upload Logo
                        </Button>
                      )}
                    </div>
                  </div>
                  <input
                    ref={imageInputRef}
                    type='file'
                    accept='image/*'
                    className='hidden'
                    aria-label='Upload store logo'
                    onChange={(e) => handleImageUpload(e, 'image')}
                  />
                </div>

                {/* Banner */}
                <div className='space-y-2'>
                  <Label>Store Banner</Label>
                  <div
                    className='relative h-32 w-full cursor-pointer overflow-hidden rounded-lg border-2 border-dashed'
                    onClick={() => isEditing && bannerInputRef.current?.click()}
                  >
                    {formData.bannerUrl ? (
                      <img
                        src={formData.bannerUrl}
                        alt='Store banner'
                        className='h-full w-full object-cover'
                      />
                    ) : (
                      <div className='flex h-full w-full items-center justify-center bg-gray-100'>
                        <ImageIcon className='h-8 w-8 text-gray-400' />
                        <span className='text-muted-foreground ml-2 text-sm'>
                          Upload banner
                        </span>
                      </div>
                    )}
                    {bannerUploading && (
                      <div className='absolute inset-0 flex items-center justify-center bg-black/50'>
                        <Loader2 className='h-6 w-6 animate-spin text-white' />
                      </div>
                    )}
                  </div>
                  <p className='text-muted-foreground text-sm'>
                    Recommended: 1200x400px, horizontal image
                  </p>
                  <input
                    ref={bannerInputRef}
                    type='file'
                    accept='image/*'
                    className='hidden'
                    aria-label='Upload store banner'
                    onChange={(e) => handleImageUpload(e, 'banner')}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Basic Information */}
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <Store className='h-5 w-5' />
                  Basic Information
                </CardTitle>
                <CardDescription>
                  Store name, description, and contact details
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='space-y-2'>
                  <Label htmlFor='name'>Store Name</Label>
                  <Input
                    id='name'
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    disabled={!isEditing}
                    placeholder='TeranGO Official Store'
                  />
                </div>

                <div className='space-y-2'>
                  <Label htmlFor='description'>Description</Label>
                  <Textarea
                    id='description'
                    value={formData.description}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        description: e.target.value,
                      }))
                    }
                    disabled={!isEditing}
                    placeholder='Describe your store...'
                    rows={3}
                  />
                </div>

                <div className='grid gap-4 sm:grid-cols-2'>
                  <div className='space-y-2'>
                    <Label htmlFor='phone'>
                      <Phone className='mr-1 inline h-3 w-3' />
                      Phone
                    </Label>
                    <Input
                      id='phone'
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          phone: e.target.value,
                        }))
                      }
                      disabled={!isEditing}
                      placeholder='+220 1234567'
                    />
                  </div>
                  <div className='space-y-2'>
                    <Label htmlFor='email'>
                      <Mail className='mr-1 inline h-3 w-3' />
                      Email
                    </Label>
                    <Input
                      id='email'
                      type='email'
                      value={formData.email}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          email: e.target.value,
                        }))
                      }
                      disabled={!isEditing}
                      placeholder='store@terango.gm'
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Location */}
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <MapPin className='h-5 w-5' />
                  Location
                </CardTitle>
                <CardDescription>Store address and city</CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='space-y-2'>
                  <Label htmlFor='address'>Address</Label>
                  <Input
                    id='address'
                    value={formData.address}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        address: e.target.value,
                      }))
                    }
                    disabled={!isEditing}
                    placeholder='123 Main Street'
                  />
                </div>
                <div className='space-y-2'>
                  <Label htmlFor='city'>City</Label>
                  <Input
                    id='city'
                    value={formData.city}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, city: e.target.value }))
                    }
                    disabled={!isEditing}
                    placeholder='Banjul'
                  />
                </div>
              </CardContent>
            </Card>

            {/* Store Status */}
            <Card>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <CheckCircle className='h-5 w-5' />
                  Store Status
                </CardTitle>
                <CardDescription>
                  Control store visibility and order acceptance
                </CardDescription>
              </CardHeader>
              <CardContent className='space-y-4'>
                <div className='flex items-center justify-between'>
                  <div>
                    <Label>Store Active</Label>
                    <p className='text-muted-foreground text-sm'>
                      Store is visible to customers
                    </p>
                  </div>
                  <Switch
                    checked={formData.isActive}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({ ...prev, isActive: checked }))
                    }
                    disabled={!isEditing}
                  />
                </div>
                <div className='flex items-center justify-between'>
                  <div>
                    <Label>Accept Orders</Label>
                    <p className='text-muted-foreground text-sm'>
                      Allow customers to place orders
                    </p>
                  </div>
                  <Switch
                    checked={formData.acceptsOrders}
                    onCheckedChange={(checked) =>
                      setFormData((prev) => ({
                        ...prev,
                        acceptsOrders: checked,
                      }))
                    }
                    disabled={!isEditing}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Business Hours */}
            <Card className='lg:col-span-2'>
              <CardHeader>
                <CardTitle className='flex items-center gap-2'>
                  <Clock className='h-5 w-5' />
                  Business Hours
                </CardTitle>
                <CardDescription>
                  Set your store opening and closing times
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className='space-y-3'>
                  {businessHours.map((day, index) => (
                    <div
                      key={day.day}
                      className='flex items-center gap-4 rounded-lg border p-3'
                    >
                      <div className='w-24'>
                        <span className='font-medium'>{day.day}</span>
                      </div>
                      <Switch
                        checked={day.isOpen}
                        onCheckedChange={(checked) =>
                          updateBusinessHour(index, 'isOpen', checked)
                        }
                        disabled={!isEditing}
                      />
                      {day.isOpen ? (
                        <>
                          <Input
                            type='time'
                            value={day.openTime}
                            onChange={(e) =>
                              updateBusinessHour(index, 'openTime', e.target.value)
                            }
                            disabled={!isEditing}
                            className='w-32'
                          />
                          <span className='text-muted-foreground'>to</span>
                          <Input
                            type='time'
                            value={day.closeTime}
                            onChange={(e) =>
                              updateBusinessHour(index, 'closeTime', e.target.value)
                            }
                            disabled={!isEditing}
                            className='w-32'
                          />
                        </>
                      ) : (
                        <span className='text-muted-foreground'>Closed</span>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </form>
      </Main>
    </>
  )
}

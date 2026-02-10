import { useMemo, useState, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { AlertCircle, Camera, LogOut, Save, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import type {
  VendorBusiness,
  VendorBusinessType,
  VendorProfile,
} from '@/lib/vendor'
import {
  useVendorProfile,
  VENDOR_PROFILE_QUERY_KEY,
} from '@/hooks/use-vendor-profile'
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'

export const Route = createFileRoute('/_vendor/vendor/settings')({
  component: VendorSettings,
})

interface BusinessOption {
  id: string
  label: string
  type: VendorBusinessType
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

const CLOUDINARY_CLOUD_NAME = 'dkpi5ij2t'
const CLOUDINARY_UPLOAD_PRESET = 'unsigned_preset'

function getBusinessOptions(vendor: VendorProfile): BusinessOption[] {
  const options: BusinessOption[] = []

  if (vendor.restaurants) {
    vendor.restaurants.forEach((r) => {
      options.push({ id: r.id, label: r.name, type: 'RESTAURANT' })
    })
  }

  if (vendor.shops) {
    vendor.shops.forEach((s) => {
      options.push({ id: s.id, label: s.name, type: 'SHOP' })
    })
  }

  if (vendor.pharmacies) {
    vendor.pharmacies.forEach((p) => {
      options.push({ id: p.id, label: p.name, type: 'PHARMACY' })
    })
  }

  return options
}

function findBusinessById(
  vendor: VendorProfile,
  businessId?: string
): VendorBusiness | undefined {
  if (!businessId) return undefined

  const allBusinesses = [
    ...(vendor.restaurants || []),
    ...(vendor.shops || []),
    ...(vendor.pharmacies || []),
  ]

  return allBusinesses.find((b) => b.id === businessId)
}

function parseOpeningHours(business?: VendorBusiness): BusinessHours[] {
  const defaultHours = DAYS.map((day) => ({
    day,
    isOpen: true,
    openTime: '09:00',
    closeTime: '18:00',
  }))

  if (!business?.openingHours || typeof business.openingHours !== 'object') {
    return defaultHours
  }

  return DAYS.map((day) => {
    const dayKey = day.toLowerCase()
    const dayData = (
      business.openingHours as Record<
        string,
        { open?: string; close?: string; closed?: boolean }
      >
    )[dayKey]

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

function VendorSettings() {
  const { vendor, isLoading, refetch } = useVendorProfile()
  const businessOptions = useMemo(
    () => (vendor ? getBusinessOptions(vendor) : []),
    [vendor]
  )
  const [selectedBusinessId, setSelectedBusinessId] = useState('')

  const resolvedBusinessId = useMemo(() => {
    if (!businessOptions.length) {
      return ''
    }

    const isValidSelection = businessOptions.some(
      (option) => option.id === selectedBusinessId
    )

    return isValidSelection ? selectedBusinessId : businessOptions[0].id
  }, [businessOptions, selectedBusinessId])

  const activeBusiness = useMemo(
    () => (vendor ? findBusinessById(vendor, resolvedBusinessId) : undefined),
    [vendor, resolvedBusinessId]
  )

  const businessKey = activeBusiness
    ? `${activeBusiness.id}-${activeBusiness.imageUrl || 'no-image'}`
    : 'no-business'

  if (isLoading && !vendor) {
    return (
      <div className='flex justify-center py-12'>
        <div className='text-muted-foreground text-sm'>Loading settings...</div>
      </div>
    )
  }

  if (!vendor) {
    return (
      <div className='space-y-2 rounded-lg border border-dashed p-6 text-center'>
        <p className='font-semibold'>Vendor profile not found</p>
        <p className='text-muted-foreground text-sm'>
          Complete vendor onboarding on the mobile app to unlock settings.
        </p>
      </div>
    )
  }

  return (
    <VendorSettingsView
      key={businessKey}
      vendor={vendor}
      business={activeBusiness}
      businessOptions={businessOptions}
      selectedBusinessId={resolvedBusinessId}
      onBusinessChange={setSelectedBusinessId}
      refetch={refetch}
    />
  )
}

interface VendorSettingsViewProps {
  vendor: VendorProfile
  business?: VendorBusiness
  businessOptions: BusinessOption[]
  selectedBusinessId?: string
  onBusinessChange: (businessId: string) => void
  refetch: () => void
}

function VendorSettingsView({
  vendor,
  business,
  businessOptions,
  selectedBusinessId,
  onBusinessChange,
  refetch,
}: VendorSettingsViewProps) {
  const queryClient = useQueryClient()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [isEditing, setIsEditing] = useState(false)
  const [imageUploading, setImageUploading] = useState(false)

  // Initialize state from business data
  const [profileImage, setProfileImage] = useState(business?.imageUrl || '')
  const [formData, setFormData] = useState({
    name: business?.name || '',
    description: business?.description || '',
    address: business?.address || '',
    phone: business?.phone || '',
    email: business?.email || '',
  })
  const [businessHours, setBusinessHours] = useState<BusinessHours[]>(() =>
    parseOpeningHours(business)
  )

  const uploadImage = async (file: File): Promise<string | null> => {
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

  const imageMutation = useMutation({
    mutationFn: async (imageUrl: string) => {
      if (!business) throw new Error('No business')

      const endpoint =
        business.type === 'RESTAURANT'
          ? `/api/restaurants/${business.id}/details`
          : `/api/shops/${business.id}`

      await api.put(endpoint, { imageUrl })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [VENDOR_PROFILE_QUERY_KEY, vendor.user?.id || vendor.userId],
      })
      refetch()
      toast.success('Business logo updated')
    },
    onError: () => toast.error('Failed to save logo'),
  })

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!business) throw new Error('No business')

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

      const endpoint =
        business.type === 'RESTAURANT'
          ? `/api/restaurants/${business.id}/details`
          : `/api/shops/${business.id}`

      await api.put(endpoint, {
        name: formData.name,
        description: formData.description,
        address: formData.address,
        phone: formData.phone,
        email: formData.email,
        openingHours,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [VENDOR_PROFILE_QUERY_KEY, vendor.user?.id || vendor.userId],
      })
      refetch()
      setIsEditing(false)
      toast.success('Business profile updated')
    },
    onError: () => toast.error('Failed to update profile'),
  })

  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setImageUploading(true)
    try {
      const imageUrl = await uploadImage(file)
      if (imageUrl) {
        setProfileImage(imageUrl)
        await imageMutation.mutateAsync(imageUrl)
      } else {
        toast.error('Failed to upload image')
      }
    } catch {
      toast.error('Failed to upload image')
    }
    setImageUploading(false)
  }

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    updateMutation.mutate()
  }

  const handleLogout = () => {
    localStorage.clear()
    window.location.href = '/auth/login'
  }

  return (
    <div className='space-y-6'>
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight'>
            Business Settings
          </h1>
          <p className='text-muted-foreground'>
            Manage your business profile and hours
          </p>
        </div>
        {business && !isEditing && (
          <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
        )}
      </div>

      {businessOptions.length > 1 && (
        <div className='max-w-md space-y-2'>
          <Label>Active business</Label>
          <Select value={selectedBusinessId} onValueChange={onBusinessChange}>
            <SelectTrigger>
              <SelectValue placeholder='Select a business' />
            </SelectTrigger>
            <SelectContent>
              {businessOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.label} · {option.type.toLowerCase()}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {!business && (
        <div className='flex items-start gap-3 rounded-lg border border-dashed p-4'>
          <AlertCircle className='h-5 w-5 text-orange-500' />
          <div>
            <p className='font-medium'>No business found</p>
            <p className='text-muted-foreground text-sm'>
              Add a restaurant or shop from the mobile app.
            </p>
          </div>
        </div>
      )}

      {business && (
        <form onSubmit={handleSave} className='space-y-6'>
          <Card>
            <CardHeader>
              <CardTitle>Business Profile</CardTitle>
              <CardDescription>
                Your business image and basic details
              </CardDescription>
            </CardHeader>
            <CardContent className='space-y-6'>
              {/* Business Image */}
              <div className='flex flex-col items-center gap-4'>
                <div className='relative'>
                  <div className='h-32 w-32 overflow-hidden rounded-lg border-2 border-gray-200'>
                    {profileImage ? (
                      <img
                        src={profileImage}
                        alt='Business logo'
                        className='h-full w-full object-cover'
                      />
                    ) : (
                      <div className='flex h-full w-full items-center justify-center bg-gray-100 text-gray-400'>
                        No Image
                      </div>
                    )}
                  </div>
                  {isEditing && (
                    <button
                      type='button'
                      onClick={() => fileInputRef.current?.click()}
                      disabled={imageUploading}
                      className='bg-primary hover:bg-primary/90 absolute right-0 bottom-0 rounded-full p-2 text-white shadow-lg'
                    >
                      {imageUploading ? (
                        <Loader2 className='h-4 w-4 animate-spin' />
                      ) : (
                        <Camera className='h-4 w-4' />
                      )}
                    </button>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type='file'
                  accept='image/*'
                  onChange={handleImageSelect}
                  className='hidden'
                  aria-label='Upload business image'
                />
                <div className='text-center'>
                  <p className='text-lg font-semibold'>{formData.name}</p>
                  <p className='text-muted-foreground text-sm'>
                    {vendor.user?.email}
                  </p>
                </div>
              </div>

              {/* Business Details */}
              <div className='space-y-4'>
                <div className='space-y-2'>
                  <Label htmlFor='name'>Business Name</Label>
                  <Input
                    id='name'
                    value={formData.name}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, name: e.target.value }))
                    }
                    disabled={!isEditing}
                    required
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
                    rows={3}
                  />
                </div>

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
                  />
                </div>

                <div className='grid gap-4 md:grid-cols-2'>
                  <div className='space-y-2'>
                    <Label htmlFor='phone'>Phone</Label>
                    <Input
                      id='phone'
                      type='tel'
                      value={formData.phone}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          phone: e.target.value,
                        }))
                      }
                      disabled={!isEditing}
                    />
                  </div>

                  <div className='space-y-2'>
                    <Label htmlFor='email'>Email</Label>
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
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Business Hours</CardTitle>
              <CardDescription>Set your operating hours</CardDescription>
            </CardHeader>
            <CardContent>
              <div className='space-y-3'>
                {businessHours.map((day, index) => (
                  <div
                    key={day.day}
                    className='flex items-center justify-between border-b pb-3 last:border-0'
                  >
                    <div className='flex items-center gap-4'>
                      <span className='w-24 font-medium'>{day.day}</span>
                      <Switch
                        checked={day.isOpen}
                        onCheckedChange={(checked) => {
                          const updated = [...businessHours]
                          updated[index].isOpen = checked
                          setBusinessHours(updated)
                        }}
                        disabled={!isEditing}
                      />
                    </div>
                    {day.isOpen && (
                      <div className='flex items-center gap-2'>
                        <Input
                          type='time'
                          value={day.openTime}
                          onChange={(e) => {
                            const updated = [...businessHours]
                            updated[index].openTime = e.target.value
                            setBusinessHours(updated)
                          }}
                          disabled={!isEditing}
                          className='w-32'
                        />
                        <span>-</span>
                        <Input
                          type='time'
                          value={day.closeTime}
                          onChange={(e) => {
                            const updated = [...businessHours]
                            updated[index].closeTime = e.target.value
                            setBusinessHours(updated)
                          }}
                          disabled={!isEditing}
                          className='w-32'
                        />
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {isEditing && (
            <div className='flex justify-end gap-3'>
              <Button
                type='button'
                variant='outline'
                onClick={() => {
                  setIsEditing(false)
                  setFormData({
                    name: business.name || '',
                    description: business.description || '',
                    address: business.address || '',
                    phone: business.phone || '',
                    email: business.email || '',
                  })
                  setBusinessHours(parseOpeningHours(business))
                  setProfileImage(business.imageUrl || '')
                }}
                disabled={updateMutation.isPending}
              >
                Cancel
              </Button>
              <Button type='submit' disabled={updateMutation.isPending}>
                <Save className='mr-2 h-4 w-4' />
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </div>
          )}
        </form>
      )}

      <Card>
        <CardContent className='pt-6'>
          <Button
            variant='destructive'
            onClick={handleLogout}
            className='w-full'
          >
            <LogOut className='mr-2 h-4 w-4' />
            Logout
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

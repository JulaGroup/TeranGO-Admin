import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { createFileRoute, useRouter } from '@tanstack/react-router'
import { ArrowLeft, Save } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
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
import { Textarea } from '@/components/ui/textarea'

export const Route = createFileRoute('/_vendor/vendor/profile')({
  component: VendorProfile,
})

function VendorProfile() {
  const router = useRouter()
  const { vendor, isLoading, refetch } = useVendorProfile()
  const queryClient = useQueryClient()

  // Get the first available business
  const business =
    vendor?.restaurants?.[0] || vendor?.shops?.[0] || vendor?.pharmacies?.[0]

  const [formData, setFormData] = useState({
    name: business?.name || '',
    description: business?.description || '',
    address: business?.address || '',
    phone: business?.phone || '',
    email: business?.email || '',
    website: (business as any)?.website || '',
  })

  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!business) {
        throw new Error('No business found')
      }

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
        website: formData.website,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [
          VENDOR_PROFILE_QUERY_KEY,
          vendor?.user?.id || vendor?.userId,
        ],
      })
      refetch()
      toast.success('Business profile updated successfully')
    },
    onError: (error: Error) => {
      toast.error(`Failed to update profile: ${error.message}`)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    updateMutation.mutate()
  }

  if (isLoading) {
    return (
      <div className='flex justify-center py-12'>
        <div className='text-muted-foreground text-sm'>Loading profile...</div>
      </div>
    )
  }

  if (!business) {
    return (
      <div className='space-y-2 rounded-lg border border-dashed p-6 text-center'>
        <p className='font-semibold'>No business found</p>
        <p className='text-muted-foreground text-sm'>
          Complete vendor onboarding on the mobile app to unlock profile
          editing.
        </p>
      </div>
    )
  }

  const canUpdate = business.type === 'RESTAURANT' || business.type === 'SHOP'

  return (
    <div className='space-y-6'>
      <div className='flex items-center gap-4'>
        <Button
          variant='ghost'
          size='icon'
          onClick={() => router.navigate({ to: '/vendor/settings' })}
        >
          <ArrowLeft className='h-5 w-5' />
        </Button>
        <div>
          <h1 className='text-3xl font-bold tracking-tight'>
            Business Profile
          </h1>
          <p className='text-muted-foreground'>
            Update your business information
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className='space-y-6'>
        <Card>
          <CardHeader>
            <CardTitle>Business Details</CardTitle>
            <CardDescription>
              Edit your business name, description, and contact information
            </CardDescription>
          </CardHeader>
          <CardContent className='space-y-4'>
            <div className='space-y-2'>
              <Label htmlFor='name'>Business Name</Label>
              <Input
                id='name'
                value={formData.name}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, name: e.target.value }))
                }
                disabled={updateMutation.isPending || !canUpdate}
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
                disabled={updateMutation.isPending || !canUpdate}
                rows={4}
              />
            </div>

            <div className='space-y-2'>
              <Label htmlFor='address'>Address</Label>
              <Textarea
                id='address'
                value={formData.address}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, address: e.target.value }))
                }
                disabled={updateMutation.isPending || !canUpdate}
                rows={2}
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
                    setFormData((prev) => ({ ...prev, phone: e.target.value }))
                  }
                  disabled={updateMutation.isPending || !canUpdate}
                />
              </div>

              <div className='space-y-2'>
                <Label htmlFor='email'>Email</Label>
                <Input
                  id='email'
                  type='email'
                  value={formData.email}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, email: e.target.value }))
                  }
                  disabled={updateMutation.isPending || !canUpdate}
                />
              </div>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='website'>Website</Label>
              <Input
                id='website'
                type='url'
                value={formData.website}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, website: e.target.value }))
                }
                disabled={updateMutation.isPending || !canUpdate}
                placeholder='https://...'
              />
            </div>
          </CardContent>
        </Card>

        {canUpdate && (
          <div className='flex justify-end gap-3'>
            <Button
              type='button'
              variant='outline'
              onClick={() => router.navigate({ to: '/vendor/settings' })}
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

        {!canUpdate && (
          <div className='rounded-lg border border-orange-200 bg-orange-50 p-4'>
            <p className='text-sm text-orange-800'>
              Profile updates are only available for restaurants and shops.
            </p>
          </div>
        )}
      </form>
    </div>
  )
}

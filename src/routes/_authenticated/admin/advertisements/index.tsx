import { useState, useRef } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import {
  Search,
  Eye,
  MousePointer,
  Image as ImageIcon,
  Plus,
  Edit,
  Trash2,
  MoreVertical,
  Power,
  DollarSign,
  RefreshCw,
  ExternalLink,
  Upload,
  Megaphone,
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

// Types
type AdType = 'BANNER' | 'CARD' | 'SQUARE'
type AdOrientation = 'LANDSCAPE' | 'PORTRAIT'
type AdPosition =
  | 'HOME_TOP'
  | 'HOME_AFTER_RESTAURANTS'
  | 'HOME_AFTER_SHOPS'
  | 'HOME_BOTTOM'
  | 'BROWSE_TOP'
  | 'BROWSE_MIDDLE'
  | 'CATEGORY_TOP'

interface Advertisement {
  id: string
  title: string
  description?: string
  imageUrl: string
  link?: string
  type: AdType
  orientation: AdOrientation
  position: AdPosition
  priority: number
  isActive: boolean
  startDate: string
  endDate?: string
  impressions: number
  clicks: number
  isPaid: boolean
  amount?: number
  paidAt?: string
  advertiserId?: string
  advertiser?: {
    id: string
    name: string
    email: string
    company?: string
  }
  createdAt: string
  updatedAt: string
}

interface Advertiser {
  id: string
  name: string
  email: string
  phone?: string
  company?: string
  isActive: boolean
  _count?: { advertisements: number }
}

interface AdvertisementStats {
  total: number
  active: number
  paid: number
  unpaid: number
  totalImpressions: number
  totalClicks: number
  byPosition: Record<string, number>
  byType: Record<string, number>
}

// Cloudinary configuration
const CLOUDINARY_CLOUD_NAME = 'dkpi5ij2t'
const CLOUDINARY_UPLOAD_PRESET = 'unsigned_preset'

// Position and Type labels
const POSITION_LABELS: Record<AdPosition, string> = {
  HOME_TOP: 'Home - Top Banner',
  HOME_AFTER_RESTAURANTS: 'Home - After Restaurants',
  HOME_AFTER_SHOPS: 'Home - After Shops',
  HOME_BOTTOM: 'Home - Bottom',
  BROWSE_TOP: 'Browse - Top',
  BROWSE_MIDDLE: 'Browse - Middle',
  CATEGORY_TOP: 'Category - Top',
}

const TYPE_LABELS: Record<AdType, string> = {
  BANNER: 'Banner (Landscape)',
  CARD: 'Card (Portrait)',
  SQUARE: 'Square',
}

const ORIENTATION_LABELS: Record<AdOrientation, string> = {
  LANDSCAPE: 'Landscape (Wide)',
  PORTRAIT: 'Portrait (Tall)',
}

// Create empty form state
const emptyFormState = {
  title: '',
  description: '',
  imageUrl: '',
  link: '',
  type: 'BANNER' as AdType,
  orientation: 'LANDSCAPE' as AdOrientation,
  position: 'HOME_TOP' as AdPosition,
  priority: 0,
  isActive: true,
  startDate: new Date().toISOString().split('T')[0],
  endDate: '',
  isPaid: false,
  amount: 0,
  advertiserId: '',
}

export const Route = createFileRoute('/_authenticated/admin/advertisements/')({
  component: AdvertisementsPage,
})

function AdvertisementsPage() {
  const queryClient = useQueryClient()
  const [search, setSearch] = useState('')
  const [positionFilter, setPositionFilter] = useState<string>('all')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showEditDialog, setShowEditDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [selectedAd, setSelectedAd] = useState<Advertisement | null>(null)
  const [formData, setFormData] = useState(emptyFormState)
  const [isUploading, setIsUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Fetch stats
  const { data: statsData } = useQuery({
    queryKey: ['advertisement-stats'],
    queryFn: async () => {
      const res = await api.get('/api/admin/advertisements/stats')
      return res.data.data as AdvertisementStats
    },
  })

  // Fetch advertisements
  const { data: adsData, isLoading } = useQuery({
    queryKey: ['advertisements', search, positionFilter, statusFilter],
    queryFn: async () => {
      const params = new URLSearchParams()
      if (search) params.append('search', search)
      if (positionFilter !== 'all') params.append('position', positionFilter)
      if (statusFilter !== 'all') params.append('isActive', statusFilter)
      const res = await api.get(
        `/api/admin/advertisements?${params.toString()}`
      )
      return res.data
    },
  })

  // Fetch advertisers for dropdown
  const { data: advertisersData } = useQuery({
    queryKey: ['advertisers'],
    queryFn: async () => {
      const res = await api.get('/api/admin/advertisements/advertisers/list')
      return res.data.advertisers as Advertiser[]
    },
  })

  // Create advertisement
  const createMutation = useMutation({
    mutationFn: async (data: typeof emptyFormState) => {
      const payload = {
        ...data,
        priority: Number(data.priority),
        amount: data.amount ? Number(data.amount) : null,
        startDate: data.startDate || new Date().toISOString(),
        endDate: data.endDate || null,
        advertiserId: data.advertiserId || null,
      }
      const res = await api.post('/api/admin/advertisements', payload)
      return res.data
    },
    onSuccess: () => {
      toast.success('Advertisement created successfully')
      queryClient.invalidateQueries({ queryKey: ['advertisements'] })
      queryClient.invalidateQueries({ queryKey: ['advertisement-stats'] })
      setShowCreateDialog(false)
      setFormData(emptyFormState)
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Failed to create advertisement'
      )
    },
  })

  // Update advertisement
  const updateMutation = useMutation({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string
      data: typeof emptyFormState
    }) => {
      const payload = {
        ...data,
        priority: Number(data.priority),
        amount: data.amount ? Number(data.amount) : null,
        startDate: data.startDate || new Date().toISOString(),
        endDate: data.endDate || null,
        advertiserId: data.advertiserId || null,
      }
      const res = await api.put(`/api/admin/advertisements/${id}`, payload)
      return res.data
    },
    onSuccess: () => {
      toast.success('Advertisement updated successfully')
      queryClient.invalidateQueries({ queryKey: ['advertisements'] })
      queryClient.invalidateQueries({ queryKey: ['advertisement-stats'] })
      setShowEditDialog(false)
      setSelectedAd(null)
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Failed to update advertisement'
      )
    },
  })

  // Delete advertisement
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.delete(`/api/admin/advertisements/${id}`)
      return res.data
    },
    onSuccess: () => {
      toast.success('Advertisement deleted successfully')
      queryClient.invalidateQueries({ queryKey: ['advertisements'] })
      queryClient.invalidateQueries({ queryKey: ['advertisement-stats'] })
      setShowDeleteDialog(false)
      setSelectedAd(null)
    },
    onError: (error: any) => {
      toast.error(
        error.response?.data?.message || 'Failed to delete advertisement'
      )
    },
  })

  // Toggle active status
  const toggleMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await api.patch(`/api/admin/advertisements/${id}/toggle`)
      return res.data
    },
    onSuccess: (data) => {
      toast.success(data.message)
      queryClient.invalidateQueries({ queryKey: ['advertisements'] })
      queryClient.invalidateQueries({ queryKey: ['advertisement-stats'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to toggle status')
    },
  })

  // Image upload handler
  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file')
      return
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image size must be less than 5MB')
      return
    }

    setIsUploading(true)
    try {
      const uploadFormData = new FormData()
      uploadFormData.append('file', file)
      uploadFormData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET)

      const cloudinaryUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`

      const uploadResponse = await fetch(cloudinaryUrl, {
        method: 'POST',
        body: uploadFormData,
      })

      if (!uploadResponse.ok) {
        throw new Error('Upload failed')
      }

      const data = await uploadResponse.json()

      if (data.secure_url) {
        setFormData((prev) => ({ ...prev, imageUrl: data.secure_url }))
        toast.success('Image uploaded successfully')
      }
    } catch (_error) {
      toast.error('Failed to upload image')
    } finally {
      setIsUploading(false)
    }
  }

  // Open edit dialog with ad data
  const handleEdit = (ad: Advertisement) => {
    setSelectedAd(ad)
    setFormData({
      title: ad.title,
      description: ad.description || '',
      imageUrl: ad.imageUrl,
      link: ad.link || '',
      type: ad.type,
      orientation: ad.orientation || 'LANDSCAPE',
      position: ad.position,
      priority: ad.priority,
      isActive: ad.isActive,
      startDate: ad.startDate ? ad.startDate.split('T')[0] : '',
      endDate: ad.endDate ? ad.endDate.split('T')[0] : '',
      isPaid: ad.isPaid,
      amount: ad.amount || 0,
      advertiserId: ad.advertiserId || '',
    })
    setShowEditDialog(true)
  }

  // Calculate CTR
  const calculateCTR = (clicks: number, impressions: number) => {
    if (impressions === 0) return '0.00%'
    return ((clicks / impressions) * 100).toFixed(2) + '%'
  }

  const advertisements = adsData?.advertisements || []
  const stats = statsData

  return (
    <div className='flex flex-col gap-6 p-4 md:p-6'>
      {/* Header */}
      <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
        <div>
          <h1 className='flex items-center gap-2 text-2xl font-bold tracking-tight'>
            <Megaphone className='text-primary h-6 w-6' />
            Advertisements
          </h1>
          <p className='text-muted-foreground'>
            Manage promotional banners and advertisements across the app
          </p>
        </div>
        <Button
          onClick={() => setShowCreateDialog(true)}
          className='w-full md:w-auto'
        >
          <Plus className='mr-2 h-4 w-4' />
          Create Advertisement
        </Button>
      </div>

      {/* Stats Cards */}
      <div className='grid gap-4 md:grid-cols-2 lg:grid-cols-4'>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Total Ads</CardTitle>
            <ImageIcon className='text-muted-foreground h-4 w-4' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{stats?.total || 0}</div>
            <p className='text-muted-foreground text-xs'>
              {stats?.active || 0} active
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>
              Total Impressions
            </CardTitle>
            <Eye className='text-muted-foreground h-4 w-4' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {(stats?.totalImpressions || 0).toLocaleString()}
            </div>
            <p className='text-muted-foreground text-xs'>
              Views across all ads
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Total Clicks</CardTitle>
            <MousePointer className='text-muted-foreground h-4 w-4' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>
              {(stats?.totalClicks || 0).toLocaleString()}
            </div>
            <p className='text-muted-foreground text-xs'>
              CTR:{' '}
              {calculateCTR(
                stats?.totalClicks || 0,
                stats?.totalImpressions || 0
              )}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
            <CardTitle className='text-sm font-medium'>Paid Ads</CardTitle>
            <DollarSign className='text-muted-foreground h-4 w-4' />
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{stats?.paid || 0}</div>
            <p className='text-muted-foreground text-xs'>
              {stats?.unpaid || 0} unpaid
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className='pt-6'>
          <div className='flex flex-col gap-4 md:flex-row md:items-center'>
            <div className='relative flex-1'>
              <Search className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 transform' />
              <Input
                placeholder='Search advertisements...'
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className='pl-10'
              />
            </div>
            <Select value={positionFilter} onValueChange={setPositionFilter}>
              <SelectTrigger className='w-full md:w-[200px]'>
                <SelectValue placeholder='Filter by position' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All Positions</SelectItem>
                {Object.entries(POSITION_LABELS).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className='w-full md:w-[150px]'>
                <SelectValue placeholder='Status' />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value='all'>All Status</SelectItem>
                <SelectItem value='true'>Active</SelectItem>
                <SelectItem value='false'>Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Button
              variant='outline'
              size='icon'
              onClick={() =>
                queryClient.invalidateQueries({ queryKey: ['advertisements'] })
              }
            >
              <RefreshCw className='h-4 w-4' />
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Advertisements Table */}
      <Card>
        <CardHeader>
          <CardTitle>All Advertisements</CardTitle>
          <CardDescription>
            Manage your promotional content and track performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className='flex items-center justify-center py-8'>
              <RefreshCw className='text-muted-foreground h-6 w-6 animate-spin' />
            </div>
          ) : advertisements.length === 0 ? (
            <div className='text-muted-foreground py-8 text-center'>
              No advertisements found. Create your first ad!
            </div>
          ) : (
            <div className='overflow-x-auto'>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Preview</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Impressions</TableHead>
                    <TableHead>Clicks</TableHead>
                    <TableHead>CTR</TableHead>
                    <TableHead>Payment</TableHead>
                    <TableHead className='text-right'>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {advertisements.map((ad: Advertisement) => (
                    <TableRow key={ad.id}>
                      <TableCell>
                        <div className='bg-muted h-14 w-24 overflow-hidden rounded-md'>
                          <img
                            src={ad.imageUrl}
                            alt={ad.title}
                            className='h-full w-full object-cover'
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className='flex flex-col'>
                          <span className='font-medium'>{ad.title}</span>
                          {ad.link && (
                            <a
                              href={ad.link}
                              target='_blank'
                              rel='noopener noreferrer'
                              className='text-muted-foreground hover:text-primary flex items-center gap-1 text-xs'
                            >
                              <ExternalLink className='h-3 w-3' />
                              {ad.link.substring(0, 30)}...
                            </a>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant='outline'>
                          {POSITION_LABELS[ad.position] || ad.position}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant={ad.isActive ? 'default' : 'secondary'}>
                          {ad.isActive ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                      <TableCell>{ad.impressions.toLocaleString()}</TableCell>
                      <TableCell>{ad.clicks.toLocaleString()}</TableCell>
                      <TableCell>
                        {calculateCTR(ad.clicks, ad.impressions)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={ad.isPaid ? 'default' : 'destructive'}>
                          {ad.isPaid ? `GMD ${ad.amount}` : 'Unpaid'}
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
                            <DropdownMenuItem onClick={() => handleEdit(ad)}>
                              <Edit className='mr-2 h-4 w-4' />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => toggleMutation.mutate(ad.id)}
                            >
                              <Power className='mr-2 h-4 w-4' />
                              {ad.isActive ? 'Deactivate' : 'Activate'}
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className='text-destructive'
                              onClick={() => {
                                setSelectedAd(ad)
                                setShowDeleteDialog(true)
                              }}
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
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create/Edit Dialog */}
      <Dialog
        open={showCreateDialog || showEditDialog}
        onOpenChange={(open) => {
          if (!open) {
            setShowCreateDialog(false)
            setShowEditDialog(false)
            setFormData(emptyFormState)
          }
        }}
      >
        <DialogContent className='max-h-[90vh] max-w-2xl overflow-y-auto'>
          <DialogHeader>
            <DialogTitle>
              {showEditDialog ? 'Edit Advertisement' : 'Create Advertisement'}
            </DialogTitle>
            <DialogDescription>
              {showEditDialog
                ? 'Update the advertisement details below'
                : 'Create a new promotional advertisement'}
            </DialogDescription>
          </DialogHeader>

          <div className='grid gap-4 py-4'>
            {/* Image Upload */}
            <div className='space-y-2'>
              <Label>Advertisement Image *</Label>
              <div className='flex flex-col gap-3'>
                {formData.imageUrl && (
                  <div className='bg-muted relative h-40 w-full overflow-hidden rounded-lg'>
                    <img
                      src={formData.imageUrl}
                      alt='Preview'
                      className='h-full w-full object-cover'
                    />
                  </div>
                )}
                <div className='flex gap-2'>
                  <Input
                    value={formData.imageUrl}
                    onChange={(e) =>
                      setFormData({ ...formData, imageUrl: e.target.value })
                    }
                    placeholder='Enter image URL or upload'
                  />
                  <input
                    title='image'
                    type='file'
                    ref={fileInputRef}
                    onChange={handleImageUpload}
                    accept='image/*'
                    className='hidden'
                  />
                  <Button
                    type='button'
                    variant='outline'
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isUploading}
                  >
                    {isUploading ? (
                      <RefreshCw className='h-4 w-4 animate-spin' />
                    ) : (
                      <Upload className='h-4 w-4' />
                    )}
                  </Button>
                </div>
              </div>
            </div>

            {/* Title */}
            <div className='space-y-2'>
              <Label htmlFor='title'>Title *</Label>
              <Input
                id='title'
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder='Advertisement title'
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
                placeholder='Optional description'
                rows={2}
              />
            </div>

            {/* Link */}
            <div className='space-y-2'>
              <Label htmlFor='link'>Link URL</Label>
              <Input
                id='link'
                value={formData.link}
                onChange={(e) =>
                  setFormData({ ...formData, link: e.target.value })
                }
                placeholder='https://example.com (optional)'
              />
            </div>

            {/* Type, Orientation and Position */}
            <div className='grid gap-4 md:grid-cols-3'>
              <div className='space-y-2'>
                <Label>Ad Type</Label>
                <Select
                  value={formData.type}
                  onValueChange={(value: AdType) =>
                    setFormData({ ...formData, type: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TYPE_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className='space-y-2'>
                <Label>Orientation</Label>
                <Select
                  value={formData.orientation}
                  onValueChange={(value: AdOrientation) =>
                    setFormData({ ...formData, orientation: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(ORIENTATION_LABELS).map(
                      ([value, label]) => (
                        <SelectItem key={value} value={value}>
                          {label}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>
              <div className='space-y-2'>
                <Label>Position</Label>
                <Select
                  value={formData.position}
                  onValueChange={(value: AdPosition) =>
                    setFormData({ ...formData, position: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(POSITION_LABELS).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Priority and Active */}
            <div className='grid gap-4 md:grid-cols-2'>
              <div className='space-y-2'>
                <Label htmlFor='priority'>Priority (Higher = First)</Label>
                <Input
                  id='priority'
                  type='number'
                  value={formData.priority}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      priority: Number(e.target.value),
                    })
                  }
                  min={0}
                />
              </div>
              <div className='flex items-center justify-between rounded-lg border p-3'>
                <Label htmlFor='isActive' className='cursor-pointer'>
                  Active
                </Label>
                <Switch
                  id='isActive'
                  checked={formData.isActive}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isActive: checked })
                  }
                />
              </div>
            </div>

            {/* Dates */}
            <div className='grid gap-4 md:grid-cols-2'>
              <div className='space-y-2'>
                <Label htmlFor='startDate'>Start Date</Label>
                <Input
                  id='startDate'
                  type='date'
                  value={formData.startDate}
                  onChange={(e) =>
                    setFormData({ ...formData, startDate: e.target.value })
                  }
                />
              </div>
              <div className='space-y-2'>
                <Label htmlFor='endDate'>End Date (Optional)</Label>
                <Input
                  id='endDate'
                  type='date'
                  value={formData.endDate}
                  onChange={(e) =>
                    setFormData({ ...formData, endDate: e.target.value })
                  }
                />
              </div>
            </div>

            {/* Payment */}
            <div className='grid gap-4 md:grid-cols-2'>
              <div className='flex items-center justify-between rounded-lg border p-3'>
                <Label htmlFor='isPaid' className='cursor-pointer'>
                  Paid
                </Label>
                <Switch
                  id='isPaid'
                  checked={formData.isPaid}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, isPaid: checked })
                  }
                />
              </div>
              {formData.isPaid && (
                <div className='space-y-2'>
                  <Label htmlFor='amount'>Amount (GMD)</Label>
                  <Input
                    id='amount'
                    type='number'
                    value={formData.amount}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        amount: Number(e.target.value),
                      })
                    }
                    min={0}
                  />
                </div>
              )}
            </div>

            {/* Advertiser */}
            <div className='space-y-2'>
              <Label>Advertiser (Optional)</Label>
              <Select
                value={formData.advertiserId || 'none'}
                onValueChange={(value) =>
                  setFormData({
                    ...formData,
                    advertiserId: value === 'none' ? '' : value,
                  })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder='Select an advertiser' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='none'>None</SelectItem>
                  {advertisersData?.map((advertiser) => (
                    <SelectItem key={advertiser.id} value={advertiser.id}>
                      {advertiser.name}
                      {advertiser.company && ` (${advertiser.company})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => {
                setShowCreateDialog(false)
                setShowEditDialog(false)
                setFormData(emptyFormState)
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={() => {
                if (!formData.title || !formData.imageUrl) {
                  toast.error('Title and image are required')
                  return
                }
                if (showEditDialog && selectedAd) {
                  updateMutation.mutate({ id: selectedAd.id, data: formData })
                } else {
                  createMutation.mutate(formData)
                }
              }}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending ? (
                <RefreshCw className='mr-2 h-4 w-4 animate-spin' />
              ) : null}
              {showEditDialog ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Advertisement</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{selectedAd?.title}"? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant='outline'
              onClick={() => setShowDeleteDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant='destructive'
              onClick={() => selectedAd && deleteMutation.mutate(selectedAd.id)}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending && (
                <RefreshCw className='mr-2 h-4 w-4 animate-spin' />
              )}
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

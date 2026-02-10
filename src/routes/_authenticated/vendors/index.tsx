import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import {
  Search,
  MoreHorizontal,
  Eye,
  Store,
  Phone,
  Mail,
  RefreshCw,
  Building2,
  UtensilsCrossed,
  Package,
  Pill,
  CheckCircle,
  Crown,
  Edit,
  Ban,
  CheckCircle2,
  Trash2,
  CreditCard,
} from 'lucide-react'
import { adminApi, api } from '@/lib/api'
import { Vendor } from '@/lib/types'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { ConfigDrawer } from '@/components/config-drawer'
import { Header } from '@/components/layout/header'
import { Main } from '@/components/layout/main'
import { TopNav } from '@/components/layout/top-nav'
import { ProfileDropdown } from '@/components/profile-dropdown'
import { Search as SearchInput } from '@/components/search'
import { ThemeSwitch } from '@/components/theme-switch'
import { toast } from 'sonner'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

const topNav = [
  { title: 'Overview', href: '/', isActive: false },
  { title: 'Vendors', href: '/vendors', isActive: true },
  { title: 'Drivers', href: '/drivers', isActive: false },
  { title: 'Settings', href: '#', isActive: false },
]

export const Route = createFileRoute('/_authenticated/vendors/')({
  component: VendorsPage,
})

interface VendorWithSubscription extends Vendor {
  subscription?: {
    status: string
    packageName: string
    endDate: string
    isTrial: boolean
  } | null
}

function VendorsPage() {
  const [searchQuery, setSearchQuery] = useState('')
  const [allVendors, setAllVendors] = useState<VendorWithSubscription[]>([])
  const [filteredVendors, setFilteredVendors] = useState<VendorWithSubscription[]>([])
  const [selectedVendor, setSelectedVendor] = useState<VendorWithSubscription | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isSubscriptionOpen, setIsSubscriptionOpen] = useState(false)
  const [isDeactivateOpen, setIsDeactivateOpen] = useState(false)
  const [isDeleteOpen, setIsDeleteOpen] = useState(false)
  const [subscriptionPackages, setSubscriptionPackages] = useState<any[]>([])
  const [stats, setStats] = useState({
    totalVendors: 0,
    activeVendors: 0,
    totalRestaurants: 0,
    totalShops: 0,
    totalPharmacies: 0,
  })

  const queryClient = useQueryClient()

  // Fetch all vendors
  const {
    data: vendorsResponse,
    isLoading,
    refetch,
  } = useQuery({
    queryKey: ['vendors-all'],
    queryFn: async () => {
      const response = await adminApi.getVendors({})
      return response.data.vendors || response.data || []
    },
  })

  // Update allVendors when data changes
  useEffect(() => {
    if (Array.isArray(vendorsResponse)) {
      setAllVendors(vendorsResponse)

      // Calculate stats from fetched vendors
      const activeCount = vendorsResponse.filter((v) => v.isActive).length
      let totalRestaurants = 0
      let totalShops = 0
      let totalPharmacies = 0

      vendorsResponse.forEach((vendor) => {
        totalRestaurants += vendor.restaurants?.length || 0
        totalShops += vendor.shops?.length || 0
        totalPharmacies += vendor.pharmacies?.length || 0
      })

      setStats({
        totalVendors: vendorsResponse.length,
        activeVendors: activeCount,
        totalRestaurants,
        totalShops,
        totalPharmacies,
      })
    }
  }, [vendorsResponse])

  // Filter vendors based on search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredVendors(allVendors)
      return
    }

    const searchLower = searchQuery.toLowerCase()
    const filtered = allVendors.filter((vendor) => {
      const fullName = vendor.user?.fullName?.toLowerCase() || ''
      const email = vendor.user?.email?.toLowerCase() || ''
      const phone = vendor.user?.phone?.toLowerCase() || ''

      // Search in business names too
      const businessNames = [
        ...(vendor.restaurants?.map((r) => r.name.toLowerCase()) || []),
        ...(vendor.shops?.map((s) => s.name.toLowerCase()) || []),
        ...(vendor.pharmacies?.map((p) => p.name.toLowerCase()) || []),
      ]

      return (
        fullName.includes(searchLower) ||
        email.includes(searchLower) ||
        phone.includes(searchLower) ||
        businessNames.some((name) => name.includes(searchLower))
      )
    })

    setFilteredVendors(filtered)
  }, [searchQuery, allVendors])

  // Fetch subscription packages
  useEffect(() => {
    const fetchPackages = async () => {
      try {
        const response = await api.get('/api/subscriptions/packages')
        setSubscriptionPackages(response.data.packages || [])
      } catch (error) {
        console.error('Failed to fetch packages:', error)
      }
    }
    fetchPackages()
  }, [])

  // Toggle vendor active status mutation
  const toggleVendorStatusMutation = useMutation({
    mutationFn: async ({ vendorId, isActive }: { vendorId: string; isActive: boolean }) => {
      const response = await api.patch(`/api/admin/vendors/${vendorId}/status`, { isActive })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors-all'] })
      toast.success('Vendor status updated successfully')
      setIsDeactivateOpen(false)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update vendor status')
    },
  })

  // Update vendor mutation
  const updateVendorMutation = useMutation({
    mutationFn: async ({ vendorId, data }: { vendorId: string; data: any }) => {
      const response = await adminApi.updateVendor(vendorId, data)
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors-all'] })
      toast.success('Vendor details updated successfully')
      setIsEditOpen(false)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to update vendor')
    },
  })

  // Assign subscription mutation
  const assignSubscriptionMutation = useMutation({
    mutationFn: async ({ vendorId, packageId, durationDays }: { vendorId: string; packageId: string; durationDays: number }) => {
      const response = await api.post('/api/subscriptions/admin/activate', {
        vendorId,
        packageId,
        durationDays,
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors-all'] })
      toast.success('Subscription assigned successfully')
      setIsSubscriptionOpen(false)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to assign subscription')
    },
  })

  // Delete vendor mutation
  const deleteVendorMutation = useMutation({
    mutationFn: async (vendorId: string) => {
      await adminApi.deleteVendor(vendorId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors-all'] })
      toast.success('Vendor deleted successfully')
      setIsDeleteOpen(false)
      setSelectedVendor(null)
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to delete vendor')
    },
  })

  const handleViewDetails = (vendor: Vendor) => {
    setSelectedVendor(vendor)
    setIsDetailsOpen(true)
  }

  const handleEditVendor = (vendor: VendorWithSubscription) => {
    setSelectedVendor(vendor)
    setIsEditOpen(true)
  }

  const handleManageSubscription = (vendor: VendorWithSubscription) => {
    setSelectedVendor(vendor)
    setIsSubscriptionOpen(true)
  }

  const handleToggleStatus = (vendor: VendorWithSubscription) => {
    setSelectedVendor(vendor)
    setIsDeactivateOpen(true)
  }

  const handleDeleteVendor = (vendor: VendorWithSubscription) => {
    setSelectedVendor(vendor)
    setIsDeleteOpen(true)
  }

  const confirmToggleStatus = () => {
    if (selectedVendor) {
      toggleVendorStatusMutation.mutate({
        vendorId: selectedVendor.id,
        isActive: !selectedVendor.isActive,
      })
    }
  }

  const confirmDelete = () => {
    if (selectedVendor) {
      deleteVendorMutation.mutate(selectedVendor.id)
    }
  }

  const getStatusBadge = (isActive: boolean) => {
    return isActive ? (
      <Badge variant='default'>Active</Badge>
    ) : (
      <Badge variant='destructive'>Inactive</Badge>
    )
  }

  const getTotalBusinesses = (vendor: VendorWithSubscription) => {
    return (
      (vendor.restaurants?.length || 0) +
      (vendor.shops?.length || 0) +
      (vendor.pharmacies?.length || 0)
    )
  }

  return (
    <>
      <Header>
        <TopNav links={topNav} />
        <div className='ms-auto flex items-center space-x-4'>
          <SearchInput />
          <ThemeSwitch />
          <ConfigDrawer />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className='space-y-6'>
          {/* Header */}
          <div className='flex flex-col gap-4 md:flex-row md:items-center md:justify-between'>
            <div>
              <h1 className='text-3xl font-bold tracking-tight'>Vendors</h1>
              <p className='text-muted-foreground'>
                Manage all vendors and their businesses
              </p>
            </div>
            <Button
              variant='outline'
              size='sm'
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className='mr-2 h-4 w-4' />
              Refresh
            </Button>
          </div>

          {/* Stats Cards */}
          <div className='grid gap-4 md:grid-cols-5'>
            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>
                  Total Vendors
                </CardTitle>
                <Building2 className='text-muted-foreground h-4 w-4' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>{stats.totalVendors}</div>
                <p className='text-muted-foreground text-xs'>All vendors</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>
                  Active Vendors
                </CardTitle>
                <CheckCircle className='h-4 w-4 text-green-600' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>{stats.activeVendors}</div>
                <p className='text-muted-foreground text-xs'>Active vendors</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>
                  Restaurants
                </CardTitle>
                <UtensilsCrossed className='h-4 w-4 text-orange-600' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>
                  {stats.totalRestaurants}
                </div>
                <p className='text-muted-foreground text-xs'>
                  Total restaurants
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>Shops</CardTitle>
                <Package className='h-4 w-4 text-blue-600' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>{stats.totalShops}</div>
                <p className='text-muted-foreground text-xs'>Total shops</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className='flex flex-row items-center justify-between space-y-0 pb-2'>
                <CardTitle className='text-sm font-medium'>
                  Pharmacies
                </CardTitle>
                <Pill className='h-4 w-4 text-red-600' />
              </CardHeader>
              <CardContent>
                <div className='text-2xl font-bold'>
                  {stats.totalPharmacies}
                </div>
                <p className='text-muted-foreground text-xs'>
                  Total pharmacies
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Search */}
          <div className='flex flex-col gap-4 md:flex-row'>
            <div className='relative flex-1'>
              <Search className='text-muted-foreground absolute top-3 left-3 h-4 w-4' />
              <Input
                placeholder='Search by vendor name, email, phone, or business...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className='pl-10'
              />
            </div>
          </div>

          {/* Vendors Table */}
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Store className='h-5 w-5' />
                All Vendors ({filteredVendors.length})
              </CardTitle>
              <CardDescription>
                Showing {filteredVendors.length} of {stats.totalVendors} vendors
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className='flex items-center justify-center py-8'>
                  <p className='text-muted-foreground'>Loading vendors...</p>
                </div>
              ) : filteredVendors.length > 0 ? (
                <div className='overflow-x-auto'>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Vendor Name</TableHead>
                        <TableHead>Contact</TableHead>
                        <TableHead>Businesses</TableHead>
                        <TableHead>Subscription</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Joined</TableHead>
                        <TableHead className='text-right'>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredVendors.map((vendor: VendorWithSubscription) => (
                        <TableRow key={vendor.id}>
                          <TableCell>
                            <div className='flex items-center gap-3'>
                              <Avatar>
                                <AvatarFallback>
                                  {vendor.user?.fullName
                                    ?.substring(0, 2)
                                    .toUpperCase() || 'VN'}
                                </AvatarFallback>
                              </Avatar>
                              <div>
                                <p className='font-medium'>
                                  {vendor.user?.fullName || 'N/A'}
                                </p>
                                <div className='text-muted-foreground space-y-0.5 text-xs'>
                                  {vendor.restaurants && vendor.restaurants.length > 0 && (
                                    <div className='flex items-center gap-1'>
                                      <UtensilsCrossed className='h-3 w-3' />
                                      <span>{vendor.restaurants[0].name}</span>
                                      {vendor.restaurants.length > 1 && (
                                        <span className='text-[10px]'>+{vendor.restaurants.length - 1} more</span>
                                      )}
                                    </div>
                                  )}
                                  {vendor.shops && vendor.shops.length > 0 && (
                                    <div className='flex items-center gap-1'>
                                      <Package className='h-3 w-3' />
                                      <span>{vendor.shops[0].name}</span>
                                      {vendor.shops.length > 1 && (
                                        <span className='text-[10px]'>+{vendor.shops.length - 1} more</span>
                                      )}
                                    </div>
                                  )}
                                  {vendor.pharmacies && vendor.pharmacies.length > 0 && (
                                    <div className='flex items-center gap-1'>
                                      <Pill className='h-3 w-3' />
                                      <span>{vendor.pharmacies[0].name}</span>
                                      {vendor.pharmacies.length > 1 && (
                                        <span className='text-[10px]'>+{vendor.pharmacies.length - 1} more</span>
                                      )}
                                    </div>
                                  )}
                                  {getTotalBusinesses(vendor) === 0 && (
                                    <span>No businesses</span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className='space-y-1'>
                              <div className='flex items-center gap-2 text-sm'>
                                <Phone className='h-3 w-3' />
                                {vendor.user?.phone || 'N/A'}
                              </div>
                              <div className='text-muted-foreground flex items-center gap-2 text-xs'>
                                <Mail className='h-3 w-3' />
                                {vendor.user?.email || 'N/A'}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className='space-y-1 text-sm'>
                              {vendor.restaurants &&
                                vendor.restaurants.length > 0 && (
                                  <div className='flex items-center gap-1'>
                                    <UtensilsCrossed className='h-3 w-3 text-orange-600' />
                                    <span>
                                      {vendor.restaurants.length} Restaurants
                                    </span>
                                  </div>
                                )}
                              {vendor.shops && vendor.shops.length > 0 && (
                                <div className='flex items-center gap-1'>
                                  <Package className='h-3 w-3 text-blue-600' />
                                  <span>{vendor.shops.length} Shops</span>
                                </div>
                              )}
                              {vendor.pharmacies &&
                                vendor.pharmacies.length > 0 && (
                                  <div className='flex items-center gap-1'>
                                    <Pill className='h-3 w-3 text-red-600' />
                                    <span>
                                      {vendor.pharmacies.length} Pharmacies
                                    </span>
                                  </div>
                                )}
                              {getTotalBusinesses(vendor) === 0 && (
                                <span className='text-muted-foreground'>
                                  No businesses
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {vendor.subscription ? (
                              <div className='space-y-1'>
                                <div className='flex items-center gap-1'>
                                  <Crown className='h-3 w-3 text-yellow-600' />
                                  <span className='text-sm font-medium'>
                                    {vendor.subscription.packageName}
                                  </span>
                                </div>
                                <div className='text-xs text-muted-foreground'>
                                  {vendor.subscription.status === 'TRIAL' && vendor.subscription.isTrial ? (
                                    <Badge variant='outline' className='text-xs'>
                                      Trial
                                    </Badge>
                                  ) : vendor.subscription.status === 'ACTIVE' ? (
                                    <span className='text-green-600'>Active</span>
                                  ) : (
                                    <span className='text-gray-500'>{vendor.subscription.status}</span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <span className='text-muted-foreground text-xs'>No subscription</span>
                            )}
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(vendor.isActive)}
                          </TableCell>
                          <TableCell>
                            <span className='text-sm'>
                              {new Date(vendor.createdAt).toLocaleDateString()}
                            </span>
                          </TableCell>
                          <TableCell className='text-right'>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant='ghost' size='icon'>
                                  <MoreHorizontal className='h-4 w-4' />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align='end'>
                                <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleViewDetails(vendor)}
                                >
                                  <Eye className='mr-2 h-4 w-4' />
                                  View Details
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleEditVendor(vendor)}
                                >
                                  <Edit className='mr-2 h-4 w-4' />
                                  Edit Vendor
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleManageSubscription(vendor)}
                                >
                                  <CreditCard className='mr-2 h-4 w-4' />
                                  Manage Subscription
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => handleToggleStatus(vendor)}
                                >
                                  {vendor.isActive ? (
                                    <>
                                      <Ban className='mr-2 h-4 w-4' />
                                      Deactivate Vendor
                                    </>
                                  ) : (
                                    <>
                                      <CheckCircle2 className='mr-2 h-4 w-4' />
                                      Activate Vendor
                                    </>
                                  )}
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => handleDeleteVendor(vendor)}
                                  className='text-red-600'
                                >
                                  <Trash2 className='mr-2 h-4 w-4' />
                                  Delete Vendor
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
                <div className='flex flex-col items-center justify-center py-12'>
                  <Store className='text-muted-foreground mb-4 h-12 w-12' />
                  <p className='text-muted-foreground'>
                    {allVendors.length === 0
                      ? 'No vendors registered yet'
                      : 'No vendors match your search'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Vendor Details Dialog */}
          <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
            <DialogContent className='max-h-[80vh] max-w-2xl overflow-y-auto'>
              <DialogHeader>
                <DialogTitle>Vendor Details</DialogTitle>
                <DialogDescription>
                  Complete information about the vendor
                </DialogDescription>
              </DialogHeader>
              {selectedVendor && (
                <div className='space-y-6'>
                  <div className='flex items-start gap-4'>
                    <Avatar className='h-20 w-20'>
                      <AvatarFallback>
                        {selectedVendor.user?.fullName
                          ?.substring(0, 2)
                          .toUpperCase() || 'VN'}
                      </AvatarFallback>
                    </Avatar>
                    <div className='flex-1'>
                      <h3 className='text-2xl font-bold'>
                        {selectedVendor.user?.fullName || 'N/A'}
                      </h3>
                      <p className='text-muted-foreground text-sm'>
                        {selectedVendor.userId}
                      </p>
                      <div className='mt-2'>
                        {getStatusBadge(selectedVendor.isActive)}
                      </div>
                    </div>
                  </div>

                  <div className='grid gap-4 md:grid-cols-2'>
                    <div>
                      <h4 className='mb-2 font-semibold'>
                        Contact Information
                      </h4>
                      <div className='space-y-2 text-sm'>
                        <div className='flex items-center gap-2'>
                          <Phone className='text-muted-foreground h-4 w-4' />
                          {selectedVendor.user?.phone || 'N/A'}
                        </div>
                        <div className='flex items-center gap-2'>
                          <Mail className='text-muted-foreground h-4 w-4' />
                          {selectedVendor.user?.email || 'N/A'}
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className='mb-2 font-semibold'>Account Details</h4>
                      <div className='space-y-2 text-sm'>
                        <div>
                          <span className='text-muted-foreground'>
                            Member Since:
                          </span>{' '}
                          {new Date(
                            selectedVendor.createdAt
                          ).toLocaleDateString()}
                        </div>
                        <div>
                          <span className='text-muted-foreground'>Status:</span>{' '}
                          {selectedVendor.isActive ? 'Active' : 'Inactive'}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Restaurants */}
                  {selectedVendor.restaurants &&
                    selectedVendor.restaurants.length > 0 && (
                      <div>
                        <h4 className='mb-3 flex items-center gap-2 font-semibold'>
                          <UtensilsCrossed className='h-4 w-4 text-orange-600' />
                          Restaurants ({selectedVendor.restaurants.length})
                        </h4>
                        <div className='space-y-2'>
                          {selectedVendor.restaurants.map((restaurant) => (
                            <div
                              key={restaurant.id}
                              className='flex items-center gap-2 rounded-md bg-orange-50 p-2 text-sm'
                            >
                              <span className='flex-1'>{restaurant.name}</span>
                              <span className='text-muted-foreground text-xs'>
                                {restaurant.id}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  {/* Shops */}
                  {selectedVendor.shops && selectedVendor.shops.length > 0 && (
                    <div>
                      <h4 className='mb-3 flex items-center gap-2 font-semibold'>
                        <Package className='h-4 w-4 text-blue-600' />
                        Shops ({selectedVendor.shops.length})
                      </h4>
                      <div className='space-y-2'>
                        {selectedVendor.shops.map((shop) => (
                          <div
                            key={shop.id}
                            className='flex items-center gap-2 rounded-md bg-blue-50 p-2 text-sm'
                          >
                            <span className='flex-1'>{shop.name}</span>
                            <span className='text-muted-foreground text-xs'>
                              {shop.id}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Pharmacies */}
                  {selectedVendor.pharmacies &&
                    selectedVendor.pharmacies.length > 0 && (
                      <div>
                        <h4 className='mb-3 flex items-center gap-2 font-semibold'>
                          <Pill className='h-4 w-4 text-red-600' />
                          Pharmacies ({selectedVendor.pharmacies.length})
                        </h4>
                        <div className='space-y-2'>
                          {selectedVendor.pharmacies.map((pharmacy) => (
                            <div
                              key={pharmacy.id}
                              className='flex items-center gap-2 rounded-md bg-red-50 p-2 text-sm'
                            >
                              <span className='flex-1'>{pharmacy.name}</span>
                              <span className='text-muted-foreground text-xs'>
                                {pharmacy.id}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                  {getTotalBusinesses(selectedVendor) === 0 && (
                    <div className='bg-muted text-muted-foreground rounded-md p-3 text-center text-sm'>
                      No businesses registered yet
                    </div>
                  )}
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Edit Vendor Dialog */}
          <EditVendorDialog
            vendor={selectedVendor}
            open={isEditOpen}
            onOpenChange={setIsEditOpen}
            onSave={(data) => {
              if (selectedVendor) {
                updateVendorMutation.mutate({ vendorId: selectedVendor.id, data })
              }
            }}
          />

          {/* Manage Subscription Dialog */}
          <ManageSubscriptionDialog
            vendor={selectedVendor}
            packages={subscriptionPackages}
            open={isSubscriptionOpen}
            onOpenChange={setIsSubscriptionOpen}
            onAssign={(packageId, durationDays) => {
              if (selectedVendor) {
                assignSubscriptionMutation.mutate({
                  vendorId: selectedVendor.id,
                  packageId,
                  durationDays,
                })
              }
            }}
          />

          {/* Deactivate/Activate Confirmation */}
          <AlertDialog open={isDeactivateOpen} onOpenChange={setIsDeactivateOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>
                  {selectedVendor?.isActive ? 'Deactivate' : 'Activate'} Vendor?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  {selectedVendor?.isActive
                    ? 'This will deactivate the vendor and prevent them from receiving orders. They can be reactivated later.'
                    : 'This will activate the vendor and allow them to receive orders.'}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={confirmToggleStatus}>
                  {selectedVendor?.isActive ? 'Deactivate' : 'Activate'}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          {/* Delete Confirmation */}
          <AlertDialog open={isDeleteOpen} onOpenChange={setIsDeleteOpen}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Vendor?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete the vendor
                  and all associated data.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={confirmDelete}
                  className='bg-red-600 hover:bg-red-700'
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </Main>
    </>
  )
}

// Edit Vendor Dialog Component
interface EditVendorDialogProps {
  vendor: VendorWithSubscription | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (data: any) => void
}

function EditVendorDialog({ vendor, open, onOpenChange, onSave }: EditVendorDialogProps) {
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phone: '',
    waveNumber: '',
  })

  useEffect(() => {
    if (vendor) {
      setFormData({
        fullName: vendor.user?.fullName || '',
        email: vendor.user?.email || '',
        phone: vendor.user?.phone || '',
        waveNumber: vendor.waveNumber || '',
      })
    }
  }, [vendor])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave(formData)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Vendor Details</DialogTitle>
          <DialogDescription>
            Update vendor information and contact details
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='fullName'>Full Name</Label>
            <Input
              id='fullName'
              value={formData.fullName}
              onChange={(e) =>
                setFormData({ ...formData, fullName: e.target.value })
              }
              placeholder='Vendor full name'
            />
          </div>
          <div className='space-y-2'>
            <Label htmlFor='email'>Email</Label>
            <Input
              id='email'
              type='email'
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
              placeholder='vendor@example.com'
            />
          </div>
          <div className='space-y-2'>
            <Label htmlFor='phone'>Phone</Label>
            <Input
              id='phone'
              value={formData.phone}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
              placeholder='+220 123 4567'
            />
          </div>
          <div className='space-y-2'>
            <Label htmlFor='waveNumber'>Wave Number</Label>
            <Input
              id='waveNumber'
              value={formData.waveNumber}
              onChange={(e) =>
                setFormData({ ...formData, waveNumber: e.target.value })
              }
              placeholder='Wave payment number'
            />
          </div>
          <DialogFooter>
            <Button type='button' variant='outline' onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type='submit'>Save Changes</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

// Manage Subscription Dialog Component
interface ManageSubscriptionDialogProps {
  vendor: VendorWithSubscription | null
  packages: any[]
  open: boolean
  onOpenChange: (open: boolean) => void
  onAssign: (packageId: string, durationDays: number) => void
}

function ManageSubscriptionDialog({
  vendor,
  packages,
  open,
  onOpenChange,
  onAssign,
}: ManageSubscriptionDialogProps) {
  const [selectedPackage, setSelectedPackage] = useState('')
  const [durationDays, setDurationDays] = useState('30')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (selectedPackage) {
      onAssign(selectedPackage, parseInt(durationDays))
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Manage Vendor Subscription</DialogTitle>
          <DialogDescription>
            Assign or update subscription package for {vendor?.user?.fullName}
          </DialogDescription>
        </DialogHeader>
        
        {vendor?.subscription && (
          <div className='rounded-lg border p-4 mb-4'>
            <h4 className='font-semibold mb-2'>Current Subscription</h4>
            <div className='space-y-1 text-sm'>
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>Package:</span>
                <span className='font-medium'>{vendor.subscription.packageName}</span>
              </div>
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>Status:</span>
                <Badge variant={vendor.subscription.status === 'ACTIVE' ? 'default' : 'secondary'}>
                  {vendor.subscription.status}
                </Badge>
              </div>
              <div className='flex justify-between'>
                <span className='text-muted-foreground'>Expires:</span>
                <span>{new Date(vendor.subscription.endDate).toLocaleDateString()}</span>
              </div>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className='space-y-4'>
          <div className='space-y-2'>
            <Label htmlFor='package'>Subscription Package</Label>
            <Select value={selectedPackage} onValueChange={setSelectedPackage}>
              <SelectTrigger>
                <SelectValue placeholder='Select package' />
              </SelectTrigger>
              <SelectContent>
                {packages.map((pkg) => (
                  <SelectItem key={pkg.id} value={pkg.id}>
                    {pkg.displayName} - GMD {pkg.price}/month
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className='space-y-2'>
            <Label htmlFor='duration'>Duration (Days)</Label>
            <Input
              id='duration'
              type='number'
              value={durationDays}
              onChange={(e) => setDurationDays(e.target.value)}
              placeholder='30'
              min='1'
            />
          </div>
          <DialogFooter>
            <Button type='button' variant='outline' onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type='submit' disabled={!selectedPackage}>
              Assign Subscription
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

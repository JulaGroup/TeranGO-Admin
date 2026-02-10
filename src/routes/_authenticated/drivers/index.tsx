import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import {
  Search,
  MoreHorizontal,
  Eye,
  Bike,
  Phone,
  Mail,
  MapPin,
  CheckCircle,
  XCircle,
  TrendingUp,
  Star,
} from 'lucide-react'
import { toast } from 'sonner'
import { adminApi } from '@/lib/api'
import { Driver } from '@/lib/types'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
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

const topNav = [
  { title: 'Overview', href: '/', isActive: false },
  { title: 'Drivers', href: '/drivers', isActive: true },
  { title: 'Vendors', href: '/vendors', isActive: false },
  { title: 'Settings', href: '#', isActive: false },
]

export const Route = createFileRoute('/_authenticated/drivers/')({
  component: DriversPage,
})

function DriversPage() {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedDriver, setSelectedDriver] = useState<Driver | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)

  // Fetch drivers
  const { data: driversData = [], isLoading } = useQuery({
    queryKey: ['drivers', statusFilter, searchQuery],
    queryFn: async () => {
      const response = await adminApi.getDrivers({
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: searchQuery || undefined,
      })
      // Handle both array and object responses
      const driversList = Array.isArray(response?.data)
        ? response.data
        : response?.data?.data || response?.data?.drivers || []
      return driversList
    },
  })

  const drivers = Array.isArray(driversData) ? driversData : []

  // Approve driver mutation
  const approveMutation = useMutation({
    mutationFn: (driverId: string) => adminApi.approveDriver(driverId),
    onSuccess: () => {
      toast.success('Driver approved successfully')
      queryClient.invalidateQueries({ queryKey: ['drivers'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to approve driver')
    },
  })

  // Reject driver mutation
  const rejectMutation = useMutation({
    mutationFn: (driverId: string) => adminApi.rejectDriver(driverId),
    onSuccess: () => {
      toast.success('Driver rejected')
      queryClient.invalidateQueries({ queryKey: ['drivers'] })
    },
    onError: (error: any) => {
      toast.error(error.response?.data?.message || 'Failed to reject driver')
    },
  })

  const handleViewDetails = (driver: Driver) => {
    setSelectedDriver(driver)
    setIsDetailsOpen(true)
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<
      string,
      {
        variant: 'default' | 'secondary' | 'destructive' | 'outline'
        label: string
      }
    > = {
      approved: { variant: 'default', label: 'Approved' },
      pending: { variant: 'secondary', label: 'Pending' },
      rejected: { variant: 'destructive', label: 'Rejected' },
      suspended: { variant: 'outline', label: 'Suspended' },
    }
    const config = variants[status] || {
      variant: 'outline' as const,
      label: status,
    }
    return <Badge variant={config.variant}>{config.label}</Badge>
  }

  const getAvailabilityBadge = (isAvailable: boolean, isOnline: boolean) => {
    if (!isOnline) {
      return <Badge variant='outline'>Offline</Badge>
    }
    return isAvailable ? (
      <Badge variant='default' className='bg-green-600'>
        Available
      </Badge>
    ) : (
      <Badge variant='secondary'>Busy</Badge>
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
              <h1 className='text-3xl font-bold tracking-tight'>Drivers</h1>
              <p className='text-muted-foreground'>
                Manage all delivery drivers and applications
              </p>
            </div>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle>Filter Drivers</CardTitle>
            </CardHeader>
            <CardContent>
              <div className='flex flex-col gap-4 md:flex-row'>
                <div className='relative flex-1'>
                  <Search className='text-muted-foreground absolute top-3 left-3 h-4 w-4' />
                  <Input
                    placeholder='Search by name, phone, or vehicle...'
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className='pl-10'
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className='w-full md:w-[200px]'>
                    <SelectValue placeholder='Filter by status' />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='all'>All Statuses</SelectItem>
                    <SelectItem value='approved'>Approved</SelectItem>
                    <SelectItem value='pending'>Pending</SelectItem>
                    <SelectItem value='rejected'>Rejected</SelectItem>
                    <SelectItem value='suspended'>Suspended</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Drivers Table */}
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Bike className='h-5 w-5' />
                All Drivers ({drivers?.length || 0})
              </CardTitle>
              <CardDescription>
                View and manage all registered drivers
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className='flex items-center justify-center py-8'>
                  <p className='text-muted-foreground'>Loading drivers...</p>
                </div>
              ) : drivers && drivers.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Driver</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Vehicle</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Availability</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Deliveries</TableHead>
                      <TableHead className='text-right'>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {drivers.map((driver: any) => (
                      <TableRow key={driver._id || driver.id}>
                        <TableCell>
                          <div className='flex items-center gap-3'>
                            <Avatar>
                              <AvatarImage
                                src={driver.profileImage}
                                alt={driver.name || driver.user?.fullName}
                              />
                              <AvatarFallback>
                                {(driver.name || driver.user?.fullName || 'D')
                                  .substring(0, 2)
                                  .toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className='font-medium'>
                                {driver.name || driver.user?.fullName}
                              </p>
                              <p className='text-muted-foreground text-sm'>
                                ID:{' '}
                                {(driver._id || driver.id || 'N/A').substring(
                                  0,
                                  8
                                )}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className='space-y-1'>
                            <div className='flex items-center gap-2 text-sm'>
                              <Phone className='h-3 w-3' />
                              {driver.phoneNumber ||
                                driver.user?.phone ||
                                'N/A'}
                            </div>
                            <div className='text-muted-foreground flex items-center gap-2 text-sm'>
                              <Mail className='h-3 w-3' />
                              {driver.email || driver.user?.email || 'N/A'}
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className='text-sm'>
                            <p className='font-medium'>
                              {driver.vehicleType || 'N/A'}
                            </p>
                            <p className='text-muted-foreground'>
                              {driver.vehicleNumber ||
                                driver.vehicleNo ||
                                'N/A'}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell>
                          {getStatusBadge(driver.status || 'approved')}
                        </TableCell>
                        <TableCell>
                          {getAvailabilityBadge(
                            driver.isAvailable ?? true,
                            driver.isOnline ?? true
                          )}
                        </TableCell>
                        <TableCell>
                          <div className='flex items-center gap-1'>
                            <Star className='h-4 w-4 fill-yellow-400 text-yellow-400' />
                            <span className='font-medium'>
                              {driver.rating?.toFixed(1) || 'N/A'}
                            </span>
                            <span className='text-muted-foreground text-xs'>
                              (
                              {driver.totalRatings ||
                                driver.orders?.length ||
                                0}
                              )
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className='font-medium'>
                            {driver.totalDeliveries ||
                              driver.orders?.length ||
                              0}
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
                                onClick={() => handleViewDetails(driver)}
                              >
                                <Eye className='mr-2 h-4 w-4' />
                                View Details
                              </DropdownMenuItem>
                              {driver.status === 'pending' && (
                                <>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      approveMutation.mutate(
                                        driver._id || driver.id
                                      )
                                    }
                                  >
                                    <CheckCircle className='mr-2 h-4 w-4 text-green-600' />
                                    Approve
                                  </DropdownMenuItem>
                                  <DropdownMenuItem
                                    onClick={() =>
                                      rejectMutation.mutate(
                                        driver._id || driver.id
                                      )
                                    }
                                    className='text-red-600'
                                  >
                                    <XCircle className='mr-2 h-4 w-4' />
                                    Reject
                                  </DropdownMenuItem>
                                </>
                              )}
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className='flex flex-col items-center justify-center py-12'>
                  <Bike className='text-muted-foreground mb-4 h-12 w-12' />
                  <p className='text-muted-foreground'>No drivers found</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Driver Details Dialog */}
          <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
            <DialogContent className='max-h-[80vh] max-w-2xl overflow-y-auto'>
              <DialogHeader>
                <DialogTitle>Driver Details</DialogTitle>
                <DialogDescription>
                  Complete information about the driver
                </DialogDescription>
              </DialogHeader>
              {selectedDriver && (
                <div className='space-y-6'>
                  <div className='flex items-start gap-4'>
                    <Avatar className='h-20 w-20'>
                      <AvatarImage
                        src={selectedDriver.profileImage}
                        alt={
                          selectedDriver.name || selectedDriver.user?.fullName
                        }
                      />
                      <AvatarFallback>
                        {(
                          selectedDriver.name ||
                          selectedDriver.user?.fullName ||
                          'D'
                        )
                          .substring(0, 2)
                          .toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div className='flex-1'>
                      <h3 className='text-2xl font-bold'>
                        {selectedDriver.name || selectedDriver.user?.fullName}
                      </h3>
                      <p className='text-muted-foreground'>
                        Driver ID:{' '}
                        {(
                          selectedDriver._id ||
                          selectedDriver.id ||
                          'N/A'
                        ).substring(0, 12)}
                      </p>
                      <div className='mt-2 flex gap-2'>
                        {getStatusBadge(selectedDriver.status || 'approved')}
                        {getAvailabilityBadge(
                          selectedDriver.isAvailable ?? true,
                          selectedDriver.isOnline ?? true
                        )}
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
                          {selectedDriver.phoneNumber ||
                            selectedDriver.user?.phone ||
                            'N/A'}
                        </div>
                        <div className='flex items-center gap-2'>
                          <Mail className='text-muted-foreground h-4 w-4' />
                          {selectedDriver.email ||
                            selectedDriver.user?.email ||
                            'N/A'}
                        </div>
                      </div>
                    </div>

                    <div>
                      <h4 className='mb-2 font-semibold'>Performance</h4>
                      <div className='space-y-2 text-sm'>
                        <div className='flex items-center gap-2'>
                          <Star className='h-4 w-4 fill-yellow-400 text-yellow-400' />
                          <span>
                            Rating: {selectedDriver.rating?.toFixed(1) || 'N/A'}{' '}
                            (
                            {selectedDriver.totalRatings ||
                              selectedDriver.orders?.length ||
                              0}{' '}
                            reviews)
                          </span>
                        </div>
                        <div className='flex items-center gap-2'>
                          <TrendingUp className='text-muted-foreground h-4 w-4' />
                          <span>
                            Total Deliveries:{' '}
                            {selectedDriver.totalDeliveries ||
                              selectedDriver.orders?.length ||
                              0}
                          </span>
                        </div>
                        <div className='flex items-center gap-2'>
                          <CheckCircle className='h-4 w-4 text-green-600' />
                          <span>
                            Completed: {selectedDriver.completedDeliveries || 0}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className='mb-2 font-semibold'>Vehicle Information</h4>
                    <div className='space-y-2 text-sm'>
                      <div>
                        <span className='text-muted-foreground'>Type:</span>{' '}
                        <span className='font-medium'>
                          {selectedDriver.vehicleType || 'N/A'}
                        </span>
                      </div>
                      <div>
                        <span className='text-muted-foreground'>Number:</span>{' '}
                        <span className='font-medium'>
                          {selectedDriver.vehicleNumber ||
                            selectedDriver.vehicleNo ||
                            'N/A'}
                        </span>
                      </div>
                      {selectedDriver.vehicleColor && (
                        <div>
                          <span className='text-muted-foreground'>Color:</span>{' '}
                          <span className='font-medium'>
                            {selectedDriver.vehicleColor}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  {selectedDriver.address && (
                    <div>
                      <h4 className='mb-2 font-semibold'>Address</h4>
                      <div className='flex items-start gap-2 text-sm'>
                        <MapPin className='text-muted-foreground mt-0.5 h-4 w-4' />
                        <div>
                          <p>{selectedDriver.address.street}</p>
                          {selectedDriver.address.city && (
                            <p className='text-muted-foreground'>
                              {selectedDriver.address.city},{' '}
                              {selectedDriver.address.state}{' '}
                              {selectedDriver.address.zipCode}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {selectedDriver.currentLocation && (
                    <div>
                      <h4 className='mb-2 font-semibold'>Current Location</h4>
                      <div className='text-muted-foreground text-sm'>
                        Lat:{' '}
                        {selectedDriver.currentLocation.coordinates[1].toFixed(
                          6
                        )}
                        , Lng:{' '}
                        {selectedDriver.currentLocation.coordinates[0].toFixed(
                          6
                        )}
                      </div>
                    </div>
                  )}

                  {selectedDriver.status === 'pending' && (
                    <div className='flex gap-2 border-t pt-4'>
                      <Button
                        className='flex-1'
                        onClick={() => {
                          if (selectedDriver._id || selectedDriver.id) {
                            approveMutation.mutate(selectedDriver._id || selectedDriver.id!)
                          }
                          setIsDetailsOpen(false)
                        }}
                        disabled={approveMutation.isPending}
                      >
                        <CheckCircle className='mr-2 h-4 w-4' />
                        Approve Driver
                      </Button>
                      <Button
                        variant='destructive'
                        className='flex-1'
                        onClick={() => {
                          if (selectedDriver._id || selectedDriver.id) {
                            rejectMutation.mutate(selectedDriver._id || selectedDriver.id!)
                          }
                          setIsDetailsOpen(false)
                        }}
                        disabled={rejectMutation.isPending}
                      >
                        <XCircle className='mr-2 h-4 w-4' />
                        Reject Driver
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </Main>
    </>
  )
}

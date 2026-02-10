import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import {
  Search,
  MoreHorizontal,
  Eye,
  ShoppingCart,
  Clock,
  CheckCircle2,
  Truck,
  MapPin,
  User,
  Store,
  Banknote,
  RefreshCw,
  XCircle,
  Package,
  Filter,
  ChevronLeft as ChevronLeftIcon,
  ChevronRight as ChevronRightIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { adminApi } from '@/lib/api'
import type { Order } from '@/lib/types'
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
  { title: 'Orders', href: '/orders', isActive: true },
  { title: 'Customers', href: '/customers', isActive: false },
  { title: 'Settings', href: '#', isActive: false },
]

export const Route = createFileRoute('/_authenticated/orders/')({
  component: OrdersPage,
})

interface OrderStats {
  total: number
  pending: number
  confirmed: number
  preparing: number
  ready: number
  dispatched: number
  inTransit: number
  delivered: number
  cancelled: number
  totalRevenue: number
}

function OrdersPage() {
  const queryClient = useQueryClient()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [isDetailsOpen, setIsDetailsOpen] = useState(false)
  const [isAssignDriverOpen, setIsAssignDriverOpen] = useState(false)
  const [selectedDriverId, setSelectedDriverId] = useState<string>('')
  const [currentPage, setCurrentPage] = useState(1)

  // Fetch orders
  const { data: ordersResponse, isLoading } = useQuery({
    queryKey: ['orders', currentPage, statusFilter, searchQuery],
    queryFn: async () => {
      const response = await adminApi.getOrders({
        page: currentPage,
        limit: 10,
        status: statusFilter === 'all' ? undefined : statusFilter,
        search: searchQuery || undefined,
      })
      return response.data
    },
  })

  // Extract and normalize orders from response
  const normalizeOrder = (order: any): Order => {
    const vendor = order.restaurant || order.shop || order.pharmacy
    return {
      ...order,
      _id: order._id || order.id,
      id: order.id || order._id,
      user: {
        _id: order.userId,
        name: order.customerName,
        phoneNumber: order.customerPhone,
        phone: order.customerPhone,
      },
      vendor: {
        _id: vendor?.id,
        id: vendor?.id,
        shopName: vendor?.name,
        businessName: vendor?.name,
        phoneNumber: vendor?.phone,
      },
      restaurant: order.restaurant,
      shop: order.shop,
      pharmacy: order.pharmacy,
    }
  }

  const orders = Array.isArray(ordersResponse)
    ? ordersResponse.map(normalizeOrder)
    : (ordersResponse?.orders || []).map(normalizeOrder)

  // Get pagination from response
  const paginationInfo = useMemo(
    () =>
      ordersResponse?.pagination || { page: 1, limit: 10, total: 0, pages: 0 },
    [ordersResponse?.pagination]
  )

  // Fetch drivers for assignment
  const { data: driversData = [] } = useQuery({
    queryKey: ['drivers'],
    queryFn: async () => {
      try {
        const response = await adminApi.getDrivers()
        // Handle both array and object responses
        const driversList = Array.isArray(response?.data)
          ? response.data
          : response?.data?.drivers || []
        return driversList
      } catch (_error) {
        // Silently handle error and return empty array
        return []
      }
    },
  })

  const drivers = Array.isArray(driversData) ? driversData : []

  // Update order status mutation
  const updateStatusMutation = useMutation({
    mutationFn: ({ orderId, status }: { orderId: string; status: string }) =>
      adminApi.updateOrderStatus(orderId, status),
    onSuccess: () => {
      toast.success('Order status updated')
      queryClient.invalidateQueries({ queryKey: ['orders'] })
    },
    onError: (
      error:
        | Error
        | { response?: { data?: { message?: string } }; message?: string }
    ) => {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message ||
        error?.message ||
        'Failed to update order'
      toast.error(message)
    },
  })

  // Assign driver mutation
  const assignDriverMutation = useMutation({
    mutationFn: ({
      orderId,
      driverId,
    }: {
      orderId: string
      driverId: string
    }) => {
      if (!orderId || !driverId) {
        throw new Error('Order ID and Driver ID are required')
      }
      return adminApi.assignDriver(orderId, driverId)
    },
    onSuccess: (_response) => {
      toast.success('Driver assigned successfully')
      queryClient.invalidateQueries({ queryKey: ['orders'] })
      setIsAssignDriverOpen(false)
      setSelectedDriverId('')
    },
    onError: (
      error:
        | Error
        | { response?: { data?: { message?: string } }; message?: string }
    ) => {
      const message =
        (error as { response?: { data?: { message?: string } } })?.response
          ?.data?.message ||
        error?.message ||
        'Failed to assign driver'
      toast.error(message)
    },
  })

  // Calculate stats - use API stats if available, otherwise calculate from current page
  const stats: OrderStats = useMemo(() => {
    // The API response should include aggregated stats for all orders
    // If not available, fallback to calculating from the orders on current page
    if (ordersResponse?.stats) {
      return {
        total: paginationInfo.total,
        pending: ordersResponse.stats.pending || 0,
        confirmed: ordersResponse.stats.confirmed || 0,
        preparing: ordersResponse.stats.preparing || 0,
        ready: ordersResponse.stats.ready || 0,
        dispatched: ordersResponse.stats.dispatched || 0,
        inTransit: ordersResponse.stats.inTransit || 0,
        delivered: ordersResponse.stats.delivered || 0,
        cancelled: ordersResponse.stats.cancelled || 0,
        totalRevenue: ordersResponse.stats.totalRevenue || 0,
      }
    }

    // Fallback calculation from current page
    const orderList = orders || []
    return {
      total: paginationInfo.total,
      pending: orderList.filter(
        (o: Order) => o.status?.toUpperCase() === 'PENDING'
      ).length,
      confirmed: orderList.filter(
        (o: Order) => o.status?.toUpperCase() === 'CONFIRMED'
      ).length,
      preparing: orderList.filter(
        (o: Order) => o.status?.toUpperCase() === 'PREPARING'
      ).length,
      ready: orderList.filter((o: Order) => o.status?.toUpperCase() === 'READY')
        .length,
      dispatched: orderList.filter(
        (o: Order) => o.status?.toUpperCase() === 'DISPATCHED'
      ).length,
      inTransit: orderList.filter(
        (o: Order) => o.status?.toUpperCase() === 'IN_TRANSIT'
      ).length,
      delivered: orderList.filter(
        (o: Order) => o.status?.toUpperCase() === 'DELIVERED'
      ).length,
      cancelled: orderList.filter(
        (o: Order) => o.status?.toUpperCase() === 'CANCELLED'
      ).length,
      totalRevenue: orderList.reduce(
        (sum: number, o: Order) => sum + (o.totalAmount || 0),
        0
      ),
    }
  }, [orders, ordersResponse, paginationInfo])

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order)
    setIsDetailsOpen(true)
  }

  const handleAssignDriver = (order: Order) => {
    setSelectedOrder(order)
    setSelectedDriverId(order.driver?.id || '')
    setIsAssignDriverOpen(true)
  }

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ['orders'] })
  }

  const getStatusBadge = (status: string) => {
    const variants: Record<
      string,
      {
        variant: 'default' | 'secondary' | 'destructive' | 'outline'
        icon: React.ComponentType<{ className?: string }>
        label: string
        color: string
      }
    > = {
      pending: {
        variant: 'secondary',
        icon: Clock,
        label: 'Pending',
        color: 'bg-yellow-50',
      },
      confirmed: {
        variant: 'default',
        icon: CheckCircle2,
        label: 'Confirmed',
        color: 'bg-blue-50',
      },
      preparing: {
        variant: 'default',
        icon: Store,
        label: 'Preparing',
        color: 'bg-orange-50',
      },
      ready: {
        variant: 'default',
        icon: Package,
        label: 'Ready',
        color: 'bg-purple-50',
      },
      in_transit: {
        variant: 'default',
        icon: Truck,
        label: 'In Transit',
        color: 'bg-indigo-50',
      },
      delivered: {
        variant: 'default',
        icon: CheckCircle2,
        label: 'Delivered',
        color: 'bg-green-50',
      },
      cancelled: {
        variant: 'destructive',
        icon: XCircle,
        label: 'Cancelled',
        color: 'bg-red-50',
      },
    }
    const config = variants[status.toLowerCase()] || {
      variant: 'outline' as const,
      icon: Package,
      label: status,
      color: 'bg-gray-50',
    }
    const Icon = config.icon
    return (
      <Badge variant={config.variant} className='flex items-center gap-1'>
        {Icon && <Icon className='h-3 w-3' />}
        {config.label}
      </Badge>
    )
  }

  const getPaymentBadge = (status: string) => {
    const isPaid = status === 'paid' || status === 'completed'
    return (
      <Badge variant={isPaid ? 'default' : 'secondary'}>
        {isPaid ? 'Paid' : 'Pending'}
      </Badge>
    )
  }

  if (isLoading) {
    return (
      <div className='flex h-64 items-center justify-center'>
        <div className='h-8 w-8 animate-spin rounded-full border-b-2 border-purple-600'></div>
      </div>
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
              <h1 className='text-3xl font-bold tracking-tight'>Orders</h1>
              <p className='text-muted-foreground'>
                Manage and track all orders and deliveries
              </p>
            </div>
            <div className='flex gap-2'>
              <Button
                onClick={handleRefresh}
                variant='outline'
                size='sm'
                className='flex items-center gap-2'
              >
                <RefreshCw className='h-4 w-4' />
                Refresh
              </Button>
            </div>
          </div>

          {/* Stats Cards */}
          <div className='grid grid-cols-2 gap-4 md:grid-cols-4'>
            <Card>
              <CardContent className='pt-6'>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-muted-foreground text-sm font-medium'>
                      Total Orders
                    </p>
                    <p className='text-2xl font-bold'>{paginationInfo.total}</p>
                  </div>
                  <ShoppingCart className='h-8 w-8 text-blue-500 opacity-50' />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className='pt-6'>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-muted-foreground text-sm font-medium'>
                      Pending
                    </p>
                    <p className='text-2xl font-bold'>{stats.pending}</p>
                  </div>
                  <Clock className='h-8 w-8 text-yellow-500 opacity-50' />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className='pt-6'>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-muted-foreground text-sm font-medium'>
                      Ready
                    </p>
                    <p className='text-2xl font-bold'>{stats.ready}</p>
                  </div>
                  <Package className='h-8 w-8 text-orange-500 opacity-50' />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className='pt-6'>
                <div className='flex items-center justify-between'>
                  <div>
                    <p className='text-muted-foreground text-sm font-medium'>
                      Delivered
                    </p>
                    <p className='text-2xl font-bold'>{stats.delivered}</p>
                  </div>
                  <CheckCircle2 className='h-8 w-8 text-green-500 opacity-50' />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center gap-2'>
                <Filter className='h-5 w-5' />
                Filter Orders
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className='flex flex-col gap-4 md:flex-row'>
                <div className='relative flex-1'>
                  <Search className='text-muted-foreground absolute top-3 left-3 h-4 w-4' />
                  <Input
                    placeholder='Search by order ID, customer name, vendor...'
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
                    <SelectItem value='pending'>Pending</SelectItem>
                    <SelectItem value='confirmed'>Confirmed</SelectItem>
                    <SelectItem value='preparing'>Preparing</SelectItem>
                    <SelectItem value='ready'>Ready</SelectItem>
                    <SelectItem value='in_transit'>In Transit</SelectItem>
                    <SelectItem value='delivered'>Delivered</SelectItem>
                    <SelectItem value='cancelled'>Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Orders Table */}
          <Card>
            <CardHeader>
              <CardTitle className='flex items-center justify-between'>
                <div className='flex items-center gap-2'>
                  <ShoppingCart className='h-5 w-5' />
                  All Orders
                </div>
                <Badge variant='outline' className='text-sm font-medium'>
                  Page {paginationInfo.page} of {paginationInfo.pages} (
                  {paginationInfo.total} total)
                </Badge>
              </CardTitle>
              <CardDescription>
                View and manage all customer orders
              </CardDescription>
            </CardHeader>
            <CardContent>
              {orders && orders.length > 0 ? (
                <div className='space-y-4'>
                  <div className='overflow-x-auto'>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Order ID</TableHead>
                          <TableHead>Customer</TableHead>
                          <TableHead>Vendor</TableHead>
                          <TableHead>Amount</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Driver</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead className='text-right'>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orders.map((order: Order) => (
                          <TableRow key={order._id || 'unknown'}>
                            <TableCell>
                              <code className='font-mono text-xs'>
                                #{order._id?.substring(0, 8) || 'N/A'}
                              </code>
                            </TableCell>
                            <TableCell>
                              <div className='flex items-center gap-3'>
                                <Avatar className='h-8 w-8'>
                                  <AvatarFallback>
                                    {order.user?.name
                                      ?.substring(0, 2)
                                      .toUpperCase() || 'U'}
                                  </AvatarFallback>
                                </Avatar>
                                <div>
                                  <div className='flex items-center gap-2'>
                                    <p className='font-medium'>
                                      {order.user?.name || 'Guest'}
                                    </p>
                                    {order.isGiftOrder && (
                                      <Badge variant='outline' className='border-orange-300 bg-orange-50 text-orange-700 text-xs'>
                                        🎁 Gift
                                      </Badge>
                                    )}
                                  </div>
                                  <p className='text-muted-foreground text-sm'>
                                    {order.isGiftOrder && order.recipientName 
                                      ? `→ ${order.recipientName}` 
                                      : order.user?.phoneNumber || 'N/A'}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className='flex items-center gap-2'>
                                <Store className='text-muted-foreground h-4 w-4' />
                                <span className='text-sm'>
                                  {order.vendor?.shopName || 'Unknown'}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className='font-medium'>
                                D{order.totalAmount?.toFixed(2) || '0.00'}
                              </div>
                              <div className='text-muted-foreground text-xs'>
                                {order.items?.length || 0} items
                              </div>
                            </TableCell>
                            <TableCell>
                              {getStatusBadge(order.status)}
                            </TableCell>
                            <TableCell>
                              {order.driver ? (
                                <div className='flex items-center gap-2'>
                                  <Avatar className='h-6 w-6'>
                                    <AvatarFallback className='text-xs'>
                                      {(
                                        order.driver.user?.fullName ||
                                        order.driver.name ||
                                        'D'
                                      )
                                        .substring(0, 2)
                                        .toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className='text-sm'>
                                    <p className='font-medium'>
                                      {order.driver.user?.fullName ||
                                        order.driver.name}
                                    </p>
                                    <p className='text-muted-foreground text-xs'>
                                      {order.driver.user?.phone || 'N/A'}
                                    </p>
                                  </div>
                                </div>
                              ) : (
                                <span className='text-muted-foreground text-xs'>
                                  Unassigned
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className='text-sm'>
                                {order.createdAt
                                  ? format(
                                      new Date(order.createdAt),
                                      'MMM dd, yyyy'
                                    )
                                  : 'N/A'}
                              </div>
                              <div className='text-muted-foreground text-xs'>
                                {order.createdAt
                                  ? format(new Date(order.createdAt), 'HH:mm')
                                  : ''}
                              </div>
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
                                    onClick={() => handleViewDetails(order)}
                                  >
                                    <Eye className='mr-2 h-4 w-4' />
                                    View Details
                                  </DropdownMenuItem>

                                  {order.status?.toLowerCase() ===
                                    'pending' && (
                                    <DropdownMenuItem
                                      onClick={() =>
                                        updateStatusMutation.mutate({
                                          orderId: order._id,
                                          status: 'confirmed',
                                        })
                                      }
                                    >
                                      <CheckCircle2 className='mr-2 h-4 w-4' />
                                      Confirm Order
                                    </DropdownMenuItem>
                                  )}

                                  {order.status?.toLowerCase() ===
                                    'confirmed' && (
                                    <DropdownMenuItem
                                      onClick={() =>
                                        updateStatusMutation.mutate({
                                          orderId: order._id,
                                          status: 'preparing',
                                        })
                                      }
                                    >
                                      <Store className='mr-2 h-4 w-4' />
                                      Start Preparing
                                    </DropdownMenuItem>
                                  )}

                                  {order.status?.toLowerCase() ===
                                    'preparing' && (
                                    <DropdownMenuItem
                                      onClick={() =>
                                        updateStatusMutation.mutate({
                                          orderId: order._id,
                                          status: 'ready',
                                        })
                                      }
                                    >
                                      <Package className='mr-2 h-4 w-4' />
                                      Mark as Ready
                                    </DropdownMenuItem>
                                  )}

                                  {order.status?.toLowerCase() === 'ready' &&
                                    !order.driver && (
                                      <DropdownMenuItem
                                        onClick={() =>
                                          handleAssignDriver(order)
                                        }
                                      >
                                        <Truck className='mr-2 h-4 w-4' />
                                        Assign Driver
                                      </DropdownMenuItem>
                                    )}

                                  {order.driver &&
                                    order.status?.toLowerCase() === 'ready' && (
                                      <DropdownMenuItem
                                        onClick={() =>
                                          updateStatusMutation.mutate({
                                            orderId: order._id,
                                            status: 'in_transit',
                                          })
                                        }
                                      >
                                        <Truck className='mr-2 h-4 w-4' />
                                        Dispatch Order
                                      </DropdownMenuItem>
                                    )}

                                  {order.status?.toLowerCase() ===
                                    'in_transit' && (
                                    <DropdownMenuItem
                                      onClick={() =>
                                        updateStatusMutation.mutate({
                                          orderId: order._id,
                                          status: 'delivered',
                                        })
                                      }
                                    >
                                      <CheckCircle2 className='mr-2 h-4 w-4' />
                                      Mark as Delivered
                                    </DropdownMenuItem>
                                  )}

                                  {order.status?.toLowerCase() !==
                                    'cancelled' &&
                                    order.status?.toLowerCase() !==
                                      'delivered' && (
                                      <>
                                        <DropdownMenuSeparator />
                                        <DropdownMenuItem
                                          onClick={() =>
                                            updateStatusMutation.mutate({
                                              orderId: order._id,
                                              status: 'cancelled',
                                            })
                                          }
                                          className='text-destructive'
                                        >
                                          <XCircle className='mr-2 h-4 w-4' />
                                          Cancel Order
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
                  </div>

                  {/* Pagination Controls */}
                  <div className='flex flex-col gap-4 border-t pt-4 sm:flex-row sm:items-center sm:justify-between'>
                    <div className='text-muted-foreground text-sm'>
                      Showing{' '}
                      <span className='font-medium'>
                        {(paginationInfo.page - 1) * paginationInfo.limit + 1}
                      </span>{' '}
                      to{' '}
                      <span className='font-medium'>
                        {Math.min(
                          paginationInfo.page * paginationInfo.limit,
                          paginationInfo.total
                        )}
                      </span>{' '}
                      of{' '}
                      <span className='font-medium'>
                        {paginationInfo.total}
                      </span>{' '}
                      orders
                    </div>
                    <div className='flex items-center gap-2'>
                      <Button
                        onClick={() =>
                          setCurrentPage(Math.max(1, currentPage - 1))
                        }
                        disabled={currentPage === 1}
                        variant='outline'
                        size='sm'
                      >
                        <ChevronLeftIcon className='mr-2 h-4 w-4' />
                        Previous
                      </Button>

                      <div className='flex items-center gap-1'>
                        {Array.from(
                          { length: paginationInfo.pages },
                          (_, i) => i + 1
                        )
                          .filter(
                            (page) =>
                              page === 1 ||
                              page === paginationInfo.pages ||
                              (page >= currentPage - 1 &&
                                page <= currentPage + 1)
                          )
                          .map((page, idx, arr) => (
                            <div key={page}>
                              {idx > 0 && arr[idx - 1] !== page - 1 && (
                                <span className='text-muted-foreground text-sm'>
                                  ...
                                </span>
                              )}
                              <Button
                                onClick={() => setCurrentPage(page)}
                                variant={
                                  currentPage === page ? 'default' : 'outline'
                                }
                                size='sm'
                                className='h-8 w-8 p-0'
                              >
                                {page}
                              </Button>
                            </div>
                          ))}
                      </div>

                      <Button
                        onClick={() =>
                          setCurrentPage(
                            Math.min(paginationInfo.pages, currentPage + 1)
                          )
                        }
                        disabled={currentPage === paginationInfo.pages}
                        variant='outline'
                        size='sm'
                      >
                        Next
                        <ChevronRightIcon className='ml-2 h-4 w-4' />
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className='flex flex-col items-center justify-center py-12'>
                  <ShoppingCart className='text-muted-foreground mb-4 h-12 w-12' />
                  <p className='text-muted-foreground'>
                    {searchQuery || statusFilter !== 'all'
                      ? 'No orders match your filters'
                      : 'No orders yet'}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Order Details Dialog */}
          <Dialog open={isDetailsOpen} onOpenChange={setIsDetailsOpen}>
            <DialogContent className='max-h-[90vh] max-w-5xl overflow-y-auto'>
              <DialogHeader>
                <DialogTitle>Order Details</DialogTitle>
                <DialogDescription>
                  Complete information about the order
                </DialogDescription>
              </DialogHeader>
              {selectedOrder && (
                <div className='space-y-6'>
                  {/* Order Header */}
                  <div className='flex items-start justify-between'>
                    <div>
                      <h3 className='text-xl font-bold'>
                        Order #{selectedOrder._id?.substring(0, 8) || 'N/A'}
                      </h3>
                      <p className='text-muted-foreground text-sm'>
                        {selectedOrder.createdAt
                          ? format(
                              new Date(selectedOrder.createdAt),
                              'MMMM dd, yyyy HH:mm'
                            )
                          : 'N/A'}
                      </p>
                    </div>
                    <div className='flex flex-col items-end gap-2'>
                      {getStatusBadge(selectedOrder.status)}
                      {getPaymentBadge(
                        selectedOrder.paymentStatus || 'pending'
                      )}
                    </div>
                  </div>

                  {/* Customer & Vendor Info */}
                  <div className='grid gap-4 md:grid-cols-2'>
                    <Card>
                      <CardHeader className='pb-3'>
                        <CardTitle className='flex items-center gap-2 text-sm'>
                          <User className='h-4 w-4' />
                          {selectedOrder.isGiftOrder ? 'Ordered By (Buyer)' : 'Customer'}
                        </CardTitle>
                      </CardHeader>
                      <CardContent className='space-y-1 text-sm'>
                        <p className='font-medium'>
                          {selectedOrder.user?.name || 'Guest'}
                        </p>
                        <p className='text-muted-foreground'>
                          {selectedOrder.user?.phoneNumber || 'N/A'}
                        </p>
                        <p className='text-muted-foreground'>
                          {selectedOrder.user?.email || 'N/A'}
                        </p>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className='pb-3'>
                        <CardTitle className='flex items-center gap-2 text-sm'>
                          <Store className='h-4 w-4' />
                          Vendor
                        </CardTitle>
                      </CardHeader>
                      <CardContent className='space-y-1 text-sm'>
                        <p className='font-medium'>
                          {selectedOrder.vendor?.shopName || 'Unknown'}
                        </p>
                        <p className='text-muted-foreground'>
                          {selectedOrder.vendor?.phoneNumber || 'N/A'}
                        </p>
                      </CardContent>
                    </Card>
                  </div>

                  {/* 🎁 Gift Order Recipient Info */}
                  {selectedOrder.isGiftOrder && selectedOrder.recipientName && (
                    <Card className='border-orange-200 bg-orange-50'>
                      <CardHeader className='pb-3'>
                        <CardTitle className='flex items-center gap-2 text-sm text-orange-700'>
                          <Package className='h-4 w-4' />
                          🎁 Gift Order - Recipient Information
                        </CardTitle>
                      </CardHeader>
                      <CardContent className='space-y-2 text-sm'>
                        <div className='grid gap-4 md:grid-cols-2'>
                          <div>
                            <p className='text-muted-foreground'>Recipient Name</p>
                            <p className='font-medium'>{selectedOrder.recipientName}</p>
                          </div>
                          <div>
                            <p className='text-muted-foreground'>Recipient Phone</p>
                            <p className='font-medium'>{selectedOrder.recipientPhone || 'N/A'}</p>
                          </div>
                        </div>
                        <div>
                          <p className='text-muted-foreground'>Delivery Address/Instructions</p>
                          <p className='font-medium'>{selectedOrder.recipientAddress || 'N/A'}</p>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Delivery Address */}
                  {selectedOrder.deliveryAddress && (
                    <Card>
                      <CardHeader className='pb-3'>
                        <CardTitle className='flex items-center gap-2 text-sm'>
                          <MapPin className='h-4 w-4' />
                          Delivery Address
                        </CardTitle>
                      </CardHeader>
                      <CardContent className='text-sm'>
                        {typeof selectedOrder.deliveryAddress === 'string' ? (
                          <p>{selectedOrder.deliveryAddress}</p>
                        ) : (
                          <>
                            <p>{selectedOrder.deliveryAddress.street}</p>
                            <p className='text-muted-foreground'>
                              {selectedOrder.deliveryAddress.city},{' '}
                              {selectedOrder.deliveryAddress.state}{' '}
                              {selectedOrder.deliveryAddress.zipCode}
                            </p>
                          </>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Order Items */}
                  <Card>
                    <CardHeader className='pb-3'>
                      <CardTitle className='text-sm'>Order Items</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className='space-y-3'>
                        {selectedOrder.items?.map((item, index) => (
                          <div
                            key={index}
                            className='flex justify-between text-sm'
                          >
                            <div className='flex-1'>
                              <p className='font-medium'>
                                {item.productName ||
                                  item.product?.name ||
                                  item.menuItem?.name ||
                                  item.medicine?.name ||
                                  'Unknown Item'}
                              </p>
                              <p className='text-muted-foreground'>
                                Qty: {item.quantity}
                              </p>
                            </div>
                            <p className='font-medium'>
                              D{(item.price * item.quantity).toFixed(2)}
                            </p>
                          </div>
                        )) || (
                          <p className='text-muted-foreground text-sm'>
                            No items
                          </p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  {/* Order Summary */}
                  <Card>
                    <CardHeader className='pb-3'>
                      <CardTitle className='flex items-center gap-2 text-sm'>
                        <Banknote className='h-4 w-4' />
                        Order Summary
                      </CardTitle>
                    </CardHeader>
                    <CardContent className='space-y-2 text-sm'>
                      <div className='flex justify-between'>
                        <span>Subtotal</span>
                        <span>
                          D
                          {(
                            selectedOrder.totalAmount -
                            (selectedOrder.deliveryFee || 0)
                          ).toFixed(2)}
                        </span>
                      </div>
                      <div className='flex justify-between'>
                        <span>Delivery Fee</span>
                        <span>
                          D{selectedOrder.deliveryFee?.toFixed(2) || '0.00'}
                        </span>
                      </div>
                      <div className='flex justify-between border-t pt-2 text-base font-bold'>
                        <span>Total</span>
                        <span>
                          D{selectedOrder.totalAmount?.toFixed(2) || '0.00'}
                        </span>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Driver Info */}
                  {selectedOrder.driver && (
                    <Card>
                      <CardHeader className='pb-3'>
                        <CardTitle className='flex items-center gap-2 text-sm'>
                          <Truck className='h-4 w-4' />
                          Delivery Driver
                        </CardTitle>
                      </CardHeader>
                      <CardContent className='space-y-1 text-sm'>
                        <p className='font-medium'>
                          {selectedOrder.driver.name ||
                            selectedOrder.driver.fullName ||
                            'Driver'}
                        </p>
                        <p className='text-muted-foreground'>
                          {selectedOrder.driver.phoneNumber ||
                            selectedOrder.driver.phone ||
                            'N/A'}
                        </p>
                        <p className='text-muted-foreground'>
                          {selectedOrder.driver.vehicleNumber ||
                            selectedOrder.driver.vehicleNo ||
                            'N/A'}
                        </p>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Assign Driver Dialog */}
          <Dialog
            open={isAssignDriverOpen}
            onOpenChange={setIsAssignDriverOpen}
          >
            <DialogContent className='max-w-md'>
              <DialogHeader>
                <DialogTitle>Assign Driver</DialogTitle>
                <DialogDescription>
                  Select a driver to assign to this order
                </DialogDescription>
              </DialogHeader>

              {selectedOrder && (
                <div className='space-y-4'>
                  {/* Order Info */}
                  <Card>
                    <CardContent className='pt-4'>
                      <div className='space-y-2 text-sm'>
                        <div className='flex justify-between'>
                          <span className='text-muted-foreground'>
                            Order ID:
                          </span>
                          <code className='font-mono'>
                            #{selectedOrder._id?.substring(0, 8) || 'N/A'}
                          </code>
                        </div>
                        <div className='flex justify-between'>
                          <span className='text-muted-foreground'>
                            Customer:
                          </span>
                          <span className='font-medium'>
                            {selectedOrder.user?.name}
                          </span>
                        </div>
                        <div className='flex justify-between'>
                          <span className='text-muted-foreground'>
                            Address:
                          </span>
                          <span className='max-w-[200px] text-right text-xs font-medium'>
                            {typeof selectedOrder.deliveryAddress === 'string'
                              ? selectedOrder.deliveryAddress
                              : selectedOrder.deliveryAddress?.street}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Driver Selection */}
                  <div className='space-y-2'>
                    <label className='text-sm font-medium'>
                      Available Drivers
                    </label>

                    {drivers.length === 0 ? (
                      <div className='text-muted-foreground rounded-lg border border-dashed p-4 text-center text-sm'>
                        No drivers are currently available
                      </div>
                    ) : (
                      <Select
                        value={selectedDriverId}
                        onValueChange={setSelectedDriverId}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder='Choose a driver...' />
                        </SelectTrigger>
                        <SelectContent>
                          {drivers.map((driver: any) => {
                            const driverName =
                              driver.user?.fullName ||
                              driver.name ||
                              driver.fullName ||
                              'Unknown'
                            const driverPhone =
                              driver.user?.phone ||
                              driver.phoneNumber ||
                              driver.phone ||
                              'N/A'
                            return (
                              <SelectItem
                                key={driver._id || driver.id}
                                value={driver._id || driver.id}
                              >
                                <div className='flex items-center gap-2'>
                                  <Avatar className='h-6 w-6'>
                                    <AvatarFallback>
                                      {driverName.substring(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div>
                                    <p className='text-sm font-medium'>
                                      {driverName}
                                    </p>
                                    <p className='text-muted-foreground text-xs'>
                                      {driverPhone}
                                    </p>
                                  </div>
                                </div>
                              </SelectItem>
                            )
                          })}
                        </SelectContent>
                      </Select>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className='flex justify-end gap-3 pt-4'>
                    <Button
                      variant='outline'
                      onClick={() => setIsAssignDriverOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={() => {
                        if (selectedOrder && selectedDriverId) {
                          const orderId = selectedOrder._id || selectedOrder.id
                          if (!orderId) {
                            toast.error('Order ID is missing')
                            return
                          }
                          assignDriverMutation.mutate({
                            orderId,
                            driverId: selectedDriverId,
                          })
                        }
                      }}
                      disabled={!selectedDriverId || drivers.length === 0}
                    >
                      {assignDriverMutation.isPending ? (
                        <>
                          <div className='mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white'></div>
                          Assigning...
                        </>
                      ) : (
                        <>
                          <Truck className='mr-2 h-4 w-4' />
                          Assign Driver
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
        </div>
      </Main>
    </>
  )
}

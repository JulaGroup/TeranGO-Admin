import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { createFileRoute } from '@tanstack/react-router'
import { Search, Eye, RefreshCw, Filter, Wifi, WifiOff } from 'lucide-react'
import { toast } from 'sonner'
import { api } from '@/lib/api'
import { useOrderNotifications } from '@/hooks/use-order-notifications'
import { useVendorProfile } from '@/hooks/use-vendor-profile'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
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

export const Route = createFileRoute('/_vendor/vendor/orders')({
  component: VendorOrders,
})

interface OrderItemDetail {
  id: string
  name?: string
  quantity: number
  price: number
  menuItem?: { name: string }
  product?: { name: string }
  medicine?: { name: string }
}

interface Order {
  id: string
  status: string
  totalAmount: number
  deliveryAddress?: string
  createdAt: string
  customerName?: string
  customerPhone?: string
  orderItems: OrderItemDetail[]
}

const ORDER_STATUSES = [
  { value: 'PENDING', label: 'Pending', color: 'bg-yellow-500' },
  { value: 'ACCEPTED', label: 'Accepted', color: 'bg-blue-500' },
  { value: 'PREPARING', label: 'Preparing', color: 'bg-purple-500' },
  { value: 'READY', label: 'Ready', color: 'bg-green-500' },
  { value: 'CANCELLED', label: 'Cancelled', color: 'bg-red-500' },
]

function VendorOrders() {
  const queryClient = useQueryClient()
  const { vendor } = useVendorProfile()
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('ALL')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)

  // Real-time order notifications with sound and toast
  const { isConnected } = useOrderNotifications({
    vendorId: vendor?.id,
    enabled: !!vendor?.id,
    onNewOrder: () => {
      // Orders list will auto-refresh via queryClient invalidation in the hook
    },
  })

  const {
    data: orders = [],
    isLoading,
    refetch,
  } = useQuery<Order[]>({
    queryKey: ['vendor-orders'],
    queryFn: async () => {
      const response = await api.get('/api/orders/vendor')
      return response.data
    },
  })

  const updateStatusMutation = useMutation({
    mutationFn: async ({
      orderId,
      status,
    }: {
      orderId: string
      status: string
    }) => {
      const response = await api.patch(`/api/orders/${orderId}/status`, {
        status,
      })
      return response.data
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-orders'] })
      toast.success('Order status updated successfully')
      setDetailsOpen(false)
    },
    onError: () => {
      toast.error('Failed to update order status')
    },
  })

  const filteredOrders = useMemo(() => {
    return orders
      .filter((order) =>
        statusFilter === 'ALL' ? true : order.status === statusFilter
      )
      .filter((order) => {
        const search = searchQuery.toLowerCase()
        const matchesId = order.id.toLowerCase().includes(search)
        const matchesName = order.customerName
          ? order.customerName.toLowerCase().includes(search)
          : false
        const matchesPhone = order.customerPhone
          ? order.customerPhone.toLowerCase().includes(search)
          : false
        return matchesId || matchesName || matchesPhone
      })
  }, [orders, searchQuery, statusFilter])

  const getStatusBadge = (status: string) => {
    const statusConfig = ORDER_STATUSES.find((s) => s.value === status)
    return (
      <Badge className={statusConfig?.color || 'bg-gray-500'}>
        {statusConfig?.label || status}
      </Badge>
    )
  }

  const handleViewDetails = (order: Order) => {
    setSelectedOrder(order)
    setDetailsOpen(true)
  }

  const handleStatusUpdate = (status: string) => {
    if (selectedOrder) {
      updateStatusMutation.mutate({ orderId: selectedOrder.id, status })
    }
  }

  // Stats
  const stats = {
    total: orders.length,
    pending: orders.filter((o) => o.status === 'PENDING').length,
    preparing: orders.filter((o) => o.status === 'PREPARING').length,
    completed: orders.filter((o) => o.status === 'DELIVERED').length,
  }

  return (
    <div className='space-y-6'>
      {/* Header */}
      <div className='flex items-center justify-between'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight'>Orders</h1>
          <p className='text-muted-foreground'>
            Manage your orders and update their status
          </p>
        </div>
        <div className='flex items-center gap-3'>
          {/* Connection Status */}
          <div className='flex items-center gap-2'>
            {isConnected ? (
              <>
                <Wifi className='h-4 w-4 text-green-500' />
                <span className='text-muted-foreground text-sm'>Live</span>
              </>
            ) : (
              <>
                <WifiOff className='h-4 w-4 text-orange-500' />
                <span className='text-muted-foreground text-sm'>Offline</span>
              </>
            )}
          </div>
          <Button onClick={() => refetch()} variant='outline' size='sm'>
            <RefreshCw className='mr-2 h-4 w-4' />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className='grid gap-4 md:grid-cols-4'>
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-muted-foreground text-sm font-medium'>
              Total Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold'>{stats.total}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-muted-foreground text-sm font-medium'>
              Pending
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-yellow-600'>
              {stats.pending}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-muted-foreground text-sm font-medium'>
              Preparing
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-purple-600'>
              {stats.preparing}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className='pb-2'>
            <CardTitle className='text-muted-foreground text-sm font-medium'>
              Completed
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className='text-2xl font-bold text-green-600'>
              {stats.completed}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className='pt-6'>
          <div className='flex flex-col gap-4 md:flex-row md:items-center'>
            <div className='relative flex-1'>
              <Search className='text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2' />
              <Input
                placeholder='Search orders by number, customer name or phone...'
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className='pl-10'
              />
            </div>
            <div className='flex items-center gap-2'>
              <Filter className='text-muted-foreground h-4 w-4' />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className='w-[180px]'>
                  <SelectValue placeholder='Filter by status' />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value='ALL'>All Orders</SelectItem>
                  {ORDER_STATUSES.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Orders Table */}
      <Card>
        <CardContent className='pt-6'>
          {isLoading ? (
            <div className='flex justify-center py-8'>
              <RefreshCw className='text-muted-foreground h-8 w-8 animate-spin' />
            </div>
          ) : filteredOrders.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order #</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Items</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead className='text-right'>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell className='font-medium'>
                      #{order.id.slice(-6).toUpperCase()}
                    </TableCell>
                    <TableCell>
                      <div>
                        <p className='font-medium'>
                          {order.customerName || 'N/A'}
                        </p>
                        <p className='text-muted-foreground text-xs'>
                          {order.customerPhone || 'N/A'}
                        </p>
                      </div>
                    </TableCell>
                    <TableCell>{order.orderItems?.length || 0} items</TableCell>
                    <TableCell className='font-medium'>
                      D{order.totalAmount.toFixed(2)}
                    </TableCell>
                    <TableCell>{getStatusBadge(order.status)}</TableCell>
                    <TableCell>
                      {format(new Date(order.createdAt), 'MMM dd, yyyy')}
                    </TableCell>
                    <TableCell className='text-right'>
                      <Button
                        variant='ghost'
                        size='sm'
                        onClick={() => handleViewDetails(order)}
                      >
                        <Eye className='h-4 w-4' />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className='text-muted-foreground py-8 text-center'>
              No orders found
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className='max-w-2xl'>
          <DialogHeader>
            <DialogTitle>Order Details</DialogTitle>
            <DialogDescription>
              Order #{selectedOrder?.id.slice(-6).toUpperCase()}
            </DialogDescription>
          </DialogHeader>

          {selectedOrder && (
            <div className='space-y-4'>
              {/* Customer Info */}
              <div>
                <h3 className='mb-2 font-semibold'>Customer Information</h3>
                <div className='space-y-1 rounded-lg border p-3'>
                  <p>
                    <span className='text-muted-foreground'>Name:</span>{' '}
                    {selectedOrder.customerName}
                  </p>
                  <p>
                    <span className='text-muted-foreground'>Phone:</span>{' '}
                    {selectedOrder.customerPhone}
                  </p>
                  <p>
                    <span className='text-muted-foreground'>Address:</span>{' '}
                    {selectedOrder.deliveryAddress}
                  </p>
                </div>
              </div>

              {/* Order Items */}
              <div>
                <h3 className='mb-2 font-semibold'>Order Items</h3>
                <div className='space-y-2'>
                  {selectedOrder.orderItems?.map((item) => {
                    const resolvedName =
                      item.name ||
                      item.menuItem?.name ||
                      item.product?.name ||
                      item.medicine?.name ||
                      'Item'
                    return (
                      <div
                        key={item.id}
                        className='flex items-center justify-between rounded-lg border p-3'
                      >
                        <div>
                          <p className='font-medium'>{resolvedName}</p>
                          <p className='text-muted-foreground text-sm'>
                            Qty: {item.quantity}
                          </p>
                        </div>
                        <p className='font-medium'>
                          D{(item.price * item.quantity).toFixed(2)}
                        </p>
                      </div>
                    )
                  })}
                </div>
              </div>

              {/* Total */}
              <div className='bg-muted flex items-center justify-between rounded-lg border p-3'>
                <span className='font-semibold'>Total</span>
                <span className='text-lg font-bold'>
                  D{selectedOrder.totalAmount.toFixed(2)}
                </span>
              </div>

              {/* Status Update */}
              <div>
                <h3 className='mb-2 font-semibold'>Update Status</h3>
                <Select
                  value={selectedOrder.status}
                  onValueChange={handleStatusUpdate}
                  disabled={updateStatusMutation.isPending}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ORDER_STATUSES.map((status) => (
                      <SelectItem key={status.value} value={status.value}>
                        {status.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}

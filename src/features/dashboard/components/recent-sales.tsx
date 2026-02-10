import { Avatar, AvatarFallback } from '@/components/ui/avatar'

interface RecentOrder {
  id: string
  customerName: string
  restaurantName?: string | null
  totalAmount: number
  status: string
  createdAt: string
}

interface RecentSalesProps {
  orders?: RecentOrder[]
}

export function RecentSales({ orders = [] }: RecentSalesProps) {
  // Ensure orders is an array
  const orderList = Array.isArray(orders) ? orders : []

  // Show fallback if no orders
  if (orderList.length === 0) {
    return (
      <div className='py-8 text-center'>
        <p className='text-muted-foreground text-sm'>No recent orders</p>
      </div>
    )
  }

  return (
    <div className='space-y-8'>
      {orderList.slice(0, 5).map((order) => (
        <div key={order.id} className='flex items-center gap-4'>
          <Avatar className='h-9 w-9'>
            <AvatarFallback>
              {order.customerName?.substring(0, 2).toUpperCase() || 'O'}
            </AvatarFallback>
          </Avatar>
          <div className='flex flex-1 flex-wrap items-center justify-between'>
            <div className='space-y-1'>
              <p className='text-sm leading-none font-medium'>
                {order.customerName || 'Customer'}
              </p>
              <p className='text-muted-foreground text-xs leading-none'>
                {order.restaurantName || 'Online Order'}
              </p>
            </div>
            <div className='font-medium'>
              +D{order.totalAmount?.toFixed(2) || '0.00'}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

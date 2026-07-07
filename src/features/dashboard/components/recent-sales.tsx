import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

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

const statusMap: Record<string, { label: string; class: string }> = {
  PENDING:    { label: 'Pending',    class: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' },
  ACCEPTED:   { label: 'Accepted',   class: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  PROCESSING: { label: 'Processing', class: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  PREPARING:  { label: 'Preparing',  class: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300' },
  READY:      { label: 'Ready',      class: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-300' },
  DISPATCHED: { label: 'Dispatched', class: 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300' },
  DELIVERED:  { label: 'Delivered',  class: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' },
  CANCELLED:  { label: 'Cancelled',  class: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' },
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 60)   return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs  < 24)   return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export function RecentSales({ orders = [] }: RecentSalesProps) {
  const orderList = Array.isArray(orders) ? orders : []

  if (orderList.length === 0) {
    return (
      <div className='flex flex-col items-center justify-center py-10 text-center'>
        <div className='h-10 w-10 rounded-full bg-muted flex items-center justify-center mb-3'>
          <span className='text-lg'>📦</span>
        </div>
        <p className='text-sm text-muted-foreground font-medium'>No recent orders</p>
        <p className='text-xs text-muted-foreground/60 mt-0.5'>Orders will appear here once placed</p>
      </div>
    )
  }

  return (
    <div className='space-y-1'>
      {orderList.slice(0, 6).map((order) => {
        const status  = statusMap[order.status] ?? { label: order.status, class: 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-300' }
        const initials = (order.customerName ?? 'O').substring(0, 2).toUpperCase()

        return (
          <div
            key={order.id}
            className='flex items-center gap-3 rounded-lg px-3 py-2.5 hover:bg-muted/40 transition-colors'
          >
            <Avatar className='h-8 w-8 shrink-0'>
              <AvatarFallback className='bg-primary/10 text-primary text-xs font-bold'>
                {initials}
              </AvatarFallback>
            </Avatar>

            <div className='flex-1 min-w-0'>
              <p className='text-sm font-semibold leading-none truncate'>
                {order.customerName || 'Customer'}
              </p>
              <p className='text-xs text-muted-foreground mt-0.5 truncate'>
                {order.restaurantName || 'Online Order'} · {timeAgo(order.createdAt)}
              </p>
            </div>

            <div className='flex flex-col items-end gap-1 shrink-0'>
              <span className='text-sm font-bold text-emerald-600 dark:text-emerald-400'>
                +D{order.totalAmount?.toFixed(0) ?? '0'}
              </span>
              <Badge
                variant='outline'
                className={cn('text-[10px] font-semibold border-0 px-1.5 py-0 h-4', status.class)}
              >
                {status.label}
              </Badge>
            </div>
          </div>
        )
      })}
    </div>
  )
}

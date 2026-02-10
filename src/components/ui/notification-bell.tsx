import { useNavigate } from '@tanstack/react-router'
import { Bell } from 'lucide-react'
import { useNotificationStore } from '@/stores/notification-store'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from '@/components/ui/dropdown-menu'

export default function NotificationBell() {
  const unread = useNotificationStore(
    (s) => s.notifications.filter((n) => !n.read).length
  )
  const notifications = useNotificationStore((s) => s.notifications.slice(0, 6))
  const markRead = useNotificationStore((s) => s.markRead)
  const markAllRead = useNotificationStore((s) => s.markAllRead)
  const navigate = useNavigate()

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant='ghost' size='icon' className='relative'>
          <Bell className='h-5 w-5' />
          {unread > 0 && (
            <span className='absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs text-white'>
              {unread > 99 ? '99+' : unread}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align='end' className='w-80 p-2'>
        <div className='flex items-center justify-between px-2 py-1'>
          <div className='text-sm font-semibold'>Notifications</div>
          <div className='flex items-center gap-2'>
            <button
              className='text-muted-foreground text-xs'
              onClick={(e) => {
                e.preventDefault()
                markAllRead()
              }}
            >
              Mark all read
            </button>
            <button
              className='text-primary text-xs'
              onClick={() => navigate({ to: '/notifications' as any })}
            >
              View all
            </button>
          </div>
        </div>
        <div className='mt-1 max-h-64 overflow-y-auto'>
          {notifications.length === 0 && (
            <div className='text-muted-foreground p-4 text-sm'>
              No notifications
            </div>
          )}
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`hover:bg-muted flex items-start gap-2 rounded-md p-2 ${n.read ? 'opacity-70' : 'bg-surface'}`}
              onClick={() => markRead(n.id)}
            >
              <div className='flex-1'>
                <div className='text-sm font-medium'>{n.title}</div>
                <div className='text-muted-foreground line-clamp-2 text-xs'>
                  {n.body}
                </div>
                <div className='text-2xs text-muted-foreground mt-1'>
                  {new Date(n.createdAt).toLocaleString()}
                </div>
              </div>
            </div>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

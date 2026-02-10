import { useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from '@tanstack/react-router'
import {
  LayoutDashboard,
  ShoppingBag,
  UtensilsCrossed,
  Settings,
  Menu,
  Store,
  LogOut,
  Package,
  BarChart3,
  FileText,
  Crown,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { clearVendorProfile, type VendorProfile } from '@/lib/vendor'
import { useVendorProfile } from '@/hooks/use-vendor-profile'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet'

interface NavGroup {
  title: string
  items: Array<{
    title: string
    href: string
    icon: React.ElementType
    badge?: string
    condition?: (vendor: VendorProfile | null) => boolean
  }>
}

const getNavGroups = (): NavGroup[] => [
  {
    title: 'Overview',
    items: [
      {
        title: 'Dashboard',
        href: '/vendor/dashboard',
        icon: LayoutDashboard,
      },
    ],
  },
  {
    title: 'Management',
    items: [
      {
        title: 'Orders',
        href: '/vendor/orders',
        icon: ShoppingBag,
      },
      {
        title: 'Menu',
        href: '/vendor/menu',
        icon: UtensilsCrossed,
        condition: (vendor) =>
          Boolean(vendor?.restaurants && vendor.restaurants.length > 0),
      },
      {
        title: 'Products',
        href: '/vendor/menu',
        icon: Package,
        condition: (vendor) =>
          Boolean(vendor?.shops && vendor.shops.length > 0),
      },
    ],
  },
  {
    title: 'Insights',
    items: [
      {
        title: 'Analytics',
        href: '/vendor/analytics',
        icon: BarChart3,
        badge: 'Soon',
      },
      {
        title: 'Reports',
        href: '/vendor/reports',
        icon: FileText,
        badge: 'Soon',
      },
    ],
  },
  {
    title: 'System',
    items: [
      {
        title: 'Subscription',
        href: '/vendor/subscription',
        icon: Crown,
      },
      {
        title: 'Settings',
        href: '/vendor/settings',
        icon: Settings,
      },
    ],
  },
]

interface VendorSidebarProps {
  className?: string
}

export function VendorSidebar({ className }: VendorSidebarProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const { vendor } = useVendorProfile()
  const cachedUser = useMemo(() => {
    if (typeof window === 'undefined') return null
    const raw = window.localStorage.getItem('user')
    return raw ? JSON.parse(raw) : null
  }, [])

  const userDisplayName =
    vendor?.user?.fullName ||
    vendor?.restaurants?.[0]?.name ||
    cachedUser?.name ||
    cachedUser?.fullName ||
    'Vendor'
  const userPhone = vendor?.user?.phone || cachedUser?.phone || '—'
  const businessCount = vendor
    ? (vendor._count?.restaurants || 0) +
      (vendor._count?.shops || 0) +
      (vendor._count?.pharmacies || 0)
    : 0

  const handleLogout = () => {
    localStorage.removeItem('auth_token')
    localStorage.removeItem('user')
    clearVendorProfile()
    toast.success('Logged out successfully')
    navigate({ to: '/sign-in' })
  }

  return (
    <div className={cn('pb-12', className)}>
      <div className='space-y-4 py-4'>
        {/* Logo/Brand */}
        <div className='px-3 py-2'>
          <div className='flex items-center gap-2 px-4'>
            <div className='flex h-10 w-10 items-center justify-center rounded-lg bg-linear-to-br from-orange-500 to-red-500'>
              <Store className='h-6 w-6 text-white' />
            </div>
            <div className='flex-1'>
              <h2 className='text-lg font-semibold tracking-tight'>TeranGO</h2>
              <p className='text-muted-foreground text-xs'>Vendor Portal</p>
            </div>
          </div>
        </div>

        {/* User Info */}
        {(vendor || cachedUser) && (
          <div className='px-3 py-2'>
            <div className='bg-muted rounded-lg px-4 py-3'>
              <p className='text-sm font-medium'>{userDisplayName}</p>
              <p className='text-muted-foreground text-xs'>{userPhone}</p>
              {businessCount > 0 && (
                <p className='text-muted-foreground text-xs'>
                  {businessCount} active business
                  {businessCount === 1 ? '' : 'es'}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className='px-3'>
          <ScrollArea className='flex-1'>
            <div className='space-y-4 py-2'>
              {getNavGroups().map((group) => (
                <div key={group.title}>
                  <h4 className='text-muted-foreground mb-2 px-2 text-xs font-semibold tracking-wider uppercase'>
                    {group.title}
                  </h4>
                  <div className='space-y-1'>
                    {group.items.map((item) => {
                      // Check condition if present
                      if (item.condition && !item.condition(vendor)) {
                        return null
                      }

                      const isActive = location.pathname === item.href
                      const isDisabled = Boolean(item.badge)

                      return (
                        <Link
                          key={item.href}
                          to={item.href}
                          disabled={isDisabled}
                          className={cn(
                            'flex items-center justify-between gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                            isDisabled
                              ? 'cursor-not-allowed opacity-60'
                              : 'hover:bg-accent hover:text-accent-foreground',
                            isActive && !isDisabled
                              ? 'bg-accent text-accent-foreground'
                              : 'text-muted-foreground'
                          )}
                        >
                          <div className='flex items-center gap-3'>
                            <item.icon className='h-4 w-4' />
                            <span>{item.title}</span>
                          </div>
                          {item.badge && (
                            <Badge variant='secondary' className='text-xs'>
                              {item.badge}
                            </Badge>
                          )}
                        </Link>
                      )
                    })}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Logout Button */}
        <div className='px-3 py-2'>
          <Button
            variant='ghost'
            className='text-muted-foreground w-full justify-start gap-3 hover:text-red-600'
            onClick={handleLogout}
          >
            <LogOut className='h-5 w-5' />
            Logout
          </Button>
        </div>
      </div>
    </div>
  )
}

export function VendorMobileSidebar() {
  const [open, setOpen] = useState(false)

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant='ghost' size='icon' className='md:hidden'>
          <Menu className='h-5 w-5' />
        </Button>
      </SheetTrigger>
      <SheetContent side='left' className='w-64 p-0'>
        <ScrollArea className='h-full'>
          <VendorSidebar />
        </ScrollArea>
      </SheetContent>
    </Sheet>
  )
}

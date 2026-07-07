import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'
import NotificationBell from '@/components/ui/notification-bell'

type HeaderProps = React.HTMLAttributes<HTMLElement> & {
  fixed?: boolean
  ref?: React.Ref<HTMLElement>
}

export function Header({ className, fixed, children, ...props }: HeaderProps) {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const onScroll = () => {
      setScrolled((document.body.scrollTop || document.documentElement.scrollTop) > 8)
    }
    document.addEventListener('scroll', onScroll, { passive: true })
    return () => document.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <header
      className={cn(
        'z-50 h-14',
        fixed && 'header-fixed peer/header sticky top-0 w-[inherit]',
        className,
      )}
      {...props}
    >
      <div
        className={cn(
          'relative flex h-full items-center gap-2 px-3 sm:px-4 transition-all duration-200',
          scrolled && fixed
            ? 'bg-background/80 backdrop-blur-xl border-b border-border/50 shadow-sm'
            : 'bg-transparent',
        )}
      >
        {/* Sidebar / hamburger trigger — larger tap target on mobile */}
        <SidebarTrigger
          variant='ghost'
          className='h-9 w-9 rounded-lg text-muted-foreground hover:text-foreground hover:bg-accent shrink-0 md:h-8 md:w-8'
        />
        <Separator orientation='vertical' className='h-5 mx-0.5 hidden sm:block' />

        {/* Page-specific nav / breadcrumbs */}
        <div className='flex flex-1 items-center gap-2 overflow-hidden min-w-0'>
          {children}
        </div>

        {/* Right-side actions */}
        <div className='flex items-center gap-1 ms-auto shrink-0'>
          <NotificationBell />
        </div>
      </div>
    </header>
  )
}

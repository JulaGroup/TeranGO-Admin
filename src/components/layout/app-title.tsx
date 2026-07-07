import { Link } from '@tanstack/react-router'
import { PanelLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { Button } from '../ui/button'

export function AppTitle() {
  const { state, setOpenMobile } = useSidebar()
  const isCollapsed = state === 'collapsed'

  return (
    <SidebarMenu>
      <SidebarMenuItem>
        <SidebarMenuButton
          size='lg'
          className='gap-0 py-0 hover:bg-transparent active:bg-transparent'
          asChild
        >
          <div className='flex items-center gap-3'>
            {/* Brand mark */}
            <Link
              to='/'
              onClick={() => setOpenMobile(false)}
              className='flex items-center gap-3 min-w-0'
            >
              <div className='flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary shadow-sm shadow-primary/30'>
                <span className='text-sm font-black text-primary-foreground leading-none select-none'>T</span>
              </div>
              {!isCollapsed && (
                <div className='grid min-w-0 leading-tight'>
                  <span className='truncate text-sm font-bold tracking-tight'>
                    Teran<span className='text-primary'>GO</span>
                  </span>
                  <span className='truncate text-[10px] text-sidebar-foreground/50 font-medium tracking-widest uppercase'>
                    Super Admin
                  </span>
                </div>
              )}
            </Link>

            {/* Toggle — only render when expanded (it acts as collapse trigger) */}
            {!isCollapsed && <ToggleSidebar className='ml-auto' />}
          </div>
        </SidebarMenuButton>
      </SidebarMenuItem>
    </SidebarMenu>
  )
}

export function ToggleSidebar({
  className,
  onClick,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { toggleSidebar } = useSidebar()

  return (
    <Button
      data-sidebar='trigger'
      data-slot='sidebar-trigger'
      variant='ghost'
      size='icon'
      className={cn(
        'aspect-square h-7 w-7 rounded-md text-sidebar-foreground/50 hover:text-sidebar-foreground hover:bg-sidebar-accent',
        className,
      )}
      onClick={(event) => {
        onClick?.(event)
        toggleSidebar()
      }}
      {...props}
    >
      <PanelLeft className='h-4 w-4' />
      <span className='sr-only'>Toggle Sidebar</span>
    </Button>
  )
}

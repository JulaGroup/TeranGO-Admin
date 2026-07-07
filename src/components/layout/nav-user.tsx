import { ChevronsUpDown, LogOut, Settings, Shield } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import useDialogState from '@/hooks/use-dialog-state'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from '@/components/ui/sidebar'
import { SignOutDialog } from '@/components/sign-out-dialog'

type NavUserProps = {
  user: {
    name: string
    email: string
    avatar: string
  }
}

function getAdminFromStorage(): { name: string; email: string; phone?: string } | null {
  try {
    const raw = localStorage.getItem('user')
    if (raw) return JSON.parse(raw)
  } catch {}
  return null
}

function initials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

export function NavUser({ user }: NavUserProps) {
  const { isMobile } = useSidebar()
  const [open, setOpen] = useDialogState()

  const stored = getAdminFromStorage()
  const displayName = stored?.name || user.name
  const displayEmail = stored?.email || user.email

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size='lg'
                className='rounded-lg border border-sidebar-border/60 bg-sidebar-accent/40 transition-colors hover:bg-sidebar-accent data-[state=open]:bg-sidebar-accent'
              >
                <Avatar className='h-8 w-8 rounded-lg ring-2 ring-primary/20'>
                  <AvatarImage src={user.avatar} alt={displayName} />
                  <AvatarFallback className='rounded-lg bg-primary/15 text-primary text-xs font-bold'>
                    {initials(displayName)}
                  </AvatarFallback>
                </Avatar>
                <div className='grid flex-1 text-start text-sm leading-tight min-w-0'>
                  <span className='truncate font-semibold text-[13px]'>{displayName}</span>
                  <span className='truncate text-[11px] text-sidebar-foreground/55'>
                    {displayEmail}
                  </span>
                </div>
                <ChevronsUpDown className='ms-auto h-3.5 w-3.5 text-sidebar-foreground/40' />
              </SidebarMenuButton>
            </DropdownMenuTrigger>

            <DropdownMenuContent
              className='w-(--radix-dropdown-menu-trigger-width) min-w-60 rounded-xl p-1.5'
              side={isMobile ? 'bottom' : 'right'}
              align='end'
              sideOffset={6}
            >
              <DropdownMenuLabel className='p-0 font-normal'>
                <div className='flex items-center gap-2.5 rounded-lg px-2 py-2 bg-muted/50'>
                  <Avatar className='h-9 w-9 rounded-lg ring-2 ring-primary/20'>
                    <AvatarImage src={user.avatar} alt={displayName} />
                    <AvatarFallback className='rounded-lg bg-primary/15 text-primary text-xs font-bold'>
                      {initials(displayName)}
                    </AvatarFallback>
                  </Avatar>
                  <div className='grid flex-1 min-w-0 text-sm leading-tight'>
                    <span className='truncate font-semibold text-[13px]'>{displayName}</span>
                    <span className='truncate text-[11px] text-muted-foreground'>{displayEmail}</span>
                  </div>
                  <Badge
                    variant='outline'
                    className='text-[9px] font-bold uppercase tracking-wider border-primary/30 text-primary bg-primary/8 px-1.5 py-0 h-5 shrink-0'
                  >
                    <Shield className='h-2.5 w-2.5 mr-0.5' />
                    Admin
                  </Badge>
                </div>
              </DropdownMenuLabel>

              <DropdownMenuSeparator className='my-1.5' />

              <DropdownMenuItem asChild>
                <Link to='/admin/settings' className='gap-2 rounded-lg cursor-pointer'>
                  <Settings className='h-4 w-4 text-muted-foreground' />
                  <span>Settings</span>
                </Link>
              </DropdownMenuItem>

              <DropdownMenuSeparator className='my-1.5' />

              <DropdownMenuItem
                variant='destructive'
                className='rounded-lg gap-2'
                onClick={() => setOpen(true)}
              >
                <LogOut className='h-4 w-4' />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      <SignOutDialog open={!!open} onOpenChange={setOpen} />
    </>
  )
}

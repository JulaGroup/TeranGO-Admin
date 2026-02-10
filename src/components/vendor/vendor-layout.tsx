import React from 'react'
import { Bell } from 'lucide-react'
import { Button } from '@/components/ui/button'
import NotificationBell from '@/components/ui/notification-bell'
import { ThemeSwitch } from '@/components/theme-switch'
import { VendorSidebar, VendorMobileSidebar } from './vendor-sidebar'

interface VendorLayoutProps {
  children: React.ReactNode
}

export function VendorLayoutWrapper({ children }: VendorLayoutProps) {
  return (
    <div className='flex min-h-screen'>
      {/* Desktop Sidebar */}
      <aside className='bg-background hidden w-64 border-r md:block'>
        <VendorSidebar />
      </aside>

      {/* Main Content */}
      <div className='flex-1'>
        {/* Header */}
        <header className='bg-background sticky top-0 z-10 flex h-16 items-center gap-4 border-b px-4 md:px-6'>
          <VendorMobileSidebar />

          <div className='flex flex-1 items-center justify-end gap-4'>
            {/* Notification Bell (shows unread count and dropdown) */}
            <div className='relative'>
              {/* Lazy load component to avoid initial bundle weight */}
              <React.Suspense
                fallback={
                  <Button variant='ghost' size='icon' className='relative'>
                    <Bell className='h-5 w-5' />
                  </Button>
                }
              >
                {/* @ts-ignore - dynamic import to keep initial bundle small */}
                <NotificationBell />
              </React.Suspense>
            </div>
            <ThemeSwitch />
          </div>
        </header>

        {/* Page Content */}
        <main className='flex-1 p-4 md:p-6 lg:p-8'>{children}</main>
      </div>
    </div>
  )
}

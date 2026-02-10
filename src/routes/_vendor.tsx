import { createFileRoute, Outlet, redirect } from '@tanstack/react-router'
import { VendorLayoutWrapper } from '@/components/vendor/vendor-layout'

export const Route = createFileRoute('/_vendor')({
  beforeLoad: async () => {
    // Check if user is authenticated and has vendor role
    const token = localStorage.getItem('auth_token')
    const userStr = localStorage.getItem('user')

    if (!token || !userStr) {
      throw redirect({ to: '/sign-in' })
    }

    const user = JSON.parse(userStr)

    // Only allow VENDOR role for vendor portal routes
    if (user.role !== 'VENDOR') {
      // Redirect admins to admin panel
      if (user.role === 'ADMIN') {
        throw redirect({ to: '/' })
      }
      // Other roles go to sign-in
      throw redirect({ to: '/sign-in' })
    }
  },
  component: VendorLayout,
})

function VendorLayout() {
  return (
    <VendorLayoutWrapper>
      <Outlet />
    </VendorLayoutWrapper>
  )
}

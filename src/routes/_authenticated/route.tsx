import { createFileRoute, redirect } from '@tanstack/react-router'
import { AuthenticatedLayout } from '@/components/layout/authenticated-layout'

export const Route = createFileRoute('/_authenticated')({
  beforeLoad: () => {
    const token = localStorage.getItem('auth_token')
    const userStr = localStorage.getItem('user')

    if (!token || !userStr) {
      throw redirect({
        to: '/login',
      })
    }

    const user = JSON.parse(userStr)

    // Only allow ADMIN role for admin panel routes
    if (user.role !== 'ADMIN') {
      // Redirect vendors to their portal
      if (user.role === 'VENDOR') {
        throw redirect({
          to: '/vendor/dashboard',
        })
      }
      // Other roles go to login
      throw redirect({
        to: '/login',
      })
    }

    return { user }
  },
  component: AuthenticatedLayout,
})

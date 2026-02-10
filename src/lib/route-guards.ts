import { redirect } from '@tanstack/react-router'
import { useAuthStore } from './auth'

export const requireAuth = () => {
  const token = localStorage.getItem('auth_token')
  const userStr = localStorage.getItem('user')
  
  if (!token || !userStr) {
    throw redirect({
      to: '/login',
      search: {
        redirect: window.location.pathname,
      },
    })
  }
  
  return { token, user: JSON.parse(userStr) }
}

export const requireAdmin = () => {
  const { user } = requireAuth()
  
  if (user.role !== 'ADMIN') {
    throw redirect({
      to: '/unauthorized',
    })
  }
  
  return user
}

export const requireVendor = () => {
  const { user } = requireAuth()
  
  if (user.role !== 'VENDOR') {
    throw redirect({
      to: '/unauthorized',
    })
  }
  
  return user
}

export const requireAdminOrVendor = () => {
  const { user } = requireAuth()
  
  if (user.role !== 'ADMIN' && user.role !== 'VENDOR') {
    throw redirect({
      to: '/unauthorized',
    })
  }
  
  return user
}

// Hook versions for use in components
export const useRequireAuth = () => {
  const { isAuthenticated, user } = useAuthStore()
  
  if (!isAuthenticated || !user) {
    throw redirect({ to: '/login' })
  }
  
  return user
}

export const useRequireAdmin = () => {
  const user = useRequireAuth()
  
  if (user.role !== 'ADMIN') {
    throw redirect({ to: '/unauthorized' })
  }
  
  return user
}

export const useRequireVendor = () => {
  const user = useRequireAuth()
  
  if (user.role !== 'VENDOR') {
    throw redirect({ to: '/unauthorized' })
  }
  
  return user
}

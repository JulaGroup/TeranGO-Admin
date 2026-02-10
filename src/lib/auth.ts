import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, Vendor } from '@/lib/types'

interface AuthState {
  user: User | null
  vendor: Vendor | null
  token: string | null
  isAuthenticated: boolean
  userRole: 'ADMIN' | 'VENDOR' | null
  login: (user: User, token: string, vendor?: Vendor) => void
  logout: () => void
  updateUser: (user: Partial<User>) => void
  updateVendor: (vendor: Partial<Vendor>) => void
  isAdmin: () => boolean
  isVendor: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      vendor: null,
      token: null,
      isAuthenticated: false,
      userRole: null,

      login: (user, token, vendor) => {
        localStorage.setItem('auth_token', token)
        localStorage.setItem('user', JSON.stringify(user))
        if (vendor) {
          localStorage.setItem('vendor', JSON.stringify(vendor))
        }
        set({
          user,
          vendor: vendor || null,
          token,
          isAuthenticated: true,
          userRole: user.role as 'ADMIN' | 'VENDOR',
        })
      },

      logout: () => {
        localStorage.removeItem('auth_token')
        localStorage.removeItem('user')
        localStorage.removeItem('vendor')
        set({
          user: null,
          vendor: null,
          token: null,
          isAuthenticated: false,
          userRole: null,
        })
      },

      updateUser: (userData) =>
        set((state) => ({
          user: state.user ? { ...state.user, ...userData } : null,
        })),

      updateVendor: (vendorData) =>
        set((state) => ({
          vendor: state.vendor ? { ...state.vendor, ...vendorData } : null,
        })),

      isAdmin: () => {
        const state = get()
        return state.user?.role === 'ADMIN'
      },

      isVendor: () => {
        const state = get()
        return state.user?.role === 'VENDOR'
      },
    }),
    {
      name: 'auth-storage',
    }
  )
)

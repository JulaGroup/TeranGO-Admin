import { api } from '@/lib/api'

export const VENDOR_PROFILE_STORAGE_KEY = 'vendor_profile'

export type VendorBusinessType = 'RESTAURANT' | 'SHOP' | 'PHARMACY'

export interface VendorBusinessBase {
  id: string
  name: string
  address?: string | null
  city?: string | null
  phone?: string | null
  description?: string | null
  email?: string | null
  imageUrl?: string | null
  acceptsOrders?: boolean | null
  isActive?: boolean | null
  minimumOrderAmount?: number | null
  openingHours?: Record<string, unknown> | null
  createdAt?: string
  updatedAt?: string
}

export interface VendorRestaurant extends VendorBusinessBase {
  type: 'RESTAURANT'
  menus?: Array<{ id: string; title: string }>
  service?: {
    id: string
    name: string
    type: string
  } | null
}

export interface VendorShop extends VendorBusinessBase {
  type: 'SHOP'
  products?: Array<{ id: string; name: string }>
  service?: {
    id: string
    name: string
    type: string
  } | null
}

export interface VendorPharmacy extends VendorBusinessBase {
  type: 'PHARMACY'
  medicines?: Array<{ id: string; name: string }>
  service?: {
    id: string
    name: string
    type: string
  } | null
}

export type VendorBusiness = VendorRestaurant | VendorShop | VendorPharmacy

export interface VendorProfileUser {
  id: string
  fullName?: string | null
  email?: string | null
  phone?: string | null
  avatarUrl?: string | null
}

export interface VendorProfile {
  id: string
  userId: string
  isActive: boolean
  createdAt?: string
  updatedAt?: string
  user?: VendorProfileUser
  restaurants: VendorRestaurant[]
  shops: VendorShop[]
  pharmacies: VendorPharmacy[]
  _count?: {
    restaurants?: number
    shops?: number
    pharmacies?: number
  }
}

const safeParse = <T>(raw: string | null): T | null => {
  if (!raw) return null
  try {
    return JSON.parse(raw) as T
  } catch (_error) {
    return null
  }
}

export const getStoredVendorProfile = (
  expectedUserId?: string
): VendorProfile | null => {
  if (typeof window === 'undefined') return null
  const cached = safeParse<{ data: VendorProfile; cachedAt: number }>(
    window.localStorage.getItem(VENDOR_PROFILE_STORAGE_KEY)
  )

  if (!cached?.data) return null

  if (expectedUserId) {
    const matchesCurrentUser =
      cached.data.userId === expectedUserId ||
      cached.data.user?.id === expectedUserId
    if (!matchesCurrentUser) {
      return null
    }
  }

  return cached.data
}

export const persistVendorProfile = (profile: VendorProfile) => {
  if (typeof window === 'undefined') return
  window.localStorage.setItem(
    VENDOR_PROFILE_STORAGE_KEY,
    JSON.stringify({ data: profile, cachedAt: Date.now() })
  )
}

export const clearVendorProfile = () => {
  if (typeof window === 'undefined') return
  window.localStorage.removeItem(VENDOR_PROFILE_STORAGE_KEY)
}

export const fetchVendorProfile = async (
  userId: string
): Promise<VendorProfile> => {
  const response = await api.get(`/api/vendors/user/${userId}`)
  const profile: VendorProfile = response.data
  persistVendorProfile(profile)
  return profile
}

import { useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  fetchVendorProfile,
  getStoredVendorProfile,
  VENDOR_PROFILE_STORAGE_KEY,
  clearVendorProfile,
  type VendorProfile,
} from '@/lib/vendor'

const getStoredUserId = (): string | undefined => {
  if (typeof window === 'undefined') return undefined
  const raw = window.localStorage.getItem('user')
  if (!raw) return undefined

  try {
    const parsed = JSON.parse(raw)
    return parsed?.id
  } catch (_error) {
    window.localStorage.removeItem('user')
    clearVendorProfile()
    return undefined
  }
}

export const VENDOR_PROFILE_QUERY_KEY = 'vendor-profile'

export function useVendorProfile() {
  const userId = useMemo(() => getStoredUserId(), [])

  const query = useQuery<VendorProfile | null>({
    queryKey: [VENDOR_PROFILE_QUERY_KEY, userId],
    queryFn: async () => {
      if (!userId) return null
      return fetchVendorProfile(userId)
    },
    enabled: Boolean(userId),
    initialData: () => (userId ? getStoredVendorProfile(userId) : null),
    staleTime: 5 * 60 * 1000,
  })

  return {
    vendor: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    refetch: query.refetch,
    error: query.error,
    status: query.status,
    userId,
    hasVendorAccess: Boolean(userId && query.data),
    storageKey: VENDOR_PROFILE_STORAGE_KEY,
  }
}

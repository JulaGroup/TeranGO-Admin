import { StrictMode } from 'react'
// Order notifications (admin)
import { useEffect } from 'react'
import ReactDOM from 'react-dom/client'
import { AxiosError } from 'axios'
import {
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from '@tanstack/react-query'
import { RouterProvider, createRouter } from '@tanstack/react-router'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { handleServerError } from '@/lib/handle-server-error'
import { DirectionProvider } from './context/direction-provider'
import { FontProvider } from './context/font-provider'
import { ThemeProvider } from './context/theme-provider'
import { useOrderNotifications } from './hooks/use-order-notifications'
// Generated Routes
import { routeTree } from './routeTree.gen'
// Styles
import './styles/index.css'

function OrderNotifications() {
  // Initialize admin socket notifications and bridge to notifications store
  const addNotification = (payload: any) => {
    // Create a readable title/body depending on payload
    const title = payload.customerName
      ? `New Order: ${payload.customerName}`
      : payload.type === 'payment_success'
        ? 'Payment Successful'
        : 'Order Notification'

    const body = payload.totalAmount
      ? `Order ${payload.orderId?.slice(-6).toUpperCase()} • D${payload.totalAmount.toFixed(2)}`
      : payload.message || `Order ${payload.orderId?.slice(-6).toUpperCase()}`

    // Add to store
    import('./stores/notification-store').then((m) => {
      m.useNotificationStore.getState().addNotification({
        title,
        body,
        data: payload,
      })
    })
  }

  useOrderNotifications({
    adminMode: true,
    enabled: true,
    onNewOrder: addNotification,
  })

  useEffect(() => {
    // placeholder - could expose connection status for UI later
  }, [])
  return null
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // eslint-disable-next-line no-console
        if (import.meta.env.DEV) console.log({ failureCount, error })

        if (failureCount >= 0 && import.meta.env.DEV) return false
        if (failureCount > 3 && import.meta.env.PROD) return false

        return !(
          error instanceof AxiosError &&
          [401, 403].includes(error.response?.status ?? 0)
        )
      },
      refetchOnWindowFocus: import.meta.env.PROD,
      staleTime: 10 * 1000, // 10s
    },
    mutations: {
      onError: (error) => {
        handleServerError(error)

        if (error instanceof AxiosError) {
          if (error.response?.status === 304) {
            toast.error('Content not modified!')
          }
        }
      },
    },
  },
  queryCache: new QueryCache({
    onError: (error) => {
      if (error instanceof AxiosError) {
        if (error.response?.status === 401) {
          toast.error('Session expired!')
          useAuthStore.getState().auth.reset()
          const redirect = `${router.history.location.href}`
          router.navigate({ to: '/sign-in', search: { redirect } })
        }
        if (error.response?.status === 500) {
          toast.error('Internal Server Error!')
          // Only navigate to error page in production to avoid disrupting HMR in development
          // Route /500 not implemented yet
          // if (import.meta.env.PROD) {
          //   router.navigate({ to: '/500' })
          // }
        }
        if (error.response?.status === 403) {
          // router.navigate("/forbidden", { replace: true });
        }
      }
    },
  }),
})

// Create a new router instance
const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: 'intent',
  defaultPreloadStaleTime: 0,
})

// Register the router instance for type safety
declare module '@tanstack/react-router' {
  interface Register {
    router: typeof router
  }
}

// Render the app
const rootElement = document.getElementById('root')!
if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement)
  root.render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <FontProvider>
            <DirectionProvider>
              <RouterProvider router={router} />
              {/* Global admin order notifications */}
              <OrderNotifications />
            </DirectionProvider>
          </FontProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </StrictMode>
  )
}

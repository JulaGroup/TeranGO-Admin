import { StrictMode } from "react";
// Order notifications (admin)
import { useEffect, useState } from "react";
import ReactDOM from "react-dom/client";
import { AxiosError } from "axios";
import {
  QueryCache,
  QueryClient,
  QueryClientProvider,
} from "@tanstack/react-query";
import { RouterProvider, createRouter } from "@tanstack/react-router";
import { toast } from "sonner";
import { useAuthStore } from "@/stores/auth-store";
import { handleServerError } from "@/lib/handle-server-error";
import { DirectionProvider } from "./context/direction-provider";
import { FontProvider } from "./context/font-provider";
import { ThemeProvider } from "./context/theme-provider";
import { useOrderNotifications } from "./hooks/use-order-notifications";
// Generated Routes
import { routeTree } from "./routeTree.gen";
// Styles
import "./styles/index.css";

/** True when localStorage holds a logged-in ADMIN's token. */
function isAdminLoggedIn(): boolean {
  try {
    const token = localStorage.getItem("auth_token");
    const userStr = localStorage.getItem("user");
    if (!token || !userStr) return false;
    const role = JSON.parse(userStr)?.role;
    return role === "ADMIN" || (Array.isArray(role) && role.includes("ADMIN"));
  } catch {
    return false;
  }
}

function OrderNotifications() {
  // Only connect the admin socket once an ADMIN is actually logged in — the
  // server refuses join_admin_room for unauthenticated/non-admin tokens, so
  // connecting earlier (e.g. on the sign-in page) would silently join
  // nothing. Re-checks after login/logout so the socket (re)connects with
  // the fresh token without needing a page refresh.
  const [adminReady, setAdminReady] = useState(isAdminLoggedIn);

  useEffect(() => {
    const refresh = () =>
      setAdminReady((prev) => {
        const next = isAdminLoggedIn();
        return prev === next ? prev : next;
      });
    // storage events cover other tabs; the interval covers login in THIS tab
    const interval = setInterval(refresh, 3000);
    window.addEventListener("storage", refresh);
    return () => {
      clearInterval(interval);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  // Initialize admin socket notifications and bridge to notifications store
  const addNotification = (payload: any) => {
    // Create a readable title/body depending on payload
    const title = payload.customerName
      ? `New Order: ${payload.customerName}`
      : payload.type === "payment_success"
        ? "Payment Successful"
        : "Order Notification";

    const body = payload.totalAmount
      ? `Order TG${payload.orderId?.slice(-4).toUpperCase()} • D${payload.totalAmount.toFixed(2)}`
      : payload.message ||
        `Order TG${payload.orderId?.slice(-4).toUpperCase()}`;

    // Add to store
    import("./stores/notification-store").then((m) => {
      m.useNotificationStore.getState().addNotification({
        title,
        body,
        data: payload,
      });
    });
  };

  useOrderNotifications({
    adminMode: true,
    enabled: adminReady,
    onNewOrder: addNotification,
  });

  return null;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: (failureCount, error) => {
        // eslint-disable-next-line no-console
        if (import.meta.env.DEV) console.log({ failureCount, error });

        if (failureCount >= 0 && import.meta.env.DEV) return false;
        if (failureCount > 3 && import.meta.env.PROD) return false;

        return !(
          error instanceof AxiosError &&
          [401, 403].includes(error.response?.status ?? 0)
        );
      },
      refetchOnWindowFocus: import.meta.env.PROD,
      staleTime: 10 * 1000, // 10s
    },
    mutations: {
      onError: (error) => {
        handleServerError(error);

        if (error instanceof AxiosError) {
          if (error.response?.status === 304) {
            toast.error("Content not modified!");
          }
        }
      },
    },
  },
  queryCache: new QueryCache({
    onError: (error) => {
      if (error instanceof AxiosError) {
        if (error.response?.status === 401) {
          toast.error("Session expired!");
          useAuthStore.getState().auth.reset();
          const redirect = `${router.history.location.href}`;
          router.navigate({ to: "/sign-in", search: { redirect } });
        }
        if (error.response?.status === 500) {
          toast.error("Internal Server Error!");
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
});

// Create a new router instance
const router = createRouter({
  routeTree,
  context: { queryClient },
  defaultPreload: "intent",
  defaultPreloadStaleTime: 0,
});

// Register the router instance for type safety
declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}

// Render the app
const rootElement = document.getElementById("root")!;
if (!rootElement.innerHTML) {
  const root = ReactDOM.createRoot(rootElement);
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
    </StrictMode>,
  );
}

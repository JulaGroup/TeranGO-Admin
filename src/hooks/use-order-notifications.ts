import {
  useEffect,
  useRef,
  useCallback,
  useState,
  useSyncExternalStore,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { io } from "socket.io-client";
import type { Socket } from "socket.io-client";
import { toast } from "sonner";

const SOCKET_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

// ── Shared connection status ─────────────────────────────────────────────
// Lets any page render a "Live" indicator without mounting its own socket
// (the socket itself is mounted once, e.g. in the vendor/admin layout).
let sharedConnected = false;
const connectionListeners = new Set<() => void>();

function publishConnected(value: boolean) {
  if (sharedConnected === value) return;
  sharedConnected = value;
  connectionListeners.forEach((fn) => fn());
}

export function useOrderSocketConnected(): boolean {
  return useSyncExternalStore(
    (onStoreChange) => {
      connectionListeners.add(onStoreChange);
      return () => connectionListeners.delete(onStoreChange);
    },
    () => sharedConnected,
  );
}

interface OrderNotification {
  id: string;
  customerName: string;
  totalAmount: number;
  itemCount: number;
  order?: unknown;
}

interface UseOrderNotificationsOptions {
  vendorId?: string;
  adminMode?: boolean; // Add admin mode flag
  enabled?: boolean;
  onNewOrder?: (order: OrderNotification) => void;
}

type OrderCreatedPayload = {
  orderId: string;
  customerName?: string;
  totalAmount?: number;
  itemCount?: number;
  order?: unknown;
};

export function useOrderNotifications({
  vendorId,
  adminMode = false,
  enabled = true,
  onNewOrder,
}: UseOrderNotificationsOptions) {
  const socketRef = useRef<Socket | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const connectErrorNotified = useRef(false);
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);

  // Initialize audio with base64 notification sound (no external file needed)
  useEffect(() => {
    audioRef.current = new Audio();
    // Simple notification beep sound
    // (unlocked on first user gesture below — see the "unlock" effect)
    audioRef.current.src =
      "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZSA0PVqzn77BdGAU+ltrywnAjBSlzy/DejD4IElyv6O2nVBELTKXh8bllHAU2kNXzzn0pBSh+zPDZijoHGGS66+ObTQ8MUKjk8LVjHQU4jtXy0IEzBiF0yO/ilkYLFWO16+ylVxIJSqDi8rdnHgU0j9Tz1IAsBx9xwu/nmkoODlOr5O+zYxwFOZHX8s16LAUpds3w3Ik5BxpnvOzim0oODlCp4/C1Yx0FOI7V8tCBMwYhdMjv4pZGCxVjtevspVcSCUqg4vK3Zx4FNI/U89SBLAcfccLv5ppKDg5Tq+TvsmQcBTmP1/LNeitFKnbM8N2JOQcaZ7zr4ptKDg5QqezvtWMcBTiO1fLQgTMGIXTI7+KWRgsVY7Xr7KVXEglKoOLyt2ceBTSP1PPUgCwHH3HC7+abSg0PUqvk77JkHAU5j9fyzXosRSt1y+/dijsHG2a76+OaSQ0PUKjk7rVjHAU4jtXy0IEzBiF0yO/ilkYLFWO16+ylVxIJSqDi8rdnHgU0j9Tz1IAsAh9xwu/mm0oND1Kr5O+yZBwFOY/X8s16LEUrdcvv3Yo7Bxtmu+vjmkkND1Co5O61YxwFOI7V8tCBMwYhdMjv4pZGCxVjtevspVcSCUqg4vK3Zx4FNI/U89SALAYfccLv5ptKDQ9Sq+TvsmQcBTmP1/LNeiyFKnTL7+aaSw8OUKfk7rRkHAU4jtXy0IEzBiF0yO/ilkYLFWO16+ylVxIJSqDi8rdnHgU0j9Tz1IAsAh9xwu/mm0oND1Kr5O+yZBwFOY/X8s16LEUpdcvv3Yo7Bxtmu+vjmkkND1Co5O61YxwFOI7V8tCBMwYhdMjv4pZGCxVjtevspVcSCUqg4vK3Zx4FNI/U89SALAYfccLv5ptKDQ9Sq+TvsmQcBTmP1/LNeiyFKnTL792KOwcbZrvr45pJDQ9QqOTutWMcBTiO1fLQgTMGIXTI7+KWRgsVY7Xr7KVXEglKoOLyt2ceBTSP1PPUgCwGH3HC7+abSg0PUqvk77JkHAU5j9fyzXosRSl0y+/dijsHG2a76+OaSQ0PUKjk7rRkHAU4jtXy0IEzBiF0yO/ilkYLFWO16+ylVxIJSqDi8rdnHgU0j9Tz1IAsAh9xwu/mm0oND1Kr5O+yZBwFOY/X8s16LIUqdMvv3Yo7Bxtmu+vjmkkND1Co5O61YxwFOI7V8tCBMwYhdMjv4pZGCxVjtevspVcSCUqg4vK3Zx4FNI/U89SALAYfccLv5ptKDQ9Sq+TvsmQcBTmP1/LNeiyFKnTL792KOwcbZrvr45pJDQ9QqOTutWMcBTiO1fLQgTMGIXTI7+KWRgsVY7Xr7KVXEglKoOLyt2ceBTSP1PPUgCwGH3HC7+abSg0PUqvk77JkHAU5j9fyzXosBSh0y+/dijsHG2a76+OaSQ0PUKjk7rVjHAU=";
    audioRef.current.volume = 0.7;
  }, []);

  // Unlock audio on the first user gesture. Browsers block audio.play()
  // until the user has interacted with the page — without this, an admin who
  // opens the dashboard and never clicks would get NO sound for new orders.
  // Playing (muted) inside a real gesture handler permanently unlocks the
  // element for later programmatic plays.
  useEffect(() => {
    const unlock = () => {
      const audio = audioRef.current;
      if (!audio) return;
      audio.muted = true;
      audio
        .play()
        .then(() => {
          audio.pause();
          audio.currentTime = 0;
          audio.muted = false;
        })
        .catch(() => {
          audio.muted = false;
        });
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };

    window.addEventListener("pointerdown", unlock);
    window.addEventListener("keydown", unlock);
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, []);

  const playNotificationSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch((e) => {
        // Autoplay blocked (no user interaction yet) — the browser
        // notification below still alerts the admin visually/via OS sound
        console.warn("[notifications] sound blocked by browser:", e?.name);
      });
    }
  }, []);

  const showOrderToast = useCallback((orderData: OrderNotification) => {
    toast.success("🔔 New Order Received!", {
      description: `Order from ${orderData.customerName} • ${orderData.itemCount} items • D${orderData.totalAmount.toFixed(2)}`,
      duration: 8000,
      action: {
        label: "View",
        onClick: () => {
          // Navigate to order details
        },
      },
    });
  }, []);

  useEffect(() => {
    if (!enabled || (!vendorId && !adminMode)) {
      return;
    }

    const authToken = localStorage.getItem("auth_token") || "";

    // Proactively request browser notification permission (admin AND vendor)
    if (
      (adminMode || vendorId) &&
      typeof window !== "undefined" &&
      "Notification" in window
    ) {
      try {
        if (Notification.permission !== "granted") {
          Notification.requestPermission().catch(() => {});
        }
      } catch {
        // ignore
      }
    }

    // Helper: Browser notification helper for admin
    const showBrowserNotification = (
      title: string,
      body: string,
      data?: Record<string, unknown>,
    ) => {
      try {
        if (typeof window === "undefined" || !("Notification" in window))
          return;
        if (Notification.permission !== "granted") return;
        const n = new Notification(title, {
          body,
          tag:
            ((data as Record<string, unknown>)?.tag as string | undefined) ||
            undefined,
          data,
        });
        n.onclick = () => {
          window.focus();
          n.close();
        };
        setTimeout(() => n.close(), 6000);
      } catch {
        // Ignore notification errors silently
      }
    };

    // IMPORTANT: WebSocket-only transport.
    // DigitalOcean App Platform (and most cloud hosts) run multiple
    // app instances without sticky sessions. With polling, the first
    // GET establishes a session on instance A, but the next POST can
    // hit instance B which returns 400 "Unknown sid" — causing a
    // reconnect storm. WebSocket is a single persistent TCP connection
    // to ONE instance, so session mismatch can't happen. DO supports WS.
    const socket = io(SOCKET_URL, {
      transports: ["websocket"],
      reconnection: true,
      reconnectionDelay: 3000,
      reconnectionDelayMax: 30000,
      reconnectionAttempts: Infinity, // dashboards are long-lived — never give up
      timeout: 20000,
      auth: authToken ? { token: authToken } : undefined,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      publishConnected(true);
      connectErrorNotified.current = false;

      if (adminMode) {
        // Join admin room for global notifications
        socket.emit("join_admin_room");
      } else if (vendorId) {
        // Join vendor room (match server event name)
        socket.emit("join_vendor_room", vendorId);
      }
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
      publishConnected(false);
    });

    socket.on("connect_error", (err) => {
      setIsConnected(false);
      publishConnected(false);
      // Surface the failure once instead of silently living without
      // real-time notifications (e.g. Socket.IO CORS or server down)
      if (!connectErrorNotified.current) {
        connectErrorNotified.current = true;
        console.error(
          "[notifications] Socket connection failed — real-time alerts are OFF:",
          err?.message || err,
        );
        toast.warning("Real-time notifications unavailable", {
          description:
            "Could not connect to the notification server. New orders will not alert until this reconnects.",
          duration: 10000,
        });
      }
    });

    // Listen for new orders (vendor and admin events)
    const handleNewOrder = (orderData: OrderNotification) => {
      // Play notification sound
      playNotificationSound();

      // Show toast notification
      showOrderToast(orderData);

      // Browser notification — for admins AND vendors, so a new order is
      // audible/visible even when the dashboard tab isn't focused
      showBrowserNotification(
        "🔔 New Order Received",
        `Order from ${orderData.customerName} • ${orderData.itemCount} items • D${orderData.totalAmount.toFixed(2)}`,
        { orderId: orderData.id, type: "new_order" },
      );

      if (adminMode) {
        // Add notification to store (non-blocking)
        import("@/stores/notification-store").then((m) =>
          m.useNotificationStore.getState().addNotification({
            title: `New Order: ${orderData.customerName}`,
            body: `Order ${orderData.id.slice(-6).toUpperCase()} • D${orderData.totalAmount.toFixed(2)}`,
            data: orderData as unknown as Record<string, unknown>,
          }),
        );
      }

      // Invalidate orders query to refresh the list
      queryClient.invalidateQueries({ queryKey: ["vendor-orders"] });
      queryClient.invalidateQueries({ queryKey: ["terango-store-orders"] });

      // Call custom handler
      onNewOrder?.(orderData);
    };

    socket.on("new_order", handleNewOrder);
    socket.on("new-order", handleNewOrder); // support server hyphenated event
    socket.on("orderCreated", (data: OrderCreatedPayload) =>
      handleNewOrder({
        id: data.orderId,
        customerName: data.customerName || "Customer",
        totalAmount: data.totalAmount || 0,
        itemCount: data.itemCount || 0,
        order: data.order,
      }),
    );

    // Listen for order status changes
    const handleStatusChange = (orderData: {
      orderId?: string;
      status: string;
    }) => {
      // Refresh orders
      queryClient.invalidateQueries({ queryKey: ["vendor-orders"] });
      queryClient.invalidateQueries({ queryKey: ["terango-store-orders"] });

      toast.info("Order status updated", {
        description: `Order #${orderData.orderId?.slice(-6).toUpperCase()} status changed to ${orderData.status}`,
      });

      // Browser notification for admins
      if (adminMode && orderData.orderId) {
        showBrowserNotification(
          "Order status updated",
          `Order #${orderData.orderId!.slice(-6).toUpperCase()} is now ${orderData.status}`,
          { orderId: orderData.orderId, status: orderData.status },
        );

        // Add to notification store
        import("@/stores/notification-store").then((m) =>
          m.useNotificationStore.getState().addNotification({
            title: `Order ${orderData.orderId!.slice(-6).toUpperCase()} ${orderData.status}`,
            body: `Order ${orderData.orderId!.slice(-6).toUpperCase()} is now ${orderData.status}`,
            data: orderData,
          }),
        );
      }
    };

    socket.on("order_status_changed", handleStatusChange);
    socket.on("order-status-changed", handleStatusChange); // support alternate naming
    socket.on(
      "new_order_update",
      (orderData: {
        orderId?: string;
        status: string;
        customerName?: string;
      }) => {
        // Play notification sound
        playNotificationSound();

        // Show toast
        toast.success("Order Updated", {
          description: `${orderData.customerName ?? "Customer"}'s order is now ${orderData.status}`,
          duration: 5000,
        });

        // Browser notification for admins
        if (adminMode) {
          showBrowserNotification(
            "Order Updated",
            `${orderData.customerName ?? "Customer"}'s order is now ${orderData.status}`,
            { orderId: orderData.orderId, status: orderData.status },
          );

          // Add to notification store
          import("@/stores/notification-store").then((m) =>
            m.useNotificationStore.getState().addNotification({
              title: `Order ${orderData.orderId?.slice(-6).toUpperCase()} ${orderData.status}`,
              body: `${orderData.customerName ?? "Customer"}'s order is now ${orderData.status}`,
              data: orderData,
            }),
          );
        }

        // Refresh queries
        queryClient.invalidateQueries({ queryKey: ["terango-store-orders"] });
        queryClient.invalidateQueries({
          queryKey: ["terango-store-dashboard"],
        });
      },
    );

    // Listen for orderStatusUpdate (server uses this event name — also covers DISPATCHED, DELIVERED, PROCESSING)
    socket.on(
      "orderStatusUpdate",
      (data: {
        orderId?: string;
        status: string;
        customerName?: string;
        driverName?: string;
        paymentId?: string;
      }) => {
        queryClient.invalidateQueries({ queryKey: ["terango-store-orders"] });
        queryClient.invalidateQueries({ queryKey: ["vendor-orders"] });

        if (!adminMode) return;

        const statusEmojis: Record<string, string> = {
          DELIVERED: "🎉",
          DISPATCHED: "🚀",
          PROCESSING: "💳",
          PREPARING: "👨‍🍳",
          READY: "📦",
          CANCELLED: "❌",
        };
        const emoji = statusEmojis[data.status] ?? "🔄";
        const statusLabel =
          data.status.charAt(0) + data.status.slice(1).toLowerCase();

        playNotificationSound();
        toast.success(`${emoji} Order ${statusLabel}`, {
          description: `Order #${data.orderId?.slice(-6).toUpperCase()}${data.customerName ? ` — ${data.customerName}` : ""}${data.driverName ? ` · Driver: ${data.driverName}` : ""}`,
          duration: 7000,
        });
        showBrowserNotification(
          `${emoji} Order ${statusLabel}`,
          `Order #${data.orderId?.slice(-6).toUpperCase()}${data.customerName ? ` — ${data.customerName}` : ""}`,
          { orderId: data.orderId, status: data.status },
        );
        import("@/stores/notification-store").then((m) =>
          m.useNotificationStore.getState().addNotification({
            title: `${emoji} Order ${statusLabel}${data.status === "DELIVERED" ? " ✔" : ""}`,
            body: `Order #${data.orderId?.slice(-6).toUpperCase()}${data.customerName ? ` — ${data.customerName}` : ""}`,
            data: data as unknown as Record<string, unknown>,
          }),
        );
      },
    );

    // Listen for payment success
    socket.on(
      "paymentSuccess",
      (data: {
        paymentId?: string;
        orderId?: string;
        amount?: number;
        currency?: string;
      }) => {
        queryClient.invalidateQueries({ queryKey: ["terango-store-orders"] });

        if (!adminMode) return;

        playNotificationSound();
        const amountStr = data.amount
          ? ` · D${data.amount}${data.currency ? ` ${data.currency}` : ""}`
          : "";
        toast.success("💳 Payment Received!", {
          description: `Order #${data.orderId?.slice(-6).toUpperCase() ?? "—"}${amountStr}`,
          duration: 7000,
        });
        showBrowserNotification(
          "💳 Payment Received",
          `Order #${data.orderId?.slice(-6).toUpperCase() ?? "—"}${amountStr}`,
          { orderId: data.orderId, type: "payment_success" },
        );
        import("@/stores/notification-store").then((m) =>
          m.useNotificationStore.getState().addNotification({
            title: "💳 Payment Received",
            body: `Order #${data.orderId?.slice(-6).toUpperCase() ?? "—"}${amountStr}`,
            data: data as unknown as Record<string, unknown>,
          }),
        );
      },
    );

    // Listen for new user registrations
    socket.on(
      "newUserRegistered",
      (data: { phone?: string; createdAt?: string }) => {
        if (!adminMode) return;

        playNotificationSound();
        toast.info("👤 New User Registered", {
          description: `Phone: ${data.phone ?? "Unknown"}`,
          duration: 6000,
        });
        showBrowserNotification(
          "👤 New User Registered",
          `Phone: ${data.phone ?? "Unknown"}`,
          { type: "new_user" },
        );
        import("@/stores/notification-store").then((m) =>
          m.useNotificationStore.getState().addNotification({
            title: "👤 New User Registered",
            body: `Phone: ${data.phone ?? "Unknown"}`,
            data: data as unknown as Record<string, unknown>,
          }),
        );
      },
    );

    // Listen for settlement/payout requests (driver or vendor)
    socket.on(
      "settlementRequest",
      (data: {
        type: "driver" | "vendor";
        settlementId: string;
        driverName?: string;
        vendorName?: string;
        amount: number;
        createdAt?: string;
      }) => {
        if (!adminMode) return;

        const isDriver = data.type === "driver";
        const name = isDriver ? data.driverName : data.vendorName;
        const emoji = isDriver ? "🏎️" : "💸";
        const label = isDriver ? "Driver" : "Vendor";

        playNotificationSound();
        toast.warning(`${emoji} ${label} Payout Request`, {
          description: `${name ?? label} requested D${data.amount.toFixed(2)}`,
          duration: 9000,
          action: {
            label: "View",
            onClick: () => {
              window.location.href = isDriver
                ? "/admin/driver-settlements"
                : "/admin/vendor-settlements";
            },
          },
        });
        showBrowserNotification(
          `${emoji} ${label} Payout Request`,
          `${name ?? label} requested D${data.amount.toFixed(2)}`,
          { settlementId: data.settlementId, type: "settlement" },
        );
        import("@/stores/notification-store").then((m) =>
          m.useNotificationStore.getState().addNotification({
            title: `${emoji} ${label} Payout Request`,
            body: `${name ?? label} requested D${data.amount.toFixed(2)}`,
            data: data as unknown as Record<string, unknown>,
          }),
        );
      },
    );

    // Listen for express delivery payment updates
    socket.on(
      "express-payment-update",
      (data: { deliveryId?: string; status?: string; amount?: number }) => {
        if (!adminMode) return;

        queryClient.invalidateQueries({ queryKey: ["express-deliveries"] });

        const statusLabel = data.status ?? "Updated";
        playNotificationSound();
        toast.info(`🚚 Express Delivery ${statusLabel}`, {
          description: `Delivery #${data.deliveryId?.slice(-6).toUpperCase() ?? "—"}${data.amount ? ` · D${data.amount}` : ""}`,
          duration: 7000,
        });
        showBrowserNotification(
          `🚚 Express Delivery ${statusLabel}`,
          `Delivery #${data.deliveryId?.slice(-6).toUpperCase() ?? "—"}`,
          { deliveryId: data.deliveryId, type: "express_delivery" },
        );
        import("@/stores/notification-store").then((m) =>
          m.useNotificationStore.getState().addNotification({
            title: `🚚 Express Delivery ${statusLabel}`,
            body: `Delivery #${data.deliveryId?.slice(-6).toUpperCase() ?? "—"}${data.amount ? ` · D${data.amount}` : ""}`,
            data: data as unknown as Record<string, unknown>,
          }),
        );
      },
    );

    // Listen for payment failures (server emits from payment webhooks)
    socket.on(
      "paymentFailed",
      (data: {
        paymentId?: string;
        orderId?: string;
        amount?: number;
        currency?: string;
        paymentProvider?: string;
      }) => {
        if (!adminMode) return;

        playNotificationSound();
        const ref = data.orderId?.slice(-6).toUpperCase() ?? "—";
        toast.error("❌ Payment Failed", {
          description: `Order #${ref}${data.amount ? ` · D${data.amount}` : ""}${data.paymentProvider ? ` · ${data.paymentProvider}` : ""}`,
          duration: 10000,
        });
        showBrowserNotification("❌ Payment Failed", `Order #${ref}`, {
          orderId: data.orderId,
          type: "payment_failed",
        });
        import("@/stores/notification-store").then((m) =>
          m.useNotificationStore.getState().addNotification({
            title: "❌ Payment Failed",
            body: `Order #${ref}${data.amount ? ` · D${data.amount}` : ""}`,
            data: data as unknown as Record<string, unknown>,
          }),
        );
      },
    );

    // Listen for order cancellations (customer/vendor/admin initiated)
    socket.on(
      "order_cancelled",
      (data: {
        orderId?: string;
        orderRef?: string;
        customerName?: string;
        vendorName?: string;
        totalAmount?: number;
        wasPaid?: boolean;
        reason?: string | null;
      }) => {
        if (!adminMode) return;

        queryClient.invalidateQueries({ queryKey: ["admin-orders"] });

        playNotificationSound();
        const ref = data.orderRef || data.orderId?.slice(-6).toUpperCase() || "—";
        const refundNote = data.wasPaid ? " · PAID — refund needed" : "";
        toast.error("🚫 Order Cancelled", {
          description: `#${ref}${data.vendorName ? ` · ${data.vendorName}` : ""}${refundNote}`,
          duration: 10000,
        });
        showBrowserNotification(
          "🚫 Order Cancelled",
          `#${ref}${data.customerName ? ` — ${data.customerName}` : ""}${refundNote}`,
          { orderId: data.orderId, type: "order_cancelled" },
        );
        import("@/stores/notification-store").then((m) =>
          m.useNotificationStore.getState().addNotification({
            title: "🚫 Order Cancelled",
            body: `#${ref}${data.vendorName ? ` · ${data.vendorName}` : ""}${refundNote}${data.reason ? ` · ${data.reason}` : ""}`,
            data: data as unknown as Record<string, unknown>,
          }),
        );
      },
    );

    // Listen for settlement approve/reject decisions (driver or vendor)
    socket.on(
      "settlement_decision",
      (data: {
        kind?: "driver" | "vendor";
        settlementId?: string;
        driverName?: string;
        vendorName?: string;
        amount?: number;
        decision?: "APPROVED" | "REJECTED";
        notes?: string | null;
      }) => {
        if (!adminMode) return;

        const approved = data.decision === "APPROVED";
        const name = data.driverName || data.vendorName || "—";
        const label = data.kind === "driver" ? "Driver" : "Vendor";
        const title = `${approved ? "💰" : "🚫"} ${label} Settlement ${approved ? "Approved" : "Rejected"}`;
        const body = `${name} · D${data.amount?.toFixed?.(2) ?? data.amount ?? "—"}`;

        playNotificationSound();
        (approved ? toast.success : toast.warning)(title, {
          description: body,
          duration: 8000,
        });
        showBrowserNotification(title, body, {
          settlementId: data.settlementId,
          type: "settlement_decision",
        });
        import("@/stores/notification-store").then((m) =>
          m.useNotificationStore.getState().addNotification({
            title,
            body,
            data: data as unknown as Record<string, unknown>,
          }),
        );
      },
    );

    // Vendor: Listen for settlement approval/confirmation
    socket.on(
      "settlementApproved",
      (data: { settlementId?: string; amount?: number; status?: string }) => {
        if (!vendorId || adminMode) return;

        queryClient.invalidateQueries({
          queryKey: ["vendor-settlements"],
        });

        playNotificationSound();
        toast.success(`✅ Payout Approved`, {
          description: `Your payout of D${data.amount?.toFixed(2) ?? "—"} has been approved`,
          duration: 8000,
        });
        showBrowserNotification(
          `✅ Payout Approved`,
          `Your payout of D${data.amount?.toFixed(2) ?? "—"} has been approved`,
          { settlementId: data.settlementId, type: "settlement_approved" },
        );
        import("@/stores/notification-store").then((m) =>
          m.useNotificationStore.getState().addNotification({
            title: "✅ Payout Approved",
            body: `D${data.amount?.toFixed(2) ?? "—"} approved for payout`,
            data: data as unknown as Record<string, unknown>,
          }),
        );
      },
    );

    // Vendor: Listen for settlement rejection
    socket.on(
      "settlementRejected",
      (data: { settlementId?: string; reason?: string }) => {
        if (!vendorId || adminMode) return;

        queryClient.invalidateQueries({
          queryKey: ["vendor-settlements"],
        });

        playNotificationSound();
        toast.error(`❌ Payout Rejected`, {
          description: `Your payout request was rejected${data.reason ? `: ${data.reason}` : ""}`,
          duration: 8000,
        });
        showBrowserNotification(
          `❌ Payout Rejected`,
          `Your payout request was rejected`,
          { settlementId: data.settlementId, type: "settlement_rejected" },
        );
        import("@/stores/notification-store").then((m) =>
          m.useNotificationStore.getState().addNotification({
            title: "❌ Payout Rejected",
            body: `Payout request rejected${data.reason ? `: ${data.reason}` : ""}`,
            data: data as unknown as Record<string, unknown>,
          }),
        );
      },
    );

    // Cleanup on unmount
    return () => {
      if (adminMode) {
        socket.emit("leave_admin_room");
      } else if (vendorId) {
        socket.emit("leave_vendor_room", vendorId);
      }
      socket.disconnect();
      setIsConnected(false);
    };
  }, [
    vendorId,
    adminMode,
    enabled,
    playNotificationSound,
    showOrderToast,
    onNewOrder,
    queryClient,
  ]);

  return {
    isConnected,
  };
}

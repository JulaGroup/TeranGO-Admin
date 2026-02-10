import { useEffect, useRef, useCallback, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { io } from "socket.io-client";
import type { Socket } from "socket.io-client";
import { toast } from "sonner";

const SOCKET_URL = import.meta.env.VITE_API_URL || "http://localhost:8080";

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
  const queryClient = useQueryClient();
  const [isConnected, setIsConnected] = useState(false);

  // Initialize audio with base64 notification sound (no external file needed)
  useEffect(() => {
    audioRef.current = new Audio();
    // Simple notification beep sound
    audioRef.current.src =
      "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZSA0PVqzn77BdGAU+ltrywnAjBSlzy/DejD4IElyv6O2nVBELTKXh8bllHAU2kNXzzn0pBSh+zPDZijoHGGS66+ObTQ8MUKjk8LVjHQU4jtXy0IEzBiF0yO/ilkYLFWO16+ylVxIJSqDi8rdnHgU0j9Tz1IAsBx9xwu/nmkoODlOr5O+zYxwFOZHX8s16LAUpds3w3Ik5BxpnvOzim0oODlCp4/C1Yx0FOI7V8tCBMwYhdMjv4pZGCxVjtevspVcSCUqg4vK3Zx4FNI/U89SBLAcfccLv5ppKDg5Tq+TvsmQcBTmP1/LNeitFKnbM8N2JOQcaZ7zr4ptKDg5QqezvtWMcBTiO1fLQgTMGIXTI7+KWRgsVY7Xr7KVXEglKoOLyt2ceBTSP1PPUgCwHH3HC7+abSg0PUqvk77JkHAU5j9fyzXosRSt1y+/dijsHG2a76+OaSQ0PUKjk7rVjHAU4jtXy0IEzBiF0yO/ilkYLFWO16+ylVxIJSqDi8rdnHgU0j9Tz1IAsAh9xwu/mm0oND1Kr5O+yZBwFOY/X8s16LEUrdcvv3Yo7Bxtmu+vjmkkND1Co5O61YxwFOI7V8tCBMwYhdMjv4pZGCxVjtevspVcSCUqg4vK3Zx4FNI/U89SALAYfccLv5ptKDQ9Sq+TvsmQcBTmP1/LNeiyFKnTL7+aaSw8OUKfk7rRkHAU4jtXy0IEzBiF0yO/ilkYLFWO16+ylVxIJSqDi8rdnHgU0j9Tz1IAsAh9xwu/mm0oND1Kr5O+yZBwFOY/X8s16LEUpdcvv3Yo7Bxtmu+vjmkkND1Co5O61YxwFOI7V8tCBMwYhdMjv4pZGCxVjtevspVcSCUqg4vK3Zx4FNI/U89SALAYfccLv5ptKDQ9Sq+TvsmQcBTmP1/LNeiyFKnTL792KOwcbZrvr45pJDQ9QqOTutWMcBTiO1fLQgTMGIXTI7+KWRgsVY7Xr7KVXEglKoOLyt2ceBTSP1PPUgCwGH3HC7+abSg0PUqvk77JkHAU5j9fyzXosRSl0y+/dijsHG2a76+OaSQ0PUKjk7rRkHAU4jtXy0IEzBiF0yO/ilkYLFWO16+ylVxIJSqDi8rdnHgU0j9Tz1IAsAh9xwu/mm0oND1Kr5O+yZBwFOY/X8s16LIUqdMvv3Yo7Bxtmu+vjmkkND1Co5O61YxwFOI7V8tCBMwYhdMjv4pZGCxVjtevspVcSCUqg4vK3Zx4FNI/U89SALAYfccLv5ptKDQ9Sq+TvsmQcBTmP1/LNeiyFKnTL792KOwcbZrvr45pJDQ9QqOTutWMcBTiO1fLQgTMGIXTI7+KWRgsVY7Xr7KVXEglKoOLyt2ceBTSP1PPUgCwGH3HC7+abSg0PUqvk77JkHAU5j9fyzXosBSh0y+/dijsHG2a76+OaSQ0PUKjk7rVjHAU=";
    audioRef.current.volume = 0.7;
  }, []);

  const playNotificationSound = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => {
        // Silently handle autoplay restrictions
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

    // Helper: Browser notification helper for admin
    const requestBrowserNotificationPermission = async () => {
      try {
        if (typeof window !== "undefined" && "Notification" in window) {
          if (Notification.permission === "default") {
            await Notification.requestPermission();
          }
        }
      } catch (_e) {
        // ignore
      }
    };

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

    // Initialize socket connection
    const socket = io(SOCKET_URL, {
      transports: ["websocket", "polling"],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);

      if (adminMode) {
        // Join admin room for global notifications
        socket.emit("join_admin_room");
        // Request browser notification permission for admins
        void requestBrowserNotificationPermission();
      } else if (vendorId) {
        // Join vendor room (match server event name)
        socket.emit("join_vendor_room", vendorId);
      }
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    socket.on("connect_error", () => {
      setIsConnected(false);
    });

    // Listen for new orders (vendor and admin events)
    const handleNewOrder = (orderData: OrderNotification) => {
      // Play notification sound
      playNotificationSound();

      // Show toast notification
      showOrderToast(orderData);

      // Browser notification for admins
      if (adminMode) {
        showBrowserNotification(
          "🔔 New Order Received",
          `Order from ${orderData.customerName} • ${orderData.itemCount} items • D${orderData.totalAmount.toFixed(2)}`,
          { orderId: orderData.id, type: "new_order" },
        );

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

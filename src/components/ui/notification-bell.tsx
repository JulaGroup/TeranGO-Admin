import { useNavigate } from "@tanstack/react-router";
import { Bell, BellOff } from "lucide-react";
import { useNotificationStore } from "@/stores/notification-store";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
} from "@/components/ui/dropdown-menu";
import { useState, useEffect } from "react";

export default function NotificationBell() {
  const allNotifications = useNotificationStore((s) => s.notifications);
  const markRead = useNotificationStore((s) => s.markRead);
  const markAllRead = useNotificationStore((s) => s.markAllRead);

  const unread = allNotifications.filter((n) => !n.read).length;
  const notifications = allNotifications.slice(0, 6);
  const navigate = useNavigate();

  // Track browser notification permission state
  const [notifPermission, setNotifPermission] =
    useState<NotificationPermission>(
      typeof window !== "undefined" && "Notification" in window
        ? Notification.permission
        : "denied",
    );

  useEffect(() => {
    if (!("Notification" in window)) return;
    setNotifPermission(Notification.permission);
  }, []);

  const handleEnableNotifications = async () => {
    if (!("Notification" in window)) return;
    const result = await Notification.requestPermission();
    setNotifPermission(result);
    if (result === "granted") {
      // Play a test sound to unblock autoplay and confirm it works
      try {
        const audio = new Audio(
          "data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBTGH0fPTgjMGHm7A7+OZSA0PVqzn77BdGAU+ltrywnAjBSlzy/DejD4IElyv6O2nVBELTKXh8bllHAU2kNXzzn0pBSh+zPDZijoHGGS66+ObTQ8MUKjk8LVjHQU4jtXy0IEzBiF0yO/ilkYLFWO16+ylVxIJSqDi8rdnHgU0j9Tz1IAsBx9xwu/nmkoODlOr5O+zYxwFOZHX8s16LAUpds3w3Ik5BxpnvOzim0oODlCp4/C1Yx0FOI7V8tCBMwYhdMjv4pZGCxVjtevspVcSCUqg4vK3Zx4FNI/U89SBLAcfccLv5ppKDg5Tq+TvsmQcBTmP1/LNeitFKnbM8N2JOQcaZ7zr4ptKDg5QqezvtWMcBTiO1fLQgTMGIXTI7+KWRgsVY7Xr7KVXEglKoOLyt2ceBTSP1PPUgCwHH3HC7+abSg0PUqvk77JkHAU5j9fyzXosRSt1y+/dijsHG2a76+OaSQ0PUKjk7rVjHAU4jtXy0IEzBiF0yO/ilkYLFWO16+ylVxIJSqDi8rdnHgU0j9Tz1IAsAh9xwu/mm0oND1Kr5O+yZBwFOY/X8s16LEUrdcvv3Yo7Bxtmu+vjmkkND1Co5O61YxwFOI7V8tCBMwYhdMjv4pZGCxVjtevspVcSCUqg4vK3Zx4FNI/U89SALAYfccLv5ptKDQ9Sq+TvsmQcBTmP1/LNeiyFKnTL7+aaSw8OUKfk7rRkHAU4jtXy0IEzBiF0yO/ilkYLFWO16+ylVxIJSqDi8rdnHgU0j9Tz1IAsAh9xwu/mm0oND1Kr5O+yZBwFOY/X8s16LEUpdcvv3Yo7Bxtmu+vjmkkND1Co5O61YxwFOI7V8tCBMwYhdMjv4pZGCxVjtevspVcSCUqg4vK3Zx4FNI/U89SALAYfccLv5ptKDQ9Sq+TvsmQcBTmP1/LNeiyFKnTL792KOwcbZrvr45pJDQ9QqOTutWMcBTiO1fLQgTMGIXTI7+KWRgsVY7Xr7KVXEglKoOLyt2ceBTSP1PPUgCwGH3HC7+abSg0PUqvk77JkHAU5j9fyzXosRSl0y+/dijsHG2a76+OaSQ0PUKjk7rRkHAU4jtXy0IEzBiF0yO/ilkYLFWO16+ylVxIJSqDi8rdnHgU0j9Tz1IAsAh9xwu/mm0oND1Kr5O+yZBwFOY/X8s16LIUqdMvv3Yo7Bxtmu+vjmkkND1Co5O61YxwFOI7V8tCBMwYhdMjv4pZGCxVjtevspVcSCUqg4vK3Zx4FNI/U89SALAYfccLv5ptKDQ9Sq+TvsmQcBTmP1/LNeiyFKnTL792KOwcbZrvr45pJDQ9QqOTutWMcBTiO1fLQgTMGIXTI7+KWRgsVY7Xr7KVXEglKoOLyt2ceBTSP1PPUgCwGH3HC7+abSg0PUqvk77JkHAU5j9fyzXosBSh0y+/dijsHG2a76+OaSQ0PUKjk7rVjHAU=",
        );
        audio.volume = 0.5;
        audio.play().catch(() => {});
      } catch {}
      new Notification("✅ TeranGO Admin Notifications", {
        body: "You will now receive real-time alerts for orders, payments, and settlements.",
      });
    }
  };

  return (
    <>
      {/* Banner shown when permission not yet granted */}
      {notifPermission === "default" && (
        <div className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between bg-orange-500 px-4 py-2 text-white shadow-lg">
          <span className="text-sm font-medium">
            🔔 Enable browser notifications to get real-time alerts for orders,
            payments & settlements
          </span>
          <button
            onClick={handleEnableNotifications}
            className="ml-4 rounded bg-white px-3 py-1 text-xs font-semibold text-orange-600 hover:bg-orange-50"
          >
            Enable Now
          </button>
        </div>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="relative">
            {notifPermission === "denied" ? (
              <BellOff className="h-5 w-5 text-muted-foreground" />
            ) : (
              <Bell className="h-5 w-5" />
            )}
            {unread > 0 && (
              <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-600 text-xs text-white">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-80 p-2">
          <div className="flex items-center justify-between px-2 py-1">
            <div className="text-sm font-semibold">Notifications</div>
            <div className="flex items-center gap-2">
              {notifPermission !== "granted" && (
                <button
                  className="text-xs font-semibold text-orange-500"
                  onClick={handleEnableNotifications}
                >
                  {notifPermission === "denied" ? "🔕 Blocked" : "🔔 Enable"}
                </button>
              )}
              <button
                className="text-muted-foreground text-xs"
                onClick={(e) => {
                  e.preventDefault();
                  markAllRead();
                }}
              >
                Mark all read
              </button>
              <button
                className="text-primary text-xs"
                onClick={() => navigate({ to: "/notifications" as any })}
              >
                View all
              </button>
            </div>
          </div>
          <div className="mt-1 max-h-64 overflow-y-auto">
            {notifications.length === 0 && (
              <div className="text-muted-foreground p-4 text-sm">
                No notifications
              </div>
            )}
            {notifications.map((n) => (
              <div
                key={n.id}
                className={`hover:bg-muted flex items-start gap-2 rounded-md p-2 ${n.read ? "opacity-70" : "bg-surface"}`}
                onClick={() => markRead(n.id)}
              >
                <div className="flex-1">
                  <div className="text-sm font-medium">{n.title}</div>
                  <div className="text-muted-foreground line-clamp-2 text-xs">
                    {n.body}
                  </div>
                  <div className="text-2xs text-muted-foreground mt-1">
                    {new Date(n.createdAt).toLocaleString()}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

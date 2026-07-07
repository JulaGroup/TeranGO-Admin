import { useNavigate } from "@tanstack/react-router";
import { Bell, BellOff, Check, Wifi, WifiOff } from "lucide-react";
import { useNotificationStore } from "@/stores/notification-store";
import { useOrderSocketConnected } from "@/hooks/use-order-notifications";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { useState, useEffect } from "react";
import { cn } from "@/lib/utils";

export default function NotificationBell() {
  const allNotifications = useNotificationStore((s) => s.notifications);
  const markRead = useNotificationStore((s) => s.markRead);
  const markAllRead = useNotificationStore((s) => s.markAllRead);
  const isSocketConnected = useOrderSocketConnected();

  const unread = allNotifications.filter((n) => !n.read).length;
  const notifications = allNotifications.slice(0, 8);
  const navigate = useNavigate();

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

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60_000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    return `${Math.floor(hrs / 24)}d ago`;
  };

  return (
    <>
      {/* Banner: permission not yet asked */}
      {notifPermission === "default" && (
        <div className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between bg-primary px-4 py-2 text-white shadow-lg">
          <span className="text-sm font-medium">
            🔔 Enable browser notifications to get real-time alerts for orders, payments &amp; settlements
          </span>
          <button
            onClick={handleEnableNotifications}
            className="ml-4 rounded bg-white px-3 py-1 text-xs font-semibold text-primary hover:bg-orange-50 shrink-0"
          >
            Enable Now
          </button>
        </div>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="relative h-9 w-9">
            {notifPermission === "denied" ? (
              <BellOff className="h-5 w-5 text-muted-foreground" />
            ) : (
              <Bell className="h-5 w-5" />
            )}
            {/* Unread count badge */}
            {unread > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white leading-none">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
            {/* Live connection dot */}
            <span
              className={cn(
                "absolute bottom-0.5 right-0.5 h-2 w-2 rounded-full border border-background",
                isSocketConnected ? "bg-emerald-500" : "bg-muted-foreground/40",
              )}
            />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-80 p-0" sideOffset={8}>
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold">Notifications</span>
              {unread > 0 && (
                <Badge variant="secondary" className="h-5 px-1.5 text-xs">
                  {unread} new
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-2">
              {/* Socket status */}
              <span
                className={cn(
                  "flex items-center gap-1 text-xs font-medium",
                  isSocketConnected ? "text-emerald-600 dark:text-emerald-400" : "text-muted-foreground",
                )}
              >
                {isSocketConnected ? (
                  <><Wifi className="h-3 w-3" /> Live</>
                ) : (
                  <><WifiOff className="h-3 w-3" /> Offline</>
                )}
              </span>
              {/* Browser permission */}
              {notifPermission !== "granted" && (
                <button
                  className="text-xs font-semibold text-primary"
                  onClick={handleEnableNotifications}
                >
                  {notifPermission === "denied" ? "🔕 Blocked" : "🔔 Enable"}
                </button>
              )}
            </div>
          </div>

          {/* Notification list */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center">
                <Bell className="h-8 w-8 text-muted-foreground/30 mb-2" />
                <p className="text-sm font-medium text-muted-foreground">No notifications yet</p>
                <p className="text-xs text-muted-foreground/60 mt-0.5">
                  {isSocketConnected ? "Waiting for new activity…" : "Connect to start receiving alerts"}
                </p>
              </div>
            ) : (
              notifications.map((n) => (
                <div
                  key={n.id}
                  className={cn(
                    "flex items-start gap-3 px-4 py-3 cursor-pointer hover:bg-muted/50 transition-colors border-b border-border/50 last:border-0",
                    !n.read && "bg-primary/5",
                  )}
                  onClick={() => markRead(n.id)}
                >
                  {/* Unread indicator */}
                  <div className={cn("mt-1.5 h-2 w-2 shrink-0 rounded-full", n.read ? "bg-transparent" : "bg-primary")} />
                  <div className="flex-1 min-w-0">
                    <p className={cn("text-sm leading-snug", !n.read && "font-semibold")}>{n.title}</p>
                    <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{n.body}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">{timeAgo(n.createdAt)}</p>
                  </div>
                  {n.read && <Check className="h-3 w-3 text-muted-foreground/40 mt-1.5 shrink-0" />}
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <DropdownMenuSeparator />
          <div className="flex items-center justify-between px-4 py-2">
            <button
              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
              onClick={(e) => { e.preventDefault(); markAllRead(); }}
            >
              Mark all read
            </button>
            <button
              className="text-xs font-semibold text-primary hover:underline"
              onClick={() => navigate({ to: "/notifications" as any })}
            >
              View all →
            </button>
          </div>
        </DropdownMenuContent>
      </DropdownMenu>
    </>
  );
}

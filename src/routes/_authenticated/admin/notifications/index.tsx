import { createFileRoute } from "@tanstack/react-router";
import { useNotificationStore } from "@/stores/notification-store";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Bell, CheckCheck, Trash2 } from "lucide-react";
import { Header } from "@/components/layout/header";
import { Main } from "@/components/layout/main";
import { ProfileDropdown } from "@/components/profile-dropdown";
import { ThemeSwitch } from "@/components/theme-switch";

export const Route = createFileRoute("/_authenticated/admin/notifications/")({
  component: NotificationsPage,
});

function NotificationsPage() {
  const notifications = useNotificationStore((s) => s.notifications);
  const markRead = useNotificationStore((s) => s.markRead);
  const markAllRead = useNotificationStore((s) => s.markAllRead);
  const clearAll = useNotificationStore((s) => s.clearAll);

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <>
      <Header fixed>
        <div className="ms-auto flex items-center gap-2">
          <ThemeSwitch />
          <ProfileDropdown />
        </div>
      </Header>

      <Main>
        <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {unreadCount > 0
              ? `${unreadCount} unread notification${unreadCount !== 1 ? "s" : ""}`
              : "All caught up"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => markAllRead()}
            disabled={unreadCount === 0}
          >
            <CheckCheck className="mr-1.5 h-4 w-4" />
            Mark all read
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => clearAll()}
            disabled={notifications.length === 0}
          >
            <Trash2 className="mr-1.5 h-4 w-4" />
            Clear all
          </Button>
        </div>
      </div>

      {/* Notifications list */}
      {notifications.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-32 text-center">
          <div className="rounded-full bg-primary/10 p-6 mb-6">
            <Bell className="h-12 w-12 text-primary" />
          </div>
          <h2 className="text-xl font-semibold mb-2">No notifications</h2>
          <p className="text-sm text-muted-foreground max-w-md">
            You're all caught up. New notifications will appear here when they arrive.
          </p>
        </div>
      ) : (
        <div className="space-y-2">
          {unreadCount > 0 && (
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1 mb-3">
              Unread ({unreadCount})
            </p>
          )}

          {notifications
            .filter((n) => !n.read)
            .map((n) => (
              <Card
                key={n.id}
                className="shadow-sm border-l-4 border-l-primary hover:shadow-md transition-shadow"
              >
                <CardContent className="pt-4 pb-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="rounded-full bg-primary/10 p-2 shrink-0 mt-0.5">
                        <Bell className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-sm">{n.title}</p>
                        <p className="text-muted-foreground text-sm mt-0.5 line-clamp-2">
                          {n.body}
                        </p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(n.createdAt).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      className="shrink-0"
                      onClick={() => markRead(n.id)}
                    >
                      Mark read
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}

          {notifications.filter((n) => n.read).length > 0 && (
            <>
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide px-1 mt-6 mb-3">
                Read
              </p>
              {notifications
                .filter((n) => n.read)
                .map((n) => (
                  <Card
                    key={n.id}
                    className="shadow-sm opacity-60 hover:opacity-80 transition-opacity"
                  >
                    <CardContent className="pt-4 pb-4">
                      <div className="flex items-start gap-3">
                        <div className="rounded-full bg-muted p-2 shrink-0 mt-0.5">
                          <Bell className="h-3.5 w-3.5 text-muted-foreground" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm">{n.title}</p>
                          <p className="text-muted-foreground text-sm mt-0.5 line-clamp-2">
                            {n.body}
                          </p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {new Date(n.createdAt).toLocaleString()}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
            </>
          )}
        </div>
      )}
        </div>
      </Main>
    </>
  );
}

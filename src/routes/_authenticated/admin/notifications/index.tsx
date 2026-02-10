import { createFileRoute } from "@tanstack/react-router";
import { useNotificationStore } from "@/stores/notification-store";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

export const Route = createFileRoute("/_authenticated/admin/notifications/")({
  component: NotificationsPage,
});

function NotificationsPage() {
  const notifications = useNotificationStore((s) => s.notifications);
  const markRead = useNotificationStore((s) => s.markRead);
  const markAllRead = useNotificationStore((s) => s.markAllRead);
  const clearAll = useNotificationStore((s) => s.clearAll);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Notifications</h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => markAllRead()}>
            Mark all read
          </Button>
          <Button variant="ghost" size="sm" onClick={() => clearAll()}>
            Clear
          </Button>
        </div>
      </div>

      <div className="grid gap-3">
        {notifications.length === 0 && (
          <div className="text-muted-foreground p-4 text-sm">
            No notifications
          </div>
        )}

        {notifications.map((n) => (
          <Card key={n.id} className={`p-4 ${n.read ? "opacity-80" : ""}`}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-semibold">{n.title}</div>
                <div className="text-muted-foreground mt-1 text-sm">
                  {n.body}
                </div>
                <div className="text-2xs text-muted-foreground mt-2">
                  {new Date(n.createdAt).toLocaleString()}
                </div>
              </div>
              <div className="flex flex-col gap-2">
                {!n.read && (
                  <Button size="sm" onClick={() => markRead(n.id)}>
                    Mark read
                  </Button>
                )}
              </div>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

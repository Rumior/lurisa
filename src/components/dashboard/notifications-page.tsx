"use client";

import { useEffect, useState } from "react";
import { Trash2, Bell } from "lucide-react";

interface Notification {
  id: string;
  title: string;
  body: string;
  type: string;
  sentAt: string;
  readAt: string | null;
}

export function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    try {
      const r = await fetch("/api/notifications");
      const data = await r.json();
      setNotifications(data.notifications || []);
    } finally {
      setLoading(false);
    }
  }

  async function markAsRead(id: string) {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await load();
    window.dispatchEvent(new Event("notifications:refresh"));
  }

  async function deleteNotification(id: string) {
    if (!confirm("Delete this notification?")) return;
    await fetch(`/api/notifications?id=${id}`, { method: "DELETE" });
    await load();
    window.dispatchEvent(new Event("notifications:refresh"));
  }

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading...</div>;
  }

  if (notifications.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-foreground">Notifications</h1>
        <div className="rounded-xl border bg-card p-8 text-center">
          <Bell className="mx-auto h-8 w-8 text-muted-foreground mb-3" />
          <p className="text-muted-foreground">No notifications yet.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-foreground">Notifications</h1>
      <div className="space-y-3">
        {notifications.map((n) => (
          <div
            key={n.id}
            onClick={() => !n.readAt && markAsRead(n.id)}
            className={`rounded-xl border p-4 cursor-pointer transition-colors ${
              n.readAt
                ? "bg-card opacity-70"
                : "bg-card border-indigo-300 dark:border-indigo-700 shadow-sm"
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {!n.readAt && (
                    <span className="h-2 w-2 rounded-full bg-indigo-500 shrink-0" />
                  )}
                  <h3 className={`text-foreground ${!n.readAt ? "font-semibold" : "font-medium"}`}>
                    {n.title}
                  </h3>
                </div>
                <p className="text-sm text-muted-foreground mt-1">{n.body}</p>
                <span className="text-xs text-muted-foreground mt-2 block">
                  {new Date(n.sentAt).toLocaleString()}
                </span>
              </div>
              <button
                onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }}
                className="p-2 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors shrink-0"
                title="Delete"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default NotificationsPage;
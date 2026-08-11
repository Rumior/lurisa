"use client";

import { useEffect, useState } from "react";

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
    fetch("/api/notifications")
      .then((r) => r.json())
      .then((data) => {
        setNotifications(data.notifications || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;

  if (notifications.length === 0) {
    return (
      <div className="space-y-6">
        <h1 className="text-2xl font-semibold text-foreground">Notifications</h1>
        <div className="rounded-xl border bg-card p-8 text-center">
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
          <div key={n.id} className="rounded-xl border bg-card p-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-foreground">{n.title}</h3>
              <span className="text-xs text-muted-foreground">
                {new Date(n.sentAt).toLocaleDateString()}
              </span>
            </div>
            <p className="mt-1 text-sm text-muted-foreground">{n.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export default NotificationsPage;

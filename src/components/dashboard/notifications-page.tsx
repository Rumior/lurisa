"use client";

export function NotificationsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold text-[#2E2E2E]">Notifications</h1>
      <p className="text-[#5C5B57]">
        Your notification history and preferences.
      </p>
      <div className="rounded-lg border border-[#D8D0BF] bg-[#FFFDF9] p-8 text-center">
        <p className="text-[#9B9A96]">No notifications yet.</p>
      </div>
    </div>
  );
}

export default NotificationsPage;

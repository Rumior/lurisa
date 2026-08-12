const CACHE_NAME = "lurisa-v1";
const STATIC_ASSETS = ["/","/chat","/memories","/goals","/timeline","/manifest.json"];

// Disable aggressive caching in development
const isDev = self.location.hostname === 'localhost' || self.location.hostname === '127.0.0.1';

self.addEventListener("install", (event) => {
  if (isDev) {
    self.skipWaiting();
    return;
  }
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  if (isDev) {
    self.registration.unregister();
    return;
  }
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // In dev mode, never intercept - let Next.js HMR work properly
  if (isDev) return;

  const { request } = event;
  const url = new URL(request.url);

  // Never intercept API calls
  if (url.pathname.startsWith("/api/")) return;
  // Never intercept Next.js internal chunks/assets
  if (url.pathname.startsWith("/_next/")) return;
  // Only handle GET requests
  if (request.method !== "GET") return;

  // Stale-while-revalidate for app pages
  if (["/memories","/goals","/timeline"].includes(url.pathname)) {
    event.respondWith(
      caches.match(request).then((cached) => {
        const fetchPromise = fetch(request).then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(request, clone));
          }
          return res;
        });
        return cached || fetchPromise;
      })
    );
    return;
  }

  // Cache-first for everything else (but not _next/*)
  event.respondWith(
    caches.match(request).then((cached) => {
      return (
        cached ||
        fetch(request).then((res) => {
          if (res.ok) {
            const clone = res.clone();
            caches.open(CACHE_NAME).then((c) => c.put(request, clone));
          }
          return res;
        })
      );
    })
  );
});

self.addEventListener("push", (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || "lurisa", {
      body: data.body || "",
      icon: "/icon-192x192.png",
      badge: "/icon-192x192.png",
      tag: data.tag || "default",
      requireInteraction: data.requireInteraction || false,
      data: data.url ? { url: data.url } : undefined,
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = event.notification.data?.url || "/chat";
  event.waitUntil(self.clients.openWindow(url));
});
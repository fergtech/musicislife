// Service Worker for musicislyfe PWA
// Strategy:
//   - Static assets  → cache-first (long TTL)
//   - API routes     → network-first (fall back to cache)
//   - Navigation     → network-first (fall back to cached shell)

const CACHE_NAME = "musicislyfe-v1";
const STATIC_ASSETS = [
  "/",
  "/offline.html",
];

// ─── Install ────────────────────────────────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS)),
  );
  self.skipWaiting();
});

// ─── Activate ───────────────────────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)),
      ),
    ),
  );
  self.clients.claim();
});

// ─── Fetch ──────────────────────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Don't intercept non-GET or cross-origin requests
  if (request.method !== "GET") return;
  if (url.origin !== self.location.origin) return;

  // API routes: network-first, fall back to cache
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Static assets (_next/static, images, icons): cache-first
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|ico|woff2?)$/)
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Navigation (HTML pages): network-first
  if (request.headers.get("accept")?.includes("text/html")) {
    event.respondWith(networkFirst(request));
    return;
  }

  // Everything else: network-first
  event.respondWith(networkFirst(request));
});

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response("Offline", { status: 503 });
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) return cached;
    // For navigation requests, return the offline page
    if (request.headers.get("accept")?.includes("text/html")) {
      const offline = await caches.match("/offline.html");
      if (offline) return offline;
    }
    return new Response("Offline", { status: 503 });
  }
}

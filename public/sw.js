// Service Worker for musicislyfe PWA
// Cache strategy:
//   - Static assets (_next/static, icons, fonts) → cache-first
//   - Everything else (API, HTML pages)          → network-only, no caching
//
// Authenticated API responses and user-specific HTML are intentionally never
// cached. Caching them would allow stale user data to persist across logout
// or session changes, which is a privacy/consistency risk.

const CACHE_NAME = "musicislyfe-v1";
const STATIC_ASSETS = ["/offline.html"];

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

  if (request.method !== "GET") return;
  if (url.origin !== self.location.origin) return;

  // Static assets: cache-first (safe — no user data, content-hashed filenames)
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.match(/\.(png|jpg|jpeg|svg|ico|woff2?)$/)
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // API routes and HTML pages: network-only.
  // On network failure, show the offline page for navigations only.
  event.respondWith(networkOnly(request));
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

async function networkOnly(request) {
  try {
    return await fetch(request);
  } catch {
    // Only substitute the offline page for HTML navigation requests
    if (request.headers.get("accept")?.includes("text/html")) {
      const offline = await caches.match("/offline.html");
      if (offline) return offline;
    }
    return new Response("Offline", { status: 503 });
  }
}

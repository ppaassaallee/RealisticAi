// Public app shell only. Never cache APIs, user results, bank credentials or Alex.
const CACHE = "bank-public-v1";
self.addEventListener("install", (event) =>
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(["/juliana", "/juliana-preview.png"]))
      .then(() => self.skipWaiting()),
  ),
);
self.addEventListener("activate", (event) =>
  event.waitUntil(self.clients.claim()),
);
self.addEventListener("fetch", (event) => {
  const u = new URL(event.request.url);
  if (
    event.request.method !== "GET" ||
    u.origin !== location.origin ||
    u.pathname.startsWith("/api/") ||
    u.pathname.includes("/admin") ||
    u.pathname.includes("/analytics")
  )
    return;
  const publicAsset =
    u.pathname.startsWith("/_next/static/") ||
    u.pathname === "/juliana-preview.png";
  const shell = u.pathname === "/juliana" && event.request.mode === "navigate";
  if (!publicAsset && !shell) return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE).then((c) => c.put(event.request, copy));
        }
        return response;
      })
      .catch(async () => {
        const c = await caches.open(CACHE);
        return (await c.match(event.request)) || Response.error();
      }),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type !== "CACHE_PUBLIC" || !Array.isArray(event.data.urls))
    return;
  const urls = event.data.urls
    .filter((value) => {
      try {
        const u = new URL(value);
        return (
          u.origin === location.origin &&
          u.pathname.startsWith("/_next/static/")
        );
      } catch {
        return false;
      }
    })
    .slice(0, 100);
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => Promise.allSettled(urls.map((url) => c.add(url)))),
  );
});

// Service worker tối giản: lưu các file đã tải để chơi lại được khi mất mạng.
// Chỉ đăng ký trên web (không dùng trong app Capacitor vì file đã nằm trong app).
// AF-04 (Audit Final 10/11): lần mở đầu mọi file đã tải xong TRƯỚC khi SW điều khiển trang, nên trang gửi danh sách file
// (message "cache") để SW lưu ngay → mở một lần là chơi lại được khi mất mạng.
// Bản mới ngay: trang (index.html) luôn hỏi lại máy chủ (cache: "no-cache"), không lấy bản cũ trong bộ nhớ đệm HTTP của
// trình duyệt; file JS/CSS có mã băm trong tên nên bản mới luôn là file mới. Đổi CACHE thì bỏ bộ nhớ đệm cũ.
const CACHE = "mj-v2";
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("message", (e) => {
  const d = e.data;
  if (!d || d.type !== "cache" || !Array.isArray(d.urls)) return;
  e.waitUntil(
    caches.open(CACHE).then((c) =>
      Promise.all(d.urls.filter((u) => typeof u === "string" && new URL(u).origin === location.origin).map((u) => c.add(u).catch(() => {}))),
    ),
  );
});
self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== location.origin) return;
  const nav = req.mode === "navigate";
  // Mạng trước (trang: hỏi lại máy chủ), lỗi mạng thì lấy bản đã lưu.
  e.respondWith(
    fetch(nav ? new Request(req, { cache: "no-cache" }) : req)
      .then((res) => {
        if (res.ok) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: nav }).then((r) => r || caches.match("./index.html") || caches.match("./")))
  );
});

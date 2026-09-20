// Service worker minimo para Web Push (canal WEB_PUSH). No cachea nada mas
// que no forma parte todavia de una estrategia PWA offline-first: su unico
// trabajo por ahora es recibir el push y mostrar la notificacion nativa del
// sistema operativo.

self.addEventListener("push", (event) => {
  let payload = { title: "LoyaltyCr", body: "" };
  try {
    if (event.data) payload = event.data.json();
  } catch {
    // payload no era JSON valido; se usa el default
  }

  event.waitUntil(
    self.registration.showNotification(payload.title, {
      body: payload.body,
      data: payload.data || {},
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow("/"));
});

const isLocalhost = ["localhost", "127.0.0.1", "[::1]"].includes(window.location.hostname);

export function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    return;
  }

  window.addEventListener("load", async () => {
    try {
      const registration = await navigator.serviceWorker.register("/sw.js");

      if (isLocalhost) {
        console.info("Service worker registered for Virtual Q.", registration.scope);
      }
    } catch (error) {
      console.error("Service worker registration failed.", error);
    }
  });
}

"use client";

import { useEffect } from "react";

export function RegistraServiceWorker() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" }).catch(() => {
        // L'app funziona anche senza service worker: non è un errore da mostrare.
      });
    }
  }, []);

  return null;
}

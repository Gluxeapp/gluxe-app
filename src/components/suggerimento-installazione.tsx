"use client";

import { useSyncExternalStore } from "react";

type Dispositivo = "installata" | "ios" | "altro" | "sconosciuto";

function leggiDispositivo(): Dispositivo {
  if (window.matchMedia("(display-mode: standalone)").matches) return "installata";
  if (/iPad|iPhone|iPod/.test(navigator.userAgent)) return "ios";
  return "altro";
}

const nessunAggiornamento = () => () => {};

/** Spiega come aggiungere l'app alla schermata Home. Sparisce se l'app è già installata. */
export function SuggerimentoInstallazione() {
  const dispositivo = useSyncExternalStore<Dispositivo>(
    nessunAggiornamento,
    leggiDispositivo,
    () => "sconosciuto",
  );

  if (dispositivo === "installata" || dispositivo === "sconosciuto") return null;

  return (
    <div className="mt-6 rounded-lg border border-bordo bg-superficie p-4 text-sm text-testo-tenue">
      <p className="font-semibold text-testo">Installa l&apos;app sul telefono</p>
      {dispositivo === "ios" ? (
        <p className="mt-1">
          In Safari tocca il pulsante <strong>Condividi</strong> (il quadrato con la freccia) e poi{" "}
          <strong>Aggiungi alla schermata Home</strong>.
        </p>
      ) : (
        <p className="mt-1">
          In Chrome apri il menu <strong>⋮</strong> in alto a destra e scegli{" "}
          <strong>Installa app</strong> oppure <strong>Aggiungi a schermata Home</strong>.
        </p>
      )}
    </div>
  );
}

"use client";

import { useEffect, useRef, useState, useTransition, type RefObject } from "react";
import { fraseVip, type FraseVip } from "@/app/azioni/vip";

/**
 * Frase del Cliente VIP sotto il carrello (decisione 35): a ogni cambio di quantità chiede al server il testo
 * e l'avanzamento verso i 99 €. Il browser non calcola nulla: legge solo le quantità scelte nel modulo.
 */
export function FraseVipCarrello({ modulo, iniziale, daProfilo }: { modulo: RefObject<HTMLFormElement | null>; iniziale: FraseVip; daProfilo: boolean }) {
  const [frase, setFrase] = useState(iniziale);
  const [, avvia] = useTransition();
  const attesa = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    const form = modulo.current;
    if (!form) return;
    const aggiorna = (evento: Event) => {
      if (!(evento.target instanceof HTMLInputElement) || !evento.target.name.startsWith("q_")) return;
      clearTimeout(attesa.current);
      attesa.current = setTimeout(() => {
        const richiesti = [...new FormData(form)]
          .filter(([chiave, valore]) => chiave.startsWith("q_") && typeof valore === "string" && valore.trim() !== "")
          .map(([chiave, valore]) => ({ prodottoId: chiave.slice(2), quantita: Number(valore) }))
          .filter((r) => Number.isInteger(r.quantita) && r.quantita >= 0);
        avvia(async () => {
          const nuova = await fraseVip(richiesti, daProfilo);
          if (nuova) setFrase(nuova);
        });
      }, 300);
    };
    form.addEventListener("input", aggiorna);
    return () => {
      form.removeEventListener("input", aggiorna);
      clearTimeout(attesa.current);
    };
  }, [modulo, daProfilo]);

  return (
    <div className="rounded-xl border border-oro/60 bg-superficie p-4" aria-live="polite">
      <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-oro-chiaro">{frase.vip ? "Cliente VIP" : "Diventa cliente VIP"}</p>
      <p className="text-sm text-testo">{frase.testo}</p>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-nero" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={frase.avanzamento}>
        <div className="h-full rounded-full bg-oro transition-[width] duration-300" style={{ width: `${frase.avanzamento}%` }} />
      </div>
    </div>
  );
}

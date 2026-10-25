"use client";

import { useActionState } from "react";
import { nuovoOrdine } from "@/app/azioni/ordini";
import { Avviso, Pulsante, type EsitoModulo } from "@/components/ui";
import type { Spedizione } from "@/lib/ordini";
import { CampiSpedizione } from "../campi-spedizione";

type Prodotto = { id: string; nome: string; dettaglio: string; prezzo: string; punti: string; promozione?: string };

export function ModuloNuovoOrdine({
  prodotti,
  indirizzo,
  serveConferma,
  sospesa,
}: {
  prodotti: Prodotto[];
  indirizzo: Spedizione;
  serveConferma: boolean;
  sospesa: boolean;
}) {
  const [esito, azione, inCorso] = useActionState<EsitoModulo, FormData>(nuovoOrdine, {});
  if (sospesa) return <Avviso tipo="errore">Il tuo account è sospeso: contatta l&apos;azienda.</Avviso>;
  return (
    <form action={azione} className="space-y-6" noValidate>
      {esito.messaggio && <Avviso tipo="errore">{esito.messaggio}</Avviso>}
      <ul className="divide-y divide-bordo rounded-xl border border-bordo bg-superficie">
        {prodotti.map((p) => (
          <li key={p.id} className="flex items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <label htmlFor={`q_${p.id}`} className="font-semibold">
                {p.nome}
              </label>
              {p.dettaglio && <p className="text-xs text-testo-tenue">{p.dettaglio}</p>}
              <p className="mt-1 text-sm">
                <span className="text-oro-chiaro">{p.prezzo}</span>
                <span className="text-testo-tenue"> · {p.punti} punti</span>
              </p>
              {p.promozione && <p className="mt-1 text-xs text-oro-chiaro">{p.promozione}</p>}
            </div>
            <input
              id={`q_${p.id}`}
              name={`q_${p.id}`}
              type="number"
              inputMode="numeric"
              min={0}
              max={99}
              placeholder="0"
              defaultValue={esito.valori?.[`q_${p.id}`]}
              className="w-20 rounded-lg border border-bordo bg-nero px-3 py-2 text-center text-lg"
            />
          </li>
        ))}
        {prodotti.length === 0 && <li className="p-4 text-testo-tenue">Nessun prodotto disponibile.</li>}
      </ul>

      <CampiSpedizione esito={esito} iniziale={indirizzo} />

      {serveConferma && (
        <label className="flex items-start gap-3 rounded-lg border border-bordo bg-superficie p-4 text-sm">
          <input type="checkbox" name="riordino" className="mt-1 size-5 accent-oro" defaultChecked={esito.valori?.riordino === "on"} />
          <span>
            Confermo di aver <strong>venduto o consumato almeno il 70%</strong> del mio acquisto precedente.
          </span>
        </label>
      )}

      <Pulsante type="submit" disabled={inCorso}>
        {inCorso ? "Calcolo…" : "Vai al riepilogo"}
      </Pulsante>
    </form>
  );
}

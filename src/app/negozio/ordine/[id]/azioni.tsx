"use client";

import { useActionState } from "react";
import { annullaOrdineCliente, pagaOrdineCliente } from "@/app/azioni/negozio";
import { Avviso, Pulsante, PulsanteSecondario, type EsitoModulo } from "@/components/ui";

/**
 * Paga o annulla l'ordine dal link segreto. Se l'ordine l'ha preparato la consulente e il cliente non ha ancora
 * accettato l'informativa (decisione 32), la accetta qui e sceglie se condividere i contatti.
 */
export function AzioniOrdineCliente({ id, codice, scaduto, serveInformativa }: { id: string; codice: string; scaduto: boolean; serveInformativa?: boolean }) {
  const [esitoPaga, paga, pagando] = useActionState<EsitoModulo, FormData>(pagaOrdineCliente, {});
  const [esitoAnnulla, annulla, annullando] = useActionState<EsitoModulo, FormData>(annullaOrdineCliente, {});
  const messaggio = esitoPaga.messaggio ?? esitoAnnulla.messaggio;
  return (
    <div className="space-y-3">
      {messaggio && <Avviso tipo={esitoAnnulla.ok ? "ok" : "errore"}>{messaggio}</Avviso>}
      <form action={paga} className="space-y-3">
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="c" value={codice} />
        {serveInformativa && (
          <>
            <label className="flex items-start gap-3 rounded-lg border border-bordo bg-superficie p-4 text-sm">
              <input type="checkbox" name="privacy" className="mt-1 size-5 shrink-0 accent-oro" />
              <span>
                Ho letto l&apos;
                <a href="/privacy#clienti" target="_blank" className="text-oro-chiaro underline">
                  informativa privacy
                </a>
                . <span className="text-testo-tenue">(obbligatorio)</span>
              </span>
            </label>
            <label className="flex items-start gap-3 rounded-lg border border-bordo bg-superficie p-4 text-sm">
              <input type="checkbox" name="consensoContatti" className="mt-1 size-5 shrink-0 accent-oro" />
              <span>
                Acconsento che la mia consulente veda email e telefono per contattarmi. <span className="text-testo-tenue">(facoltativo)</span>
              </span>
            </label>
          </>
        )}
        <Pulsante type="submit" disabled={pagando || annullando}>
          {pagando ? "Apertura del pagamento…" : scaduto ? "Verifica l'ordine" : "Paga ora"}
        </Pulsante>
      </form>
      <form action={annulla} className="text-center">
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="c" value={codice} />
        <PulsanteSecondario type="submit" disabled={pagando || annullando}>
          {annullando ? "Annullamento…" : "Annulla ordine"}
        </PulsanteSecondario>
      </form>
    </div>
  );
}

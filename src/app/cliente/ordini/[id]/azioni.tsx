"use client";

import { useActionState } from "react";
import { annullaOrdineProfilo, pagaOrdineProfilo } from "@/app/azioni/clienti";
import { Avviso, Pulsante, PulsanteSecondario, type EsitoModulo } from "@/components/ui";

export function AzioniOrdineProfilo({ id, scaduto, serveInformativa }: { id: string; scaduto: boolean; serveInformativa: boolean }) {
  const [esitoPaga, paga, pagando] = useActionState<EsitoModulo, FormData>(pagaOrdineProfilo, {});
  const [esitoAnnulla, annulla, annullando] = useActionState<EsitoModulo, FormData>(annullaOrdineProfilo, {});
  const messaggio = esitoPaga.messaggio ?? esitoAnnulla.messaggio;
  return (
    <div className="space-y-3">
      {messaggio && <Avviso tipo={esitoAnnulla.ok ? "ok" : "errore"}>{messaggio}</Avviso>}
      <form action={paga} className="space-y-3">
        <input type="hidden" name="id" value={id} />
        {serveInformativa && (
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
        )}
        <Pulsante type="submit" disabled={pagando || annullando}>
          {pagando ? "Apertura del pagamento…" : scaduto ? "Verifica l'ordine" : "Paga ora"}
        </Pulsante>
      </form>
      <form action={annulla} className="text-center">
        <input type="hidden" name="id" value={id} />
        <PulsanteSecondario type="submit" disabled={pagando || annullando}>
          {annullando ? "Annullamento…" : "Annulla ordine"}
        </PulsanteSecondario>
      </form>
    </div>
  );
}

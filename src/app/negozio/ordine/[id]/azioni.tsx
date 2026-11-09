"use client";

import { useActionState } from "react";
import { annullaOrdineCliente, pagaOrdineCliente } from "@/app/azioni/negozio";
import { Avviso, Pulsante, PulsanteSecondario, type EsitoModulo } from "@/components/ui";

export function AzioniOrdineCliente({ id, codice, scaduto }: { id: string; codice: string; scaduto: boolean }) {
  const [esitoPaga, paga, pagando] = useActionState<EsitoModulo, FormData>(pagaOrdineCliente, {});
  const [esitoAnnulla, annulla, annullando] = useActionState<EsitoModulo, FormData>(annullaOrdineCliente, {});
  const messaggio = esitoPaga.messaggio ?? esitoAnnulla.messaggio;
  return (
    <div className="space-y-3">
      {messaggio && <Avviso tipo={esitoAnnulla.ok ? "ok" : "errore"}>{messaggio}</Avviso>}
      <form action={paga}>
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="c" value={codice} />
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

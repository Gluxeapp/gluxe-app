"use client";

import { useActionState } from "react";
import { cambiaStatoOrdine } from "@/app/azioni/ordini";
import { Avviso, Campo, Pulsante, PulsanteSecondario, type EsitoModulo } from "@/components/ui";

/** Pulsanti per il passaggio di stato successivo. Il server ricontrolla che il passaggio sia ammesso. */
export function ModuloStato({ id, stato }: { id: string; stato: string }) {
  const [esito, azione, inCorso] = useActionState<EsitoModulo, FormData>(cambiaStatoOrdine, {});
  const messaggio = esito.messaggio && <Avviso tipo={esito.ok ? "ok" : "errore"}>{esito.messaggio}</Avviso>;

  if (stato === "pagato" || stato === "in_preparazione") {
    return (
      <div className="mt-3 space-y-4">
        {messaggio}
        {stato === "pagato" && (
          <form action={azione}>
            <input type="hidden" name="id" value={id} />
            <input type="hidden" name="stato" value="in_preparazione" />
            <PulsanteSecondario type="submit" disabled={inCorso} className="w-full">
              Segna «in preparazione»
            </PulsanteSecondario>
          </form>
        )}
        <form action={azione} className="space-y-3" noValidate>
          <input type="hidden" name="id" value={id} />
          <input type="hidden" name="stato" value="spedito" />
          <Campo etichetta="Corriere" name="corriere" esito={esito} placeholder="BRT, GLS, Poste…" />
          <Campo etichetta="Numero di tracciamento" name="tracciamento" esito={esito} />
          <Pulsante type="submit" disabled={inCorso}>
            Segna «spedito» e avvisa l&apos;incaricata
          </Pulsante>
        </form>
      </div>
    );
  }
  if (stato === "spedito") {
    return (
      <form action={azione} className="mt-3 space-y-3">
        {messaggio}
        <input type="hidden" name="id" value={id} />
        <input type="hidden" name="stato" value="consegnato" />
        <Pulsante type="submit" disabled={inCorso}>
          Segna «consegnato»
        </Pulsante>
      </form>
    );
  }
  return (
    <div className="mt-3 space-y-3">
      {messaggio}
      <p className="text-sm text-testo-tenue">
        {stato === "inserito"
          ? "In attesa del pagamento dell'incaricata: diventa «pagato» quando Stripe lo conferma."
          : "Nessun passaggio da fare."}
      </p>
    </div>
  );
}

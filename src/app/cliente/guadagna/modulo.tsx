"use client";

import { useActionState } from "react";
import { inviaCandidaturaAzione } from "@/app/azioni/clienti";
import { Avviso, Campo, Pulsante, type EsitoModulo } from "@/components/ui";

/** Candidatura della cliente: città, messaggio facoltativo e consenso a essere contattata dalla sede. */
export function ModuloCandidatura() {
  const [esito, azione, inCorso] = useActionState<EsitoModulo, FormData>(inviaCandidaturaAzione, {});
  if (esito.ok) return <Avviso tipo="ok">{esito.messaggio}</Avviso>;
  const v = esito.valori ?? {};
  return (
    <form action={azione} className="space-y-4" noValidate>
      {esito.messaggio && <Avviso tipo="errore">{esito.messaggio}</Avviso>}
      <Campo etichetta="La tua città" name="citta" esito={esito} autoComplete="address-level2" maxLength={80} />
      <div>
        <label htmlFor="messaggio" className="block text-sm text-testo-tenue">
          Vuoi raccontarci qualcosa di te? <span className="text-xs">(facoltativo)</span>
        </label>
        <textarea
          id="messaggio"
          name="messaggio"
          rows={4}
          maxLength={1000}
          defaultValue={v.messaggio}
          className="mt-1 w-full rounded-lg border border-bordo bg-nero px-3 py-2 text-testo"
        />
        {esito.errori?.messaggio && <p className="mt-1 text-sm text-errore">{esito.errori.messaggio}</p>}
      </div>
      <label className="flex items-start gap-3 rounded-lg border border-bordo bg-nero p-4 text-sm">
        <input type="checkbox" name="consenso" className="mt-1 size-5 shrink-0 accent-oro" defaultChecked={v.consenso === "on"} />
        <span>
          Acconsento a essere contattata dalla sede G LUXE, al telefono e all&apos;email del mio profilo, per informazioni
          sull&apos;attività di incaricata. <span className="text-testo-tenue">(obbligatorio)</span>
          {esito.errori?.consenso && <span className="block text-errore">Spunta la casella per continuare.</span>}
        </span>
      </label>
      <Pulsante type="submit" disabled={inCorso}>
        {inCorso ? "Invio…" : "Invia la tua candidatura"}
      </Pulsante>
    </form>
  );
}

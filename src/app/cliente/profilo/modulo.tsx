"use client";

import { useActionState } from "react";
import { salvaProfiloCliente } from "@/app/azioni/clienti";
import { Avviso, Campo, Pulsante, type EsitoModulo } from "@/components/ui";

export function ModuloProfiloCliente({ valori }: { valori: Record<string, string> }) {
  const [esito, azione, inCorso] = useActionState<EsitoModulo, FormData>(salvaProfiloCliente, { valori });
  return (
    <form action={azione} className="space-y-3" noValidate>
      {esito.messaggio && <Avviso tipo={esito.ok ? "ok" : "errore"}>{esito.messaggio}</Avviso>}
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo etichetta="Nome" name="nome" esito={esito} defaultValue={valori.nome} autoComplete="given-name" />
        <Campo etichetta="Cognome" name="cognome" esito={esito} defaultValue={valori.cognome} autoComplete="family-name" />
      </div>
      <Campo etichetta="Telefono" name="telefono" type="tel" esito={esito} defaultValue={valori.telefono} autoComplete="tel" />
      <Campo etichetta="Indirizzo di spedizione" name="indirizzo" esito={esito} defaultValue={valori.indirizzo} autoComplete="street-address" />
      <div className="grid grid-cols-[1fr_2fr_1fr] gap-3">
        <Campo etichetta="CAP" name="cap" esito={esito} defaultValue={valori.cap} inputMode="numeric" />
        <Campo etichetta="Città" name="citta" esito={esito} defaultValue={valori.citta} />
        <Campo etichetta="Prov." name="provincia" esito={esito} defaultValue={valori.provincia} maxLength={2} />
      </div>
      <label className="flex items-start gap-3 rounded-lg border border-bordo bg-nero p-4 text-sm">
        <input type="checkbox" name="consensoContatti" className="mt-1 size-5 shrink-0 accent-oro" defaultChecked={valori.consensoContatti === "on"} />
        <span>Acconsento che la mia consulente veda email e telefono per contattarmi. Puoi togliere la spunta quando vuoi.</span>
      </label>
      <Pulsante type="submit" disabled={inCorso}>
        {inCorso ? "Salvataggio…" : "Salva"}
      </Pulsante>
    </form>
  );
}

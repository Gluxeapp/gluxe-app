"use client";

import { useActionState } from "react";
import { registratiCliente } from "@/app/azioni/clienti";
import { Avviso, Campo, Pulsante, type EsitoModulo } from "@/components/ui";

export function ModuloRegistrazioneCliente({ negozio }: { negozio: string }) {
  const [esito, azione, inCorso] = useActionState<EsitoModulo, FormData>(registratiCliente, {});
  if (esito.ok) return <Avviso tipo="ok">{esito.messaggio}</Avviso>;
  return (
    <form action={azione} className="space-y-4" noValidate>
      <input type="hidden" name="negozio" value={negozio} />
      <div aria-hidden className="hidden">
        <label>
          Sito <input name="sito" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      {esito.messaggio && <Avviso tipo="errore">{esito.messaggio}</Avviso>}
      <div className="grid gap-3 sm:grid-cols-2">
        <Campo etichetta="Nome" name="nome" esito={esito} autoComplete="given-name" />
        <Campo etichetta="Cognome" name="cognome" esito={esito} autoComplete="family-name" />
      </div>
      <Campo etichetta="Email" name="email" type="email" esito={esito} autoComplete="email" />
      <Campo etichetta="Telefono" name="telefono" type="tel" esito={esito} autoComplete="tel" />
      <Campo etichetta="Password" name="password" type="password" esito={esito} autoComplete="new-password" aiuto="Almeno 10 caratteri, con lettere e numeri." />
      <Campo etichetta="Ripeti la password" name="confermaPassword" type="password" esito={esito} autoComplete="new-password" />
      <label className="flex items-start gap-3 rounded-lg border border-bordo bg-superficie p-4 text-sm">
        <input type="checkbox" name="privacy" className="mt-1 size-5 shrink-0 accent-oro" defaultChecked={esito.valori?.privacy === "on"} />
        <span>
          Ho letto l&apos;
          <a href="/privacy#clienti" target="_blank" className="text-oro-chiaro underline">
            informativa privacy
          </a>
          . <span className="text-testo-tenue">(obbligatorio)</span>
        </span>
      </label>
      <Pulsante type="submit" disabled={inCorso}>
        {inCorso ? "Registrazione…" : "Crea il profilo"}
      </Pulsante>
    </form>
  );
}

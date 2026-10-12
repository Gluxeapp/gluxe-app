"use client";

import Link from "next/link";
import { useActionState } from "react";
import { inviaRichiestaSponsor } from "@/app/azioni/registrazione";
import { Avviso, Campo, Collegamento, PaginaPubblica, Pulsante, Titolo, type EsitoModulo } from "@/components/ui";

export default function RichiestaSponsor() {
  const [esito, azione, inCorso] = useActionState<EsitoModulo, FormData>(inviaRichiestaSponsor, {});

  return (
    <PaginaPubblica>
      <Titolo sottotitolo="Lasciaci i tuoi recapiti: ti contatteremo per darti un codice sponsor.">
        Non hai un codice sponsor?
      </Titolo>

      {esito.ok ? (
        <>
          <Avviso tipo="ok">{esito.messaggio}</Avviso>
          <p className="mt-6 text-center text-sm">
            <Collegamento href="/">Torna alla pagina iniziale</Collegamento>
          </p>
        </>
      ) : (
        <form action={azione} className="space-y-4" noValidate>
          {esito.messaggio && <Avviso tipo="errore">{esito.messaggio}</Avviso>}
          <div className="grid grid-cols-2 gap-4">
            <Campo etichetta="Nome" name="nome" esito={esito} autoComplete="given-name" required />
            <Campo etichetta="Cognome" name="cognome" esito={esito} autoComplete="family-name" required />
          </div>
          <Campo etichetta="Telefono" name="telefono" type="tel" esito={esito} autoComplete="tel" required />
          <Campo etichetta="Email" name="email" type="email" esito={esito} autoComplete="email" required />
          <Campo etichetta="Città" name="citta" esito={esito} autoComplete="address-level2" required />
          <div>
            <label className="flex items-start gap-3 text-sm">
              <input type="checkbox" name="privacy" className="mt-1 accent-oro" />
              <span>
                Ho letto l&apos;
                <Link href="/privacy" target="_blank" className="text-oro-chiaro underline">
                  informativa privacy
                </Link>{" "}
                e acconsento a essere ricontattata.
              </span>
            </label>
            {esito.errori?.privacy && <p className="mt-1 text-sm text-errore">{esito.errori.privacy}</p>}
          </div>
          <Pulsante type="submit" disabled={inCorso}>
            {inCorso ? "Invio in corso…" : "Invia la richiesta"}
          </Pulsante>
        </form>
      )}
    </PaginaPubblica>
  );
}

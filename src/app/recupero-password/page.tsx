"use client";

import { useActionState } from "react";
import { richiediRecuperoPassword } from "@/app/azioni/password";
import { Avviso, Campo, Collegamento, PaginaPubblica, Pulsante, Titolo, type EsitoModulo } from "@/components/ui";

export default function RecuperoPassword() {
  const [esito, azione, inCorso] = useActionState<EsitoModulo, FormData>(richiediRecuperoPassword, {});

  return (
    <PaginaPubblica>
      <Titolo sottotitolo="Ti mandiamo via email un link per sceglierne una nuova.">Password dimenticata</Titolo>
      {esito.ok ? (
        <Avviso tipo="ok">{esito.messaggio}</Avviso>
      ) : (
        <form action={azione} className="space-y-5">
          <Campo
            etichetta="Codice incaricato oppure email"
            name="identificativo"
            esito={esito}
            autoComplete="username"
            placeholder="GL000123 oppure nome@email.it"
            required
          />
          <Pulsante type="submit" disabled={inCorso}>
            {inCorso ? "Invio in corso…" : "Inviami il link"}
          </Pulsante>
        </form>
      )}
      <p className="mt-6 text-center text-sm">
        <Collegamento href="/">Torna all&apos;accesso</Collegamento>
      </p>
    </PaginaPubblica>
  );
}

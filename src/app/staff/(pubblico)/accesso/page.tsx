"use client";

import { useActionState } from "react";
import { accediStaff } from "@/app/azioni/accesso";
import { Avviso, Campo, Collegamento, PaginaPubblica, Pulsante, Titolo, type EsitoModulo } from "@/components/ui";

export default function AccessoStaff() {
  const [esito, azione, inCorso] = useActionState<EsitoModulo, FormData>(accediStaff, {});
  return (
    <PaginaPubblica>
      <Titolo sottotitolo="Amministrazione e contabilità G LUXE">Accesso staff</Titolo>
      <form action={azione} className="space-y-5">
        {esito.messaggio && <Avviso tipo="errore">{esito.messaggio}</Avviso>}
        <Campo etichetta="Email" name="email" type="email" esito={esito} autoComplete="username" required />
        <Campo etichetta="Password" name="password" type="password" autoComplete="current-password" required />
        <Pulsante type="submit" disabled={inCorso}>
          {inCorso ? "Controllo…" : "Continua"}
        </Pulsante>
        <p className="text-center text-xs text-testo-tenue">Dopo la password ti invieremo un codice via email.</p>
      </form>
      <p className="mt-6 text-center text-sm">
        <Collegamento href="/recupero-password">Password dimenticata?</Collegamento>
      </p>
    </PaginaPubblica>
  );
}

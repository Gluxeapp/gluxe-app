"use client";

import { useActionState } from "react";
import { verificaStaff } from "@/app/azioni/accesso";
import { Avviso, Campo, Collegamento, PaginaPubblica, Pulsante, Titolo, type EsitoModulo } from "@/components/ui";

export default function VerificaStaff() {
  const [esito, azione, inCorso] = useActionState<EsitoModulo, FormData>(verificaStaff, {});
  return (
    <PaginaPubblica>
      <Titolo sottotitolo="Ti abbiamo inviato via email un codice di 6 cifre. Vale 10 minuti.">Codice di accesso</Titolo>
      <form action={azione} className="space-y-5">
        {esito.messaggio && <Avviso tipo="errore">{esito.messaggio}</Avviso>}
        <Campo
          etichetta="Codice"
          name="codice"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={6}
          placeholder="123456"
          className="text-center"
          required
        />
        <Pulsante type="submit" disabled={inCorso}>
          {inCorso ? "Verifica…" : "Accedi"}
        </Pulsante>
      </form>
      <p className="mt-6 text-center text-sm">
        <Collegamento href="/staff/accesso">Non è arrivato? Ricomincia l&apos;accesso</Collegamento>
      </p>
    </PaginaPubblica>
  );
}

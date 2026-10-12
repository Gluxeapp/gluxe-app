"use client";

import { useActionState } from "react";
import { accediIncaricato } from "@/app/azioni/accesso";
import { Avviso, Campo, Pulsante, type EsitoModulo } from "@/components/ui";

export function ModuloAccesso() {
  const [esito, azione, inCorso] = useActionState<EsitoModulo, FormData>(accediIncaricato, {});

  return (
    <form action={azione} className="space-y-5">
      {esito.messaggio && <Avviso tipo="errore">{esito.messaggio}</Avviso>}
      <Campo
        etichetta="Codice incaricato"
        name="codice"
        esito={esito}
        autoComplete="username"
        autoCapitalize="characters"
        placeholder="GL000123"
        required
      />
      <Campo etichetta="Password" name="password" type="password" autoComplete="current-password" required />
      <Pulsante type="submit" disabled={inCorso}>
        {inCorso ? "Accesso in corso…" : "Accedi"}
      </Pulsante>
    </form>
  );
}

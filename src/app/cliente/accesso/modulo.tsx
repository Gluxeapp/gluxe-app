"use client";

import { useActionState } from "react";
import { accediCliente } from "@/app/azioni/accesso";
import { Avviso, Campo, Pulsante, type EsitoModulo } from "@/components/ui";

export function ModuloAccessoCliente() {
  const [esito, azione, inCorso] = useActionState<EsitoModulo, FormData>(accediCliente, {});
  return (
    <form action={azione} className="space-y-5">
      {esito.messaggio && <Avviso tipo="errore">{esito.messaggio}</Avviso>}
      <Campo etichetta="Email" name="email" type="email" esito={esito} autoComplete="username" required />
      <Campo etichetta="Password" name="password" type="password" autoComplete="current-password" required />
      <Pulsante type="submit" disabled={inCorso}>
        {inCorso ? "Accesso in corso…" : "Accedi"}
      </Pulsante>
    </form>
  );
}

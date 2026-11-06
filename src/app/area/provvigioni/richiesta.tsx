"use client";

import { useActionState } from "react";
import { richiediPagamento } from "@/app/azioni/pagamenti";
import { Avviso, Pulsante, type EsitoModulo } from "@/components/ui";

export function PulsanteRichiesta({ importo }: { importo: string }) {
  const [esito, azione, inCorso] = useActionState<EsitoModulo>(richiediPagamento, {});
  if (esito.ok) return <Avviso tipo="ok">{esito.messaggio}</Avviso>;
  return (
    <form action={azione} className="grid gap-2">
      {esito.messaggio && <Avviso tipo="errore">{esito.messaggio}</Avviso>}
      <Pulsante type="submit" disabled={inCorso}>
        {inCorso ? "Invio…" : `Richiedi pagamento di ${importo}`}
      </Pulsante>
    </form>
  );
}

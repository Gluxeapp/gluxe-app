"use client";

import { useActionState } from "react";
import { rinnovaLicenza } from "@/app/azioni/ordini";
import { Avviso, Pulsante, type EsitoModulo } from "@/components/ui";

export function PulsanteRinnovo({ prezzo }: { prezzo: string }) {
  const [esito, azione, inCorso] = useActionState<EsitoModulo, FormData>(rinnovaLicenza, {});
  return (
    <form action={azione} className="space-y-3">
      {esito.messaggio && <Avviso tipo="errore">{esito.messaggio}</Avviso>}
      <Pulsante type="submit" disabled={inCorso}>
        {inCorso ? "Apertura del pagamento…" : `Rinnova la licenza (${prezzo})`}
      </Pulsante>
    </form>
  );
}

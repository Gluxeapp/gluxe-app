"use client";

import { useActionState } from "react";
import { pagaStartKit } from "@/app/azioni/ordini";
import { Avviso, Pulsante, type EsitoModulo } from "@/components/ui";
import type { Spedizione } from "@/lib/ordini";
import { CampiSpedizione } from "../ordini/campi-spedizione";

export function ModuloStartKit({ indirizzo }: { indirizzo: Spedizione }) {
  const [esito, azione, inCorso] = useActionState<EsitoModulo, FormData>(pagaStartKit, {});
  return (
    <form action={azione} className="space-y-5" noValidate>
      {esito.messaggio && <Avviso tipo="errore">{esito.messaggio}</Avviso>}
      <CampiSpedizione esito={esito} iniziale={indirizzo} />
      <Pulsante type="submit" disabled={inCorso}>
        {inCorso ? "Apertura del pagamento…" : "Paga lo start kit"}
      </Pulsante>
    </form>
  );
}

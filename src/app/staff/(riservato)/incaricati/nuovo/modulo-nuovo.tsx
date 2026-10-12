"use client";

import { useActionState } from "react";
import { inserisciIncaricato } from "@/app/azioni/staff";
import { CampiAnagrafica, Sezione } from "@/components/campi-anagrafica";
import { Avviso, Campo, Pulsante, Titolo, type EsitoModulo } from "@/components/ui";

export function ModuloNuovoIncaricato() {
  const [esito, azione, inCorso] = useActionState<EsitoModulo, FormData>(inserisciIncaricato, {});
  return (
    <div className="max-w-2xl">
      <Titolo sottotitolo="L'incaricato riceverà un'email con il suo codice e il link per scegliere la password.">
        Nuovo incaricato
      </Titolo>
      <form action={azione} className="space-y-6" noValidate>
        {esito.messaggio && <Avviso tipo="errore">{esito.messaggio}</Avviso>}
        <Sezione titolo="Sponsor">
          <Campo
            etichetta="Codice sponsor"
            name="codiceSponsor"
            esito={esito}
            placeholder="GL000123"
            autoCapitalize="characters"
            aiuto="Lascia vuoto solo per il capostipite della rete (il primo incaricato, senza sponsor)."
          />
        </Sezione>
        <CampiAnagrafica esito={esito} />
        <Pulsante type="submit" disabled={inCorso}>
          {inCorso ? "Salvataggio…" : "Crea incaricato"}
        </Pulsante>
      </form>
    </div>
  );
}

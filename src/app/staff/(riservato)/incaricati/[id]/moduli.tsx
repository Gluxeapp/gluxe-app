"use client";

import { useActionState } from "react";
import { cambiaSponsor, cambiaStato, modificaAnagrafica } from "@/app/azioni/staff";
import { CampiAnagrafica } from "@/components/campi-anagrafica";
import { Avviso, Campo, Pulsante, PulsanteSecondario, type EsitoModulo } from "@/components/ui";

export function ModuloAnagrafica({ id, valori }: { id: string; valori: Record<string, string> }) {
  const [esito, azione, inCorso] = useActionState<EsitoModulo, FormData>(modificaAnagrafica, { valori });
  return (
    <form action={azione} className="space-y-6" noValidate>
      {esito.messaggio && <Avviso tipo={esito.ok ? "ok" : "errore"}>{esito.messaggio}</Avviso>}
      <input type="hidden" name="id" value={id} />
      <CampiAnagrafica esito={esito} />
      <Pulsante type="submit" disabled={inCorso}>
        {inCorso ? "Salvataggio…" : "Salva le modifiche"}
      </Pulsante>
    </form>
  );
}

export function ModuloSponsor({ id }: { id: string }) {
  const [esito, azione, inCorso] = useActionState<EsitoModulo, FormData>(cambiaSponsor, {});
  return (
    <form action={azione} className="mt-4 space-y-3 border-t border-bordo pt-4">
      {esito.messaggio && <Avviso tipo={esito.ok ? "ok" : "errore"}>{esito.messaggio}</Avviso>}
      <input type="hidden" name="id" value={id} />
      <Campo etichetta="Nuovo codice sponsor" name="codiceSponsor" esito={esito} placeholder="GL000123" required />
      <Campo etichetta="Motivo" name="motivo" esito={esito} placeholder="Es. errore in registrazione" required />
      <PulsanteSecondario type="submit" disabled={inCorso}>
        Cambia sponsor
      </PulsanteSecondario>
    </form>
  );
}

const STATI = [
  ["attivo", "Attivo"],
  ["sospeso", "Sospeso"],
  ["cessato", "Cessato"],
] as const;

export function ModuloStato({ id, stato }: { id: string; stato: string }) {
  const [esito, azione, inCorso] = useActionState<EsitoModulo, FormData>(cambiaStato, {});
  return (
    <form action={azione} className="mt-3 space-y-3">
      {esito.messaggio && <Avviso tipo={esito.ok ? "ok" : "errore"}>{esito.messaggio}</Avviso>}
      <input type="hidden" name="id" value={id} />
      <select
        name="stato"
        defaultValue={stato}
        aria-label="Stato"
        className="w-full rounded-lg border border-bordo bg-superficie px-4 py-3 text-testo"
      >
        {STATI.map(([valore, etichetta]) => (
          <option key={valore} value={valore}>
            {etichetta}
          </option>
        ))}
      </select>
      <Campo etichetta="Motivo" name="motivo" esito={esito} placeholder="Es. vendita su marketplace" required />
      <PulsanteSecondario type="submit" disabled={inCorso}>
        Aggiorna stato
      </PulsanteSecondario>
    </form>
  );
}

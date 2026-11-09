"use client";

import { useActionState } from "react";
import { spostaClienteAzione } from "@/app/azioni/negozio";
import { Avviso, Campo, PulsanteSecondario, type EsitoModulo } from "@/components/ui";

export function ModuloSposta({ id }: { id: string }) {
  const [esito, azione, inCorso] = useActionState<EsitoModulo, FormData>(spostaClienteAzione, {});
  return (
    <form action={azione} className="mt-4 space-y-3 border-t border-bordo pt-4" noValidate>
      <p className="text-sm text-testo-tenue">Sposta a un&apos;altra incaricata (vale per i prossimi ordini):</p>
      {esito.messaggio && <Avviso tipo={esito.ok ? "ok" : "errore"}>{esito.messaggio}</Avviso>}
      <input type="hidden" name="id" value={id} />
      <Campo etichetta="Codice incaricata" name="codice" esito={esito} placeholder="GL000123" />
      <Campo etichetta="Motivo" name="motivo" esito={esito} />
      <PulsanteSecondario type="submit" disabled={inCorso}>
        {inCorso ? "Spostamento…" : "Sposta il cliente"}
      </PulsanteSecondario>
    </form>
  );
}

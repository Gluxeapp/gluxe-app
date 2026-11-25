"use client";

import { useActionState } from "react";
import { correggiCodiceFiscaleAzione } from "@/app/azioni/negozio";
import { Avviso, Campo, PulsanteSecondario, type EsitoModulo } from "@/components/ui";

/** Correzione del codice fiscale del cliente (decisione 36): solo amministrazione, con motivo. */
export function ModuloCodiceFiscale({ id }: { id: string }) {
  const [esito, azione, inCorso] = useActionState<EsitoModulo, FormData>(correggiCodiceFiscaleAzione, {});
  return (
    <form action={azione} className="mt-4 space-y-3 border-t border-bordo pt-4" noValidate>
      <p className="text-sm text-testo-tenue">Correggi il codice fiscale (es. errore di battitura):</p>
      {esito.messaggio && <Avviso tipo={esito.ok ? "ok" : "errore"}>{esito.messaggio}</Avviso>}
      <input type="hidden" name="id" value={id} />
      <Campo etichetta="Codice fiscale corretto" name="codiceFiscale" esito={esito} autoCapitalize="characters" maxLength={16} />
      <Campo etichetta="Motivo" name="motivo" esito={esito} />
      <PulsanteSecondario type="submit" disabled={inCorso}>
        {inCorso ? "Salvataggio…" : "Correggi il codice fiscale"}
      </PulsanteSecondario>
    </form>
  );
}

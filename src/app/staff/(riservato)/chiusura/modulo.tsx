"use client";

import { useActionState } from "react";
import { chiudiIlMese } from "@/app/azioni/pagamenti";
import { Avviso, Pulsante, type EsitoModulo } from "@/components/ui";

export function ModuloChiusura({ mese, nome }: { mese: string; nome: string }) {
  const [esito, azione, inCorso] = useActionState<EsitoModulo, FormData>(chiudiIlMese, {});
  return (
    <form action={azione} className="grid gap-3">
      {esito.messaggio && <Avviso tipo={esito.ok ? "ok" : "errore"}>{esito.messaggio}</Avviso>}
      <input type="hidden" name="mese" value={mese} />
      <label className="flex items-start gap-3 text-sm">
        <input type="checkbox" name="conferma" className="mt-1 accent-oro" required />
        <span>
          Ho controllato l&apos;anteprima di {nome}. Dopo la chiusura il mese non si può più cambiare: eventuali correzioni diventano rettifiche
          nei mesi successivi.
        </span>
      </label>
      <Pulsante type="submit" disabled={inCorso}>
        {inCorso ? "Chiusura in corso…" : `Chiudi il mese di ${nome}`}
      </Pulsante>
    </form>
  );
}

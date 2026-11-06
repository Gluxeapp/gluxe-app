"use client";

import { useActionState } from "react";
import { salvaPuntiProdotto, salvaPuntiPromozione } from "@/app/azioni/catalogo";
import { Avviso, Campo, PulsanteSecondario, type EsitoModulo } from "@/components/ui";

/** Punti per pezzo scritti a mano (decisione 27). Vuoto = calcolo automatico, mostrato come aiuto. */
export function ModuloPunti({
  id,
  valori,
  automatici,
}: {
  id: string;
  valori: { puntiPersonaleManuali: string; puntiOnlineManuali: string };
  automatici: { personale: string; online: string };
}) {
  const [esito, azione, inCorso] = useActionState<EsitoModulo, FormData>(salvaPuntiProdotto, { valori });
  return (
    <form action={azione} className="mt-3 space-y-3">
      {esito.messaggio && <Avviso tipo={esito.ok ? "ok" : "errore"}>{esito.messaggio}</Avviso>}
      <input type="hidden" name="id" value={id} />
      <Campo
        etichetta="Punti acquisto personale (per pezzo)"
        name="puntiPersonaleManuali"
        esito={esito}
        inputMode="decimal"
        placeholder={automatici.personale}
        aiuto={`Vuoto = automatico: ${automatici.personale} punti`}
      />
      <Campo
        etichetta="Punti vendita online (per pezzo)"
        name="puntiOnlineManuali"
        esito={esito}
        inputMode="decimal"
        placeholder={automatici.online}
        aiuto={`Vuoto = automatico: ${automatici.online} punti. La provvigione online resta il 50% dei punti.`}
      />
      <Campo etichetta="Motivo" name="motivo" esito={esito} required />
      <PulsanteSecondario type="submit" disabled={inCorso}>
        Salva i punti
      </PulsanteSecondario>
    </form>
  );
}

export function ModuloPuntiPromozione({ id, valore, automatici }: { id: string; valore: string; automatici: string }) {
  const [esito, azione, inCorso] = useActionState<EsitoModulo, FormData>(salvaPuntiPromozione, { valori: { puntiManuali: valore } });
  return (
    <form action={azione} className="mt-3 grid gap-2 border-t border-bordo pt-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
      {esito.messaggio && (
        <div className="sm:col-span-3">
          <Avviso tipo={esito.ok ? "ok" : "errore"}>{esito.messaggio}</Avviso>
        </div>
      )}
      <input type="hidden" name="id" value={id} />
      <Campo
        etichetta="Punti per pezzo"
        name="puntiManuali"
        esito={esito}
        inputMode="decimal"
        placeholder={automatici}
        aiuto={`Vuoto = automatico: ${automatici}`}
      />
      <Campo etichetta="Motivo" name="motivo" esito={esito} required />
      <PulsanteSecondario type="submit" disabled={inCorso} className="sm:w-auto sm:px-4">
        Salva
      </PulsanteSecondario>
    </form>
  );
}

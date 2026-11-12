"use client";

import { useActionState, useState } from "react";
import { preparaOrdinePerCliente } from "@/app/azioni/negozio";
import { SceltaProdotti, type ProdottoVetrina } from "@/components/scelta-prodotti";
import { Avviso, Campo, Pulsante, PulsanteSecondario, type EsitoModulo } from "@/components/ui";

export function ModuloOrdinePerCliente({ prodotti, spedizione }: { prodotti: ProdottoVetrina[]; spedizione: string }) {
  const [esito, azione, inCorso] = useActionState<EsitoModulo, FormData>(preparaOrdinePerCliente, {});
  const [copiato, setCopiato] = useState(false);
  const link = esito.ok ? esito.valori?.link : undefined;

  if (link) {
    const testo = `Ciao! Ho preparato il tuo ordine G LUXE: lo trovi qui e puoi pagarlo in sicurezza ${link}`;
    return (
      <div className="space-y-4">
        <Avviso tipo="ok">{esito.messaggio}</Avviso>
        <p className="break-all rounded-lg border border-bordo bg-nero px-3 py-2 text-sm select-all">{link}</p>
        <div className="flex flex-wrap gap-2">
          <PulsanteSecondario
            type="button"
            onClick={() =>
              navigator.clipboard
                .writeText(link)
                .then(() => setCopiato(true))
                .catch(() => setCopiato(false))
            }
          >
            {copiato ? "Copiato!" : "Copia il link"}
          </PulsanteSecondario>
          <a
            href={`https://wa.me/?text=${encodeURIComponent(testo)}`}
            target="_blank"
            rel="noreferrer"
            className="rounded-lg border border-oro/60 px-4 py-2 text-sm text-oro-chiaro"
          >
            Invia con WhatsApp
          </a>
        </div>
        <p className="text-xs text-testo-tenue">Il link vale 24 ore. Quando il cliente paga, l&apos;ordine compare tra gli ordini del tuo negozio.</p>
      </div>
    );
  }

  const v = esito.valori ?? {};
  return (
    <form action={azione} className="space-y-8" noValidate>
      {esito.messaggio && <Avviso tipo="errore">{esito.messaggio}</Avviso>}
      <section>
        <h2 className="mb-3 font-titoli text-2xl text-oro-chiaro">Prodotti</h2>
        <SceltaProdotti prodotti={prodotti} valori={v} />
      </section>
      <fieldset className="space-y-3">
        <legend className="mb-2 font-titoli text-2xl text-oro-chiaro">Dati del cliente</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo etichetta="Nome" name="nome" esito={esito} />
          <Campo etichetta="Cognome" name="cognome" esito={esito} />
          <Campo etichetta="Email" name="email" type="email" esito={esito} aiuto="Il cliente riceve qui il link per pagare." />
          <Campo etichetta="Telefono" name="telefono" type="tel" esito={esito} aiuto="Serve al corriere." />
        </div>
        <Campo etichetta="Indirizzo di spedizione" name="indirizzo" esito={esito} />
        <div className="grid grid-cols-[1fr_2fr_1fr] gap-3">
          <Campo etichetta="CAP" name="cap" esito={esito} inputMode="numeric" />
          <Campo etichetta="Città" name="citta" esito={esito} />
          <Campo etichetta="Prov." name="provincia" esito={esito} maxLength={2} />
        </div>
      </fieldset>
      <div className="rounded-xl border border-bordo bg-superficie p-4 text-sm text-testo-tenue">
        Spedizione {spedizione}, pagata dal cliente. Il cliente vede il totale esatto e accetta l&apos;informativa privacy prima di pagare.
        Se è già seguito da un&apos;altra consulente, l&apos;ordine non si può preparare.
      </div>
      <Pulsante type="submit" disabled={inCorso}>
        {inCorso ? "Preparazione…" : "Prepara l'ordine e manda il link"}
      </Pulsante>
    </form>
  );
}

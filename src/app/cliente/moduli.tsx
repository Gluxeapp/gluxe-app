"use client";

import { useActionState } from "react";
import { chiediConsulenteAzione, ordinaDalProfilo } from "@/app/azioni/clienti";
import { CampiSpedizione } from "@/app/area/ordini/campi-spedizione";
import { SceltaProdotti, type ProdottoVetrina } from "@/components/scelta-prodotti";
import { Avviso, Campo, Pulsante, PulsanteSecondario, type EsitoModulo } from "@/components/ui";
import type { Spedizione } from "@/lib/ordini";

/** Carrello del profilo cliente: prodotti, indirizzo (quello salvato è proposto), codice consulente al primo acquisto. */
export function ModuloCarrello({
  prodotti,
  spedizione,
  serveCodice,
  indirizzo,
}: {
  prodotti: ProdottoVetrina[];
  spedizione: string;
  serveCodice: boolean;
  indirizzo: Spedizione;
}) {
  const [esito, azione, inCorso] = useActionState<EsitoModulo, FormData>(ordinaDalProfilo, {});
  return (
    <form action={azione} className="space-y-8" noValidate>
      {esito.messaggio && <Avviso tipo="errore">{esito.messaggio}</Avviso>}
      <section>
        <h2 className="mb-3 font-titoli text-2xl text-oro-chiaro">I prodotti</h2>
        <SceltaProdotti prodotti={prodotti} valori={esito.valori} />
      </section>
      <CampiSpedizione esito={esito} iniziale={indirizzo} />
      {serveCodice && (
        <Campo
          etichetta="Codice della tua consulente"
          name="codiceConsulente"
          esito={esito}
          placeholder="GL000123"
          autoCapitalize="characters"
          aiuto="Te lo comunica l'azienda: serve solo per il primo acquisto."
        />
      )}
      <div className="rounded-xl border border-bordo bg-superficie p-4 text-sm text-testo-tenue">
        Spedizione {spedizione} per ogni ordine. Il totale esatto lo vedi nella pagina di pagamento sicura (carta, PayPal o Klarna), prima di
        confermare.
      </div>
      <Pulsante type="submit" disabled={inCorso}>
        {inCorso ? "Un momento…" : "Vai al pagamento"}
      </Pulsante>
    </form>
  );
}

/** "Non hai un codice?": la richiesta arriva all'azienda, che ti comunica la tua consulente. */
export function ChiediConsulente() {
  const [esito, azione, inCorso] = useActionState<EsitoModulo, FormData>(chiediConsulenteAzione, {});
  if (esito.ok) return <Avviso tipo="ok">{esito.messaggio}</Avviso>;
  return (
    <form action={azione} className="space-y-3 rounded-xl border border-bordo bg-superficie p-4">
      <p className="text-sm">
        Non hai il codice della tua consulente? <span className="text-testo-tenue">Chiedilo all&apos;azienda: ti contatteremo noi.</span>
      </p>
      {esito.messaggio && <Avviso tipo="errore">{esito.messaggio}</Avviso>}
      <Campo etichetta="La tua città" name="citta" esito={esito} autoComplete="address-level2" />
      <PulsanteSecondario type="submit" disabled={inCorso}>
        {inCorso ? "Invio…" : "Chiedi una consulente"}
      </PulsanteSecondario>
    </form>
  );
}

"use client";

import Image from "next/image";
import { useActionState } from "react";
import { ordinaDalNegozio } from "@/app/azioni/negozio";
import { Avviso, Campo, Pulsante, type EsitoModulo } from "@/components/ui";

type Prodotto = {
  id: string;
  nome: string;
  dettaglio: string;
  descrizione: string | null;
  immagineId: string | null;
  prezzo: string;
  barrato?: string;
  promozione?: string;
};

export function ModuloNegozio({ codice, prodotti, spedizione }: { codice: string; prodotti: Prodotto[]; spedizione: string }) {
  const [esito, azione, inCorso] = useActionState<EsitoModulo, FormData>(ordinaDalNegozio, {});
  const v = esito.valori ?? {};

  return (
    <form action={azione} className="space-y-8" noValidate>
      <input type="hidden" name="negozio" value={codice} />
      {/* Trappola per i programmi automatici: nascosta alle persone. */}
      <div aria-hidden className="hidden">
        <label>
          Sito <input name="sito" tabIndex={-1} autoComplete="off" />
        </label>
      </div>

      {esito.messaggio && <Avviso tipo="errore">{esito.messaggio}</Avviso>}

      <section>
        <h2 className="mb-3 font-titoli text-2xl text-oro-chiaro">I prodotti</h2>
        <ul className="grid gap-4 sm:grid-cols-2">
          {prodotti.map((p) => (
            <li key={p.id} className="flex flex-col rounded-xl border border-bordo bg-superficie p-4">
              <div className="flex gap-4">
                <div className="flex h-32 w-24 shrink-0 items-center justify-center rounded-lg bg-white p-1">
                  {p.immagineId ? (
                    <Image src={`/api/immagini/${p.immagineId}`} alt={p.nome} width={96} height={128} unoptimized className="max-h-full w-auto object-contain" />
                  ) : (
                    <span className="text-xs text-neutral-400">Foto in arrivo</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  {p.promozione && (
                    <p className="mb-1 inline-block rounded-full bg-oro px-2 py-0.5 text-[11px] font-semibold text-nero">{p.promozione}</p>
                  )}
                  <h3 className="font-titoli text-xl leading-tight text-oro-chiaro">{p.nome}</h3>
                  {p.dettaglio && <p className="text-xs text-testo-tenue">{p.dettaglio}</p>}
                  {p.descrizione && <p className="mt-1 line-clamp-3 text-xs text-testo-tenue">{p.descrizione}</p>}
                  <p className="mt-2">
                    {p.barrato && <span className="mr-2 text-xs text-testo-tenue line-through">{p.barrato}</span>}
                    <span className="font-semibold text-oro-chiaro">{p.prezzo}</span>
                  </p>
                </div>
              </div>
              <label htmlFor={`q_${p.id}`} className="mt-3 flex items-center justify-between gap-3 border-t border-bordo pt-3 text-sm text-testo-tenue">
                Quantità
                <input
                  id={`q_${p.id}`}
                  name={`q_${p.id}`}
                  type="number"
                  inputMode="numeric"
                  min={0}
                  max={99}
                  placeholder="0"
                  defaultValue={v[`q_${p.id}`]}
                  className="w-20 rounded-lg border border-bordo bg-nero px-3 py-2 text-center text-lg text-testo"
                />
              </label>
            </li>
          ))}
          {prodotti.length === 0 && <li className="text-testo-tenue">Nessun prodotto disponibile.</li>}
        </ul>
      </section>

      <fieldset className="space-y-3">
        <legend className="mb-2 font-titoli text-2xl text-oro-chiaro">I tuoi dati</legend>
        <div className="grid gap-3 sm:grid-cols-2">
          <Campo etichetta="Nome" name="nome" esito={esito} autoComplete="given-name" />
          <Campo etichetta="Cognome" name="cognome" esito={esito} autoComplete="family-name" />
          <Campo etichetta="Email" name="email" type="email" esito={esito} autoComplete="email" aiuto="Ti mandiamo qui la conferma dell'ordine." />
          <Campo etichetta="Telefono" name="telefono" type="tel" esito={esito} autoComplete="tel" aiuto="Serve al corriere." />
        </div>
        <Campo etichetta="Indirizzo di spedizione" name="indirizzo" esito={esito} autoComplete="street-address" />
        <div className="grid grid-cols-[1fr_2fr_1fr] gap-3">
          <Campo etichetta="CAP" name="cap" esito={esito} inputMode="numeric" autoComplete="postal-code" />
          <Campo etichetta="Città" name="citta" esito={esito} autoComplete="address-level2" />
          <Campo etichetta="Prov." name="provincia" esito={esito} maxLength={2} />
        </div>
      </fieldset>

      <div className="space-y-3">
        <label className="flex items-start gap-3 rounded-lg border border-bordo bg-superficie p-4 text-sm">
          <input type="checkbox" name="privacy" className="mt-1 size-5 shrink-0 accent-oro" defaultChecked={v.privacy === "on"} />
          <span>
            Ho letto l&apos;
            <a href="/privacy#clienti" target="_blank" className="text-oro-chiaro underline">
              informativa privacy
            </a>
            . <span className="text-testo-tenue">(obbligatorio)</span>
            {esito.errori?.privacy && <span className="block text-errore">Spunta la casella per continuare.</span>}
          </span>
        </label>
        <label className="flex items-start gap-3 rounded-lg border border-bordo bg-superficie p-4 text-sm">
          <input type="checkbox" name="consensoContatti" className="mt-1 size-5 shrink-0 accent-oro" defaultChecked={v.consensoContatti === "on"} />
          <span>
            Acconsento che la mia consulente veda email e telefono per contattarmi (consigli, nuovi prodotti).{" "}
            <span className="text-testo-tenue">(facoltativo)</span>
          </span>
        </label>
      </div>

      <div className="rounded-xl border border-bordo bg-superficie p-4 text-sm text-testo-tenue">
        Spedizione {spedizione} per ogni ordine. Il totale esatto lo vedi nella pagina di pagamento sicura (carta, PayPal o
        Klarna), prima di confermare.
      </div>

      <Pulsante type="submit" disabled={inCorso}>
        {inCorso ? "Un momento…" : "Vai al pagamento"}
      </Pulsante>
    </form>
  );
}

import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AttesaConferma } from "@/app/area/ordini/[id]/azioni-ordine";
import { EtichettaStato } from "@/components/etichetta-stato";
import { Avviso, Caricamento, Scheda } from "@/components/ui";
import { formattaEuro } from "@/lib/denaro";
import { ordineDelCliente } from "@/lib/negozio";
import { dataOra, ETICHETTE_STATO, numeroOrdine, ORE_PER_PAGARE } from "@/lib/ordini";
import { AzioniOrdineCliente } from "./azioni";

export const metadata: Metadata = { title: "Il tuo ordine · G LUXE", robots: { index: false } };

/** Pagina dell'ordine per il cliente del negozio: si apre solo con il link segreto ricevuto alla creazione. */
export default function OrdineCliente({ params, searchParams }: PageProps<"/negozio/ordine/[id]">) {
  return (
    <main className="flex flex-1 flex-col">
      <header className="border-b border-bordo bg-superficie">
        <div className="mx-auto flex max-w-xl justify-center px-5 py-6">
          <Image src="/brand/logo-g-luxe.png" alt="G LUXE · Nata per brillare" width={1779} height={899} priority className="w-36" />
        </div>
      </header>
      <div className="mx-auto w-full max-w-xl flex-1 px-4 py-8 sm:px-5">
        <Suspense fallback={<Caricamento />}>
          <Contenuto params={params} searchParams={searchParams} />
        </Suspense>
      </div>
    </main>
  );
}

async function Contenuto({ params, searchParams }: Pick<PageProps<"/negozio/ordine/[id]">, "params" | "searchParams">) {
  const { id } = await params;
  const { c, esito } = await searchParams;
  const codice = typeof c === "string" ? c : "";
  const letto = await ordineDelCliente(id, codice);
  if (!letto) notFound();
  const { ordine, righe, storico, scaduto, consulente } = letto;
  const inAttesa = ordine.stato === "inserito";
  const tornatoDaStripe = esito === "pagato";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-titoli text-3xl font-semibold testo-oro">Ordine {numeroOrdine(ordine.numero)}</h1>
        <EtichettaStato stato={ordine.stato} etichetta={ETICHETTE_STATO[ordine.stato]} />
        <p className="mt-2 text-sm text-testo-tenue">
          La tua consulente: {consulente.nome} ·{" "}
          <Link href={`/negozio/${consulente.codice}`} className="text-oro-chiaro underline">
            torna al negozio
          </Link>
        </p>
      </div>

      {inAttesa && tornatoDaStripe && <AttesaConferma />}
      {inAttesa && !tornatoDaStripe && !scaduto && (
        <Avviso>Da pagare entro {ORE_PER_PAGARE} ore, sulla pagina sicura di Stripe. Salva questa pagina per ritrovare l&apos;ordine.</Avviso>
      )}
      {!inAttesa && ordine.pagatoIl && tornatoDaStripe && (
        <Avviso tipo="ok">Pagamento ricevuto, grazie! Ti abbiamo mandato la conferma via email.</Avviso>
      )}

      <Scheda>
        <ul className="divide-y divide-bordo text-sm">
          {righe.map((r) => (
            <li key={r.id.toString()} className="flex justify-between gap-3 py-2">
              <span>
                {r.quantita} × {r.nome}
                <span className="block text-xs text-testo-tenue">{formattaEuro(r.prezzoUnitarioIvato)} cad.</span>
              </span>
              <span className="whitespace-nowrap">{formattaEuro(r.totaleIvato)}</span>
            </li>
          ))}
          <li className="flex justify-between py-2">
            <span className="text-testo-tenue">Spedizione</span>
            <span>{formattaEuro(ordine.speseSpedizione)}</span>
          </li>
          <li className="flex justify-between py-2 font-semibold">
            <span>Totale (IVA inclusa)</span>
            <span className="text-oro-chiaro">{formattaEuro(ordine.totale)}</span>
          </li>
        </ul>
      </Scheda>

      {inAttesa && !tornatoDaStripe && <AzioniOrdineCliente id={ordine.id} codice={codice} scaduto={scaduto} />}

      <Scheda>
        <h2 className="font-titoli text-xl text-oro-chiaro">Spedizione</h2>
        <p className="mt-2 text-sm">
          {ordine.destinatario}
          <br />
          {ordine.indirizzo}, {ordine.cap} {ordine.citta} ({ordine.provincia})
        </p>
        {ordine.tracciamento && (
          <p className="mt-3 text-sm">
            Corriere <strong>{ordine.corriere}</strong> · tracciamento <strong className="select-all">{ordine.tracciamento}</strong>
          </p>
        )}
        <ul className="mt-3 space-y-1 text-xs text-testo-tenue">
          {storico.map((s, i) => (
            <li key={i} className="flex justify-between gap-3">
              <span>{ETICHETTE_STATO[s.stato]}</span>
              <span>{dataOra(s.creatoIl)}</span>
            </li>
          ))}
        </ul>
      </Scheda>
    </div>
  );
}

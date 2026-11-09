import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { EtichettaStato } from "@/components/etichetta-stato";
import { Caricamento, Scheda } from "@/components/ui";
import { richiediIncaricataOperativa } from "@/lib/accesso";
import { formatta, formattaEuro } from "@/lib/denaro";
import { ordineDelNegozio } from "@/lib/negozio";
import { dataOra, ETICHETTE_STATO, numeroOrdine } from "@/lib/ordini";

/** Ordine di un cliente visto dall'incaricata: prodotti, punti, provvigione e stato. Niente indirizzo (regola 16). */
export default function OrdineNegozio({ params }: PageProps<"/area/negozio/ordine/[id]">) {
  return (
    <>
      <p className="mb-2 text-sm">
        <Link href="/area/negozio" className="text-testo-tenue">
          ← Negozio
        </Link>
      </p>
      <Suspense fallback={<Caricamento />}>
        <Contenuto params={params} />
      </Suspense>
    </>
  );
}

async function Contenuto({ params }: Pick<PageProps<"/area/negozio/ordine/[id]">, "params">) {
  const { incaricato } = await richiediIncaricataOperativa();
  const { id } = await params;
  const letto = await ordineDelNegozio(id, incaricato.id);
  if (!letto) notFound();
  const { ordine, righe, storico } = letto;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-titoli text-3xl font-semibold testo-oro">Ordine {numeroOrdine(ordine.numero)}</h1>
        <EtichettaStato stato={ordine.stato} etichetta={ETICHETTE_STATO[ordine.stato]} />
        <p className="mt-2 text-sm text-testo-tenue">Cliente: {ordine.cliente}</p>
      </div>

      <Scheda>
        <ul className="divide-y divide-bordo text-sm">
          {righe.map((r) => (
            <li key={r.id.toString()} className="flex justify-between gap-3 py-2">
              <span>
                {r.quantita} × {r.nome}
                <span className="block text-xs text-testo-tenue">
                  {formattaEuro(r.prezzoUnitarioIvato)} cad. · {formatta(r.totalePunti)} punti · provvigione {formattaEuro(r.totaleProvvigione)}
                  {r.tipoPrezzo === "promozione" && " · in promozione"}
                </span>
              </span>
              <span className="whitespace-nowrap">{formattaEuro(r.totaleIvato)}</span>
            </li>
          ))}
          <li className="flex justify-between py-2">
            <span className="text-testo-tenue">Spedizione (pagata dal cliente)</span>
            <span>{formattaEuro(ordine.speseSpedizione)}</span>
          </li>
          <li className="flex justify-between py-2 font-semibold">
            <span>Totale</span>
            <span className="text-oro-chiaro">{formattaEuro(ordine.totale)}</span>
          </li>
        </ul>
        <p className="mt-3 text-sm">
          Punti ON: <strong>{formatta(ordine.punti)}</strong> · provvigione online: <strong>{formattaEuro(ordine.provvigione)}</strong>
        </p>
        <p className="mt-1 text-xs text-testo-tenue">Contano nel mese in cui il cliente paga. Se l&apos;ordine viene reso, si stornano.</p>
      </Scheda>

      <Scheda>
        <h2 className="font-titoli text-xl text-oro-chiaro">Storico</h2>
        {ordine.tracciamento && (
          <p className="mt-2 text-sm">
            Corriere <strong>{ordine.corriere}</strong> · tracciamento <strong className="select-all">{ordine.tracciamento}</strong>
          </p>
        )}
        <ul className="mt-2 space-y-1 text-sm">
          {storico.map((s, i) => (
            <li key={i} className="flex justify-between gap-3">
              <span>{ETICHETTE_STATO[s.stato]}</span>
              <span className="text-testo-tenue">{dataOra(s.creatoIl)}</span>
            </li>
          ))}
        </ul>
      </Scheda>
    </div>
  );
}

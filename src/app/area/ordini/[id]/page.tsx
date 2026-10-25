import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { Avviso, Caricamento, Scheda } from "@/components/ui";
import { richiediIncaricato } from "@/lib/accesso";
import { formattaEuro, formatta } from "@/lib/denaro";
import { dataOra, ETICHETTE_STATO, leggiOrdine, numeroOrdine, ORE_PER_PAGARE } from "@/lib/ordini";
import { EtichettaStato } from "@/components/etichetta-stato";
import { AttesaConferma, AzioniOrdine } from "./azioni-ordine";

export default function PaginaOrdine({ params, searchParams }: PageProps<"/area/ordini/[id]">) {
  return (
    <>
      <p className="mb-2 text-sm">
        <Link href="/area/ordini" className="text-testo-tenue">
          ← Ordini
        </Link>
      </p>
      <Suspense fallback={<Caricamento />}>
        <Contenuto params={params} searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Contenuto({ params, searchParams }: Pick<PageProps<"/area/ordini/[id]">, "params" | "searchParams">) {
  const { incaricato } = await richiediIncaricato();
  const { id } = await params;
  const { esito } = await searchParams;
  const letto = await leggiOrdine(id, incaricato.id);
  if (!letto) notFound();
  const { ordine, righe, storico, scaduto } = letto;
  const inAttesa = ordine.stato === "inserito";
  const tornatoDaStripe = esito === "pagato";

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-titoli text-3xl font-semibold testo-oro">Ordine {numeroOrdine(ordine.numero)}</h1>
        <EtichettaStato stato={ordine.stato} etichetta={ETICHETTE_STATO[ordine.stato]} />
      </div>

      {inAttesa && tornatoDaStripe && <AttesaConferma />}
      {inAttesa && !tornatoDaStripe && !scaduto && (
        <Avviso>Da pagare entro {ORE_PER_PAGARE} ore dalla creazione, sulla pagina sicura di Stripe.</Avviso>
      )}
      {!inAttesa && ordine.pagatoIl && tornatoDaStripe && <Avviso tipo="ok">Pagamento ricevuto, grazie!</Avviso>}

      <Scheda>
        <ul className="divide-y divide-bordo text-sm">
          {righe.map((r) => (
            <li key={r.id.toString()} className="flex justify-between gap-3 py-2">
              <span>
                {r.quantita} × {r.nome}
                <span className="block text-xs text-testo-tenue">
                  {formattaEuro(r.prezzoUnitarioIvato)} cad. · {formatta(r.totalePunti)} punti
                  {r.tipoPrezzo === "promozione" && ` · provvigione ${formattaEuro(r.totaleProvvigione)}`}
                </span>
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
        <p className="mt-3 text-xs text-testo-tenue">
          Punti dell&apos;ordine: {formatta(ordine.punti)}
          {ordine.provvigioneAcquisto > 0n &&
            ` · provvigione sui prodotti in promozione: ${formattaEuro(ordine.provvigioneAcquisto)}`}
        </p>
      </Scheda>

      {inAttesa && !tornatoDaStripe && <AzioniOrdine id={ordine.id} scaduto={scaduto} />}

      <Scheda>
        <h2 className="font-titoli text-xl text-oro-chiaro">Spedizione</h2>
        <p className="mt-2 text-sm">
          {ordine.destinatario}
          <br />
          {ordine.indirizzo}, {ordine.cap} {ordine.citta} ({ordine.provincia})
          <br />
          Tel. {ordine.telefono}
        </p>
        {ordine.tracciamento && (
          <p className="mt-3 text-sm">
            Corriere <strong>{ordine.corriere}</strong> · tracciamento{" "}
            <strong className="select-all">{ordine.tracciamento}</strong>
          </p>
        )}
      </Scheda>

      <Scheda>
        <h2 className="font-titoli text-xl text-oro-chiaro">Storico</h2>
        <ul className="mt-2 space-y-1 text-sm">
          {storico.map((s, i) => (
            <li key={i} className="flex justify-between gap-3">
              <span>{ETICHETTE_STATO[s.stato]}</span>
              <span className="text-testo-tenue">{dataOra(s.creatoIl)}</span>
            </li>
          ))}
        </ul>
        {ordine.riordinoConfermatoIl && (
          <p className="mt-3 text-xs text-testo-tenue">
            Riordino responsabile (70%) confermato il {dataOra(ordine.riordinoConfermatoIl)}.
          </p>
        )}
      </Scheda>
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import { AttesaConferma } from "@/app/area/ordini/[id]/azioni-ordine";
import { EtichettaStato } from "@/components/etichetta-stato";
import { Avviso, Caricamento, Scheda } from "@/components/ui";
import { richiediCliente } from "@/lib/accesso";
import { formattaEuro } from "@/lib/denaro";
import { dataOra, ETICHETTE_STATO, numeroOrdine, ORE_PER_PAGARE } from "@/lib/ordini";
import { ordineDelProfilo } from "@/lib/profilo-cliente";
import { AzioniOrdineProfilo } from "./azioni";

export default function OrdineDelProfilo({ params, searchParams }: PageProps<"/cliente/ordini/[id]">) {
  return (
    <>
      <p className="mb-2 text-sm">
        <Link href="/cliente/ordini" className="text-testo-tenue">
          ← I miei ordini
        </Link>
      </p>
      <Suspense fallback={<Caricamento />}>
        <Contenuto params={params} searchParams={searchParams} />
      </Suspense>
    </>
  );
}

async function Contenuto({ params, searchParams }: Pick<PageProps<"/cliente/ordini/[id]">, "params" | "searchParams">) {
  const { cliente } = await richiediCliente();
  const { id } = await params;
  const { esito } = await searchParams;
  const letto = await ordineDelProfilo(id, cliente.id);
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
      {inAttesa && !tornatoDaStripe && !scaduto && <Avviso>Da pagare entro {ORE_PER_PAGARE} ore, sulla pagina sicura di Stripe.</Avviso>}
      {!inAttesa && ordine.pagatoIl && tornatoDaStripe && <Avviso tipo="ok">Pagamento ricevuto, grazie!</Avviso>}

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

      {inAttesa && !tornatoDaStripe && <AzioniOrdineProfilo id={ordine.id} scaduto={scaduto} serveInformativa={!cliente.privacyAccettataIl} />}

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

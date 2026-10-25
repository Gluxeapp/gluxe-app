import Link from "next/link";
import { Suspense } from "react";
import { Caricamento, Titolo } from "@/components/ui";
import { richiediIncaricataOperativa } from "@/lib/accesso";
import { formattaEuro, formatta } from "@/lib/denaro";
import { dataItaliana } from "@/lib/dati-incaricato";
import { ETICHETTE_STATO, numeroOrdine, ordiniDellIncaricata } from "@/lib/ordini";
import { EtichettaStato } from "@/components/etichetta-stato";

export default function Ordini() {
  return (
    <>
      <Titolo sottotitolo="Paghi con carta, PayPal o Klarna. Spedizione 6,90 € a ordine.">Ordini</Titolo>
      <Link href="/area/ordini/nuovo" className="mb-6 block rounded-lg bg-oro py-3 text-center font-semibold text-nero">
        Nuovo ordine
      </Link>
      <Suspense fallback={<Caricamento />}>
        <Elenco />
      </Suspense>
    </>
  );
}

async function Elenco() {
  const { incaricato } = await richiediIncaricataOperativa();
  const elenco = await ordiniDellIncaricata(incaricato.id);
  if (elenco.length === 0) return <p className="text-testo-tenue">Non hai ancora ordini.</p>;
  return (
    <ul className="space-y-3">
      {elenco.map((o) => (
        <li key={o.id}>
          <Link
            href={`/area/ordini/${o.id}`}
            className="flex items-center justify-between gap-3 rounded-xl border border-bordo bg-superficie p-4"
          >
            <div>
              <p className="font-semibold">
                Ordine {numeroOrdine(o.numero)}
                {o.tipo === "start_kit" && <span className="font-normal text-testo-tenue"> · start kit</span>}
              </p>
              <p className="text-xs text-testo-tenue">
                {dataItaliana(o.creatoIl)} · {formatta(o.punti)} punti
              </p>
            </div>
            <div className="text-right">
              <p className="font-semibold text-oro-chiaro">{formattaEuro(o.totale)}</p>
              <EtichettaStato stato={o.stato} etichetta={ETICHETTE_STATO[o.stato]} />
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

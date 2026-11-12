import Link from "next/link";
import { Suspense } from "react";
import { EtichettaStato } from "@/components/etichetta-stato";
import { Caricamento, Scheda, Titolo } from "@/components/ui";
import { richiediCliente } from "@/lib/accesso";
import { formattaEuro } from "@/lib/denaro";
import { dataOra, ETICHETTE_STATO, numeroOrdine } from "@/lib/ordini";
import { ordiniDelProfilo } from "@/lib/profilo-cliente";

export const metadata = { title: "I miei ordini · Clienti G LUXE" };

export default function OrdiniCliente() {
  return (
    <>
      <Titolo>I miei ordini</Titolo>
      <Suspense fallback={<Caricamento />}>
        <Contenuto />
      </Suspense>
    </>
  );
}

async function Contenuto() {
  const { cliente } = await richiediCliente();
  const elenco = await ordiniDelProfilo(cliente.id);
  if (elenco.length === 0) return <p className="text-sm text-testo-tenue">Ancora nessun ordine.</p>;
  return (
    <Scheda className="p-0">
      <ul className="divide-y divide-bordo text-sm">
        {elenco.map((o) => (
          <li key={o.id}>
            <Link href={`/cliente/ordini/${o.id}`} className="flex items-center justify-between gap-3 p-4">
              <span>
                <span className="block font-semibold">Ordine {numeroOrdine(o.numero)}</span>
                <span className="block text-xs text-testo-tenue">{dataOra(o.creatoIl)}</span>
                <EtichettaStato stato={o.stato} etichetta={ETICHETTE_STATO[o.stato]} />
              </span>
              <span className="whitespace-nowrap">{formattaEuro(o.totale)}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Scheda>
  );
}

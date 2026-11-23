import Link from "next/link";
import { Suspense } from "react";
import { Avviso, Caricamento, Titolo } from "@/components/ui";
import { richiediIncaricataOperativa } from "@/lib/accesso";
import { licenzaScaduta, MESSAGGIO_LICENZA_SCADUTA } from "@/lib/licenze";
import { statoNegozio, vetrinaProdotti } from "@/lib/negozio";
import { pagamentiAttivi } from "@/lib/stripe";
import { ModuloOrdinePerCliente } from "./modulo";

export default function OrdinePerCliente() {
  return (
    <>
      <p className="mb-2 text-sm">
        <Link href="/area/negozio" className="text-testo-tenue">
          ← Negozio
        </Link>
      </p>
      <Titolo sottotitolo="Prepari tu l'ordine; il cliente riceve il link e paga lui, a prezzo pieno o in promozione. Per te: punti del negozio e provvigione del 50% dei punti.">
        Ordine per un cliente
      </Titolo>
      <Suspense fallback={<Caricamento />}>
        <Contenuto />
      </Suspense>
    </>
  );
}

async function Contenuto() {
  const { incaricato } = await richiediIncaricataOperativa();
  if (await licenzaScaduta(incaricato.id)) return <Avviso tipo="errore">{MESSAGGIO_LICENZA_SCADUTA}</Avviso>;
  const stato = statoNegozio(incaricato);
  if (!stato.aperto) return <Avviso>Il tuo negozio è chiuso ({stato.motivo}): non puoi preparare ordini per i clienti.</Avviso>;
  if (!pagamentiAttivi()) return <Avviso>Il pagamento online sarà attivo a breve.</Avviso>;
  const vetrina = await vetrinaProdotti();
  return <ModuloOrdinePerCliente prodotti={vetrina.prodotti} spedizione={vetrina.spedizione} />;
}

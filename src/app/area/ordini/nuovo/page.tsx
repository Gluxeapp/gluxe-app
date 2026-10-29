import Link from "next/link";
import { Suspense } from "react";
import { Avviso, Caricamento, Titolo } from "@/components/ui";
import { richiediIncaricataOperativa } from "@/lib/accesso";
import { catalogoIncaricata } from "@/lib/catalogo";
import { formattaEuro, formatta } from "@/lib/denaro";
import { indirizzoDelProfilo, serveConfermaRiordino } from "@/lib/ordini";
import { pagamentiAttivi } from "@/lib/stripe";
import { ModuloNuovoOrdine } from "./modulo-nuovo-ordine";

export default function NuovoOrdine() {
  return (
    <>
      <p className="mb-2 text-sm">
        <Link href="/area/ordini" className="text-testo-tenue">
          ← Ordini
        </Link>
      </p>
      <Titolo sottotitolo="Indica le quantità: prima di pagare vedrai il riepilogo con il totale.">Nuovo ordine</Titolo>
      <Suspense fallback={<Caricamento />}>
        <Contenuto />
      </Suspense>
    </>
  );
}

async function Contenuto() {
  const { incaricato } = await richiediIncaricataOperativa();
  if (!pagamentiAttivi()) {
    return <Avviso>Il pagamento online sarà attivo a breve. Ti avviseremo quando potrai ordinare.</Avviso>;
  }
  const [catalogo, indirizzo, conferma] = await Promise.all([
    catalogoIncaricata(),
    indirizzoDelProfilo(incaricato.id),
    serveConfermaRiordino(incaricato.id),
  ]);
  // Testi già pronti dal server: il browser non calcola nulla.
  const prodotti = catalogo.map(({ prodotto, listino, promozione }) => {
    const prezzi = promozione ? promozione.prezzi : listino;
    return {
      id: prodotto.id,
      nome: prodotto.nome,
      dettaglio: [prodotto.linea, prodotto.formato].filter(Boolean).join(" · "),
      prezzo: formattaEuro(prezzi.incaricata.ivaInclusa),
      punti: formatta(prezzi.incaricata.punti),
      promozione: promozione
        ? `${promozione.titolo}: provvigione ${formattaEuro(promozione.prezzi.provvigioneAcquisto)} a pezzo`
        : undefined,
    };
  });
  return (
    <ModuloNuovoOrdine
      prodotti={prodotti}
      indirizzo={indirizzo}
      serveConferma={conferma}
      sospesa={incaricato.stato === "sospeso"}
    />
  );
}

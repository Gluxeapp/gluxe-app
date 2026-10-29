import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Avviso, Caricamento, Scheda, Titolo } from "@/components/ui";
import { db } from "@/db";
import { prodotti } from "@/db/schema";
import { richiediIncaricato } from "@/lib/accesso";
import { calcolaOrdine } from "@/lib/calcolo-ordine";
import { parametriCorrenti } from "@/lib/catalogo";
import { formattaEuro } from "@/lib/denaro";
import { indirizzoDelProfilo } from "@/lib/ordini";
import { pagamentiAttivi } from "@/lib/stripe";
import { ModuloStartKit } from "./modulo-start-kit";

export default function StartKit() {
  return (
    <>
      <Titolo sottotitolo="Ultimo passo per attivare il tuo account.">Start kit</Titolo>
      <Suspense fallback={<Caricamento />}>
        <Contenuto />
      </Suspense>
    </>
  );
}

async function Contenuto() {
  const { incaricato } = await richiediIncaricato();
  if (incaricato.startKitPagato) redirect("/area");
  const [[kit], parametri, indirizzo] = await Promise.all([
    db()
      .select()
      .from(prodotti)
      .where(and(eq(prodotti.tipo, "start_kit"), eq(prodotti.attivo, true)))
      .limit(1),
    parametriCorrenti(),
    indirizzoDelProfilo(incaricato.id),
  ]);
  if (!kit) return <Avviso tipo="errore">Lo start kit non è disponibile in questo momento: contatta l&apos;azienda.</Avviso>;
  const conto = calcolaOrdine([{ prodotto: kit, quantita: 1 }], "start_kit", parametri);

  return (
    <div className="space-y-6">
      <Scheda>
        <p className="font-titoli text-2xl text-oro-chiaro">{kit.nome}</p>
        {kit.descrizione && <p className="mt-1 text-sm text-testo-tenue">{kit.descrizione}</p>}
        <dl className="mt-4 grid grid-cols-2 gap-y-1 text-sm">
          <dt className="text-testo-tenue">Start kit</dt>
          <dd className="text-right">{formattaEuro(conto.merceIvaInclusa)}</dd>
          <dt className="text-testo-tenue">Spedizione</dt>
          <dd className="text-right">{formattaEuro(conto.speseSpedizione)}</dd>
          <dt className="font-semibold">Totale</dt>
          <dd className="text-right font-semibold text-oro-chiaro">{formattaEuro(conto.totale)}</dd>
        </dl>
        <p className="mt-4 text-xs leading-relaxed text-testo-tenue">
          Con il pagamento il tuo account si attiva: dall&apos;ordine successivo hai lo sconto del 40% e il tuo negozio
          online. Paghi con carta, PayPal o Klarna sulla pagina sicura di Stripe.
        </p>
      </Scheda>
      {pagamentiAttivi() ? (
        <ModuloStartKit indirizzo={indirizzo} />
      ) : (
        <Avviso>Il pagamento online sarà attivo a breve. Ti avviseremo quando potrai procedere.</Avviso>
      )}
    </div>
  );
}

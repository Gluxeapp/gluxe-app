import { Suspense } from "react";
import { Caricamento, Titolo } from "@/components/ui";
import { catalogoIncaricata } from "@/lib/catalogo";
import { dataItaliana } from "@/lib/dati-incaricato";
import { SchedaProdotto } from "../scheda-prodotto";
import { Schede } from "../schede";

export default function Promozioni() {
  return (
    <>
      <Titolo sottotitolo="Prodotti scontati in questo periodo. Sulle promozioni non c'è lo sconto del 40%: se nel mese sei attiva ricevi invece una provvigione anche quando li compri tu.">Prodotti</Titolo>
      <Suspense fallback={<Caricamento />}>
        <Elenco />
      </Suspense>
    </>
  );
}

async function Elenco() {
  const inPromozione = (await catalogoIncaricata()).filter((c) => c.promozione);
  return (
    <>
      <Schede attiva="promo" promoInCorso={inPromozione.length} />
      <div className="space-y-4">
        {inPromozione.map(({ prodotto, promozione }) =>
          promozione ? (
            <SchedaProdotto
              key={prodotto.id}
              {...prodotto}
              prezzi={promozione.prezzi}
              listinoBarrato={prodotto.prezzoListino}
              etichetta={`${promozione.titolo} · fino al ${dataItaliana(promozione.al)}`}
            />
          ) : null,
        )}
        {inPromozione.length === 0 && <p className="text-testo-tenue">Nessuna promozione in corso.</p>}
      </div>
    </>
  );
}

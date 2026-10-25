import { Suspense } from "react";
import { Caricamento, Titolo } from "@/components/ui";
import { catalogoIncaricata } from "@/lib/catalogo";
import { SchedaProdotto } from "./scheda-prodotto";
import { Schede } from "./schede";

export default function Prodotti() {
  return (
    <>
      <Titolo sottotitolo="Prezzi IVA inclusa. Il tuo prezzo ha lo sconto del 40%.">Prodotti</Titolo>
      <Suspense fallback={<Caricamento />}>
        <Elenco />
      </Suspense>
    </>
  );
}

async function Elenco() {
  const catalogo = await catalogoIncaricata();
  const promoInCorso = catalogo.filter((c) => c.promozione).length;
  return (
    <>
      <Schede attiva="listino" promoInCorso={promoInCorso} />
      <div className="space-y-4">
        {catalogo.map(({ prodotto, listino, promozione }) => (
          <SchedaProdotto
            key={prodotto.id}
            {...prodotto}
            prezzi={listino}
            etichetta={promozione ? "In promozione" : undefined}
          />
        ))}
        {catalogo.length === 0 && <p className="text-testo-tenue">Il catalogo è in preparazione.</p>}
      </div>
      <p className="mt-6 text-xs leading-relaxed text-testo-tenue">
        <strong>Punti (tuo acquisto)</strong>: i punti che ottieni comprando il prodotto per te.{" "}
        <strong>Dal tuo negozio</strong>: quanto guadagni e quanti punti ottieni quando un tuo cliente lo compra dal tuo
        negozio online.
      </p>
    </>
  );
}

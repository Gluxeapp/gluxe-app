import { Suspense } from "react";
import { disattivaPromozione } from "@/app/azioni/catalogo";
import { Caricamento, Scheda, Titolo } from "@/components/ui";
import { catalogoStaff, elencoPromozioni } from "@/lib/catalogo";
import { dataItaliana } from "@/lib/dati-incaricato";
import { formattaEuro } from "@/lib/denaro";
import { ModuloPromozione } from "./modulo-promozione";

export default function Promozioni() {
  return (
    <>
      <Titolo sottotitolo="Prezzo al pubblico scontato per un periodo. Sulle promozioni le incaricate non hanno lo sconto del 40%: pagano il prezzo in promozione e, se attive nel mese, ricevono il 50% dei punti come provvigione più la loro percentuale di qualifica.">
        Promozioni
      </Titolo>
      <Suspense fallback={<Caricamento />}>
        <Contenuto />
      </Suspense>
    </>
  );
}

async function Contenuto() {
  const [promozioni, catalogo] = await Promise.all([elencoPromozioni(), catalogoStaff()]);
  const scelte = catalogo
    .filter((c) => c.prodotto.tipo !== "start_kit" && c.prodotto.attivo)
    .map((c) => ({ id: c.prodotto.id, nome: `${c.prodotto.nome} (listino ${formattaEuro(c.prodotto.prezzoListino)})` }));

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_2fr]">
      <Scheda>
        <h2 className="mb-4 font-titoli text-xl text-oro-chiaro">Nuova promozione</h2>
        <ModuloPromozione prodotti={scelte} />
      </Scheda>
      <div className="space-y-3">
        {promozioni.map(({ promozione: p, prodotto, inCorso }) => (
          <Scheda key={p.id} className={p.attiva ? "" : "opacity-50"}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">
                  {p.titolo} <span className="font-normal text-testo-tenue">· {prodotto}</span>
                </p>
                <p className="text-sm text-testo-tenue">
                  {formattaEuro(p.prezzoPromo)} dal {dataItaliana(p.dal)} al {dataItaliana(p.al)} ·{" "}
                  {!p.attiva ? "disattivata" : inCorso ? <span className="text-oro-chiaro">in corso</span> : "non in corso"}
                </p>
              </div>
              {p.attiva && (
                <form action={disattivaPromozione}>
                  <input type="hidden" name="id" value={p.id} />
                  <button className="rounded-lg border border-oro/60 px-3 py-1.5 text-sm text-oro-chiaro">Disattiva</button>
                </form>
              )}
            </div>
          </Scheda>
        ))}
        {promozioni.length === 0 && <p className="text-testo-tenue">Nessuna promozione.</p>}
      </div>
    </div>
  );
}

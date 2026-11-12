import { Suspense } from "react";
import { disattivaPromozione } from "@/app/azioni/catalogo";
import { Caricamento, Scheda, Titolo } from "@/components/ui";
import { richiediStaff } from "@/lib/accesso";
import { catalogoStaff, elencoPromozioni, parametriCorrenti } from "@/lib/catalogo";
import { dataItaliana } from "@/lib/dati-incaricato";
import { formatta, formattaEuro } from "@/lib/denaro";
import { prezziPromozione } from "@/lib/prezzi";
import { ModuloPuntiPromozione } from "../modulo-punti";
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
  const [promozioni, catalogo, parametri, { ruolo }] = await Promise.all([elencoPromozioni(), catalogoStaff(), parametriCorrenti(), richiediStaff()]);
  const amministrazione = ruolo === "amministrazione";
  const scelte = catalogo
    .filter((c) => c.prodotto.tipo === "prodotto" && c.prodotto.attivo)
    .map((c) => ({ id: c.prodotto.id, nome: `${c.prodotto.nome} (listino ${formattaEuro(c.prodotto.prezzoListino)})` }));

  return (
    <div className={amministrazione ? "grid gap-6 lg:grid-cols-[1fr_2fr]" : "grid gap-6"}>
      {amministrazione && (
        <Scheda>
          <h2 className="mb-4 font-titoli text-xl text-oro-chiaro">Nuova promozione</h2>
          <ModuloPromozione prodotti={scelte} />
        </Scheda>
      )}
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
                <p className="text-sm text-testo-tenue">
                  Punti per pezzo: {formatta(prezziPromozione(p.prezzoPromo, parametri, p.puntiManuali).incaricata.punti)}
                  {p.puntiManuali === null ? " (automatici)" : " (a mano)"}
                </p>
              </div>
              {p.attiva && amministrazione && (
                <form action={disattivaPromozione}>
                  <input type="hidden" name="id" value={p.id} />
                  <button className="rounded-lg border border-oro/60 px-3 py-1.5 text-sm text-oro-chiaro">Disattiva</button>
                </form>
              )}
            </div>
            {p.attiva && (
              <ModuloPuntiPromozione
                id={p.id}
                valore={p.puntiManuali === null ? "" : formatta(p.puntiManuali)}
                automatici={formatta(prezziPromozione(p.prezzoPromo, parametri).incaricata.punti)}
              />
            )}
          </Scheda>
        ))}
        {promozioni.length === 0 && <p className="text-testo-tenue">Nessuna promozione.</p>}
      </div>
    </div>
  );
}

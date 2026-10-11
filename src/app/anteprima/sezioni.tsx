"use client";

import { useState } from "react";

const sezioni = [
  {
    id: "listino",
    etichetta: "Listino",
    titolo: "Prodotti a listino",
    descrizione: "Il catalogo G LUXE con prezzo al pubblico, prezzo incaricato e punti di ogni prodotto.",
    fase: 2,
  },
  {
    id: "promo",
    etichetta: "Promo",
    titolo: "Promozioni",
    descrizione: "I prodotti scontati del momento, con date di inizio e fine.",
    fase: 2,
  },
  {
    id: "ordini",
    etichetta: "Ordini",
    titolo: "I miei ordini",
    descrizione: "Nuovo ordine con pagamento con carta, PayPal o Klarna, ed elenco degli ordini con il loro stato.",
    fase: 3,
  },
  {
    id: "carriera",
    etichetta: "Carriera",
    titolo: "La mia carriera",
    descrizione: "Qualifica del mese, punti mancanti per la prossima, avanzamento in percentuale e l'albero della tua rete.",
    fase: 5,
  },
  {
    id: "provvigioni",
    etichetta: "Provvigioni",
    titolo: "Le mie provvigioni",
    descrizione: "Maturate, disponibili, richieste e pagate, voce per voce. Pulsante \"Richiedi pagamento\" dal 10 al 13 del mese.",
    fase: 6,
  },
] as const;

export function SezioniAnteprima() {
  const [attiva, setAttiva] = useState<(typeof sezioni)[number]["id"]>("listino");
  const sezione = sezioni.find((s) => s.id === attiva) ?? sezioni[0];

  return (
    <>
      <main className="flex-1 px-5 py-6 pb-28">
        <h1 className="font-titoli text-3xl font-semibold text-testo">{sezione.titolo}</h1>
        <div className="mt-5 rounded-xl border border-bordo bg-superficie p-5">
          <p className="text-testo-tenue">{sezione.descrizione}</p>
          <p className="mt-4 inline-block rounded-full border border-oro/50 px-3 py-1 text-xs text-oro-chiaro">
            In arrivo nella Fase {sezione.fase}
          </p>
        </div>
      </main>

      <nav
        aria-label="Sezioni"
        className="fixed inset-x-0 bottom-0 grid grid-cols-5 border-t border-bordo bg-superficie pb-[env(safe-area-inset-bottom)]"
      >
        {sezioni.map((s) => (
          <button
            key={s.id}
            type="button"
            onClick={() => setAttiva(s.id)}
            aria-current={s.id === attiva ? "page" : undefined}
            className={`py-4 text-[11px] font-medium tracking-wide ${
              s.id === attiva ? "text-oro-chiaro" : "text-testo-tenue"
            }`}
          >
            {s.etichetta}
          </button>
        ))}
      </nav>
    </>
  );
}

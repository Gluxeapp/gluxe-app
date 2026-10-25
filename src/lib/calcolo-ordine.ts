/**
 * Calcolo di un ordine: righe con prezzi e punti "fotografati" e totali. Modulo puro (niente database),
 * usato dal server quando l'incaricata crea l'ordine. Regole in docs/piano-compensi.md, sezione 2.
 */
import type { Centesimi } from "./denaro";
import type { Parametri } from "./parametri";
import { prezziProdotto, prezziPromozione, prezziStartKit } from "./prezzi";

export const QUANTITA_MASSIMA = 99;

export type TipoOrdineCalcolabile = "start_kit" | "personale";

export type Articolo = {
  prodotto: { id: string; codice: string; nome: string; tipo: "prodotto" | "start_kit"; prezzoListino: Centesimi };
  quantita: number;
  /** Promozione valida oggi per il prodotto, se c'è. */
  promozione?: { id: string; prezzoPromo: Centesimi };
};

export type RigaCalcolata = {
  prodottoId: string;
  codice: string;
  nome: string;
  tipoPrezzo: "listino_scontato" | "promozione" | "start_kit";
  promozioneId: string | null;
  quantita: number;
  prezzoUnitarioIvato: Centesimi;
  prezzoUnitarioIvaEsclusa: Centesimi;
  puntiUnitari: Centesimi;
  provvigioneUnitaria: Centesimi;
  totaleIvato: Centesimi;
  totaleIvaEsclusa: Centesimi;
  totalePunti: Centesimi;
  totaleProvvigione: Centesimi;
};

export class ErroreOrdine extends Error {}

function riga(a: Articolo, p: Parametri): RigaCalcolata {
  const { prodotto, quantita, promozione } = a;
  let tipoPrezzo: RigaCalcolata["tipoPrezzo"];
  let unita: { ivaInclusa: Centesimi; ivaEsclusa: Centesimi; punti: Centesimi };
  let provvigione: Centesimi = 0n;

  if (prodotto.tipo === "start_kit") {
    tipoPrezzo = "start_kit";
    unita = prezziStartKit(prodotto.prezzoListino, p);
  } else if (promozione) {
    tipoPrezzo = "promozione";
    const prezzi = prezziPromozione(promozione.prezzoPromo, p);
    unita = prezzi.incaricata;
    provvigione = prezzi.provvigioneAcquisto;
  } else {
    tipoPrezzo = "listino_scontato";
    unita = prezziProdotto(prodotto.prezzoListino, p).incaricata;
  }

  const q = BigInt(quantita);
  return {
    prodottoId: prodotto.id,
    codice: prodotto.codice,
    nome: prodotto.nome,
    tipoPrezzo,
    promozioneId: tipoPrezzo === "promozione" ? (promozione?.id ?? null) : null,
    quantita,
    prezzoUnitarioIvato: unita.ivaInclusa,
    prezzoUnitarioIvaEsclusa: unita.ivaEsclusa,
    puntiUnitari: unita.punti,
    provvigioneUnitaria: provvigione,
    totaleIvato: unita.ivaInclusa * q,
    totaleIvaEsclusa: unita.ivaEsclusa * q,
    totalePunti: unita.punti * q,
    totaleProvvigione: provvigione * q,
  };
}

const somma = (righe: RigaCalcolata[], campo: keyof RigaCalcolata) =>
  righe.reduce((totale, r) => totale + (r[campo] as Centesimi), 0n);

/** Calcola righe e totali. Lancia ErroreOrdine se l'ordine non è ammesso. */
export function calcolaOrdine(articoli: Articolo[], tipo: TipoOrdineCalcolabile, p: Parametri) {
  if (articoli.length === 0) throw new ErroreOrdine("Scegli almeno un prodotto.");
  for (const a of articoli) {
    if (!Number.isInteger(a.quantita) || a.quantita < 1 || a.quantita > QUANTITA_MASSIMA) {
      throw new ErroreOrdine(`Quantità non valida per ${a.prodotto.nome}: da 1 a ${QUANTITA_MASSIMA}.`);
    }
    if ((tipo === "start_kit") !== (a.prodotto.tipo === "start_kit")) {
      throw new ErroreOrdine(`${a.prodotto.nome} non si può ordinare qui.`);
    }
  }
  if (tipo === "start_kit" && (articoli.length !== 1 || articoli[0].quantita !== 1)) {
    throw new ErroreOrdine("Lo start kit si ordina da solo, in una sola unità.");
  }

  const righe = articoli.map((a) => riga(a, p));
  const merceIvaInclusa = somma(righe, "totaleIvato");
  return {
    righe,
    merceIvaInclusa,
    merceIvaEsclusa: somma(righe, "totaleIvaEsclusa"),
    punti: somma(righe, "totalePunti"),
    provvigioneAcquisto: somma(righe, "totaleProvvigione"),
    speseSpedizione: p.speseSpedizione,
    totale: merceIvaInclusa + p.speseSpedizione,
  };
}

/**
 * Prezzi e punti dei prodotti (docs/piano-compensi.md, sezioni 1 e 2). Modulo puro: niente database.
 * Tutto in centesimi; i punti per una unità, da moltiplicare per la quantità.
 */
import { CENTO_PER_CENTO, percentuale, scorporaIva, type Centesimi } from "./denaro";
import type { Parametri } from "./parametri";

type Prezzo = { ivaInclusa: Centesimi; ivaEsclusa: Centesimi; punti: Centesimi };

function puntiDi(ivaEsclusa: Centesimi, p: Parametri): Centesimi {
  return percentuale(ivaEsclusa, p.coefficientePunti);
}

/** Prezzo al pubblico (ordini dal negozio online) e prezzo per l'acquisto personale dell'incaricata. */
export function prezziProdotto(listinoIvato: Centesimi, p: Parametri) {
  const pubblicoIvaEsclusa = scorporaIva(listinoIvato, p.aliquotaIva);
  const pagaPercentuale = CENTO_PER_CENTO - p.scontoIncaricata;

  let incaricataIvaInclusa: Centesimi;
  let incaricataIvaEsclusa: Centesimi;
  if (p.scontoSuPrezzoIvato) {
    incaricataIvaInclusa = percentuale(listinoIvato, pagaPercentuale);
    incaricataIvaEsclusa = scorporaIva(incaricataIvaInclusa, p.aliquotaIva);
  } else {
    incaricataIvaEsclusa = percentuale(pubblicoIvaEsclusa, pagaPercentuale);
    incaricataIvaInclusa = percentuale(incaricataIvaEsclusa, CENTO_PER_CENTO + p.aliquotaIva);
  }

  const pubblico: Prezzo = { ivaInclusa: listinoIvato, ivaEsclusa: pubblicoIvaEsclusa, punti: puntiDi(pubblicoIvaEsclusa, p) };
  const incaricata: Prezzo = {
    ivaInclusa: incaricataIvaInclusa,
    ivaEsclusa: incaricataIvaEsclusa,
    punti: puntiDi(incaricataIvaEsclusa, p),
  };
  return {
    pubblico,
    incaricata,
    /** Guadagno dell'incaricata che compra a prezzo scontato e rivende a prezzo pieno (solo informativo). */
    margine: listinoIvato - incaricataIvaInclusa,
    /** Provvigione su un pezzo venduto dal negozio online: 50% dei punti. */
    provvigioneOnline: percentuale(pubblico.punti, p.provvigioneOnline),
    /** Provvigione sull'acquisto personale: solo per i prodotti in promozione. */
    provvigioneAcquisto: 0n as Centesimi,
  };
}

/**
 * Prodotto in promozione: niente sconto per l'incaricata (paga il prezzo in promozione), ma
 * riceve come provvigione la stessa percentuale dei punti di una vendita dal negozio (decisione 16).
 */
export function prezziPromozione(prezzoPromoIvato: Centesimi, p: Parametri) {
  const ivaEsclusa = scorporaIva(prezzoPromoIvato, p.aliquotaIva);
  const prezzo: Prezzo = { ivaInclusa: prezzoPromoIvato, ivaEsclusa, punti: puntiDi(ivaEsclusa, p) };
  const provvigione = percentuale(prezzo.punti, p.provvigioneOnline);
  return {
    pubblico: prezzo,
    incaricata: prezzo,
    margine: 0n as Centesimi,
    provvigioneOnline: provvigione,
    provvigioneAcquisto: provvigione,
  };
}

/** Lo start kit ha punti fissi, non calcolati con il coefficiente. */
export function prezziStartKit(prezzoIvato: Centesimi, p: Parametri): Prezzo {
  return { ivaInclusa: prezzoIvato, ivaEsclusa: scorporaIva(prezzoIvato, p.aliquotaIva), punti: p.puntiStartKit };
}

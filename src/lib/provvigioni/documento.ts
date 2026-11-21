/**
 * Importi della ricevuta o fattura proforma delle provvigioni (docs/piano-compensi.md, sezione 8a,
 * decisione 28). Modulo puro: dall'importo lordo richiesto e dal regime dell'incaricata alle righe.
 */
import { percentuale, type Centesimi } from "../denaro";
import type { Parametri } from "../parametri";
import { ritenuta } from "./pagamenti";

export type RegimeFiscale = "nessuna_piva" | "piva_ordinaria" | "piva_forfettaria";
export type TipoDocumento = "ricevuta" | "fattura_ordinaria" | "fattura_forfettaria";

export const TIPO_PER_REGIME: Record<RegimeFiscale, TipoDocumento> = {
  nessuna_piva: "ricevuta",
  piva_ordinaria: "fattura_ordinaria",
  piva_forfettaria: "fattura_forfettaria",
};

export const ETICHETTE_REGIME: Record<RegimeFiscale, string> = {
  nessuna_piva: "Senza partita IVA",
  piva_ordinaria: "Partita IVA, regime ordinario",
  piva_forfettaria: "Partita IVA, regime forfettario",
};

/** Decisione 33: il regime forfettario è incompatibile con l'attività di incaricata (Legge 190/2014). */
export const MESSAGGIO_FORFETTARIO =
  "L'incaricata risulta in regime forfettario, che non è ammesso per le vendite a domicilio (Legge 190/2014): aggiorna il regime nella sua scheda.";

export type ImportiDocumento = {
  tipo: TipoDocumento;
  imponibile: Centesimi;
  /** IVA in fattura (solo regime ordinario). */
  iva: Centesimi;
  ritenuta: Centesimi;
  /** Parte del reddito imponibile (78% delle provvigioni) dell'anno oltre la franchigia INPS, dovuta a questo pagamento. */
  inpsBase: Centesimi;
  /** Quota INPS a carico dell'incaricata (trattenuta) e dell'azienda (costo, report separato). */
  inpsIncaricata: Centesimi;
  inpsAzienda: Centesimi;
  bollo: Centesimi;
  /** Importo del bonifico. */
  totale: Centesimi;
};

/**
 * Contributo INPS gestione separata dei venditori porta a porta (decisione 33): reddito imponibile =
 * base imponibile (78%) delle provvigioni dell'anno; si paga l'aliquota sulla parte oltre la franchigia
 * annua. Progressivo: a questo pagamento va la differenza tra la parte oltre la franchigia dopo e prima.
 * L'azienda paga la sua quota, il resto si trattiene. Con i parametri a zero non c'è contributo.
 */
function inps(imponibile: Centesimi, compensiPrecedentiAnno: Centesimi, p: Parametri) {
  if (p.inpsAliquota === 0n) return { base: 0n, incaricata: 0n, azienda: 0n };
  const oltreFranchigia = (compensi: Centesimi) => {
    const reddito = percentuale(compensi, p.inpsBaseImponibile);
    return reddito > p.inpsSogliaEsenzione ? reddito - p.inpsSogliaEsenzione : 0n;
  };
  const base = oltreFranchigia(compensiPrecedentiAnno + imponibile) - oltreFranchigia(compensiPrecedentiAnno);
  const contributo = percentuale(base, p.inpsAliquota);
  const azienda = percentuale(contributo, p.inpsQuotaAzienda);
  return { base, incaricata: contributo - azienda, azienda };
}

export function importiDocumento(
  imponibile: Centesimi,
  regime: RegimeFiscale,
  p: Parametri,
  compensiPrecedentiAnno: Centesimi = 0n,
): ImportiDocumento {
  if (imponibile <= 0n) throw new RangeError("L'importo del documento deve essere positivo");
  if (regime === "piva_forfettaria") throw new RangeError(MESSAGGIO_FORFETTARIO);
  const iva = regime === "piva_ordinaria" ? percentuale(imponibile, p.aliquotaIva) : 0n;
  const r = ritenuta(imponibile, p).ritenuta;
  const contributi = inps(imponibile, compensiPrecedentiAnno, p);
  const bollo = regime !== "piva_ordinaria" && imponibile > p.bolloSoglia ? p.bolloImporto : 0n;
  return {
    tipo: TIPO_PER_REGIME[regime],
    imponibile,
    iva,
    ritenuta: r,
    inpsBase: contributi.base,
    inpsIncaricata: contributi.incaricata,
    inpsAzienda: contributi.azienda,
    bollo,
    totale: imponibile + iva - r - contributi.incaricata - bollo,
  };
}

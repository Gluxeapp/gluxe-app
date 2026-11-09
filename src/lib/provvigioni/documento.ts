/**
 * Importi della ricevuta o fattura proforma delle provvigioni (docs/piano-compensi.md, sezione 8a,
 * decisione 28). Modulo puro: dall'importo lordo richiesto e dal regime dell'incaricata alle righe.
 */
import { CENTO_PER_CENTO, dividiArrotondando, percentuale, type Centesimi } from "../denaro";
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

export type ImportiDocumento = {
  tipo: TipoDocumento;
  imponibile: Centesimi;
  /** IVA in fattura (solo regime ordinario). */
  iva: Centesimi;
  ritenuta: Centesimi;
  /** Compensi dell'anno oltre la soglia INPS, su cui si calcola il contributo. */
  inpsBase: Centesimi;
  /** Quota INPS a carico dell'incaricata (trattenuta) e dell'azienda (costo, report separato). */
  inpsIncaricata: Centesimi;
  inpsAzienda: Centesimi;
  bollo: Centesimi;
  /** Importo del bonifico. */
  totale: Centesimi;
};

/**
 * Contributo INPS gestione separata: aliquota × base imponibile (% dei compensi) sulla parte dei
 * compensi dell'anno oltre la soglia di esenzione; l'azienda ne paga la sua quota, il resto si trattiene.
 * Con i parametri a zero (in attesa del commercialista) non c'è contributo.
 */
function inps(imponibile: Centesimi, compensiPrecedentiAnno: Centesimi, regime: RegimeFiscale, p: Parametri) {
  if (regime === "piva_forfettaria" || p.inpsAliquota === 0n) return { base: 0n, incaricata: 0n, azienda: 0n };
  const giaOltre = compensiPrecedentiAnno > p.inpsSogliaEsenzione ? compensiPrecedentiAnno - p.inpsSogliaEsenzione : 0n;
  const totaleOltre = compensiPrecedentiAnno + imponibile > p.inpsSogliaEsenzione ? compensiPrecedentiAnno + imponibile - p.inpsSogliaEsenzione : 0n;
  const base = totaleOltre - giaOltre;
  const contributo = dividiArrotondando(base * p.inpsAliquota * p.inpsBaseImponibile, CENTO_PER_CENTO * CENTO_PER_CENTO);
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
  const iva = regime === "piva_ordinaria" ? percentuale(imponibile, p.aliquotaIva) : 0n;
  const r = ritenuta(imponibile, p).ritenuta;
  const contributi = inps(imponibile, compensiPrecedentiAnno, regime, p);
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

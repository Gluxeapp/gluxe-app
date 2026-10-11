/**
 * Importi e punti G LUXE.
 *
 * Tutti gli importi (euro) e i punti si rappresentano come interi in centesimi (`bigint`):
 * 12,50 € → 1250n; 52,87 punti → 5287n. Le percentuali si rappresentano in punti base:
 * 4% → 400n, 12,5% → 1250n, 100% → 10000n.
 *
 * Questo è l'UNICO posto del progetto in cui si arrotonda (CLAUDE.md, regola 3):
 * arrotondamento commerciale, 0,005 va in su. Per i numeri negativi (rettifiche) si arrotonda
 * allo stesso modo ma in negativo, così una rettifica è sempre l'esatto opposto della voce.
 */

export type Centesimi = bigint;
export type PuntiBase = bigint;

export const CENTO_PER_CENTO: PuntiBase = 10000n;

/** Divide due interi arrotondando al più vicino; a metà strada si allontana da zero. */
export function dividiArrotondando(numeratore: bigint, denominatore: bigint): bigint {
  if (denominatore === 0n) throw new RangeError("Divisione per zero");
  if (denominatore < 0n) return dividiArrotondando(-numeratore, -denominatore);
  const negativo = numeratore < 0n;
  const assoluto = negativo ? -numeratore : numeratore;
  const quoziente = (assoluto * 2n + denominatore) / (denominatore * 2n);
  return negativo ? -quoziente : quoziente;
}

/** Applica una percentuale a un importo: percentuale(21148n, 400n) = 846n (211,48 × 4% = 8,46). */
export function percentuale(importo: Centesimi, puntiBase: PuntiBase): Centesimi {
  return dividiArrotondando(importo * puntiBase, CENTO_PER_CENTO);
}

/** Toglie l'IVA da un prezzo ivato: scorporaIva(12900n, 2200n) = 10574n (129,00 ÷ 1,22 = 105,74). */
export function scorporaIva(prezzoIvato: Centesimi, aliquota: PuntiBase): Centesimi {
  return dividiArrotondando(prezzoIvato * CENTO_PER_CENTO, CENTO_PER_CENTO + aliquota);
}

/**
 * Converte un testo all'italiana ("1.234,56", "52,87", "7000") in centesimi.
 * Rifiuta più di 2 decimali e il punto usato come virgola ("52.87"), che sarebbe ambiguo.
 */
export function daTesto(testo: string): Centesimi {
  const pulito = testo.trim().replace(/\s|€/g, "");
  const corrispondenza = /^(-?)(\d{1,3}(?:\.\d{3})+|\d+)(?:,(\d{1,2}))?$/.exec(pulito);
  if (!corrispondenza) throw new RangeError(`Importo non valido: "${testo}"`);
  const [, segno, interi, decimali = ""] = corrispondenza;
  const valore = BigInt(interi.replace(/\./g, "")) * 100n + BigInt(decimali.padEnd(2, "0"));
  return segno === "-" ? -valore : valore;
}

/** Formatta centesimi all'italiana: 123456n → "1.234,56". */
export function formatta(valore: Centesimi): string {
  const negativo = valore < 0n;
  const assoluto = negativo ? -valore : valore;
  const interi = (assoluto / 100n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  const decimali = (assoluto % 100n).toString().padStart(2, "0");
  return `${negativo ? "−" : ""}${interi},${decimali}`;
}

/** Formatta centesimi come euro: 123456n → "1.234,56 €". */
export function formattaEuro(valore: Centesimi): string {
  return `${formatta(valore)} €`;
}

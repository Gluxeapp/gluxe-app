/**
 * Regole dei pagamenti delle provvigioni (docs/piano-compensi.md, sezione 8). Modulo puro.
 * Date come testo "AAAA-MM-GG" del calendario italiano.
 */
import { CENTO_PER_CENTO, dividiArrotondando, type Centesimi } from "../denaro";
import type { Parametri } from "../parametri";

/** Il saldo si può richiedere solo se raggiunge l'importo minimo. */
export function pagamentoRichiedibile(saldo: Centesimi, p: Parametri): boolean {
  return saldo >= p.pagamentoMinimo;
}

/** Ritenuta d'imposta (23% sul 78% = 17,94%), calcolata in modo esatto e arrotondata una volta. */
export function ritenuta(lordo: Centesimi, p: Parametri) {
  const importo = dividiArrotondando(lordo * p.ritenutaAliquota * p.ritenutaBase, CENTO_PER_CENTO * CENTO_PER_CENTO);
  return { lordo, ritenuta: importo, netto: lordo - importo };
}

/** Il pulsante "Richiedi pagamento" è attivo dal giorno X al giorno Y del mese (estremi compresi). */
export function finestraRichiestaAperta(oggi: string, p: Parametri): boolean {
  const giorno = Number(oggi.slice(8, 10));
  return giorno >= p.richiestaDalGiorno && giorno <= p.richiestaAlGiorno;
}

const testo = (d: Date) => d.toISOString().slice(0, 10);

/** Domenica di Pasqua (calcolo gregoriano di Meeus/Jones/Butcher). */
function pasqua(anno: number): Date {
  const a = anno % 19;
  const b = Math.floor(anno / 100);
  const c = anno % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mese = Math.floor((h + l - 7 * m + 114) / 31);
  const giorno = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(anno, mese - 1, giorno));
}

/** Festività nazionali italiane. Il 4 ottobre non si considera (decisione 26). */
function festivi(anno: number): Set<string> {
  const fissi = ["01-01", "01-06", "04-25", "05-01", "06-02", "08-15", "11-01", "12-08", "12-25", "12-26"];
  const lunediAngelo = pasqua(anno);
  lunediAngelo.setUTCDate(lunediAngelo.getUTCDate() + 1);
  return new Set([...fissi.map((g) => `${anno}-${g}`), testo(lunediAngelo)]);
}

/** Giorno di pagamento del mese indicato: il 20, o il primo giorno lavorativo successivo. */
export function dataPagamento(anno: number, mese: number, p: Parametri): string {
  const giorno = new Date(Date.UTC(anno, mese - 1, p.giornoPagamento));
  const chiusi = festivi(anno);
  while (giorno.getUTCDay() === 0 || giorno.getUTCDay() === 6 || chiusi.has(testo(giorno))) {
    giorno.setUTCDate(giorno.getUTCDate() + 1);
  }
  return testo(giorno);
}

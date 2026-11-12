/**
 * Licenza annuale dell'app (docs/piano-compensi.md, sezione 3a, decisione 31). Modulo puro:
 * date come testo "AAAA-MM-GG" del calendario italiano. "Valida fino" è l'ultimo giorno valido, compreso.
 */
import type { Parametri } from "./parametri";

const testo = (d: Date) => d.toISOString().slice(0, 10);
const data = (g: string) => new Date(`${g}T00:00:00Z`);

export function piuGiorni(giorno: string, giorni: number): string {
  const d = data(giorno);
  d.setUTCDate(d.getUTCDate() + giorni);
  return testo(d);
}

/** Stesso giorno N mesi dopo; se quel mese è più corto, il suo ultimo giorno. */
export function piuMesi(giorno: string, mesi: number): string {
  const [a, m, g] = giorno.split("-").map(Number);
  const ultimo = new Date(Date.UTC(a, m - 1 + mesi + 1, 0)).getUTCDate();
  return testo(new Date(Date.UTC(a, m - 1 + mesi, Math.min(g, ultimo))));
}

/** Ultimo giorno del mese "AAAA-MM". */
export function fineMese(mese: string): string {
  const [a, m] = mese.split("-").map(Number);
  return testo(new Date(Date.UTC(a, m, 0)));
}

/** Licenza che parte da un giorno: valida fino al giorno prima dello stesso giorno dopo 12 mesi. */
export function validaFinoDa(inizio: string, p: Parametri): string {
  return piuGiorni(piuMesi(inizio, p.licenzaMesi), -1);
}

/** Rinnovo pagato in un giorno: prima della scadenza si allunga la vecchia, dopo si riparte dal pagamento. */
export function nuovaValidita(validaFino: string | null, pagatoIl: string, p: Parametri): string {
  if (validaFino && pagatoIl <= validaFino) return validaFinoDa(piuGiorni(validaFino, 1), p);
  return validaFinoDa(pagatoIl, p);
}

/** Ultimo giorno per rinnovare: fine del mese successivo a quello in cui la licenza è scaduta. */
export function ultimoGiornoRinnovo(validaFino: string): string {
  const scaduta = piuGiorni(validaFino, 1);
  return fineMese(piuMesi(`${scaduta.slice(0, 7)}-01`, 1).slice(0, 7));
}

/**
 * Validità attuale: l'ultima registrata (start kit e rinnovi). Chi non ne ha (incaricate di prima della Fase 3)
 * parte dalla data di lancio del piano; senza data di lancio, o se esente, la licenza non scade (null).
 */
export function validaFinoAttuale(d: { esente: boolean; rinnovi: string[]; lancio: string | null }, p: Parametri): string | null {
  if (d.esente) return null;
  if (d.rinnovi.length > 0) return [...d.rinnovi].sort().at(-1)!;
  return d.lancio ? validaFinoDa(d.lancio, p) : null;
}

export type StatoLicenza =
  | { stato: "senza_scadenza"; rinnovabile: false }
  | { stato: "valida" | "in_scadenza" | "scaduta" | "decaduta"; validaFino: string; rinnovabile: boolean; rinnovabileDal: string; rinnovabileFino: string };

export function statoLicenza(validaFino: string | null, oggi: string, p: Parametri): StatoLicenza {
  if (!validaFino) return { stato: "senza_scadenza", rinnovabile: false };
  const rinnovabileDal = piuGiorni(validaFino, -p.licenzaAnticipoGiorni);
  const rinnovabileFino = ultimoGiornoRinnovo(validaFino);
  const stato = oggi < rinnovabileDal ? "valida" : oggi <= validaFino ? "in_scadenza" : oggi <= rinnovabileFino ? "scaduta" : "decaduta";
  return { stato, validaFino, rinnovabile: stato === "in_scadenza" || stato === "scaduta", rinnovabileDal, rinnovabileFino };
}

/** Giorni mancanti se oggi è un giorno di avviso (30 o 7 giorni prima della scadenza), altrimenti null. */
export function avvisoDiOggi(validaFino: string | null, oggi: string, p: Parametri): number | null {
  if (!validaFino) return null;
  return [p.licenzaPrimoAvvisoGiorni, p.licenzaSecondoAvvisoGiorni].find((g) => piuGiorni(validaFino, -g) === oggi) ?? null;
}

/** Mese fermo: la licenza è scaduta all'ultimo giorno del mese. */
export function meseFermo(validaFino: string | null, mese: string): boolean {
  return validaFino !== null && validaFino < fineMese(mese);
}

/** La licenza decade con la chiusura di questo mese (o di uno successivo, se le chiusure sono in ritardo). */
export function decadeConLaChiusura(validaFino: string | null, mese: string): boolean {
  return validaFino !== null && ultimoGiornoRinnovo(validaFino) <= fineMese(mese);
}

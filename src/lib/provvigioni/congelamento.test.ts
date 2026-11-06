import { describe, expect, test } from "vitest";
import { PARAMETRI_INIZIALI as P } from "../parametri";
import { datiDaFotografia, fotografaMese, stornoIncrementale } from "./congelamento";
import { calcolaMese, calcolaStorno, VOCI_NON_STORNABILI, type DatiMese, type Voce } from "./motore";

const c = (n: number) => BigInt(Math.round(n * 100));

// Una piccola rete con figure speciali, per toccare tutte le parti della fotografia.
const mese: DatiMese = {
  mese: "2026-11",
  parametri: P,
  incaricate: [
    { id: "gio", sponsorId: null },
    { id: "anna", sponsorId: "gio" },
    { id: "bea", sponsorId: "anna" },
    { id: "cleo", sponsorId: "anna", sospesa: true },
  ],
  ordini: [
    { id: "o1", incaricataId: "anna", tipo: "online", punti: c(91.14), puntiPromo: 0n, imponibile: c(113.93) },
    { id: "o2", incaricataId: "anna", tipo: "online", punti: c(91.14), puntiPromo: 0n, imponibile: c(113.93) },
    { id: "o3", incaricataId: "bea", tipo: "personale", punti: c(53.35), puntiPromo: c(18.3), imponibile: c(66.69) },
    { id: "o4", incaricataId: "bea", tipo: "start_kit", punti: c(33), puntiPromo: 0n, imponibile: c(49.1) },
    { id: "o5", incaricataId: "cleo", tipo: "online", punti: c(70.1), puntiPromo: 0n, imponibile: c(87.62) },
  ],
  bloccate: [{ incaricataId: "gio", percentuale: 2000n }],
  fondatori: [{ incaricataId: "anna", ingresso: "2026-10-01", decadeDal: null }],
  quoteSpeciali: [{ incaricataId: "gio", tipo: "master_president", percentuale: 200n, soloSeAttiva: false }],
  esclusiPool: ["gio"],
  esclusiBonusAuto: ["gio"],
};

const somma = (voci: Voce[]) => voci.reduce((t, v) => t + v.importo, 0n);

describe("Fotografia del mese chiuso", () => {
  test("passa per il JSON del database e ridà lo stesso calcolo al centesimo", () => {
    const json = JSON.parse(JSON.stringify(fotografaMese(mese)));
    const riletto = datiDaFotografia(json);
    expect(riletto).toEqual(mese);
    expect(calcolaMese(riletto)).toEqual(calcolaMese(mese));
  });

  test("una fotografia non valida si rifiuta", () => {
    expect(() => datiDaFotografia({ mese: "2026-11" })).toThrow();
  });
});

describe("Storni fatti in momenti diversi", () => {
  test("la somma degli storni a rate è uguale allo storno di tutti insieme", () => {
    const aRate = [...stornoIncrementale(mese, [], ["o1"]), ...stornoIncrementale(mese, ["o1"], ["o3"]), ...stornoIncrementale(mese, ["o1", "o3"], ["o5"])];
    expect(somma(aRate)).toBe(somma(calcolaStorno(mese, ["o1", "o3", "o5"])));
  });

  test("il primo storno è uguale allo storno normale", () => {
    expect(stornoIncrementale(mese, [], ["o2"])).toEqual(calcolaStorno(mese, ["o2"]));
  });

  test("tutto reso a rate: le voci stornabili del mese tornano a zero", () => {
    const originale = calcolaMese(mese).voci.filter((v) => !VOCI_NON_STORNABILI.includes(v.tipo));
    const ids = mese.ordini.map((o) => o.id);
    const storni = ids.flatMap((id, i) => stornoIncrementale(mese, ids.slice(0, i), [id]));
    expect(somma(originale) + somma(storni)).toBe(0n);
    expect(storni.some((v) => VOCI_NON_STORNABILI.includes(v.tipo))).toBe(false);
  });
});

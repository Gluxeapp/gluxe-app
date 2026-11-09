import { describe, expect, test } from "vitest";
import { PARAMETRI_INIZIALI as P } from "../parametri";
import { importiDocumento } from "./documento";

const c = (n: number) => BigInt(Math.round(n * 100));

describe("Ricevuta o fattura delle provvigioni (sezione 8a)", () => {
  test("T13 ritenuta su 100 € senza partita IVA (bollo dovuto oltre 77,47 €)", () => {
    expect(importiDocumento(c(100), "nessuna_piva", P)).toMatchObject({ ritenuta: c(17.94), bollo: c(2), totale: c(80.06) });
  });

  test("T21 ricevuta senza partita IVA: 104,87 € → 84,06 €", () => {
    expect(importiDocumento(c(104.87), "nessuna_piva", P)).toEqual({
      tipo: "ricevuta",
      imponibile: c(104.87),
      iva: 0n,
      ritenuta: c(18.81),
      inpsBase: 0n,
      inpsIncaricata: 0n,
      inpsAzienda: 0n,
      bollo: c(2),
      totale: c(84.06),
    });
  });

  test("T22 ricevuta sotto la soglia del bollo: 60,00 € → 49,24 €", () => {
    expect(importiDocumento(c(60), "nessuna_piva", P)).toMatchObject({ ritenuta: c(10.76), bollo: 0n, totale: c(49.24) });
  });

  test("bollo: a 77,47 € esatti non è dovuto, a 77,48 € sì", () => {
    expect(importiDocumento(c(77.47), "nessuna_piva", P).bollo).toBe(0n);
    expect(importiDocumento(c(77.48), "nessuna_piva", P).bollo).toBe(c(2));
  });

  test("T23 fattura partita IVA ordinaria: 132,20 € → 137,56 €", () => {
    expect(importiDocumento(c(132.2), "piva_ordinaria", P)).toEqual({
      tipo: "fattura_ordinaria",
      imponibile: c(132.2),
      iva: c(29.08),
      ritenuta: c(23.72),
      inpsBase: 0n,
      inpsIncaricata: 0n,
      inpsAzienda: 0n,
      bollo: 0n,
      totale: c(137.56),
    });
  });

  test("T24 fattura forfettaria: niente IVA, bollo: 132,20 € → 106,48 €", () => {
    expect(importiDocumento(c(132.2), "piva_forfettaria", P)).toMatchObject({
      tipo: "fattura_forfettaria",
      iva: 0n,
      ritenuta: c(23.72),
      bollo: c(2),
      totale: c(106.48),
    });
  });

  test("INPS con parametri impostati: solo sulla parte oltre la soglia annua, un terzo trattenuto", () => {
    const p = { ...P, inpsAliquota: 3372n, inpsBaseImponibile: 7800n, inpsQuotaAzienda: 6667n, inpsSogliaEsenzione: c(5000) };
    // Già 4.900 € nell'anno: dei 300 € solo 200 sono oltre la soglia. 200 × 33,72% × 78% = 52,60; azienda 2/3 = 35,07.
    const d = importiDocumento(c(300), "piva_ordinaria", p, c(4900));
    expect(d).toMatchObject({ inpsBase: c(200), inpsIncaricata: c(17.53), inpsAzienda: c(35.07) });
    expect(d.totale).toBe(c(300) + c(66) - c(53.82) - c(17.53));
    // Sotto la soglia nessun contributo; per le forfettarie mai.
    expect(importiDocumento(c(300), "nessuna_piva", p, c(1000)).inpsIncaricata).toBe(0n);
    expect(importiDocumento(c(300), "piva_forfettaria", p, c(9000)).inpsBase).toBe(0n);
  });

  test("importo non positivo: errore", () => {
    expect(() => importiDocumento(0n, "nessuna_piva", P)).toThrow();
  });
});

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

  test("T24 regime forfettario non ammesso (decisione 33): nessun documento", () => {
    expect(() => importiDocumento(c(132.2), "piva_forfettaria", P)).toThrow();
  });

  // Decisione 33: INPS sul reddito imponibile (78% delle provvigioni) oltre la franchigia di 5.000 € l'anno.
  const PI = { ...P, inpsAliquota: 3372n, inpsBaseImponibile: 7800n, inpsQuotaAzienda: 6667n, inpsSogliaEsenzione: c(5000) };

  test("T29 INPS oltre la franchigia: 6.000 € già pagati + 1.000 € → 988,90 €", () => {
    expect(importiDocumento(c(1000), "piva_ordinaria", PI, c(6000))).toEqual({
      tipo: "fattura_ordinaria",
      imponibile: c(1000),
      iva: c(220),
      ritenuta: c(179.4),
      inpsBase: c(460),
      inpsIncaricata: c(51.7),
      inpsAzienda: c(103.41),
      bollo: 0n,
      totale: c(988.9),
    });
  });

  test("T30 INPS già oltre la franchigia, senza partita IVA: 300 € → 217,88 €", () => {
    expect(importiDocumento(c(300), "nessuna_piva", PI, c(10000))).toEqual({
      tipo: "ricevuta",
      imponibile: c(300),
      iva: 0n,
      ritenuta: c(53.82),
      inpsBase: c(234),
      inpsIncaricata: c(26.3),
      inpsAzienda: c(52.6),
      bollo: c(2),
      totale: c(217.88),
    });
  });

  test("T30 INPS sotto la franchigia e al confine dei 5.000 € di reddito", () => {
    expect(importiDocumento(c(300), "nessuna_piva", PI, c(1000))).toMatchObject({ inpsBase: 0n, inpsIncaricata: 0n, inpsAzienda: 0n });
    expect(importiDocumento(c(6410.26), "piva_ordinaria", PI).inpsBase).toBe(0n);
    expect(importiDocumento(c(6410.27), "piva_ordinaria", PI).inpsBase).toBe(c(0.01));
  });

  test("INPS progressivo: pagamenti spezzati danno lo stesso reddito soggetto di un pagamento unico", () => {
    const unico = importiDocumento(c(9000), "piva_ordinaria", PI, c(1000)).inpsBase;
    const primo = importiDocumento(c(4000), "piva_ordinaria", PI, c(1000)).inpsBase;
    const secondo = importiDocumento(c(5000), "piva_ordinaria", PI, c(5000)).inpsBase;
    expect(primo + secondo).toBe(unico);
  });

  test("senza IVA per chi non ha la partita IVA (decisione 33)", () => {
    expect(importiDocumento(c(500), "nessuna_piva", PI).iva).toBe(0n);
  });

  test("importo non positivo: errore", () => {
    expect(() => importiDocumento(0n, "nessuna_piva", P)).toThrow();
  });
});

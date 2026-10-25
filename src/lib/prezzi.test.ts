import { describe, expect, it } from "vitest";
import { PARAMETRI_INIZIALI as P, parametriDaJson, parametriInJson } from "./parametri";
import { prezziProdotto, prezziStartKit } from "./prezzi";

describe("prezzi e punti (piano rev. 5)", () => {
  it("kit routine 139,00 €: 113,93 € IVA esclusa, 91,14 punti, provvigione online 45,57 € (caso T1)", () => {
    const p = prezziProdotto(13900n, P);
    expect(p.pubblico.ivaEsclusa).toBe(11393n);
    expect(p.pubblico.punti).toBe(9114n);
    expect(p.provvigioneOnline).toBe(4557n);
    // 4 kit: 364,56 punti (arrotondamento per unità, poi × quantità)
    expect(p.pubblico.punti * 4n).toBe(36456n);
  });

  it("shampoo 32,90 €: incaricata paga 19,74 € (−40%), 16,18 € IVA esclusa, 12,94 punti (caso T8)", () => {
    const p = prezziProdotto(3290n, P);
    expect(p.incaricata.ivaInclusa).toBe(1974n);
    expect(p.incaricata.ivaEsclusa).toBe(1618n);
    expect(p.incaricata.punti).toBe(1294n);
    expect(p.margine).toBe(3290n - 1974n);
  });

  it("sconto sul prezzo IVA esclusa (parametro alternativo)", () => {
    const p = prezziProdotto(3290n, { ...P, scontoSuPrezzoIvato: false });
    // 32,90 → 26,97 € IVA esclusa → −40% = 16,18 € → 19,74 € IVA inclusa
    expect(p.incaricata.ivaEsclusa).toBe(1618n);
    expect(p.incaricata.ivaInclusa).toBe(1974n);
  });

  it("start kit 59,90 €: 33 punti fissi, nessuna provvigione online", () => {
    const k = prezziStartKit(5990n, P);
    expect(k.ivaEsclusa).toBe(4910n);
    expect(k.punti).toBe(3300n);
  });

  it("i parametri si salvano e si rileggono uguali", () => {
    expect(parametriDaJson(parametriInJson(P))).toEqual(P);
  });
});

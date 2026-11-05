import { describe, expect, it } from "vitest";
import { PARAMETRI_INIZIALI as P, parametriDaJson, parametriInJson } from "./parametri";
import { prezziProdotto, prezziPromozione, prezziStartKit } from "./prezzi";

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

  it("prodotto in promozione a 27,90 €: l'incaricata paga 27,90 €, 18,30 punti, provvigione 9,15 € (caso T16)", () => {
    const p = prezziPromozione(2790n, P);
    expect(p.incaricata.ivaInclusa).toBe(2790n);
    expect(p.incaricata.ivaEsclusa).toBe(2287n);
    expect(p.incaricata.punti).toBe(1830n);
    expect(p.provvigioneAcquisto).toBe(915n);
    expect(p.provvigioneOnline).toBe(915n);
    expect(p.margine).toBe(0n);
  });

  it("punti scritti a mano dalla sede: acquisto personale e vendita online separati (decisione 27)", () => {
    const p = prezziProdotto(3390n, P, { personale: 1500n, online: 2500n });
    expect(p.incaricata.punti).toBe(1500n);
    expect(p.pubblico.punti).toBe(2500n);
    // La provvigione online resta il 50% dei punti, anche se scritti a mano.
    expect(p.provvigioneOnline).toBe(1250n);
    // I prezzi non cambiano.
    expect(p.incaricata.ivaInclusa).toBe(2034n);
    expect(p.pubblico.ivaEsclusa).toBe(2779n);
  });

  it("punti a mano vuoti: resta il calcolo automatico (Shampoo Botox 33,90 €)", () => {
    const p = prezziProdotto(3390n, P, { personale: null, online: 2500n });
    expect(p.incaricata.punti).toBe(1334n);
    expect(p.pubblico.punti).toBe(2500n);
    const automatico = prezziProdotto(3390n, P);
    expect(automatico.pubblico.punti).toBe(2223n);
    expect(automatico.incaricata.punti).toBe(1334n);
  });

  it("promozione con punti a mano: valgono per acquisto personale e online, provvigione 50%", () => {
    const p = prezziPromozione(2790n, P, 2000n);
    expect(p.incaricata.punti).toBe(2000n);
    expect(p.pubblico.punti).toBe(2000n);
    expect(p.provvigioneAcquisto).toBe(1000n);
    expect(prezziPromozione(2790n, P, null).incaricata.punti).toBe(1830n);
  });

  it("i parametri si salvano e si rileggono uguali", () => {
    expect(parametriDaJson(parametriInJson(P))).toEqual(P);
  });
});

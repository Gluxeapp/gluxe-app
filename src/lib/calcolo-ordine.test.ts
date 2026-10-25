import { describe, expect, test } from "vitest";
import { calcolaOrdine, type Articolo } from "./calcolo-ordine";
import { PARAMETRI_INIZIALI as p } from "./parametri";

const shampoo = { id: "s", codice: "HB-SH", nome: "Shampoo", tipo: "prodotto" as const, prezzoListino: 3290n };
const kitRoutine = { id: "k", codice: "KR", nome: "Kit routine", tipo: "prodotto" as const, prezzoListino: 13900n };
const startKit = { id: "sk", codice: "KIT", nome: "Start kit", tipo: "start_kit" as const, prezzoListino: 5990n };

describe("calcolaOrdine", () => {
  test("acquisto personale a listino: sconto 40%, punti per unità × quantità, spedizione a parte", () => {
    const articoli: Articolo[] = [{ prodotto: shampoo, quantita: 3 }];
    const o = calcolaOrdine(articoli, "personale", p);
    expect(o.righe[0]).toMatchObject({
      tipoPrezzo: "listino_scontato",
      prezzoUnitarioIvato: 1974n,
      prezzoUnitarioIvaEsclusa: 1618n,
      puntiUnitari: 1294n,
      provvigioneUnitaria: 0n,
      totaleIvato: 5922n,
      totaleIvaEsclusa: 4854n,
      totalePunti: 3882n,
      totaleProvvigione: 0n,
    });
    expect(o.merceIvaInclusa).toBe(5922n);
    expect(o.speseSpedizione).toBe(690n);
    expect(o.totale).toBe(6612n);
    expect(o.punti).toBe(3882n);
  });

  test("T16: prodotto in promozione, niente sconto, provvigione 50% dei punti", () => {
    const o = calcolaOrdine([{ prodotto: shampoo, quantita: 1, promozione: { id: "pr", prezzoPromo: 2790n } }], "personale", p);
    expect(o.righe[0]).toMatchObject({
      tipoPrezzo: "promozione",
      promozioneId: "pr",
      prezzoUnitarioIvato: 2790n,
      prezzoUnitarioIvaEsclusa: 2287n,
      puntiUnitari: 1830n,
      provvigioneUnitaria: 915n,
    });
    expect(o.provvigioneAcquisto).toBe(915n);
    expect(o.totale).toBe(2790n + 690n);
  });

  test("T8: start kit con 33 punti fissi e spedizione", () => {
    const o = calcolaOrdine([{ prodotto: startKit, quantita: 1 }], "start_kit", p);
    expect(o.righe[0]).toMatchObject({ tipoPrezzo: "start_kit", prezzoUnitarioIvato: 5990n, prezzoUnitarioIvaEsclusa: 4910n, puntiUnitari: 3300n });
    expect(o.punti).toBe(3300n);
    expect(o.totale).toBe(5990n + 690n);
  });

  test("più righe: i totali sono la somma delle righe già arrotondate", () => {
    const o = calcolaOrdine(
      [
        { prodotto: kitRoutine, quantita: 2 },
        { prodotto: shampoo, quantita: 1 },
      ],
      "personale",
      p,
    );
    // Kit routine 139,00 → 83,40 IVA inclusa → 68,36 IVA esclusa → 54,69 punti
    expect(o.righe[0]).toMatchObject({ prezzoUnitarioIvato: 8340n, prezzoUnitarioIvaEsclusa: 6836n, puntiUnitari: 5469n });
    expect(o.merceIvaInclusa).toBe(8340n * 2n + 1974n);
    expect(o.merceIvaEsclusa).toBe(6836n * 2n + 1618n);
    expect(o.punti).toBe(5469n * 2n + 1294n);
  });

  test("rifiuta ordini vuoti, quantità fuori limite e prodotti del tipo sbagliato", () => {
    expect(() => calcolaOrdine([], "personale", p)).toThrow();
    expect(() => calcolaOrdine([{ prodotto: shampoo, quantita: 0 }], "personale", p)).toThrow();
    expect(() => calcolaOrdine([{ prodotto: shampoo, quantita: 100 }], "personale", p)).toThrow();
    expect(() => calcolaOrdine([{ prodotto: startKit, quantita: 1 }], "personale", p)).toThrow();
    expect(() => calcolaOrdine([{ prodotto: shampoo, quantita: 1 }], "start_kit", p)).toThrow();
    expect(() => calcolaOrdine([{ prodotto: startKit, quantita: 2 }], "start_kit", p)).toThrow();
  });
});

import { describe, expect, test } from "vitest";
import { PARAMETRI_INIZIALI as P } from "../parametri";
import { dataPagamento, datiF24, finestraRichiestaAperta, pagamentoRichiedibile, ritenuta } from "./pagamenti";

describe("Pagamenti delle provvigioni (sezione 8)", () => {
  test("T9 Pagamento minimo: 42 € non si possono richiedere, 50 € sì", () => {
    expect(pagamentoRichiedibile(4200n, P)).toBe(false);
    expect(pagamentoRichiedibile(5000n, P)).toBe(true);
    expect(pagamentoRichiedibile(-1000n, P)).toBe(false);
  });

  test("T13 Ritenuta 23% sul 78%: 100,00 € → 17,94 di ritenuta, 82,06 di bonifico", () => {
    expect(ritenuta(10000n, P)).toEqual({ lordo: 10000n, ritenuta: 1794n, netto: 8206n });
    expect(ritenuta(4999n, P).ritenuta).toBe(897n); // 49,99 × 17,94% = 8,968... → 8,97
  });

  test("T14 Data di pagamento: il 20 dicembre 2026 è domenica → lunedì 21", () => {
    expect(dataPagamento(2026, 12, P)).toBe("2026-12-21");
  });

  test("festivi e fine settimana spostano il pagamento al primo giorno lavorativo", () => {
    expect(dataPagamento(2026, 11, P)).toBe("2026-11-20"); // venerdì
    expect(dataPagamento(2027, 3, P)).toBe("2027-03-22"); // 20 sabato → lunedì 22
    expect(dataPagamento(2027, 6, P)).toBe("2027-06-21"); // 20 domenica → lunedì 21
  });

  test("T25 F24: codice 1038, mese e anno dei pagamenti, scadenza il 16 del mese dopo (sabato → lunedì)", () => {
    expect(datiF24("2026-12", [1881n, 2372n])).toEqual({
      codiceTributo: "1038",
      meseRiferimento: "0012",
      annoRiferimento: "2026",
      importo: 4253n,
      scadenza: "2027-01-18",
    });
    expect(datiF24("2026-11", []).scadenza).toBe("2026-12-16"); // mercoledì
    expect(datiF24("2027-07", []).scadenza).toBe("2027-08-16"); // lunedì: Ferragosto è domenica 15
  });

  test("finestra di richiesta dal 3 al 6", () => {
    expect(finestraRichiestaAperta("2026-12-02", P)).toBe(false);
    expect(finestraRichiestaAperta("2026-12-03", P)).toBe(true);
    expect(finestraRichiestaAperta("2026-12-06", P)).toBe(true);
    expect(finestraRichiestaAperta("2026-12-07", P)).toBe(false);
  });
});

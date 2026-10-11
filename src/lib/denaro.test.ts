import { describe, expect, it } from "vitest";
import {
  daTesto,
  dividiArrotondando,
  formattaEuro,
  percentuale,
  scorporaIva,
} from "./denaro";

describe("arrotondamento commerciale", () => {
  it("0,005 va in su", () => {
    expect(dividiArrotondando(5n, 10n)).toBe(1n);
    expect(dividiArrotondando(4n, 10n)).toBe(0n);
    expect(dividiArrotondando(15n, 10n)).toBe(2n);
  });

  it("le rettifiche negative sono l'opposto esatto delle voci", () => {
    expect(dividiArrotondando(-5n, 10n)).toBe(-1n);
    expect(dividiArrotondando(-15n, 10n)).toBe(-2n);
    expect(percentuale(-21148n, 400n)).toBe(-percentuale(21148n, 400n));
  });

  it("rifiuta la divisione per zero", () => {
    expect(() => dividiArrotondando(1n, 0n)).toThrow(RangeError);
  });
});

describe("esempi del piano compensi", () => {
  it("prezzo netto: 129,00 € ÷ 1,22 = 105,74 €", () => {
    expect(scorporaIva(12900n, 2200n)).toBe(10574n);
  });

  it("prezzo incaricato: 105,74 € × 50% = 52,87 €", () => {
    expect(percentuale(10574n, 5000n)).toBe(5287n);
  });

  it("4 kit = 211,48 punti; qualifica 4% = 8,46 € (T1)", () => {
    expect(5287n * 4n).toBe(21148n);
    expect(percentuale(21148n, 400n)).toBe(846n);
  });

  it("reso di un kit: 158,61 × 4% = 6,34 €, rettifica 2,12 € (T8)", () => {
    expect(percentuale(15861n, 400n)).toBe(634n);
    expect(percentuale(21148n, 400n) - percentuale(15861n, 400n)).toBe(212n);
  });

  it("differenza su un inattivo: 30 × 8% = 2,40 € (T6)", () => {
    expect(percentuale(3000n, 800n)).toBe(240n);
  });
});

describe("lettura e scrittura degli importi", () => {
  it("legge importi scritti all'italiana", () => {
    expect(daTesto("52,87")).toBe(5287n);
    expect(daTesto("1.234,5")).toBe(123450n);
    expect(daTesto("7000")).toBe(700000n);
    expect(daTesto("-54,99 €")).toBe(-5499n);
  });

  it("rifiuta importi con più di due decimali o non numerici", () => {
    expect(() => daTesto("8,4592")).toThrow(RangeError);
    expect(() => daTesto("abc")).toThrow(RangeError);
    expect(() => daTesto("52.87")).toThrow(RangeError);
  });

  it("formatta in euro", () => {
    expect(formattaEuro(427000n)).toBe("4.270,00 €");
    expect(formattaEuro(5n)).toBe("0,05 €");
    expect(formattaEuro(-5499n)).toBe("−54,99 €");
  });
});

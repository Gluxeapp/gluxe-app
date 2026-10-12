import { describe, expect, it } from "vitest";
import {
  codiceFiscaleValido,
  ibanValido,
  partitaIvaValida,
  problemaPassword,
} from "./validazioni";

describe("codice fiscale", () => {
  it("accetta codici corretti, anche minuscoli o con spazi", () => {
    expect(codiceFiscaleValido("RSSMRA85T10A562S")).toBe(true);
    expect(codiceFiscaleValido("rssmra85t10a562s")).toBe(true);
    expect(codiceFiscaleValido("RSS MRA 85T10 A562S")).toBe(true);
  });

  it("rifiuta carattere di controllo sbagliato e formati errati", () => {
    expect(codiceFiscaleValido("RSSMRA85T10A562X")).toBe(false);
    expect(codiceFiscaleValido("RSSMRA85T10A562")).toBe(false);
    expect(codiceFiscaleValido("")).toBe(false);
  });
});

describe("IBAN", () => {
  it("accetta IBAN corretti", () => {
    expect(ibanValido("IT60X0542811101000000123456")).toBe(true);
    expect(ibanValido("it60 x054 2811 1010 0000 0123 456")).toBe(true);
    expect(ibanValido("DE89370400440532013000")).toBe(true);
  });

  it("rifiuta IBAN con una cifra sbagliata o lunghezza errata", () => {
    expect(ibanValido("IT60X0542811101000000123457")).toBe(false);
    expect(ibanValido("IT60X054281110100000012345")).toBe(false);
  });
});

describe("partita IVA", () => {
  it("verifica la cifra di controllo", () => {
    expect(partitaIvaValida("01114601006")).toBe(true);
    expect(partitaIvaValida("01114601007")).toBe(false);
    expect(partitaIvaValida("123")).toBe(false);
  });
});

describe("password", () => {
  it("chiede almeno 10 caratteri con lettere e numeri", () => {
    expect(problemaPassword("corta1")).not.toBeNull();
    expect(problemaPassword("solamentelettere")).not.toBeNull();
    expect(problemaPassword("Capelli2026")).toBeNull();
  });
});

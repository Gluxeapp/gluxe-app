import { describe, expect, test } from "vitest";
import { abiDaIban, distintaSepaCbi, testoSepa, type Distinta } from "./sepa";

// IBAN di prova con codice di controllo corretto (non sono conti veri).
const IBAN_AZIENDA = "IT42X0306909606100000063127";
const IBAN_A = "IT60X0542811101000000123456";
const IBAN_B = "IT88A0200805364000104567890";

const distinta = (modifica: Partial<Distinta> = {}): Distinta => ({
  idMessaggio: "GLUXE-2026-12-21-1",
  creatoIl: "2026-12-15T10:30:00",
  dataEsecuzione: "2026-12-21",
  ordinante: { ragioneSociale: "G LUXE S.r.l.", codiceFiscale: "01114601006", iban: IBAN_AZIENDA, cuc: "1234567X" },
  bonifici: [
    { riferimento: "GLUXE-DOC-2026-GL000002-1", beneficiario: "Anna Nicolò", iban: IBAN_A, importo: 8406n, causale: "Provvigioni 11/2026, ricevuta n. 1" },
    { riferimento: "GLUXE-DOC-2026-GL000003-1", beneficiario: "Bea D'Amico & figli", iban: IBAN_B, importo: 13756n, causale: "Provvigioni 11/2026, fattura n. 1" },
  ],
  ...modifica,
});

describe("File bonifici SEPA, pain.001.001.03 profilo CBI (sezione 8c)", () => {
  test("intestazione con numero di bonifici e totale di controllo", () => {
    const x = distintaSepaCbi(distinta());
    expect(x).toContain('<CBIPaymentRequest xmlns="urn:CBI:xsd:CBIPaymentRequest.00.04.00"');
    expect(x).toContain("<NbOfTxs>2</NbOfTxs>");
    expect(x).toContain("<CtrlSum>221.62</CtrlSum>");
    expect(x).toContain("<Id>1234567X</Id>\n            <Issr>CBI</Issr>");
    expect(x).toContain("<ReqdExctnDt>2026-12-21</ReqdExctnDt>");
    // ABI della banca dell'azienda dall'IBAN.
    expect(x).toContain("<MmbId>03069</MmbId>");
    expect(x).toContain(`<IBAN>${IBAN_AZIENDA}</IBAN>`);
  });

  test("un bonifico per richiesta, importi con il punto, nomi senza caratteri vietati", () => {
    const x = distintaSepaCbi(distinta());
    expect(x.match(/<CdtTrfTxInf>/g)).toHaveLength(2);
    expect(x).toContain('<InstdAmt Ccy="EUR">84.06</InstdAmt>');
    expect(x).toContain('<InstdAmt Ccy="EUR">137.56</InstdAmt>');
    expect(x).toContain("<Nm>Anna Nicolo</Nm>");
    expect(x).toContain("<Nm>Bea D&apos;Amico figli</Nm>");
    expect(x).toContain("<Ustrd>Provvigioni 11/2026, ricevuta n. 1</Ustrd>");
  });

  test("testi tagliati alla lunghezza massima", () => {
    expect(testoSepa("È già l'ora: àèìòù ß €", 140)).toBe("E gia l'ora: aeiou");
    expect(testoSepa("x".repeat(80), 70)).toHaveLength(70);
  });

  test("errori bloccanti: IBAN non valido, importo zero, bonifico ripetuto, CUC mancante, file vuoto", () => {
    const [a, b] = distinta().bonifici;
    expect(() => distintaSepaCbi(distinta({ bonifici: [{ ...a, iban: "IT60X0542811101000000123457" }] }))).toThrow(/IBAN non valido/);
    expect(() => distintaSepaCbi(distinta({ bonifici: [{ ...a, importo: 0n }] }))).toThrow(/Importo/);
    expect(() => distintaSepaCbi(distinta({ bonifici: [a, { ...b, riferimento: a.riferimento }] }))).toThrow(/ripetuto/);
    expect(() => distintaSepaCbi(distinta({ ordinante: { ...distinta().ordinante, cuc: "" } }))).toThrow(/CUC/);
    expect(() => distintaSepaCbi(distinta({ bonifici: [] }))).toThrow(/Nessun bonifico/);
  });

  test("ABI dall'IBAN italiano", () => {
    expect(abiDaIban(IBAN_A)).toBe("05428");
    expect(() => abiDaIban("DE89370400440532013000")).toThrow();
  });
});

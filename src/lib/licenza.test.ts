import { describe, expect, test } from "vitest";
import {
  avvisoDiOggi,
  decadeConLaChiusura,
  meseFermo,
  nuovaValidita,
  piuMesi,
  statoLicenza,
  ultimoGiornoRinnovo,
  validaFinoAttuale,
  validaFinoDa,
} from "./licenza";
import { PARAMETRI_INIZIALI } from "./parametri";

const P = PARAMETRI_INIZIALI;

describe("Licenza annuale (sezione 3a, decisione 31)", () => {
  test("T28 date della licenza: start kit pagato il 15/03/2026", () => {
    const fino = validaFinoDa("2026-03-15", P);
    expect(fino).toBe("2027-03-14");
    expect(statoLicenza(fino, "2027-02-11", P)).toMatchObject({ stato: "valida", rinnovabile: false });
    expect(statoLicenza(fino, "2027-02-12", P)).toMatchObject({ stato: "in_scadenza", rinnovabile: true, rinnovabileDal: "2027-02-12" });
    expect(avvisoDiOggi(fino, "2027-02-12", P)).toBe(30);
    expect(avvisoDiOggi(fino, "2027-03-07", P)).toBe(7);
    expect(avvisoDiOggi(fino, "2027-03-08", P)).toBeNull();
    // Rinnovo prima della scadenza: vecchia scadenza + 12 mesi.
    expect(nuovaValidita(fino, "2027-03-01", P)).toBe("2028-03-14");
    // Rinnovo dopo la scadenza: 12 mesi dal pagamento.
    expect(nuovaValidita(fino, "2027-04-10", P)).toBe("2028-04-09");
    expect(meseFermo(fino, "2027-03")).toBe(true);
    expect(meseFermo("2028-04-09", "2027-04")).toBe(false);
    // Ultimo giorno per rinnovare: fine del mese dopo quello della scadenza.
    expect(ultimoGiornoRinnovo(fino)).toBe("2027-04-30");
    expect(statoLicenza(fino, "2027-03-15", P)).toMatchObject({ stato: "scaduta", rinnovabile: true, rinnovabileFino: "2027-04-30" });
    expect(statoLicenza(fino, "2027-04-30", P)).toMatchObject({ stato: "scaduta", rinnovabile: true });
    expect(statoLicenza(fino, "2027-05-01", P)).toMatchObject({ stato: "decaduta", rinnovabile: false });
    expect(decadeConLaChiusura(fino, "2027-03")).toBe(false);
    expect(decadeConLaChiusura(fino, "2027-04")).toBe(true);
  });

  test("scadenza l'ultimo giorno del mese: quel mese non è fermo, il mese per rinnovare è il successivo", () => {
    expect(meseFermo("2027-03-31", "2027-03")).toBe(false);
    expect(meseFermo("2027-03-30", "2027-03")).toBe(true);
    expect(ultimoGiornoRinnovo("2027-03-31")).toBe("2027-05-31");
    expect(ultimoGiornoRinnovo("2027-12-15")).toBe("2028-01-31");
  });

  test("somma dei mesi con i mesi corti", () => {
    expect(piuMesi("2027-01-31", 1)).toBe("2027-02-28");
    expect(piuMesi("2028-02-29", 12)).toBe("2029-02-28");
    expect(validaFinoDa("2026-01-01", P)).toBe("2026-12-31");
  });

  test("validità attuale: rinnovi registrati, data di lancio, esente", () => {
    expect(validaFinoAttuale({ esente: true, rinnovi: ["2027-03-14"], lancio: null }, P)).toBeNull();
    expect(validaFinoAttuale({ esente: false, rinnovi: ["2027-03-14", "2028-03-14"], lancio: null }, P)).toBe("2028-03-14");
    // Senza start kit registrato: dalla data di lancio; senza data di lancio non scade.
    expect(validaFinoAttuale({ esente: false, rinnovi: [], lancio: "2027-01-10" }, P)).toBe("2028-01-09");
    expect(validaFinoAttuale({ esente: false, rinnovi: [], lancio: null }, P)).toBeNull();
    expect(statoLicenza(null, "2030-01-01", P)).toMatchObject({ stato: "senza_scadenza", rinnovabile: false });
    expect(meseFermo(null, "2030-01")).toBe(false);
    expect(decadeConLaChiusura(null, "2030-01")).toBe(false);
  });
});

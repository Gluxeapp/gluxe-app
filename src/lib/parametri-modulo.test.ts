import { describe, expect, test } from "vitest";
import { PARAMETRI_INIZIALI } from "./parametri";
import { parametriDaModulo, valoriDelModulo } from "./parametri-modulo";

describe("Modulo dei parametri del piano", () => {
  test("i valori attuali, riletti senza modifiche, danno gli stessi parametri", () => {
    const esito = parametriDaModulo(valoriDelModulo(PARAMETRI_INIZIALI));
    expect(esito.ok).toBe(true);
    if (esito.ok) expect(esito.parametri).toEqual(PARAMETRI_INIZIALI);
  });

  test("percentuali, punti ed euro all'italiana diventano punti base e centesimi", () => {
    const v = valoriDelModulo(PARAMETRI_INIZIALI);
    v.scontoIncaricata = "35";
    v.sogliaLineaForte = "9.000";
    v.pagamentoMinimo = "49,90";
    v["qualifiche.0.percentuale"] = "4,5";
    v["titoli.4.generazioni"] = "4; 3; 2; 2; 1,5";
    v.limiteCompensiSuPunti = "70";
    const esito = parametriDaModulo(v);
    expect(esito.ok).toBe(true);
    if (!esito.ok) return;
    expect(esito.parametri.scontoIncaricata).toBe(3500n);
    expect(esito.parametri.sogliaLineaForte).toBe(900000n);
    expect(esito.parametri.pagamentoMinimo).toBe(4990n);
    expect(esito.parametri.qualifiche[0].percentuale).toBe(450n);
    expect(esito.parametri.titoli[4].generazioni).toEqual([400n, 300n, 200n, 200n, 150n]);
  });

  test("valori non validi: errore sul campo, nessun parametro", () => {
    const v = valoriDelModulo(PARAMETRI_INIZIALI);
    v.aliquotaIva = "ventidue";
    v.provvigioneOnline = "120";
    v["qualifiche.1.soglia"] = "50"; // più bassa della New Star (100)
    v.richiestaDalGiorno = "8"; // dopo il giorno finale (6)
    const esito = parametriDaModulo(v);
    expect(esito.ok).toBe(false);
    if (esito.ok) return;
    expect(Object.keys(esito.errori).sort()).toEqual(["aliquotaIva", "provvigioneOnline", "qualifiche.1.soglia", "richiestaDalGiorno"].sort());
  });

  test("la data di lancio del piano è facoltativa", () => {
    const v = valoriDelModulo(PARAMETRI_INIZIALI);
    v.dataLancioPiano = "2026-12-01";
    const esito = parametriDaModulo(v);
    expect(esito.ok && esito.parametri.dataLancioPiano).toBe("2026-12-01");
    v.dataLancioPiano = "1 dicembre";
    expect(parametriDaModulo(v).ok).toBe(false);
  });
});

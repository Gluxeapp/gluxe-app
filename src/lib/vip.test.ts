/**
 * Cliente VIP (docs/piano-compensi.md, sezione 2a, decisione 35): casi T31–T34 e regole di contorno.
 * Scritti prima del codice (CLAUDE.md, regola 12). Importi e punti in centesimi.
 */
import { describe, expect, test } from "vitest";
import { calcolaOrdine } from "./calcolo-ordine";
import { PARAMETRI_INIZIALI as P } from "./parametri";
import { calcolaMese } from "./provvigioni/motore";
import {
  contaProdotti,
  daRevocare,
  esitoVipDelPagamento,
  messaggioVip,
  prezzoVip,
  puntiManualiVip,
  validaFinoVip,
  validaFinoVipDa,
  type VoceRegistroVip,
} from "./vip";

const prodotto = (id: string, nome: string, listino: bigint, extra: Record<string, unknown> = {}) => ({
  id,
  codice: id.toUpperCase(),
  nome,
  tipo: "prodotto" as const,
  prezzoListino: listino,
  ...extra,
});
const kitRoutine = prodotto("kr", "Kit Routine Botox", 10690n);
const shampoo = prodotto("sh", "Shampoo Botox", 3390n);
const maschera = prodotto("ma", "Maschera Botox", 3990n);
const spray = prodotto("sp", "Spray Botox 10in1", 3490n);

describe("prezzo e punti VIP", () => {
  test("prezzo VIP per unità: listino − 15%, arrotondato al centesimo (106,90 → 90,87)", () => {
    expect(prezzoVip(10690n, P)).toBe(9087n);
    expect(prezzoVip(3390n, P)).toBe(2882n);
    expect(prezzoVip(3990n, P)).toBe(3392n);
    expect(prezzoVip(3490n, P)).toBe(2967n);
  });

  test("punti scritti a mano ridotti del 15% (15,00 → 12,75)", () => {
    expect(puntiManualiVip(1500n, P)).toBe(1275n);
  });

  test("T31 ordine VIP: Kit Routine Botox a 90,87 €, 59,58 punti ON, provvigione online 29,79 €", () => {
    const o = calcolaOrdine([{ prodotto: kitRoutine, quantita: 1 }], "online", P, { vip: true });
    expect(o.righe[0]).toMatchObject({
      tipoPrezzo: "listino_vip",
      prezzoUnitarioIvato: 9087n,
      prezzoUnitarioIvaEsclusa: 7448n,
      puntiUnitari: 5958n,
      provvigioneUnitaria: 2979n,
      listinoUnitarioIvato: 10690n,
    });
    expect(o.totale).toBe(9087n + 690n);

    // Nel mese l'incaricata ha anche altri 100 punti ON: PGQ 159,58 → New Star 4%.
    const e = calcolaMese({
      mese: "2027-03",
      parametri: P,
      incaricate: [{ id: "x", sponsorId: null }],
      ordini: [
        { id: "vip", incaricataId: "x", tipo: "online", punti: o.punti, puntiPromo: 0n, imponibile: o.merceIvaEsclusa },
        { id: "altro", incaricataId: "x", tipo: "online", punti: 10000n, puntiPromo: 0n, imponibile: 12500n },
      ],
    });
    const somma = (tipo?: string) => e.voci.filter((v) => v.beneficiariaId === "x" && (!tipo || v.tipo === tipo)).reduce((s, v) => s + v.importo, 0n);
    expect(somma("online")).toBe(7979n);
    expect(somma("qualifica")).toBe(638n);
    expect(somma()).toBe(8617n);
  });

  test("promozioni al loro prezzo anche per la VIP; punti online a mano ridotti del 15%", () => {
    const conPunti = { ...shampoo, puntiOnlineManuali: 1500n };
    const o = calcolaOrdine(
      [
        { prodotto: conPunti, quantita: 2 },
        { prodotto: maschera, quantita: 1, promozione: { id: "pr", prezzoPromo: 2790n } },
      ],
      "online",
      P,
      { vip: true },
    );
    expect(o.righe[0]).toMatchObject({ tipoPrezzo: "listino_vip", prezzoUnitarioIvato: 2882n, puntiUnitari: 1275n, totalePunti: 2550n, provvigioneUnitaria: 638n });
    expect(o.righe[1]).toMatchObject({ tipoPrezzo: "promozione", prezzoUnitarioIvato: 2790n, puntiUnitari: 1830n });
  });

  test("senza VIP l'ordine online resta a listino pieno; lo sconto VIP non tocca gli acquisti personali", () => {
    expect(calcolaOrdine([{ prodotto: kitRoutine, quantita: 1 }], "online", P).righe[0].tipoPrezzo).toBe("listino_pieno");
    expect(calcolaOrdine([{ prodotto: kitRoutine, quantita: 1 }], "personale", P, { vip: true }).righe[0].tipoPrezzo).toBe("listino_scontato");
  });
});

describe("soglia, attivazione e rinnovo", () => {
  const righe = (o: ReturnType<typeof calcolaOrdine>) => o.righe;

  test("T32 soglia: la spedizione non conta, la promozione sì", () => {
    // A: 95,00 € di prodotti + 6,90 € di spedizione.
    const a = contaProdotti([{ tipoPrezzo: "listino_pieno", quantita: 1, totaleIvato: 9500n, listinoUnitarioIvato: 9500n }]);
    expect(esitoVipDelPagamento({ validaFinoPrima: null, pagatoIl: "2027-03-10", conteggio: a, p: P })).toBeNull();
    // B: 99,00 € di prodotti, di cui una promozione a 27,90 €.
    const b = contaProdotti([
      { tipoPrezzo: "listino_pieno", quantita: 1, totaleIvato: 7110n, listinoUnitarioIvato: 7110n },
      { tipoPrezzo: "promozione", quantita: 1, totaleIvato: 2790n, listinoUnitarioIvato: 3390n },
    ]);
    expect(b).toEqual({ pagati: 9900n, aListino: 9900n });
    expect(esitoVipDelPagamento({ validaFinoPrima: null, pagatoIl: "2027-03-15", conteggio: b, p: P })).toEqual({ tipo: "attivazione", validaFino: "2028-03-14" });
  });

  test("T33 rinnovo con 108,70 € a listino (paga 92,41 €): nuova scadenza 12 mesi dal pagamento", () => {
    const o = calcolaOrdine(
      [
        { prodotto: shampoo, quantita: 1 },
        { prodotto: maschera, quantita: 1 },
        { prodotto: spray, quantita: 1 },
      ],
      "online",
      P,
      { vip: true },
    );
    expect(o.merceIvaInclusa).toBe(9241n);
    const conteggio = contaProdotti(righe(o));
    expect(conteggio).toEqual({ pagati: 9241n, aListino: 10870n });
    expect(esitoVipDelPagamento({ validaFinoPrima: "2028-03-14", pagatoIl: "2028-02-01", conteggio, p: P })).toEqual({ tipo: "rinnovo", validaFino: "2029-01-31" });

    // Solo Shampoo e Maschera: 73,80 € a listino (paga 62,74 €), non rinnova.
    const poco = calcolaOrdine([{ prodotto: shampoo, quantita: 1 }, { prodotto: maschera, quantita: 1 }], "online", P, { vip: true });
    expect(poco.merceIvaInclusa).toBe(6274n);
    expect(esitoVipDelPagamento({ validaFinoPrima: "2028-03-14", pagatoIl: "2028-02-01", conteggio: contaProdotti(righe(poco)), p: P })).toBeNull();
  });

  test("dopo la scadenza vale come una nuova attivazione: contano i prodotti pagati", () => {
    const conteggio = { pagati: 9241n, aListino: 10870n };
    expect(esitoVipDelPagamento({ validaFinoPrima: "2028-03-14", pagatoIl: "2028-03-15", conteggio, p: P })).toBeNull();
    expect(esitoVipDelPagamento({ validaFinoPrima: "2028-03-14", pagatoIl: "2028-03-15", conteggio: { pagati: 9900n, aListino: 9900n }, p: P })).toEqual({
      tipo: "attivazione",
      validaFino: "2029-03-14",
    });
  });

  test("durata: 12 mesi meno un giorno, anche a fine mese", () => {
    expect(validaFinoVipDa("2027-03-15", P)).toBe("2028-03-14");
    expect(validaFinoVipDa("2028-02-29", P)).toBe("2029-02-27");
  });
});

describe("registro e revoche", () => {
  const registro: VoceRegistroVip[] = [
    { id: "1", tipo: "attivazione", ordineId: "b", validaFino: "2028-03-14", revocaDi: null },
    { id: "2", tipo: "rinnovo", ordineId: "r", validaFino: "2029-01-31", revocaDi: null },
  ];

  test("lo status vale fino alla scadenza più lontana tra le voci non revocate", () => {
    expect(validaFinoVip([])).toBeNull();
    expect(validaFinoVip(registro)).toBe("2029-01-31");
    // Revoca del rinnovo: torna alla scadenza precedente.
    expect(validaFinoVip([...registro, { id: "3", tipo: "revoca", ordineId: "r", validaFino: null, revocaDi: "2" }])).toBe("2028-03-14");
  });

  test("T34 reso dell'ordine che aveva attivato lo status: la cliente non è più VIP", () => {
    const conteggio = { pagati: 9900n, aListino: 9900n };
    expect(daRevocare({ tipo: "attivazione", conteggio, rimborsato: 9900n + 690n, p: P })).toBe(true);
    expect(validaFinoVip([registro[0], { id: "3", tipo: "revoca", ordineId: "b", validaFino: null, revocaDi: "1" }])).toBeNull();
  });

  test("reso parziale: si revoca solo se i prodotti restanti scendono sotto 99,00 €", () => {
    const conteggio = { pagati: 13000n, aListino: 13000n };
    expect(daRevocare({ tipo: "attivazione", conteggio, rimborsato: 3100n, p: P })).toBe(false);
    expect(daRevocare({ tipo: "attivazione", conteggio, rimborsato: 3101n, p: P })).toBe(true);
    // Rinnovo: il valore a listino restante segue la parte pagata restante.
    const rinnovo = { pagati: 9241n, aListino: 10870n };
    expect(daRevocare({ tipo: "rinnovo", conteggio: rinnovo, rimborsato: 0n, p: P })).toBe(false);
    expect(daRevocare({ tipo: "rinnovo", conteggio: rinnovo, rimborsato: 2882n, p: P })).toBe(true);
  });
});

describe("frase nel carrello", () => {
  const oggi = "2027-03-01";

  test("non VIP: quanto manca ai 99,00 €", () => {
    expect(messaggioVip({ validaFino: null, oggi, conteggio: { pagati: 7380n, aListino: 7380n }, p: P }).testo).toBe(
      "Ti mancano 25,20 € per diventare cliente VIP G LUXE: dal prossimo ordine avrai il 15% di sconto su tutto il listino per 12 mesi.",
    );
    expect(messaggioVip({ validaFino: null, oggi, conteggio: { pagati: 0n, aListino: 0n }, p: P }).testo).toBe(
      "Con un ordine da 99,00 € diventi cliente VIP G LUXE: dal prossimo ordine avrai il 15% di sconto su tutto il listino per 12 mesi.",
    );
    expect(messaggioVip({ validaFino: null, oggi, conteggio: { pagati: 10870n, aListino: 10870n }, p: P })).toMatchObject({
      raggiunto: true,
      testo: "Con questo ordine diventi cliente VIP G LUXE: dal prossimo ordine avrai il 15% di sconto su tutto il listino per 12 mesi.",
    });
  });

  test("VIP: scadenza e quanto manca (a listino) per rinnovare", () => {
    const m = messaggioVip({ validaFino: "2027-12-31", oggi, conteggio: { pagati: 6274n, aListino: 7380n }, p: P });
    expect(m.testo).toBe("Sei cliente VIP fino al 31/12/2027. Ti mancano 25,20 € a listino per rinnovare il tuo status VIP fino al 29/02/2028.");
    expect(messaggioVip({ validaFino: "2027-12-31", oggi, conteggio: { pagati: 9241n, aListino: 10870n }, p: P }).testo).toBe(
      "Sei cliente VIP fino al 31/12/2027. Con questo ordine rinnovi il tuo status VIP fino al 29/02/2028.",
    );
  });

  test("uno status scaduto conta come non VIP", () => {
    expect(messaggioVip({ validaFino: "2027-02-28", oggi, conteggio: { pagati: 0n, aListino: 0n }, p: P }).testo).toMatch(/^Con un ordine da 99,00 €/);
  });
});

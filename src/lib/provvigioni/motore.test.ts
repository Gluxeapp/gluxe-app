/**
 * Casi di test del Piano Compensi G LUXE (docs/piano-compensi.md, sezione 11), al centesimo.
 * Scritti prima del motore (CLAUDE.md, regola 12). Importi e punti in centesimi.
 */
import { describe, expect, test } from "vitest";
import { PARAMETRI_INIZIALI } from "../parametri";
import { calcolaMese, calcolaStorno, type DatiMese, type EsitoMese, type OrdineMese, type TipoVoce } from "./motore";

const P = PARAMETRI_INIZIALI;
/** 12,34 → 1234n */
const c = (n: number) => BigInt(Math.round(n * 100));

let progressivo = 0;
function ordine(incaricataId: string, tipo: OrdineMese["tipo"], punti: number, extra: Partial<OrdineMese> = {}): OrdineMese {
  const p = c(punti);
  // Prezzo IVA esclusa d'esempio coerente con i punti (punti = 0,80 × prezzo).
  return { id: `o${++progressivo}`, incaricataId, tipo, punti: p, puntiPromo: 0n, imponibile: (p * 5n) / 4n, ...extra };
}
const online = (id: string, punti: number, extra: Partial<OrdineMese> = {}) => ordine(id, "online", punti, extra);
const acquisto = (id: string, punti: number) => ordine(id, "personale", punti);
const promo = (id: string, punti: number) => ordine(id, "personale", punti, { puntiPromo: c(punti) });
const kit = (id: string) => ordine(id, "start_kit", 33, { imponibile: 4910n });

/** Rete da coppie [incaricata, sponsor]. */
const rete = (...coppie: [string, string | null][]) => coppie.map(([id, sponsorId]) => ({ id, sponsorId }));

function dati(d: Partial<DatiMese> & Pick<DatiMese, "incaricate" | "ordini">): DatiMese {
  return { mese: "2026-11", parametri: P, ...d };
}

/** Somma delle voci di una beneficiaria (di un tipo, se indicato). */
function voci(e: EsitoMese, id: string, tipo?: TipoVoce): bigint {
  return e.voci.filter((v) => v.beneficiariaId === id && (!tipo || v.tipo === tipo)).reduce((s, v) => s + v.importo, 0n);
}
const situazione = (e: EsitoMese, id: string) => {
  const s = e.situazioni.find((x) => x.id === id);
  if (!s) throw new Error(`manca ${id}`);
  return s;
};

/** Linee di n diretti con gli stessi punti online, sotto lo sponsor indicato. */
function linee(sponsor: string, n: number, punti: number) {
  const incaricate = Array.from({ length: n }, (_, i) => ({ id: `${sponsor}-l${i + 1}`, sponsorId: sponsor }));
  return { incaricate, ordini: incaricate.map((i) => online(i.id, punti)) };
}

describe("Piano Compensi G LUXE rev. 6 — casi di test", () => {
  test("T1 Anna, New Star: 4 kit dal negozio online", () => {
    const e = calcolaMese(dati({
      incaricate: rete(["anna", null]),
      ordini: Array.from({ length: 4 }, () => online("anna", 91.14, { imponibile: 11393n })),
    }));
    expect(situazione(e, "anna").pgq).toBe(c(364.56));
    expect(situazione(e, "anna").percentualeApplicata).toBe(400n);
    expect(voci(e, "anna", "online")).toBe(c(182.28));
    expect(voci(e, "anna", "qualifica")).toBe(c(14.58));
    expect(voci(e, "anna")).toBe(c(196.86));
  });

  test("T2 Luca, Partner", () => {
    const e = calcolaMese(dati({
      incaricate: rete(["luca", null], ["d1", "luca"], ["d2", "luca"]),
      ordini: [online("luca", 546.84), online("d1", 150), online("d2", 150)],
    }));
    expect(situazione(e, "luca").pgq).toBe(c(846.84));
    expect(voci(e, "luca", "online")).toBe(c(273.42));
    expect(voci(e, "luca", "qualifica")).toBe(c(43.75));
    expect(voci(e, "luca", "differenza")).toBe(c(12));
    expect(voci(e, "luca")).toBe(c(329.17));
  });

  test("T3 Sara, Director", () => {
    const e = calcolaMese(dati({
      incaricate: rete(["sara", null], ["exp", "sara"], ["pa1", "sara"], ["pa2", "sara"]),
      ordini: [online("sara", 400), online("exp", 2600), online("pa1", 1500), online("pa2", 1700)],
    }));
    expect(situazione(e, "sara").pgq).toBe(c(6200));
    expect(situazione(e, "sara").percentualeApplicata).toBe(1600n);
    expect(voci(e, "sara", "online")).toBe(c(200));
    expect(voci(e, "sara", "qualifica")).toBe(c(64));
    expect(voci(e, "sara", "differenza")).toBe(c(104 + 256));
    expect(voci(e, "sara")).toBe(c(624));
  });

  test("T4 Leader Fondatore bloccata al 12%", () => {
    const diretti = Array.from({ length: 5 }, (_, i) => `n${i}`);
    const e = calcolaMese(dati({
      incaricate: rete(["fon", null], ...diretti.map((d): [string, string] => [d, "fon"])),
      ordini: [acquisto("fon", 300), ...diretti.map((d) => online(d, 290))],
      fondatori: [{ incaricataId: "fon", ingresso: "2026-10-15", decadeDal: null }],
    }));
    const s = situazione(e, "fon");
    expect(s.pgq).toBe(c(1700));
    expect(s.qualificaReale).toBe("Partner");
    expect(s.percentualeApplicata).toBe(1200n);
    expect(voci(e, "fon", "qualifica")).toBe(c(36));
    expect(voci(e, "fon", "differenza")).toBe(c(116));
    expect(voci(e, "fon", "fondatore")).toBe(c(52.5));
    expect(voci(e, "fon")).toBe(c(204.5));
  });

  test("T5 Paola, Prestige Director con pool sui punti aziendali", () => {
    const dir = linee("paola", 3, 11600);
    const par = linee("paola", 2, 2000);
    par.incaricate.forEach((i, n) => (i.id = `paola-p${n + 1}`));
    par.ordini.forEach((o, n) => (o.incaricataId = `paola-p${n + 1}`));
    // Altre due reti con due Diamond President (5 quote ciascuna) e una Leader senza linee forti:
    // in tutto 240.000 punti aziendali e 12 quote pool.
    const d1 = linee("dp1", 5, 8000);
    const d2 = linee("dp2", 5, 8000);
    const e = calcolaMese(dati({
      incaricate: [
        ...rete(["paola", null], ["dp1", null], ["dp2", null], ["grande", null]),
        ...dir.incaricate, ...par.incaricate, ...d1.incaricate, ...d2.incaricate,
      ],
      ordini: [
        online("paola", 500), ...dir.ordini, ...par.ordini,
        online("dp1", 100), ...d1.ordini, online("dp2", 100), ...d2.ordini,
        online("grande", 120500),
      ],
    }));
    expect(e.puntiAziendali).toBe(c(240000));
    const s = situazione(e, "paola");
    expect(s.leader).toBe(true);
    expect(s.lineeForti).toBe(3);
    expect(s.titolo).toBe("Prestige Director");
    expect(situazione(e, "dp1").titolo).toBe("Diamond President");
    expect(voci(e, "paola", "online")).toBe(c(250));
    expect(voci(e, "paola", "qualifica")).toBe(c(100));
    expect(voci(e, "paola", "differenza")).toBe(c(1392 + 480));
    expect(voci(e, "paola", "generazione")).toBe(0n);
    expect(voci(e, "paola", "pool")).toBe(c(1200));
    expect(voci(e, "paola", "bonus_auto")).toBe(c(300));
    expect(voci(e, "paola")).toBe(c(3722));
  });

  test("T6 Tetto acquisti: soglie su 250, qualifica su tutti i punti", () => {
    const e = calcolaMese(dati({ incaricate: rete(["x", null]), ordini: [acquisto("x", 400)] }));
    expect(situazione(e, "x").ppq).toBe(c(250));
    expect(situazione(e, "x").percentualeApplicata).toBe(400n);
    expect(voci(e, "x")).toBe(c(16));
  });

  test("T7 Upline inattiva: la percentuale già pagata avanza, la quota resta all'azienda", () => {
    const e = calcolaMese(dati({
      incaricate: rete(["v", null], ["u", "v"], ["x", "u"], ["y", "u"]),
      ordini: [online("x", 150), online("u", 20), online("y", 600), online("v", 1700)],
    }));
    expect(situazione(e, "u").attiva).toBe(false);
    expect(situazione(e, "u").percentualeApplicata).toBe(800n);
    expect(voci(e, "u")).toBe(c(10));
    expect(voci(e, "v", "online")).toBe(c(850));
    expect(voci(e, "v", "qualifica")).toBe(c(204));
    expect(voci(e, "v", "differenza")).toBe(c(6 + 24 + 0.8));
    expect(voci(e, "v")).toBe(c(1084.8));
  });

  test("T27 Mese fermo per licenza scaduta: niente provvigione online, i punti contano per chi sta sopra", () => {
    const e = calcolaMese(dati({
      incaricate: [{ id: "v", sponsorId: null }, { id: "x", sponsorId: "v", ferma: true }],
      ordini: [online("x", 150), online("v", 1700)],
    }));
    expect(situazione(e, "x").attiva).toBe(false);
    expect(situazione(e, "x").percentualeApplicata).toBe(400n);
    expect(voci(e, "x")).toBe(0n);
    expect(voci(e, "v", "online")).toBe(c(850));
    expect(voci(e, "v", "qualifica")).toBe(c(136));
    expect(voci(e, "v", "differenza")).toBe(c(6));
    expect(voci(e, "v")).toBe(c(992));
    // I punti di X restano nei punti aziendali.
    expect(e.puntiAziendali).toBe(c(1850));
  });

  test("T8 Start kit: la sponsor riceve il 50% dei punti più la differenza", () => {
    const e = calcolaMese(dati({
      incaricate: rete(["bea", null], ["mara", "bea"]),
      ordini: [online("bea", 600), kit("mara")],
    }));
    expect(situazione(e, "mara").attiva).toBe(true);
    expect(situazione(e, "mara").percentualeApplicata).toBe(0n);
    expect(voci(e, "mara")).toBe(0n);
    expect(voci(e, "bea", "kit")).toBe(c(16.5));
    expect(voci(e, "bea", "differenza")).toBe(c(2.64));
    // I 33 punti del kit si contano una volta sola nei punti aziendali e di gruppo.
    expect(e.puntiAziendali).toBe(c(633));
    expect(situazione(e, "bea").pgq).toBe(c(633));
  });

  test("T10 Reso dopo la chiusura: storno a percentuali ferme", () => {
    const ordini = Array.from({ length: 4 }, () => online("anna", 91.14, { imponibile: 11393n }));
    const settembre = dati({ mese: "2026-09", incaricate: rete(["anna", null]), ordini });
    const storni = calcolaStorno(settembre, [ordini[0].id]);
    const di = (tipo: TipoVoce) => storni.filter((v) => v.tipo === tipo).reduce((s, v) => s + v.importo, 0n);
    expect(di("online")).toBe(c(-45.57));
    expect(di("qualifica")).toBe(c(-3.64));
    expect(storni.reduce((s, v) => s + v.importo, 0n)).toBe(c(-49.21));
  });

  test("T11 Leader inattiva saltata (compressione)", () => {
    const e = calcolaMese(dati({
      incaricate: rete(["paola", null], ["lina", "paola"], ["carla", "paola"], ["sonia", "carla"], ["rita", "carla"]),
      ordini: [online("paola", 600), online("lina", 12000), online("carla", 20), online("sonia", 6000), online("rita", 12000)],
    }));
    const carla = situazione(e, "carla");
    expect(carla.pgq).toBe(c(18020));
    expect(carla.percentualeApplicata).toBe(2000n);
    expect(carla.leader).toBe(false);
    expect(voci(e, "carla")).toBe(c(10));
    const s = situazione(e, "paola");
    expect(s.lineeForti).toBe(2);
    expect(s.titolo).toBe("Gold Leader");
    expect(voci(e, "paola", "online")).toBe(c(300));
    expect(voci(e, "paola", "qualifica")).toBe(c(120));
    expect(voci(e, "paola", "differenza")).toBe(0n);
    expect(voci(e, "paola", "generazione")).toBe(c(960));
    expect(voci(e, "paola", "pool")).toBe(c(918.6));
    expect(voci(e, "paola")).toBe(c(2298.6));
  });

  describe("T12 Pool con le figure speciali", () => {
    function mese(margheritaAttiva: boolean) {
      const g = linee("giovanna", 3, 8000);
      const m = linee("margherita", 2, 8000);
      const m2 = linee("m2", 4, 8000);
      return calcolaMese(dati({
        incaricate: [...rete(["giovanna", null], ["margherita", null], ["m2", null]), ...g.incaricate, ...m.incaricate, ...m2.incaricate],
        ordini: [
          online("giovanna", 100), ...g.ordini,
          ...(margheritaAttiva ? [online("margherita", 100)] : []), ...m.ordini,
          online("m2", 100), ...m2.ordini,
        ],
        bloccate: [{ incaricataId: "giovanna", percentuale: 2000n }],
        quoteSpeciali: [
          { incaricataId: "giovanna", tipo: "master_president", percentuale: 200n, soloSeAttiva: false },
          { incaricataId: "margherita", tipo: "quota_riservata", percentuale: 100n, soloSeAttiva: true },
        ],
        esclusiPool: ["giovanna"],
        esclusiBonusAuto: ["giovanna"],
      }));
    }

    test("mese A: Margherita attiva", () => {
      const e = mese(true);
      expect(e.puntiAziendali).toBe(c(72300));
      expect(e.incasso).toBe(c(90375));
      expect(situazione(e, "giovanna").titolo).toBe("Prestige Director");
      expect(voci(e, "giovanna", "pool")).toBe(0n);
      expect(voci(e, "giovanna", "bonus_auto")).toBe(0n);
      expect(voci(e, "giovanna", "master_president")).toBe(c(1807.5));
      expect(voci(e, "margherita", "pool")).toBe(c(542.25));
      expect(voci(e, "margherita", "quota_riservata")).toBe(c(903.75));
      expect(voci(e, "m2", "pool")).toBe(c(1626.75));
      expect(voci(e, "m2", "bonus_auto")).toBe(c(500));
    });

    test("mese B: Margherita inattiva, niente quota e niente 1%", () => {
      const e = mese(false);
      expect(situazione(e, "margherita").attiva).toBe(false);
      expect(voci(e, "margherita", "pool")).toBe(0n);
      expect(voci(e, "margherita", "quota_riservata")).toBe(0n);
      expect(voci(e, "m2", "pool")).toBe(c(2166));
      expect(voci(e, "giovanna", "master_president")).toBe(c(1805));
    });
  });

  test("T15 Soglia esatta: 600 punti → Partner", () => {
    const e = calcolaMese(dati({ incaricate: rete(["x", null]), ordini: [online("x", 600)] }));
    expect(situazione(e, "x").qualificaReale).toBe("Partner");
    expect(situazione(e, "x").percentualeApplicata).toBe(800n);
  });

  test("T16 Acquisto in promozione per sé", () => {
    const e = calcolaMese(dati({
      incaricate: rete(["bea", null], ["anna", "bea"]),
      ordini: [online("bea", 2300), promo("anna", 18.3), online("anna", 90)],
    }));
    expect(situazione(e, "anna").ppq).toBe(c(108.3));
    expect(voci(e, "anna", "online")).toBe(c(45));
    expect(voci(e, "anna", "promozione")).toBe(c(9.15));
    expect(voci(e, "anna", "qualifica")).toBe(c(4.33));
    expect(voci(e, "anna")).toBe(c(58.48));
    expect(situazione(e, "bea").percentualeApplicata).toBe(1200n);
    expect(voci(e, "bea", "differenza")).toBe(c(8.66));
  });

  test("T17 Promozione da inattiva: nessuna provvigione, la sponsor ha la differenza", () => {
    const e = calcolaMese(dati({
      incaricate: rete(["bea", null], ["anna", "bea"]),
      ordini: [online("bea", 2400), promo("anna", 18.3)],
    }));
    expect(situazione(e, "anna").attiva).toBe(false);
    expect(voci(e, "anna")).toBe(0n);
    expect(voci(e, "bea", "differenza")).toBe(c(2.2));
  });

  test("T18 Tetto anche sulle promozioni intestate all'incaricata", () => {
    const e = calcolaMese(dati({ incaricate: rete(["x", null]), ordini: [acquisto("x", 300), promo("x", 250)] }));
    expect(situazione(e, "x").ppq).toBe(c(250));
    expect(situazione(e, "x").percentualeApplicata).toBe(400n);
    expect(voci(e, "x", "promozione")).toBe(c(125));
    expect(voci(e, "x", "qualifica")).toBe(c(22));
    expect(voci(e, "x")).toBe(c(147));
  });

  test("Promozione comprata da una cliente nel negozio: ordine online senza tetto", () => {
    const e = calcolaMese(dati({ incaricate: rete(["x", null]), ordini: [online("x", 700)] }));
    expect(situazione(e, "x").ppq).toBe(c(700));
  });

  test("T19 Kit di una sponsor senza altri punti: il kit la rende attiva", () => {
    const e = calcolaMese(dati({
      incaricate: rete(["cleo", null], ["bea", "cleo"], ["mara", "bea"]),
      ordini: [online("cleo", 600), kit("mara")],
    }));
    expect(situazione(e, "bea").attiva).toBe(true);
    expect(situazione(e, "bea").pgq).toBe(c(33));
    expect(voci(e, "bea", "kit")).toBe(c(16.5));
    expect(voci(e, "bea", "differenza")).toBe(0n);
    expect(voci(e, "cleo", "differenza")).toBe(c(2.64));
  });

  test("Kit di una sponsor sospesa: nessuna provvigione kit", () => {
    const e = calcolaMese(dati({
      incaricate: [{ id: "bea", sponsorId: null, sospesa: true }, { id: "mara", sponsorId: "bea" }],
      ordini: [kit("mara")],
    }));
    expect(voci(e, "bea")).toBe(0n);
  });

  test("T20 Giovanna inattiva: solo il Master President", () => {
    const e = calcolaMese(dati({
      incaricate: rete(["giovanna", null], ["altra", null]),
      ordini: [online("altra", 8000, { imponibile: c(10000) })],
      bloccate: [{ incaricataId: "giovanna", percentuale: 2000n }],
      quoteSpeciali: [{ incaricataId: "giovanna", tipo: "master_president", percentuale: 200n, soloSeAttiva: false }],
      esclusiPool: ["giovanna"],
      esclusiBonusAuto: ["giovanna"],
    }));
    expect(situazione(e, "giovanna").attiva).toBe(false);
    expect(e.voci.filter((v) => v.beneficiariaId === "giovanna").map((v) => [v.tipo, v.importo])).toEqual([["master_president", c(200)]]);
  });

  test("Qualifica bloccata al 20%: è Leader del mese con le sue linee forti", () => {
    const e = calcolaMese(dati({
      incaricate: rete(["g", null], ["d", "g"]),
      ordini: [online("g", 50), online("d", 9000)],
      bloccate: [{ incaricataId: "g", percentuale: 2000n }],
    }));
    const s = situazione(e, "g");
    expect(s.qualificaReale).toBe("Director");
    expect(s.leader).toBe(true);
    expect(s.titolo).toBe("Leader in crescita");
    expect(voci(e, "g", "differenza")).toBe(c(360));
  });

  test("Generazioni su più livelli, con titolo che le prevede", () => {
    // Paola President (4 linee forti) → sotto una sua linea c'è la Leader L1, sotto L1 la Leader L2.
    const altre = linee("paola", 3, 8000);
    const e = calcolaMese(dati({
      incaricate: [...rete(["paola", null], ["l1", "paola"], ["l2", "l1"], ["x", "l2"]), ...altre.incaricate],
      ordini: [online("paola", 100), online("l1", 12000), online("l2", 12000), online("x", 500), ...altre.ordini],
    }));
    expect(situazione(e, "paola").titolo).toBe("President");
    expect(situazione(e, "l1").lineeForti).toBe(1);
    // 1ª generazione di Paola: team di L1 = 12.000 (L2 esclusa) → 4% = 480.
    // 2ª generazione di Paola: team di L2 = 12.500 → 3% = 375.
    expect(voci(e, "paola", "generazione")).toBe(c(480 + 375));
    // L1 (Leader in crescita) ha la 1ª generazione su L2: 12.500 × 3% = 375.
    expect(voci(e, "l1", "generazione")).toBe(c(375));
  });

  test("Leader Fondatore: dopo i 12 mesi e dopo la decadenza niente blocco né bonus", () => {
    const base = {
      incaricate: rete(["fon", null], ["n", "fon"]),
      ordini: [acquisto("fon", 300), online("n", 500)],
    };
    const scaduto = calcolaMese(dati({ ...base, mese: "2027-10", fondatori: [{ incaricataId: "fon", ingresso: "2026-10-15", decadeDal: null }] }));
    expect(situazione(scaduto, "fon").percentualeApplicata).toBe(800n);
    expect(voci(scaduto, "fon", "fondatore")).toBe(0n);
    const ultimo = calcolaMese(dati({ ...base, mese: "2027-09", fondatori: [{ incaricataId: "fon", ingresso: "2026-10-15", decadeDal: null }] }));
    expect(situazione(ultimo, "fon").percentualeApplicata).toBe(1200n);
    const decaduto = calcolaMese(dati({ ...base, mese: "2027-02", fondatori: [{ incaricataId: "fon", ingresso: "2026-10-15", decadeDal: "2027-02" }] }));
    expect(situazione(decaduto, "fon").percentualeApplicata).toBe(800n);
    expect(voci(decaduto, "fon", "fondatore")).toBe(0n);
  });
});

describe("Garanzie del calcolo (docs/garanzie-calcolo.md)", () => {
  function meseGrande(): DatiMese {
    const dir = linee("paola", 3, 11600);
    const sotto = linee("paola-l1", 2, 900);
    return dati({
      incaricate: [...rete(["paola", null], ["mara", "paola-l2"], ["fon", "paola"]), ...dir.incaricate, ...sotto.incaricate],
      ordini: [online("paola", 500), ...dir.ordini, ...sotto.ordini, kit("mara"), promo("paola-l3", 40), acquisto("fon", 320), online("fon", 10)],
      fondatori: [{ incaricataId: "fon", ingresso: "2026-11-02", decadeDal: null }],
    });
  }

  const comeTesto = (e: unknown) => JSON.stringify(e, (_, v) => (typeof v === "bigint" ? v.toString() : v));

  test("stesso mese con ordini e incaricate mescolati → stesso risultato al centesimo", () => {
    const d = meseGrande();
    const atteso = comeTesto(calcolaMese(d));
    for (let seme = 1; seme <= 20; seme++) {
      const mescola = <T,>(a: T[]) => {
        const b = [...a];
        let s = seme;
        for (let i = b.length - 1; i > 0; i--) {
          s = (s * 16807) % 2147483647;
          const j = s % (i + 1);
          [b[i], b[j]] = [b[j], b[i]];
        }
        return b;
      };
      expect(comeTesto(calcolaMese({ ...d, ordini: mescola(d.ordini), incaricate: mescola(d.incaricate) }))).toBe(atteso);
    }
  });

  test("calcolo ripetuto → stesso risultato; i dati in ingresso non cambiano", () => {
    const d = meseGrande();
    const prima = comeTesto(d);
    expect(comeTesto(calcolaMese(d))).toBe(comeTesto(calcolaMese(d)));
    expect(comeTesto(d)).toBe(prima);
  });

  test("quadratura: punti delle incaricate = punti aziendali; controlli superati", () => {
    const e = calcolaMese(dati({
      incaricate: rete(["bea", null], ["mara", "bea"]),
      ordini: [acquisto("bea", 600), kit("mara")],
    }));
    expect(e.situazioni.reduce((s, x) => s + x.pp, 0n)).toBe(e.puntiAziendali);
    expect(e.totaleCompensi).toBe(e.voci.reduce((s, v) => s + v.importo, 0n));
    expect(e.ok).toBe(true);
  });

  test("tutti gli ordini resi → gli storni azzerano le voci stornabili", () => {
    const d = meseGrande();
    const e = calcolaMese(d);
    const storni = calcolaStorno(d, d.ordini.map((o) => o.id));
    const nonStornabili: TipoVoce[] = ["pool", "quota_riservata", "master_president", "bonus_auto"];
    const stornabili = e.voci.filter((v) => !nonStornabili.includes(v.tipo)).reduce((s, v) => s + v.importo, 0n);
    expect(storni.reduce((s, v) => s + v.importo, 0n)).toBe(-stornabili);
    expect(storni.every((v) => !nonStornabili.includes(v.tipo))).toBe(true);
  });

  test("ciclo nella genealogia: il calcolo si ferma, nessuna voce", () => {
    const e = calcolaMese(dati({ incaricate: rete(["a", "b"], ["b", "a"]), ordini: [online("a", 100)] }));
    expect(e.ok).toBe(false);
    expect(e.voci).toEqual([]);
    expect(e.controlli.find((x) => x.nome === "genealogia")?.ok).toBe(false);
  });

  test("ordine di un'incaricata sconosciuta o contato due volte: il calcolo si ferma", () => {
    const o = online("a", 100);
    const sconosciuta = calcolaMese(dati({ incaricate: rete(["a", null]), ordini: [online("zzz", 10)] }));
    expect(sconosciuta.ok).toBe(false);
    expect(sconosciuta.voci).toEqual([]);
    const doppio = calcolaMese(dati({ incaricate: rete(["a", null]), ordini: [o, o] }));
    expect(doppio.ok).toBe(false);
    expect(doppio.voci).toEqual([]);
  });

  test("sponsor inesistente o punti negativi: il calcolo si ferma", () => {
    expect(calcolaMese(dati({ incaricate: rete(["a", "nessuna"]), ordini: [] })).ok).toBe(false);
    expect(calcolaMese(dati({ incaricate: rete(["a", null]), ordini: [online("a", -5)] })).ok).toBe(false);
  });

  test("limite compensi al 70% dei punti aziendali (bonus auto escluso)", () => {
    // T1: 196,86 € su 364,56 punti = 54%: sotto il limite.
    const t1 = calcolaMese(dati({
      incaricate: rete(["anna", null]),
      ordini: Array.from({ length: 4 }, () => online("anna", 91.14, { imponibile: 11393n })),
    }));
    expect(t1.controlli.find((x) => x.nome === "limite compensi")?.ok).toBe(true);
    // Online 50% + Leader 20% = esattamente 70%: ancora nel limite.
    const alLimite = calcolaMese(dati({ incaricate: rete(["x", null]), ordini: [online("x", 12000)] }));
    expect(alLimite.controlli.find((x) => x.nome === "limite compensi")?.ok).toBe(true);
    // Con una quota sull'incasso in più si supera il 70%: il mese non si può chiudere.
    const sopra = calcolaMese(dati({
      incaricate: rete(["x", null]),
      ordini: [online("x", 12000)],
      quoteSpeciali: [{ incaricataId: "x", tipo: "master_president", percentuale: 200n, soloSeAttiva: false }],
    }));
    expect(sopra.controlli.find((x) => x.nome === "limite compensi")?.ok).toBe(false);
    expect(sopra.ok).toBe(false);
    // Le voci restano visibili nell'anteprima: è la chiusura a essere bloccata.
    expect(voci(sopra, "x", "online")).toBe(c(6000));
  });
});

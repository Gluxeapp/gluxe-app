import { describe, expect, test } from "vitest";
import { PARAMETRI_INIZIALI as P } from "../parametri";
import { meseDecadenzaFondatore, puntiRequisitoFondatore, type OrdinePagato } from "./fondatori";

let n = 0;
const ordine = (incaricataId: string, tipo: OrdinePagato["tipo"], punti: number, pagatoIl: string): OrdinePagato => ({
  id: `o${++n}`, incaricataId, tipo, punti: BigInt(punti * 100), puntiPromo: 0n, imponibile: 0n, pagatoIl,
});
const rete = [
  { id: "fon", sponsorId: null },
  { id: "d", sponsorId: "fon" },
  { id: "estranea", sponsorId: null },
];

describe("Requisito Leader Fondatori: 1.000 punti per qualifica in 90 giorni (decisione 15)", () => {
  const ordini = [
    ordine("fon", "personale", 300, "2026-11-10"), // tetto 250 nel mese di novembre
    ordine("fon", "personale", 100, "2026-12-05"), // dicembre ha il suo tetto
    ordine("d", "online", 600, "2027-02-07"), // 90° giorno: conta
    ordine("d", "online", 500, "2027-02-08"), // 91° giorno: non conta
    ordine("estranea", "online", 900, "2026-12-01"), // fuori dalla sua rete
    ordine("d", "online", 900, "2026-11-09"), // prima dell'ingresso
  ];

  test("si contano i punti per qualifica della rete dal giorno di ingresso al 90° compreso", () => {
    expect(puntiRequisitoFondatore("fon", "2026-11-10", rete, ordini, P)).toBe(95000n);
  });

  test("sotto i 1.000 punti i privilegi decadono dal mese successivo al 90° giorno", () => {
    expect(meseDecadenzaFondatore("fon", "2026-11-10", rete, ordini, P)).toBe("2027-03");
  });

  test("con 1.000 punti i privilegi restano", () => {
    const conAltri = [...ordini, ordine("d", "start_kit", 50, "2027-01-15")];
    expect(meseDecadenzaFondatore("fon", "2026-11-10", rete, conAltri, P)).toBeNull();
  });
});

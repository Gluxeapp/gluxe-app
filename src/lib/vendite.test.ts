import { describe, expect, test } from "vitest";
import { quoteVendite } from "./vendite";

// Anna → Bea → Carla; Dora senza sponsor. Punti in centesimi.
const rete = [
  { id: "anna", sponsorId: null },
  { id: "bea", sponsorId: "anna" },
  { id: "carla", sponsorId: "bea" },
  { id: "dora", sponsorId: null },
];
const punti = new Map([
  ["anna", { on: 10000n, pp: 40000n }],
  ["bea", { on: 30000n, pp: 30000n }],
  ["carla", { on: 0n, pp: 10000n }],
]);

describe("Vendite a clienti finali (sezione 10)", () => {
  test("quota personale e di rete in punti base (100% = 10000)", () => {
    const q = quoteVendite(rete, punti);
    expect(q.get("anna")).toEqual({ on: 10000n, pp: 40000n, quota: 2500n, onRete: 40000n, ppRete: 80000n, quotaRete: 5000n });
    expect(q.get("bea")).toEqual({ on: 30000n, pp: 30000n, quota: 10000n, onRete: 30000n, ppRete: 40000n, quotaRete: 7500n });
    expect(q.get("carla")).toEqual({ on: 0n, pp: 10000n, quota: 0n, onRete: 0n, ppRete: 10000n, quotaRete: 0n });
  });

  test("senza punti la quota non si calcola", () => {
    expect(quoteVendite(rete, punti).get("dora")).toEqual({ on: 0n, pp: 0n, quota: null, onRete: 0n, ppRete: 0n, quotaRete: null });
  });

  test("arrotondamento commerciale al punto base", () => {
    // 1 / 3 = 33,333...% → 3333; 2 / 3 = 66,666...% → 6667
    const q = quoteVendite([{ id: "x", sponsorId: null }], new Map([["x", { on: 200n, pp: 300n }]]));
    expect(q.get("x")?.quota).toBe(6667n);
  });

  test("una genealogia con un ciclo non blocca il calcolo", () => {
    const ciclo = [
      { id: "a", sponsorId: "b" },
      { id: "b", sponsorId: "a" },
    ];
    const q = quoteVendite(ciclo, new Map([["a", { on: 100n, pp: 100n }]]));
    expect(q.get("a")?.ppRete).toBe(100n);
  });
});

// Prova di "Guadagna con G LUXE" sul database di PROVA (npm run prova:vip): i numeri della pagina arrivano dai
// parametri del piano e dal catalogo, non dal codice.
import { expect, test } from "vitest";
import { datiGuadagna } from "@/lib/profilo-cliente";

test("Guadagna con G LUXE: sconto, provvigione, qualifiche e costi letti da parametri e catalogo", async () => {
  const d = await datiGuadagna();
  expect(d.sconto).toBe("40%");
  expect(d.provvigioneOnline).toBe("50%");
  expect(d.qualifiche.map((q) => `${q.nome} ${q.soglia} ${q.percentuale}`)).toEqual([
    "New Star 100 4%",
    "Partner 600 8%",
    "Expert 2.400 12%",
    "Director 6.000 16%",
    "Leader 12.000 20%",
  ]);
  expect(d.sogliaAttivita).toBe("33");
  expect(d.startKit).toMatch(/€$/);
  expect(d.esempio?.scontato).toMatch(/€$/);
  console.info(JSON.stringify(d, null, 2));
});

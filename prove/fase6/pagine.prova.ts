// Le interrogazioni delle pagine di contabilità e provvigioni funzionano sul database di prova (sola lettura).
import { sql } from "drizzle-orm";
import { expect, test } from "vitest";
import { db } from "@/db";
import { contoIncaricata, f24DelPeriodo, leggiDatiAzienda, quadroContabilita, statoRichiesta } from "@/lib/provvigioni/conti";
import { meseDaChiudere, stornoInSospeso } from "@/lib/provvigioni/chiusura";
import { margineDellAnno } from "@/lib/provvigioni/margine";

test("pagine di contabilità e provvigioni", async () => {
  const q = await quadroContabilita();
  expect(Array.isArray(q.distinte)).toBe(true);
  await leggiDatiAzienda();
  await f24DelPeriodo("2026-11");
  await meseDaChiudere();
  await stornoInSospeso("2026-12");
  const { rows } = await db().execute<{ id: string }>(sql`select id from app.incaricati order by codice limit 3`);
  for (const r of rows) {
    await contoIncaricata(r.id);
    await statoRichiesta(r.id);
  }
});

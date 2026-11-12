// Prova completa della Fase 6 sul database di PROVA (npm run prova:fase6): chiude il mese scorso, chiede,
// approva e rifiuta pagamenti, crea il file bonifici e l'F24. Prima e dopo il database torna a prima della chiusura.
// Serve la rete finta con ordini del mese scorso: npm run db:seme-rete-prova -- --mese-scorso
import { sql } from "drizzle-orm";
import { expect, test } from "vitest";
import { db } from "@/db";
import { PARAMETRI_INIZIALI as P } from "@/lib/parametri";
import { chiudiMese, meseDaChiudere } from "@/lib/provvigioni/chiusura";
import { approvaRichiesta, creaDistinta, creaRichiesta, f24DelPeriodo, rifiutaRichiesta, saldo, segnaPagata, statoRichiesta } from "@/lib/provvigioni/conti";
import { calcoloDelMese } from "@/lib/provvigioni/dati";
import { importiDocumento } from "@/lib/provvigioni/documento";

const uno = async <T,>(q: ReturnType<typeof sql>) => (await db().execute(q)).rows[0] as T;

test("Fase 6 dall'inizio alla fine sul database di prova", async () => {
  process.env.PROVA_FINESTRA_PAGAMENTI_APERTA = "1";
  const admin = await uno<{ id: string }>(sql`select id from app.utenti where ruolo = 'amministrazione' order by creato_il limit 1`);
  const persona = (email: string) => uno<{ id: string; regime: string }>(sql`select i.id, i.regime_fiscale regime from app.incaricati i join app.utenti u on u.id = i.utente_id where u.email = ${email}`);
  const alice = await persona("alice.finta@gluxe.test");
  const bruna = await persona("bruna.finta@gluxe.test");
  const carla = await persona("carla.finta@gluxe.test");

  const mese = (await meseDaChiudere())!;
  expect(mese).toMatch(/^[0-9]{4}-[0-9]{2}$/);
  const anteprima = await calcoloDelMese(mese);
  console.log("controlli", anteprima.controlli.filter((c) => !c.ok), "punti", anteprima.puntiAziendali, "compensi", anteprima.totaleCompensi);
  expect(anteprima.ok).toBe(true);
  const chiusura = await chiudiMese(mese, admin.id);
  console.log("chiusura", chiusura);
  expect(chiusura.totaleCompensi).toBe(anteprima.totaleCompensi);
  await expect(chiudiMese(mese, admin.id)).rejects.toThrow();
  const congelato = await calcoloDelMese(mese);
  expect(congelato.chiuso).toBe(true);
  expect(congelato.totaleCompensi).toBe(anteprima.totaleCompensi);
  const { rows: [{ somma }] } = await db().execute<{ somma: string }>(sql`select sum(importo)::text somma from app.movimenti where mese = ${mese}`);
  expect(BigInt(somma)).toBe(anteprima.totaleCompensi);

  const saldi = { alice: await saldo(alice.id), bruna: await saldo(bruna.id), carla: await saldo(carla.id) };
  console.log("saldi", saldi);
  const s = await statoRichiesta(alice.id);
  expect(s.puoRichiedere).toBe(true);

  // Richieste contemporanee della stessa incaricata: ne passa una sola.
  const doppie = await Promise.allSettled([creaRichiesta(alice.id, admin.id), creaRichiesta(alice.id, admin.id), creaRichiesta(alice.id, admin.id)]);
  expect(doppie.filter((d) => d.status === "fulfilled")).toHaveLength(1);
  expect(await saldo(alice.id)).toBe(0n);
  const ra = (doppie.find((d) => d.status === "fulfilled") as PromiseFulfilledResult<{ id: string; lordo: bigint }>).value;
  expect(ra.lordo).toBe(saldi.alice);

  const da = await approvaRichiesta(ra.id, admin.id);
  expect(da.numero).toBe(1);
  await expect(approvaRichiesta(ra.id, admin.id)).rejects.toThrow();
  const doc = await uno<{ tipo: string; totale: string; iva: string }>(sql`select tipo, totale::text, iva::text from app.documenti_provvigioni where id = ${da.id}`);
  const atteso = importiDocumento(saldi.alice, "piva_ordinaria", P);
  expect(doc.tipo).toBe("fattura_ordinaria");
  expect(BigInt(doc.totale)).toBe(atteso.totale);

  // Sotto il minimo: richiesta rifiutata dall'app (Bruna, se i dati di prova la lasciano sotto i 50 €).
  if (saldi.bruna < P.pagamentoMinimo) await expect(creaRichiesta(bruna.id, admin.id)).rejects.toThrow(/minimo/);
  else console.log("Bruna supera il minimo con questi dati di prova: controllo del minimo saltato (coperto dal test T9).");
  // Carla: rifiutata dalla contabilità, l'importo torna nel saldo; poi richiesta di nuovo e approvata (ricevuta con bollo).
  const rc = await creaRichiesta(carla.id, admin.id);
  await rifiutaRichiesta(rc.id, "Prova di rifiuto", admin.id);
  expect(await saldo(carla.id)).toBe(saldi.carla);
  const rc2 = await creaRichiesta(carla.id, admin.id);
  const dc = await approvaRichiesta(rc2.id, admin.id);
  expect(dc.numero).toBe(1);
  const docC = await uno<{ tipo: string; totale: string; bollo: string }>(sql`select tipo, totale::text, bollo::text from app.documenti_provvigioni where id = ${dc.id}`);
  expect(docC.tipo).toBe("ricevuta");
  expect(BigInt(docC.totale)).toBe(importiDocumento(saldi.carla, "nessuna_piva", P).totale);

  const distinta = await creaDistinta(s.dataPagamento, admin.id);
  expect(distinta.scartate).toEqual([]);
  await expect(creaDistinta(s.dataPagamento, admin.id)).rejects.toThrow();
  const { xml, numero_bonifici } = await uno<{ xml: string; numero_bonifici: number }>(sql`select xml, numero_bonifici from app.distinte_bonifici where id = ${distinta.id}`);
  console.log(xml.slice(0, 1200));
  expect(xml).toContain(`<NbOfTxs>${numero_bonifici}</NbOfTxs>`);
  await segnaPagata(distinta.id, admin.id);

  const f = await f24DelPeriodo(s.dataPagamento.slice(0, 7));
  console.log("F24", { ...f, documenti: f.documenti.length });
  expect(f.importo).toBe(f.documenti.reduce((t, d) => t + d.documento.ritenuta, 0n));
  expect(f.codiceTributo).toBe("1038");
});

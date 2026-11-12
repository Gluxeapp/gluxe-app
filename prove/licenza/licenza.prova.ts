// Prova della licenza annuale sul database di PROVA (npm run prova:licenza). Ogni giro crea un'incaricata finta
// "Licenza Prova" sotto Alice (il database non lascia cancellare nulla); la decadenza si prova in una transazione annullata.
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { expect, test } from "vitest";
import { db, type Esecutore } from "@/db";
import { parametriCorrenti } from "@/lib/catalogo";
import { applicaDecadenze, fermeDelMese, licenzaScaduta, ordineLicenza, registraPeriodoLicenza, situazioneLicenza } from "@/lib/licenze";
import { negozioDi } from "@/lib/negozio";
import { leggiOrdine } from "@/lib/ordini";
import { calcoloDelMese, meseCorrente } from "@/lib/provvigioni/dati";

const uno = async <T,>(q: ReturnType<typeof sql>, e: Esecutore = db()) => (await e.execute(q)).rows[0] as T;

/** Incaricata finta con start kit pagato in un giorno del passato (ordine e periodo di licenza come li registra il webhook). */
async function nuovaIncaricata(e: Esecutore, sponsorId: string, kitPagatoIl: string) {
  const cf = `PRV${randomUUID().replace(/-/g, "").slice(0, 13).toUpperCase()}`;
  const u = await uno<{ id: string }>(sql`insert into app.utenti (ruolo, email, nome) values ('incaricato', ${`licenza-${cf.toLowerCase()}@gluxe.test`}, 'Licenza Prova') returning id`, e);
  const i = await uno<{ id: string; codice: string }>(sql`
    insert into app.incaricati (utente_id, codice, nome, cognome, codice_fiscale, data_nascita, indirizzo, cap, citta, provincia,
      telefono, iban, sponsor_id, start_kit_pagato, privacy_accettata_il)
    values (${u.id}, 'GL' || lpad(nextval('app.sequenza_codice_incaricato')::text, 6, '0'), 'Licenza', 'Prova', ${cf}, '1985-01-01',
      'Via delle Prove 9', '20100', 'Milano', 'MI', '3339999999', 'IT60X0542811101000000123456', ${sponsorId}, true, now())
    returning id, codice`, e);
  const parametri = await uno<{ id: string }>(sql`select id from app.parametri_versioni order by valido_dal desc, id desc limit 1`, e);
  // L'ordine dello start kit resta "annullato" e senza data di pagamento: serve solo come riferimento del periodo di
  // licenza e così non entra nei punti di nessun mese (non sposta il mese da chiudere nelle altre prove).
  const kit = await uno<{ id: string }>(sql`
    insert into app.ordini (incaricato_id, tipo, stato, parametri_versione_id, merce_iva_inclusa, merce_iva_esclusa, punti,
      provvigione_acquisto, spese_spedizione, totale, destinatario, indirizzo, cap, citta, provincia, telefono)
    values (${i.id}, 'start_kit', 'annullato', ${parametri.id}, 5990, 4910, 3300, 0, 690, 6680, 'Licenza Prova', 'Via delle Prove 9',
      '20100', 'Milano', 'MI', '3339999999')
    returning id`, e);
  await registraPeriodoLicenza(e, { id: kit.id, incaricatoId: i.id, tipo: "start_kit" }, new Date(`${kitPagatoIl}T10:00:00+01:00`));
  return i;
}

test("licenza annuale: scadenza, sola visualizzazione, mese fermo, rinnovo, decadenza", async () => {
  const alice = await uno<{ id: string }>(sql`select i.id from app.incaricati i join app.utenti u on u.id = i.utente_id where u.email = 'alice.finta@gluxe.test'`);
  const admin = await uno<{ id: string }>(sql`select id from app.utenti where ruolo = 'amministrazione' order by creato_il limit 1`);
  const p = await parametriCorrenti();
  const oggi = (await uno<{ oggi: string }>(sql`select (now() at time zone 'Europe/Rome')::date::text as oggi`)).oggi;
  const meseScorso = (await uno<{ m: string }>(sql`select to_char((now() at time zone 'Europe/Rome') - interval '1 month', 'YYYY-MM') as m`)).m;

  // Start kit pagato 13 mesi fa: licenza scaduta il mese scorso, ancora rinnovabile fino alla fine di questo mese.
  const kitIl = (await uno<{ g: string }>(sql`select (date_trunc('month', now() at time zone 'Europe/Rome') - interval '13 months' + interval '9 days')::date::text as g`)).g;
  const x = await db().transaction((tx) => nuovaIncaricata(tx, alice.id, kitIl));
  const prima = await situazioneLicenza(x.id);
  expect(prima).toMatchObject({ stato: "scaduta", rinnovabile: true });
  expect(await licenzaScaduta(x.id)).toBe(true);

  // Sola visualizzazione: negozio chiuso; il mese scorso è fermo (licenza scaduta all'ultimo giorno), quello prima no.
  expect((await negozioDi(x.codice))?.stato).toEqual({ aperto: false, motivo: "licenza scaduta" });
  expect((await fermeDelMese(meseScorso, p)).has(x.id)).toBe(true);
  const dueMesiFa = (await uno<{ m: string }>(sql`select to_char((now() at time zone 'Europe/Rome') - interval '2 months', 'YYYY-MM') as m`)).m;
  expect((await fermeDelMese(dueMesiFa, p)).has(x.id)).toBe(false);

  // Il calcolo del mese scorso (se ancora aperto) la segna ferma: nessuna voce per lei.
  const calcolo = await calcoloDelMese(meseScorso);
  if (!calcolo.chiuso) expect(calcolo.voci.some((v) => v.beneficiariaId === x.id)).toBe(false);

  // Rinnovo: ordine da 29,90 € senza punti né spedizione; riaperto due volte è sempre lo stesso ordine.
  const idOrdine = await ordineLicenza(x.id);
  expect(await ordineLicenza(x.id)).toBe(idOrdine);
  const ordine = (await leggiOrdine(idOrdine, x.id))!.ordine;
  expect(ordine).toMatchObject({ tipo: "licenza", punti: 0n, speseSpedizione: 0n, provvigioneAcquisto: 0n });
  expect(ordine.totale).toBeGreaterThan(0n);

  // Pagamento (come lo registra il webhook): punti e incasso del mese non cambiano.
  const mese = await meseCorrente();
  const primaDelPagamento = await calcoloDelMese(mese);
  await db().execute(sql`update app.ordini set pagato_il = now(), stato = 'pagato' where id = ${idOrdine}`);
  await db().transaction((tx) => registraPeriodoLicenza(tx, { id: idOrdine, incaricatoId: x.id, tipo: "licenza" }, new Date()));
  await db().transaction((tx) => registraPeriodoLicenza(tx, { id: idOrdine, incaricatoId: x.id, tipo: "licenza" }, new Date()));
  const dopoIlPagamento = await calcoloDelMese(mese);
  expect(dopoIlPagamento.puntiAziendali).toBe(primaDelPagamento.puntiAziendali);
  expect(dopoIlPagamento.incasso).toBe(primaDelPagamento.incasso);

  // Rinnovata dopo la scadenza: 12 mesi dal pagamento (un periodo solo, anche con due conferme).
  const dopo = await situazioneLicenza(x.id);
  expect(dopo.stato === "valida" || dopo.stato === "in_scadenza").toBe(true);
  expect(dopo.periodi).toHaveLength(2);
  expect(dopo.periodi[1].pagatoIl).toBe(oggi);
  expect(await licenzaScaduta(x.id)).toBe(false);
  expect((await negozioDi(x.codice))?.stato.aperto).toBe(true);

  // Decadenza (in una transazione annullata): licenza scaduta 2 mesi fa e non rinnovata entro la fine del mese scorso.
  const kitVecchio = (await uno<{ g: string }>(sql`select (date_trunc('month', now() at time zone 'Europe/Rome') - interval '14 months' + interval '4 days')::date::text as g`)).g;
  await expect(
    db().transaction(async (tx) => {
      const y = await nuovaIncaricata(tx, alice.id, kitVecchio);
      const diretta = await nuovaIncaricata(tx, y.id, oggi);
      const cliente = await uno<{ id: string }>(sql`
        insert into app.clienti (incaricato_id, email, nome, cognome, telefono, privacy_accettata_il)
        values (${y.id}, ${`cliente-licenza-${randomUUID().slice(0, 8)}@gluxe.test`}, 'Cliente', 'Licenza', '3471112233', now()) returning id`, tx);
      // Con la chiusura di due mesi fa non decade ancora (poteva rinnovare fino alla fine del mese scorso).
      expect(await applicaDecadenze(tx, dueMesiFa, p, admin.id)).not.toContain(y.codice);
      const decadute = await applicaDecadenze(tx, meseScorso, p, admin.id);
      expect(decadute).toContain(y.codice);
      expect(decadute).not.toContain(x.codice);
      const dopoY = await uno<{ stato: string }>(sql`select stato from app.incaricati where id = ${y.id}`, tx);
      expect(dopoY.stato).toBe("cliente");
      expect((await uno<{ sponsor: string }>(sql`select sponsor_id::text sponsor from app.incaricati where id = ${diretta.id}`, tx)).sponsor).toBe(alice.id);
      expect((await uno<{ inc: string }>(sql`select incaricato_id::text inc from app.clienti where id = ${cliente.id}`, tx)).inc).toBe(alice.id);
      const traccia = await uno<{ n: number }>(sql`select count(*)::int n from app.registro_modifiche where azione = 'incaricato.licenza_decaduta' and entita_id = ${y.id}`, tx);
      expect(traccia.n).toBe(1);
      throw new Error("ANNULLA");
    }),
  ).rejects.toThrow("ANNULLA");
});

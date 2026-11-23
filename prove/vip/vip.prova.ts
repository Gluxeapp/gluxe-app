// Prova del Cliente VIP sul database di PROVA (npm run prova:vip): attivazione al pagamento, prezzi VIP nell'ordine
// successivo, rinnovo, revoca dopo un reso, registro solo in aggiunta, frase del carrello. Tutto avviene dentro una
// transazione che alla fine si annulla: nel database non resta nulla.
import { randomUUID } from "node:crypto";
import { and, eq, sql } from "drizzle-orm";
import { expect, test } from "vitest";
import { db } from "@/db";
import { clienti, ordini, prodotti, registroVip, righeOrdine } from "@/db/schema";
import { clienteVipOggi, inviaAvvisiVip, oggiItalia, registraVipDelPagamento, revocaVipDopoRimborso } from "@/lib/clienti-vip";
import { fraseVipDelCarrello } from "@/lib/negozio";
import { inserisciOrdine } from "@/lib/ordini";

const spedizione = { destinatario: "Cliente VIP Prova", indirizzo: "Via Prova VIP 1", cap: "20121", citta: "Milano", provincia: "MI", telefono: "3471234567" };
class Annulla extends Error {}

test("Cliente VIP: attivazione, prezzo VIP, rinnovo, revoca e registro", async () => {
  const [incaricata] = (await db().execute<{ id: string }>(sql`
    select i.id from app.incaricati i join app.utenti u on u.id = i.utente_id where u.email = 'alice.finta@gluxe.test'`)).rows;
  expect(incaricata).toBeTruthy();
  const [kit] = await db().select().from(prodotti).where(and(eq(prodotti.codice, "HB-SH-10"), eq(prodotti.attivo, true)));
  const [shampoo] = await db().select().from(prodotti).where(and(eq(prodotti.codice, "HB-SH"), eq(prodotti.attivo, true)));
  expect(kit && shampoo).toBeTruthy();

  // Frase del carrello da ospite: nessuno status, quanto manca ai 99 €.
  const vuota = await fraseVipDelCarrello([], null);
  expect(vuota).toMatchObject({ vip: false, raggiunto: false, avanzamento: 0 });
  const conKit = await fraseVipDelCarrello([{ prodottoId: kit.id, quantita: 1 }], null);
  expect(conKit.raggiunto).toBe(kit.prezzoListino >= 9900n);

  await expect(
    db().transaction(async (tx) => {
      const [cliente] = await tx
        .insert(clienti)
        .values({ incaricatoId: incaricata.id, email: `vip-${randomUUID().slice(0, 8)}@gluxe.test`, nome: "Vera", cognome: "Prova", telefono: "3471234567", privacyAccettataIl: new Date() })
        .returning();
      const ordine = async (vip: boolean, quantita: number, prodotto = kit) => {
        const id = await inserisciOrdine(tx, { incaricatoId: incaricata.id, tipo: "online", articoli: [{ prodotto, quantita }], spedizione, riordinoConfermato: false, clienteId: cliente.id, vip });
        const [o] = await tx.select().from(ordini).where(eq(ordini.id, id));
        return o;
      };
      const oggi = await oggiItalia(tx);

      // Primo ordine a prezzo pieno: alla conferma del pagamento la cliente diventa VIP e riceve l'email.
      expect((await clienteVipOggi(cliente.id, tx)).vip).toBe(false);
      const primo = await ordine(false, 1);
      const email = await registraVipDelPagamento(tx, primo, new Date());
      expect(email?.a).toBe(cliente.email);
      expect(email?.oggetto).toMatch(/VIP/);
      const stato = await clienteVipOggi(cliente.id, tx);
      expect(stato.vip).toBe(true);
      expect(stato.validaFino! > oggi).toBe(true);
      // Lo stesso pagamento ricevuto due volte non crea una seconda voce.
      expect(await registraVipDelPagamento(tx, primo, new Date())).toBeNull();

      // Ordine successivo: prezzo VIP (listino − 15%), punti su quanto pagato.
      const secondo = await ordine(true, 1);
      const [riga] = await tx.select().from(righeOrdine).where(eq(righeOrdine.ordineId, secondo.id));
      expect(riga).toMatchObject({ tipoPrezzo: "listino_vip", listinoUnitarioIvato: kit.prezzoListino });
      expect(riga.prezzoUnitarioIvato).toBe((kit.prezzoListino * 8500n + 5000n) / 10000n);
      expect(riga.provvigioneUnitaria * 2n - riga.puntiUnitari).toBeLessThanOrEqual(1n);
      // 106,90 € a listino: rinnova, con l'email di rinnovo e la nuova scadenza.
      const rinnovo = await registraVipDelPagamento(tx, secondo, new Date());
      expect(rinnovo?.oggetto).toMatch(/rinnovato/);
      expect(rinnovo?.testo).toMatch(/rinnovato fino al \d{2}\/\d{2}\/\d{4}/);
      const voci = await tx.select().from(registroVip).where(eq(registroVip.clienteId, cliente.id));
      expect(voci.map((v) => v.tipo).sort()).toEqual(["attivazione", "rinnovo"]);

      // Reso totale del rinnovo: si revoca e la scadenza torna quella dell'attivazione (che oggi è la stessa).
      await revocaVipDopoRimborso(tx, secondo.id, secondo.totale, new Date());
      await revocaVipDopoRimborso(tx, secondo.id, secondo.totale, new Date());
      const dopo = await tx.select().from(registroVip).where(eq(registroVip.clienteId, cliente.id));
      expect(dopo.filter((v) => v.tipo === "revoca")).toHaveLength(1);
      expect((await clienteVipOggi(cliente.id, tx)).vip).toBe(true);
      // Reso totale anche del primo: non è più VIP.
      await revocaVipDopoRimborso(tx, primo.id, primo.totale, new Date());
      expect((await clienteVipOggi(cliente.id, tx)).vip).toBe(false);

      // Un ordine piccolo (sotto i 99 €) non attiva nulla.
      const piccolo = await ordine(false, 1, shampoo);
      expect(await registraVipDelPagamento(tx, piccolo, new Date())).toBeNull();

      // Avviso di scadenza: una cliente VIP che scade tra 10 giorni riceve l'avviso una volta sola.
      const [altra] = await tx
        .insert(clienti)
        .values({ incaricatoId: incaricata.id, email: `vip-${randomUUID().slice(0, 8)}@gluxe.test`, nome: "Sara", cognome: "Prova", telefono: "3471234567", privacyAccettataIl: new Date() })
        .returning();
      const [ordineAltra] = await tx.select({ id: ordini.id }).from(ordini).where(eq(ordini.id, piccolo.id));
      await tx.execute(sql`insert into app.registro_vip (cliente_id, tipo, ordine_id, giorno, valida_fino, prodotti_pagati, prodotti_listino)
        values (${altra.id}, 'attivazione', ${ordineAltra.id}, (current_date - 355), (current_date + 10), 9900, 9900)`);
      const primoGiro = await inviaAvvisiVip(tx);
      expect(primoGiro).toBeGreaterThanOrEqual(1);
      const [{ n }] = (await tx.execute<{ n: number }>(sql`select count(*)::int n from app.avvisi_vip where cliente_id = ${altra.id}`)).rows;
      expect(n).toBe(1);
      await inviaAvvisiVip(tx);
      const [{ n: dopoSecondo }] = (await tx.execute<{ n: number }>(sql`select count(*)::int n from app.avvisi_vip where cliente_id = ${altra.id}`)).rows;
      expect(dopoSecondo).toBe(1);

      // Il registro è solo in aggiunta: il database vieta di modificarlo.
      await expect(tx.execute(sql`savepoint prova_modifica`)).resolves.toBeDefined();
      await expect(tx.update(registroVip).set({ validaFino: "2099-12-31" }).where(eq(registroVip.clienteId, cliente.id))).rejects.toThrow();
      await tx.execute(sql`rollback to savepoint prova_modifica`);

      throw new Annulla();
    }),
  ).rejects.toBeInstanceOf(Annulla);
});

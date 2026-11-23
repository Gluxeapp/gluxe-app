// Prova della decisione 32 sul database di PROVA (npm run prova:clienti): profilo cliente, codice della consulente al
// primo acquisto, attivazione protetta per le email già clienti, "ordine per un cliente" dell'incaricata.
// Gli ordini creati restano "annullati"; clienti e profili finti hanno email @gluxe.test con un codice casuale.
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { afterAll, expect, test } from "vitest";
import { db } from "@/db";
import { creaOrdineDaProfilo, creaOrdineOnline, creaOrdinePerCliente, MESSAGGIO_CLIENTE_ALTRUI, vetrinaProdotti } from "@/lib/negozio";
import { leggiOrdine, registraStato } from "@/lib/ordini";
import { aggiornaProfilo, chiediConsulente, consulenteDi, ordiniDelProfilo, registraCliente } from "@/lib/profilo-cliente";

const creati: string[] = [];
const spedizione = { destinatario: "Cliente Profilo", indirizzo: "Via Profilo 3", cap: "20121", citta: "Milano", provincia: "MI", telefono: "3478889999" };
const email = (prefisso: string) => `${prefisso}-${randomUUID().slice(0, 8)}@gluxe.test`;
const uno = async <T,>(q: ReturnType<typeof sql>) => (await db().execute(q)).rows[0] as T;
const cliente = (e: string) => uno<{ id: string; incaricato_id: string | null; utente_id: string | null; nome: string; privacy: string | null }>(sql`
  select id, incaricato_id::text, utente_id::text, nome, privacy_accettata_il::text as privacy from app.clienti where email = ${e}`);

afterAll(async () => {
  for (const id of creati) await db().transaction((tx) => registraStato(tx, id, "annullato", { nota: "Prova automatica clienti" }));
});

test("decisione 32: profilo cliente e ordine per un cliente", async () => {
  const persona = (e: string) => uno<{ id: string; codice: string }>(sql`select i.id, i.codice from app.incaricati i join app.utenti u on u.id = i.utente_id where u.email = ${e}`);
  const alice = await persona("alice.finta@gluxe.test");
  const bruna = await persona("bruna.finta@gluxe.test");
  const prodotto = (await vetrinaProdotti()).prodotti[0];
  const richiesti = [{ prodottoId: prodotto.id, quantita: 1 }];

  // Registrazione senza link: profilo attivo, nessuna consulente; il primo acquisto vuole un codice valido.
  const libera = email("profilo");
  const r1 = await registraCliente({ nome: "Libera", cognome: "Prova", email: libera.toUpperCase(), telefono: "3471110000", password: "PasswordProva1" });
  expect(r1.esito).toBe("attivo");
  const c1 = await cliente(libera);
  expect(c1.incaricato_id).toBeNull();
  expect(c1.utente_id).not.toBeNull();
  await expect(creaOrdineDaProfilo({ clienteId: c1.id, richiesti, spedizione })).rejects.toThrow(/codice/);
  await expect(creaOrdineDaProfilo({ clienteId: c1.id, richiesti, spedizione, codiceConsulente: "GL999999" })).rejects.toThrow(/codice/);
  // Richiesta di una consulente all'azienda: una sola aperta alla volta.
  const dati1 = { id: c1.id, nome: "Libera", cognome: "Prova", telefono: "3471110000", email: libera };
  expect(await chiediConsulente(dati1, "Milano")).toBe(true);
  expect(await chiediConsulente(dati1, "Milano")).toBe(false);
  // Con il codice di Alice: ordine ad Alice e legame permanente; poi compra senza codice.
  const o1 = await creaOrdineDaProfilo({ clienteId: c1.id, richiesti, spedizione, codiceConsulente: alice.codice });
  creati.push(o1.id);
  expect((await leggiOrdine(o1.id))?.ordine).toMatchObject({ tipo: "online", incaricatoId: alice.id });
  expect((await cliente(libera)).incaricato_id).toBe(alice.id);
  const o2 = await creaOrdineDaProfilo({ clienteId: c1.id, richiesti, spedizione, codiceConsulente: bruna.codice });
  creati.push(o2.id);
  expect((await leggiOrdine(o2.id))?.ordine.incaricatoId).toBe(alice.id);
  expect((await ordiniDelProfilo(c1.id)).map((o) => o.id).sort()).toEqual([o1.id, o2.id].sort());

  // Registrazione dal link del negozio di Bruna: legata subito a lei.
  const dalLink = email("dal-link");
  expect((await registraCliente({ nome: "Link", cognome: "Prova", email: dalLink, telefono: "3471110001", password: "PasswordProva1", codiceNegozio: bruna.codice })).esito).toBe("attivo");
  expect((await cliente(dalLink)).incaricato_id).toBe(bruna.id);

  // Email di un cliente che ha già comprato come ospite: profilo da attivare con il link (nessuna password scelta da chi
  // si registra) e i suoi dati non cambiano. Una seconda registrazione con la stessa email: "esiste".
  const ospite = email("ospite");
  const g = await creaOrdineOnline({ codiceNegozio: alice.codice, richiesti, cliente: { nome: "Ospite", cognome: "Vero", email: ospite, telefono: "3471110002" }, spedizione, consensoContatti: false });
  creati.push(g.id);
  expect((await registraCliente({ nome: "Intruso", cognome: "X", email: ospite, telefono: "3330000000", password: "PasswordProva1" })).esito).toBe("conferma");
  const cg = await cliente(ospite);
  expect(cg.nome).toBe("Ospite");
  const profilo = await uno<{ hash: string | null }>(sql`select password_hash as hash from app.utenti where id = ${cg.utente_id}`);
  expect(profilo.hash).toBeNull();
  expect((await registraCliente({ nome: "Ospite", cognome: "Vero", email: ospite, telefono: "3471110002", password: "PasswordProva1" })).esito).toBe("esiste");

  // Ordine per un cliente preparato da Bruna: cliente nuovo legato a lei, informativa ancora da accettare.
  const nuovo = email("per-cliente");
  const p1 = await creaOrdinePerCliente({ incaricatoId: bruna.id, codiceIncaricata: bruna.codice, richiesti, cliente: { nome: "Nuovo", cognome: "Cliente", email: nuovo, telefono: "3471110003" }, spedizione });
  creati.push(p1.id);
  expect((await leggiOrdine(p1.id))?.ordine).toMatchObject({ tipo: "online", incaricatoId: bruna.id });
  expect(await cliente(nuovo)).toMatchObject({ incaricato_id: bruna.id, privacy: null });
  // Cliente di Alice: Bruna non può preparargli ordini.
  await expect(
    creaOrdinePerCliente({ incaricatoId: bruna.id, codiceIncaricata: bruna.codice, richiesti, cliente: { nome: "X", cognome: "Y", email: ospite, telefono: "3471110002" }, spedizione }),
  ).rejects.toThrow(MESSAGGIO_CLIENTE_ALTRUI);
  // Cliente registrato senza consulente: l'ordine preparato da Bruna lo lega a lei.
  const senza = email("senza-consulente");
  await registraCliente({ nome: "Senza", cognome: "Consulente", email: senza, telefono: "3471110004", password: "PasswordProva1" });
  const p2 = await creaOrdinePerCliente({ incaricatoId: bruna.id, codiceIncaricata: bruna.codice, richiesti, cliente: { nome: "Senza", cognome: "Consulente", email: senza, telefono: "3471110004" }, spedizione });
  creati.push(p2.id);
  expect((await cliente(senza)).incaricato_id).toBe(bruna.id);
  // Il codice dell'incaricata deve essere il suo.
  await expect(
    creaOrdinePerCliente({ incaricatoId: bruna.id, codiceIncaricata: alice.codice, richiesti, cliente: { nome: "A", cognome: "B", email: email("x"), telefono: "3471110005" }, spedizione }),
  ).rejects.toThrow(/negozio/);

  // Ospite dal link per un cliente registrato senza consulente: si lega all'incaricata del link.
  const terzo = email("terzo");
  await registraCliente({ nome: "Terzo", cognome: "Prova", email: terzo, telefono: "3471110006", password: "PasswordProva1" });
  const g2 = await creaOrdineOnline({ codiceNegozio: alice.codice, richiesti, cliente: { nome: "Terzo", cognome: "Prova", email: terzo, telefono: "3471110006" }, spedizione, consensoContatti: true });
  creati.push(g2.id);
  expect((await cliente(terzo)).incaricato_id).toBe(alice.id);

  // Profilo: dati e indirizzo; contatti della consulente solo se lei sceglie di mostrarli.
  await aggiornaProfilo(c1.id, { nome: "Libera", cognome: "Prova", telefono: "3471110000", indirizzo: "Via Nuova 1", cap: "20122", citta: "Milano", provincia: "MI", consensoContatti: true });
  const aggiornato = await uno<{ indirizzo: string; consenso: string | null }>(sql`select indirizzo, consenso_contatti_il::text consenso from app.clienti where id = ${c1.id}`);
  expect(aggiornato.indirizzo).toBe("Via Nuova 1");
  expect(aggiornato.consenso).not.toBeNull();
  await db().execute(sql`update app.incaricati set mostra_contatti_clienti = false where id = ${alice.id}`);
  expect((await consulenteDi(alice.id))?.contatti).toBeNull();
  await db().execute(sql`update app.incaricati set mostra_contatti_clienti = true where id = ${alice.id}`);
  expect((await consulenteDi(alice.id))?.contatti).not.toBeNull();
  await db().execute(sql`update app.incaricati set mostra_contatti_clienti = false where id = ${alice.id}`);
});

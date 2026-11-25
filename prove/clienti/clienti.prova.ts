// Prova delle decisioni 32 e 36 sul database di PROVA (npm run prova:clienti): profilo cliente, codice della consulente
// al primo acquisto, attivazione protetta per i clienti che esistono già, "ordine per un cliente" dell'incaricata,
// cliente riconosciuto dal codice fiscale (non dall'email).
// Gli ordini creati restano "annullati"; clienti e profili finti hanno email @gluxe.test e codici fiscali casuali.
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { afterAll, expect, test } from "vitest";
import { db } from "@/db";
import { correggiCodiceFiscale, elencoClienti } from "@/lib/clienti";
import { clientiDellIncaricata, creaOrdineDaProfilo, creaOrdineOnline, creaOrdinePerCliente, MESSAGGIO_CLIENTE_ALTRUI, vetrinaProdotti } from "@/lib/negozio";
import { leggiOrdine, registraStato } from "@/lib/ordini";
import {
  aggiornaProfilo,
  aggiungiCodiceFiscale,
  chiediConsulente,
  consulenteDi,
  ordiniDelProfilo,
  registraCliente,
} from "@/lib/profilo-cliente";
import { codiceFiscaleCasuale } from "../codice-fiscale-casuale";

const creati: string[] = [];
const spedizione = { destinatario: "Cliente Profilo", indirizzo: "Via Profilo 3", cap: "20121", citta: "Milano", provincia: "MI", telefono: "3478889999" };
const email = (prefisso: string) => `${prefisso}-${randomUUID().slice(0, 8)}@gluxe.test`;
const uno = async <T,>(q: ReturnType<typeof sql>) => (await db().execute(q)).rows[0] as T;
type Riga = { id: string; incaricato_id: string | null; utente_id: string | null; nome: string; email: string; cf: string | null; privacy: string | null };
const campi = sql`id, incaricato_id::text, utente_id::text, nome, email, codice_fiscale cf, privacy_accettata_il::text as privacy`;
const cliente = (cf: string) => uno<Riga>(sql`select ${campi} from app.clienti where codice_fiscale = ${cf}`);
const perEmail = async (e: string) => (await db().execute(sql`select ${campi} from app.clienti where email = ${e} order by creato_il`)).rows as Riga[];

afterAll(async () => {
  for (const id of creati) await db().transaction((tx) => registraStato(tx, id, "annullato", { nota: "Prova automatica clienti" }));
});

test("decisioni 32 e 36: profilo cliente, ordine per un cliente e codice fiscale", async () => {
  const persona = (e: string) =>
    uno<{ id: string; codice: string; cf: string }>(sql`select i.id, i.codice, i.codice_fiscale cf from app.incaricati i join app.utenti u on u.id = i.utente_id where u.email = ${e}`);
  const alice = await persona("alice.finta@gluxe.test");
  const bruna = await persona("bruna.finta@gluxe.test");
  const prodotto = (await vetrinaProdotti()).prodotti[0];
  const richiesti = [{ prodottoId: prodotto.id, quantita: 1 }];

  // Registrazione senza link: profilo attivo, nessuna consulente; il primo acquisto vuole un codice valido.
  const libera = email("profilo");
  const cfLibera = codiceFiscaleCasuale();
  const r1 = await registraCliente({ nome: "Libera", cognome: "Prova", codiceFiscale: cfLibera, email: libera.toUpperCase(), telefono: "3471110000", password: "PasswordProva1" });
  expect(r1.esito).toBe("attivo");
  const c1 = await cliente(cfLibera);
  expect(c1).toMatchObject({ incaricato_id: null, email: libera });
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
  expect((await cliente(cfLibera)).incaricato_id).toBe(alice.id);
  const o2 = await creaOrdineDaProfilo({ clienteId: c1.id, richiesti, spedizione, codiceConsulente: bruna.codice });
  creati.push(o2.id);
  expect((await leggiOrdine(o2.id))?.ordine.incaricatoId).toBe(alice.id);
  expect((await ordiniDelProfilo(c1.id)).map((o) => o.id).sort()).toEqual([o1.id, o2.id].sort());

  // Registrazione dal link del negozio di Bruna: legata subito a lei.
  const cfLink = codiceFiscaleCasuale();
  expect(
    (await registraCliente({ nome: "Link", cognome: "Prova", codiceFiscale: cfLink, email: email("dal-link"), telefono: "3471110001", password: "PasswordProva1", codiceNegozio: bruna.codice }))
      .esito,
  ).toBe("attivo");
  expect((await cliente(cfLink)).incaricato_id).toBe(bruna.id);

  // Codice fiscale di un cliente che ha già comprato come ospite, anche con un'email diversa: profilo da attivare con il
  // link mandato all'email degli acquisti (che resta quella del profilo); i suoi dati non cambiano.
  const ospite = email("ospite");
  const cfOspite = codiceFiscaleCasuale();
  const g = await creaOrdineOnline({
    codiceNegozio: alice.codice,
    richiesti,
    cliente: { nome: "Ospite", cognome: "Vero", codiceFiscale: cfOspite, email: ospite, telefono: "3471110002" },
    spedizione,
    consensoContatti: false,
  });
  creati.push(g.id);
  expect((await registraCliente({ nome: "Intruso", cognome: "X", codiceFiscale: cfOspite, email: email("intruso"), telefono: "3330000000", password: "PasswordProva1" })).esito).toBe(
    "conferma",
  );
  const cg = await cliente(cfOspite);
  expect(cg).toMatchObject({ nome: "Ospite", email: ospite });
  const profilo = await uno<{ hash: string | null; email: string }>(sql`select password_hash as hash, email from app.utenti where id = ${cg.utente_id}`);
  expect(profilo).toEqual({ hash: null, email: ospite });
  // Di nuovo con lo stesso codice fiscale: stessa risposta (promemoria all'email del profilo), nessun profilo in più.
  expect((await registraCliente({ nome: "Ospite", cognome: "Vero", codiceFiscale: cfOspite, email: email("altra"), telefono: "3471110002", password: "PasswordProva1" })).esito).toBe(
    "conferma",
  );
  expect((await cliente(cfOspite)).utente_id).toBe(cg.utente_id);
  // Email con un profilo, codice fiscale nuovo: "esiste" (un profilo per email).
  expect((await registraCliente({ nome: "Altra", cognome: "Persona", codiceFiscale: codiceFiscaleCasuale(), email: ospite, telefono: "3471110009", password: "PasswordProva1" })).esito).toBe(
    "esiste",
  );

  // Decisione 36, ospite: stesso codice fiscale con un'altra email e dal link di Bruna → stesso cliente, resta ad Alice,
  // l'email salvata non cambia.
  const g4 = await creaOrdineOnline({
    codiceNegozio: bruna.codice,
    richiesti,
    cliente: { nome: "Ospite", cognome: "Vero", codiceFiscale: cfOspite, email: email("cambiata"), telefono: "3471110002" },
    spedizione,
    consensoContatti: false,
  });
  creati.push(g4.id);
  expect((await leggiOrdine(g4.id))?.ordine).toMatchObject({ incaricatoId: alice.id, clienteId: cg.id });
  expect((await cliente(cfOspite)).email).toBe(ospite);

  // Stessa email, codice fiscale diverso (es. madre e figlia): due clienti, la seconda legata all'incaricata del link.
  const condivisa = email("famiglia");
  const [cfMadre, cfFiglia] = [codiceFiscaleCasuale(), codiceFiscaleCasuale()];
  const m = await creaOrdineOnline({ codiceNegozio: alice.codice, richiesti, cliente: { nome: "Madre", cognome: "Prova", codiceFiscale: cfMadre, email: condivisa, telefono: "3471110010" }, spedizione, consensoContatti: false });
  const f = await creaOrdineOnline({ codiceNegozio: bruna.codice, richiesti, cliente: { nome: "Figlia", cognome: "Prova", codiceFiscale: cfFiglia, email: condivisa, telefono: "3471110011" }, spedizione, consensoContatti: false });
  creati.push(m.id, f.id);
  expect((await perEmail(condivisa)).map((r) => [r.cf, r.incaricato_id])).toEqual([
    [cfMadre, alice.id],
    [cfFiglia, bruna.id],
  ]);

  // Cliente nato prima del codice fiscale (senza): al prossimo acquisto con la stessa email è lui, il codice gli si scrive
  // e il legame resta. Poi il codice fiscale non si cambia più, se non dalla sede.
  const vecchia = email("vecchio");
  const vecchio = await uno<{ id: string }>(sql`
    insert into app.clienti (incaricato_id, email, nome, cognome, telefono, privacy_accettata_il)
    values (${alice.id}, ${vecchia}, 'Vecchio', 'Cliente', '3471110012', now()) returning id`);
  await db().execute(sql`insert into app.storico_legami_clienti (cliente_id, incaricato_id, motivo) values (${vecchio.id}, ${alice.id}, 'Prova automatica clienti')`);
  const cfVecchio = codiceFiscaleCasuale();
  const v = await creaOrdineOnline({ codiceNegozio: bruna.codice, richiesti, cliente: { nome: "Vecchio", cognome: "Cliente", codiceFiscale: cfVecchio, email: vecchia, telefono: "3471110012" }, spedizione, consensoContatti: false });
  creati.push(v.id);
  expect(await cliente(cfVecchio)).toMatchObject({ id: vecchio.id, incaricato_id: alice.id });
  await expect(db().execute(sql`update app.clienti set codice_fiscale = ${codiceFiscaleCasuale()} where id = ${vecchio.id}`)).rejects.toThrow();
  const admin = await uno<{ id: string }>(sql`select id from app.utenti where ruolo = 'amministrazione' order by creato_il limit 1`);
  const corretto = codiceFiscaleCasuale();
  expect(await correggiCodiceFiscale({ clienteId: vecchio.id, codiceFiscale: cfMadre, motivo: "Prova automatica", utenteId: admin.id })).toBe("altrui");
  expect(await correggiCodiceFiscale({ clienteId: vecchio.id, codiceFiscale: corretto, motivo: "Prova automatica", utenteId: admin.id })).toBe("ok");
  expect((await cliente(corretto)).id).toBe(vecchio.id);
  const registro = await uno<{ n: number }>(sql`select count(*)::int n from app.registro_modifiche where azione = 'cliente.codice_fiscale_corretto' and entita_id = ${vecchio.id}`);
  expect(registro.n).toBe(1);

  // Profilo nato prima del codice fiscale: non ordina finché non lo aggiunge (una volta sola, mai quello di un altro).
  const senzaCf = email("profilo-vecchio");
  const pv = await uno<{ id: string }>(sql`
    with u as (insert into app.utenti (ruolo, email, nome) values ('cliente', ${senzaCf}, 'Profilo Vecchio') returning id)
    insert into app.clienti (incaricato_id, utente_id, email, nome, cognome, telefono, privacy_accettata_il)
    select ${alice.id}, u.id, ${senzaCf}, 'Profilo', 'Vecchio', '3471110013', now() from u returning id`);
  await expect(creaOrdineDaProfilo({ clienteId: pv.id, richiesti, spedizione })).rejects.toThrow(/codice fiscale/);
  expect(await aggiungiCodiceFiscale(pv.id, cfMadre)).toMatchObject({ ok: false });
  const cfPv = codiceFiscaleCasuale();
  expect(await aggiungiCodiceFiscale(pv.id, cfPv)).toEqual({ ok: true });
  expect(await aggiungiCodiceFiscale(pv.id, codiceFiscaleCasuale())).toMatchObject({ ok: false });
  const op = await creaOrdineDaProfilo({ clienteId: pv.id, richiesti, spedizione });
  creati.push(op.id);
  expect((await leggiOrdine(op.id))?.ordine.incaricatoId).toBe(alice.id);

  // Ordine per un cliente preparato da Bruna: cliente nuovo legato a lei, informativa ancora da accettare.
  const cfNuovo = codiceFiscaleCasuale();
  const p1 = await creaOrdinePerCliente({
    incaricatoId: bruna.id,
    codiceIncaricata: bruna.codice,
    richiesti,
    cliente: { nome: "Nuovo", cognome: "Cliente", codiceFiscale: cfNuovo, email: email("per-cliente"), telefono: "3471110003" },
    spedizione,
  });
  creati.push(p1.id);
  expect((await leggiOrdine(p1.id))?.ordine).toMatchObject({ tipo: "online", incaricatoId: bruna.id });
  expect(await cliente(cfNuovo)).toMatchObject({ incaricato_id: bruna.id, privacy: null });
  // Cliente di Alice (riconosciuto dal codice fiscale, anche con un'altra email): Bruna non può preparargli ordini.
  await expect(
    creaOrdinePerCliente({
      incaricatoId: bruna.id,
      codiceIncaricata: bruna.codice,
      richiesti,
      cliente: { nome: "X", cognome: "Y", codiceFiscale: cfOspite, email: email("diversa"), telefono: "3471110002" },
      spedizione,
    }),
  ).rejects.toThrow(MESSAGGIO_CLIENTE_ALTRUI);
  // Cliente registrato senza consulente: l'ordine preparato da Bruna lo lega a lei.
  const cfSenza = codiceFiscaleCasuale();
  const senza = email("senza-consulente");
  await registraCliente({ nome: "Senza", cognome: "Consulente", codiceFiscale: cfSenza, email: senza, telefono: "3471110004", password: "PasswordProva1" });
  const p2 = await creaOrdinePerCliente({
    incaricatoId: bruna.id,
    codiceIncaricata: bruna.codice,
    richiesti,
    cliente: { nome: "Senza", cognome: "Consulente", codiceFiscale: cfSenza, email: senza, telefono: "3471110004" },
    spedizione,
  });
  creati.push(p2.id);
  expect((await cliente(cfSenza)).incaricato_id).toBe(bruna.id);
  // L'incaricata vede il codice fiscale dei suoi clienti (decisione 36).
  const idSenza = (await cliente(cfSenza)).id;
  expect((await clientiDellIncaricata(bruna.id)).find((x) => x.id === idSenza)?.codiceFiscale).toBe(cfSenza);
  // Il codice dell'incaricata deve essere il suo.
  await expect(
    creaOrdinePerCliente({
      incaricatoId: bruna.id,
      codiceIncaricata: alice.codice,
      richiesti,
      cliente: { nome: "A", cognome: "B", codiceFiscale: codiceFiscaleCasuale(), email: email("x"), telefono: "3471110005" },
      spedizione,
    }),
  ).rejects.toThrow(/negozio/);

  // Ospite dal link per un cliente registrato senza consulente: si lega all'incaricata del link.
  const cfTerzo = codiceFiscaleCasuale();
  const terzo = email("terzo");
  await registraCliente({ nome: "Terzo", cognome: "Prova", codiceFiscale: cfTerzo, email: terzo, telefono: "3471110006", password: "PasswordProva1" });
  const g2 = await creaOrdineOnline({
    codiceNegozio: alice.codice,
    richiesti,
    cliente: { nome: "Terzo", cognome: "Prova", codiceFiscale: cfTerzo, email: terzo, telefono: "3471110006" },
    spedizione,
    consensoContatti: true,
  });
  creati.push(g2.id);
  expect((await cliente(cfTerzo)).incaricato_id).toBe(alice.id);

  // Clienti fittizi: un cliente con il codice fiscale dell'incaricata è segnalato.
  const se = await creaOrdineOnline({
    codiceNegozio: alice.codice,
    richiesti,
    cliente: { nome: "Alice", cognome: "Finta", codiceFiscale: alice.cf, email: email("se-stessa"), telefono: "3471110014" },
    spedizione,
    consensoContatti: false,
  });
  creati.push(se.id);
  const idSe = (await cliente(alice.cf)).id;
  expect((await elencoClienti()).find((x) => x.id === idSe)?.motivi).toContain("codice_fiscale");

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

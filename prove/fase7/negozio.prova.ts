// Prova della Fase 7 sul database di PROVA (npm run prova:fase7): ordini dal negozio online, legame del cliente,
// consenso ai contatti, ordini contemporanei, clienti fittizi, quote di vendita e pagine. Gli ordini creati restano
// "annullati" e i clienti finti hanno email @gluxe.test con un codice casuale (il database non li lascia cancellare).
import { randomUUID } from "node:crypto";
import { sql } from "drizzle-orm";
import { afterAll, expect, test } from "vitest";
import { db } from "@/db";
import { elencoClienti, schedaCliente, spostaCliente } from "@/lib/clienti";
import { catalogoNegozio, clientiDellIncaricata, creaOrdineOnline, negozioDi, ordineDelCliente, ordineDelNegozio, ordiniDelNegozio } from "@/lib/negozio";
import { leggiOrdine, ordiniDellIncaricata, registraStato } from "@/lib/ordini";
import { apriPagamentoCliente, chiudiPagamento } from "@/lib/pagamenti";
import { calcoloDelMese, meseCorrente, reteCompleta } from "@/lib/provvigioni/dati";
import { quoteVendite } from "@/lib/vendite";

const creati: string[] = [];
const spedizione = { destinatario: "Cliente Prova", indirizzo: "Via Prova Negozio 7", cap: "20121", citta: "Milano", provincia: "MI", telefono: "3471234567" };
const persona = async (email: string) =>
  (await db().execute<{ id: string; codice: string; telefono: string }>(sql`
    select i.id, i.codice, i.telefono from app.incaricati i join app.utenti u on u.id = i.utente_id where u.email = ${email}`)).rows[0];

afterAll(async () => {
  // Gli ordini di prova non pagati si annullano (gli ordini non si cancellano mai).
  for (const id of creati) await db().transaction((tx) => registraStato(tx, id, "annullato", { nota: "Prova automatica Fase 7" }));
});

test("Fase 7: negozio, legame del cliente, consenso, contemporaneità, controlli e pagine", async () => {
  const alice = await persona("alice.finta@gluxe.test");
  const bruna = await persona("bruna.finta@gluxe.test");
  expect(alice && bruna).toBeTruthy();

  // Negozio aperto e catalogo al pubblico (niente start kit, prezzo pieno).
  const negozio = await negozioDi(alice.codice);
  expect(negozio?.stato.aperto).toBe(true);
  expect(negozio?.nome).toMatch(/^Alice F\.$/);
  expect(await negozioDi("GL99999X")).toBeUndefined();
  const catalogo = await catalogoNegozio();
  const prodotto = catalogo.prodotti.find((p) => !p.promozione)!;
  expect(prodotto.prezzo).toBe(prodotto.listino);

  // Primo ordine dal negozio di Alice: il cliente nasce legato ad Alice, senza consenso ai contatti.
  const email = `cliente-${randomUUID().slice(0, 8)}@gluxe.test`;
  const dati = { nome: "Cliente", cognome: "Prova", email: email.toUpperCase(), telefono: "3471234567" };
  const primo = await creaOrdineOnline({ codiceNegozio: alice.codice, richiesti: [{ prodottoId: prodotto.id, quantita: 2 }], cliente: dati, spedizione, consensoContatti: false });
  creati.push(primo.id);
  const letto = await leggiOrdine(primo.id);
  expect(letto?.ordine).toMatchObject({ tipo: "online", incaricatoId: alice.id, totale: prodotto.listino * 2n + 690n });
  expect(letto?.righe[0]).toMatchObject({ tipoPrezzo: "listino_pieno", prezzoUnitarioIvato: prodotto.listino });
  expect(letto?.ordine.provvigioneAcquisto).toBe(letto!.righe[0].totaleProvvigione);

  // Pagamento: si apre la pagina di Stripe (chiavi di prova) con lo stesso totale; poi la si chiude.
  const url = await apriPagamentoCliente(primo.id, email, `http://localhost:3000/negozio/ordine/${primo.id}?c=${primo.codice}`);
  expect(url).toMatch(/^https:\/\/checkout\.stripe\.com\//);
  const conSessione = await leggiOrdine(primo.id);
  expect(await chiudiPagamento(conSessione!.ordine.stripeSessioneId!)).toBe(true);
  // Un acquisto personale non si paga come ordine del negozio.
  const personale = (await ordiniDellIncaricata(alice.id))[0];
  if (personale) await expect(apriPagamentoCliente(personale.id, email, "http://localhost:3000")).rejects.toThrow(/non trovato/);

  // Il link segreto apre l'ordine; un codice sbagliato no. Nel database c'è solo l'impronta.
  expect((await ordineDelCliente(primo.id, primo.codice))?.consulente.codice).toBe(alice.codice);
  expect(await ordineDelCliente(primo.id, "codice-sbagliato-123")).toBeUndefined();
  expect(letto?.ordine.accessoClienteImpronta).not.toBe(primo.codice);

  // L'incaricata non vede l'ordine del cliente tra i suoi acquisti, né con leggiOrdine; lo vede nel Negozio, senza indirizzo.
  expect((await ordiniDellIncaricata(alice.id)).some((o) => o.id === primo.id)).toBe(false);
  expect(await leggiOrdine(primo.id, alice.id)).toBeUndefined();
  const delNegozio = await ordineDelNegozio(primo.id, alice.id);
  expect(delNegozio?.ordine.cliente).toBe("Cliente Prova");
  expect(JSON.stringify(delNegozio, (_, x) => (typeof x === "bigint" ? x.toString() : x))).not.toContain("Via Prova Negozio");
  expect(await ordineDelNegozio(primo.id, bruna.id)).toBeUndefined();
  expect((await ordiniDelNegozio(alice.id)).some((o) => o.id === primo.id)).toBe(true);

  // Senza consenso: Alice vede nome e cognome, non i contatti.
  const mieiClienti = await clientiDellIncaricata(alice.id);
  const { rows: [{ id: idCliente }] } = await db().execute<{ id: string }>(sql`select id from app.clienti where email = ${email}`);
  const c = mieiClienti.find((x) => x.id === idCliente);
  expect(c).toMatchObject({ nome: "Cliente", cognome: "Prova", contatti: null });
  expect(JSON.stringify(mieiClienti)).not.toContain(email);

  // Secondo ordine dal link di Bruna, con il consenso: va comunque ad Alice (legame permanente) e i contatti compaiono.
  const secondo = await creaOrdineOnline({ codiceNegozio: bruna.codice, richiesti: [{ prodottoId: prodotto.id, quantita: 1 }], cliente: { ...dati, email }, spedizione, consensoContatti: true });
  creati.push(secondo.id);
  expect((await leggiOrdine(secondo.id))?.ordine.incaricatoId).toBe(alice.id);
  expect((await clientiDellIncaricata(alice.id)).find((x) => x.id === c!.id)?.contatti?.email).toBe(email);
  expect((await clientiDellIncaricata(bruna.id)).some((x) => x.id === c!.id)).toBe(false);

  // Ordini contemporanei di un cliente nuovo da due negozi: un solo cliente, un solo legame.
  const nuovaEmail = `contemporaneo-${randomUUID().slice(0, 8)}@gluxe.test`;
  const insieme = await Promise.all(
    [alice.codice, bruna.codice, alice.codice].map((codiceNegozio) =>
      creaOrdineOnline({ codiceNegozio, richiesti: [{ prodottoId: prodotto.id, quantita: 1 }], cliente: { ...dati, email: nuovaEmail }, spedizione, consensoContatti: false }),
    ),
  );
  creati.push(...insieme.map((o) => o.id));
  const { rows: legami } = await db().execute<{ n: number; incaricate: number }>(sql`
    select count(distinct c.id)::int n, count(distinct o.incaricato_id)::int incaricate
    from app.clienti c join app.ordini o on o.cliente_id = c.id where c.email = ${nuovaEmail}`);
  expect(legami[0]).toEqual({ n: 1, incaricate: 1 });

  // Limite contro gli abusi: al massimo 5 ordini non pagati per cliente nelle 24 ore (qui ne ha già 3).
  for (let i = 0; i < 2; i++) {
    const o = await creaOrdineOnline({ codiceNegozio: alice.codice, richiesti: [{ prodottoId: prodotto.id, quantita: 1 }], cliente: { ...dati, email: nuovaEmail }, spedizione, consensoContatti: false });
    creati.push(o.id);
  }
  await expect(
    creaOrdineOnline({ codiceNegozio: alice.codice, richiesti: [{ prodottoId: prodotto.id, quantita: 1 }], cliente: { ...dati, email: nuovaEmail }, spedizione, consensoContatti: false }),
  ).rejects.toThrow(/in attesa di pagamento/);

  // Clienti fittizi: il cliente che usa il telefono dell'incaricata è segnalato.
  const sospetto = `sospetto-${randomUUID().slice(0, 8)}@gluxe.test`;
  const o = await creaOrdineOnline({ codiceNegozio: bruna.codice, richiesti: [{ prodottoId: prodotto.id, quantita: 1 }], cliente: { ...dati, email: sospetto, telefono: bruna.telefono }, spedizione, consensoContatti: false });
  creati.push(o.id);
  const elenco = await elencoClienti();
  expect(elenco.find((x) => x.email === sospetto)?.motivi).toContain("telefono");
  expect(elenco.find((x) => x.email === email)?.motivi).toEqual([]);

  // La sede sposta il cliente: storico e registro modifiche; gli ordini già fatti restano ad Alice.
  const admin = (await db().execute<{ id: string }>(sql`select id from app.utenti where ruolo = 'amministrazione' order by creato_il limit 1`)).rows[0];
  expect(await spostaCliente({ clienteId: c!.id, incaricatoId: bruna.id, motivo: "Prova automatica Fase 7", utenteId: admin.id })).toBe("ok");
  const scheda = await schedaCliente(c!.id);
  expect(scheda?.codice).toBe(bruna.codice);
  expect(scheda?.legami.map((l) => l.codice)).toEqual([alice.codice, bruna.codice]);
  expect((await leggiOrdine(primo.id))?.ordine.incaricatoId).toBe(alice.id);
  const terzo = await creaOrdineOnline({ codiceNegozio: alice.codice, richiesti: [{ prodottoId: prodotto.id, quantita: 1 }], cliente: { ...dati, email }, spedizione, consensoContatti: true });
  creati.push(terzo.id);
  expect((await leggiOrdine(terzo.id))?.ordine.incaricatoId).toBe(bruna.id);

  // Quote di vendita del mese (pagina della sede): i calcoli girano sui dati veri del database di prova.
  const mese = await meseCorrente();
  const [e, rete] = await Promise.all([calcoloDelMese(mese), reteCompleta()]);
  const quote = quoteVendite(
    rete.map((r) => ({ id: r.id, sponsorId: r.sponsor_id })),
    new Map(e.situazioni.map((s) => [s.id, { on: s.on, pp: s.pp }])),
  );
  const qa = quote.get(alice.id)!;
  expect(qa.ppRete).toBeGreaterThanOrEqual(qa.pp);
});

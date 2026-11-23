import "server-only";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db, type Esecutore } from "@/db";
import { clienti, incaricati, registroVip, righeOrdine } from "@/db/schema";
import { parametriCorrenti } from "./catalogo";
import { formattaEuro } from "./denaro";
import { indirizzoApp } from "./indirizzo-app";
import { contaProdotti, daRevocare, dataItaliana, esitoVipDelPagamento, validaFinoVip, vipIl, type VoceRegistroVip } from "./vip";

/**
 * Cliente VIP (docs/piano-compensi.md, sezione 2a, decisione 35): letture e scritture sul database.
 * Le regole sono nel modulo puro vip.ts. Lo sconto vale solo dal profilo cliente e negli ordini preparati
 * dall'incaricata, mai da ospite: chi scrive solo un'email non scopre lo status di un'altra persona.
 */

const OGGI_ITALIA = sql<string>`(now() at time zone 'Europe/Rome')::date::text`;

export async function oggiItalia(e: Esecutore = db()): Promise<string> {
  const {
    rows: [{ giorno }],
  } = await e.execute<{ giorno: string }>(sql`select ${OGGI_ITALIA} as giorno`);
  return giorno;
}

async function giornoItaliano(e: Esecutore, momento: Date): Promise<string> {
  const {
    rows: [{ giorno }],
  } = await e.execute<{ giorno: string }>(sql`select (${momento.toISOString()}::timestamptz at time zone 'Europe/Rome')::date::text as giorno`);
  return giorno;
}

async function registroDi(e: Esecutore, clienteId: string): Promise<VoceRegistroVip[]> {
  const righe = await e
    .select({ id: registroVip.id, tipo: registroVip.tipo, ordineId: registroVip.ordineId, validaFino: registroVip.validaFino, revocaDi: registroVip.revocaDi })
    .from(registroVip)
    .where(eq(registroVip.clienteId, clienteId))
    .orderBy(asc(registroVip.id));
  return righe.map((r) => ({ ...r, id: r.id.toString(), revocaDi: r.revocaDi?.toString() ?? null }));
}

/** Ultimo giorno di status VIP della cliente (null se non è mai stata VIP o se è stato revocato). */
export async function validaFinoDelCliente(clienteId: string, e: Esecutore = db()): Promise<string | null> {
  return validaFinoVip(await registroDi(e, clienteId));
}

/** È VIP oggi? Serve a decidere il prezzo di un ordine nuovo. */
export async function clienteVipOggi(clienteId: string, e: Esecutore = db()): Promise<{ vip: boolean; validaFino: string | null; oggi: string }> {
  // Una dopo l'altra: dentro una transazione la connessione è una sola.
  const validaFino = await validaFinoDelCliente(clienteId, e);
  const oggi = await oggiItalia(e);
  return { vip: vipIl(validaFino, oggi), validaFino, oggi };
}

/** Scadenza dello status VIP di più clienti insieme (per gli elenchi). Solo chi è VIP oggi. */
export async function vipDiOggi(clienteIds: string[]): Promise<Map<string, string>> {
  if (clienteIds.length === 0) return new Map();
  const [righe, oggi] = await Promise.all([
    db()
      .select({ clienteId: registroVip.clienteId, id: registroVip.id, tipo: registroVip.tipo, ordineId: registroVip.ordineId, validaFino: registroVip.validaFino, revocaDi: registroVip.revocaDi })
      .from(registroVip)
      .where(inArray(registroVip.clienteId, clienteIds)),
    oggiItalia(),
  ]);
  const perCliente = new Map<string, VoceRegistroVip[]>();
  for (const r of righe) {
    const voci = perCliente.get(r.clienteId) ?? [];
    voci.push({ id: r.id.toString(), tipo: r.tipo, ordineId: r.ordineId, validaFino: r.validaFino, revocaDi: r.revocaDi?.toString() ?? null });
    perCliente.set(r.clienteId, voci);
  }
  const esito = new Map<string, string>();
  for (const [id, voci] of perCliente) {
    const fino = validaFinoVip(voci);
    if (vipIl(fino, oggi)) esito.set(id, fino!);
  }
  return esito;
}

type Messaggio = { a: string; oggetto: string; testo: string };

/**
 * Ordine del negozio appena pagato (dal webhook di Stripe, nella stessa transazione): se raggiunge la soglia
 * attiva o rinnova lo status VIP. All'attivazione prepara l'email per la cliente. Idempotente: un ordine
 * dà al massimo una voce (indice unico).
 */
export async function registraVipDelPagamento(
  tx: Esecutore,
  ordine: { id: string; tipo: string; clienteId: string | null },
  pagatoIl: Date,
): Promise<Messaggio | null> {
  if (ordine.tipo !== "online" || !ordine.clienteId) return null;
  // Un pagamento alla volta per cliente: il rinnovo dipende dalla scadenza precedente.
  const [cliente] = await tx.select().from(clienti).where(eq(clienti.id, ordine.clienteId)).for("update");
  const p = await parametriCorrenti();
  const giorno = await giornoItaliano(tx, pagatoIl);
  const registro = await registroDi(tx, cliente.id);
  const righe = await tx.select().from(righeOrdine).where(eq(righeOrdine.ordineId, ordine.id));
  if (registro.some((v) => v.ordineId === ordine.id && v.tipo !== "revoca")) return null;
  const conteggio = contaProdotti(righe);
  const esito = esitoVipDelPagamento({ validaFinoPrima: validaFinoVip(registro), pagatoIl: giorno, conteggio, p });
  if (!esito) return null;
  const [nuova] = await tx
    .insert(registroVip)
    .values({
      clienteId: cliente.id,
      tipo: esito.tipo,
      ordineId: ordine.id,
      giorno,
      validaFino: esito.validaFino,
      prodottiPagati: conteggio.pagati,
      prodottiListino: conteggio.aListino,
    })
    .onConflictDoNothing()
    .returning({ id: registroVip.id });
  if (!nuova || esito.tipo !== "attivazione") return null;
  return emailBenvenutoVip(tx, cliente, esito.validaFino, p);
}

/**
 * Dopo un rimborso su Stripe: se l'ordine aveva attivato o rinnovato lo status e i prodotti restanti scendono
 * sotto la soglia, quella voce si revoca (la cliente torna non VIP, o alla scadenza precedente).
 */
export async function revocaVipDopoRimborso(tx: Esecutore, ordineId: string, rimborsato: bigint, quando: Date): Promise<void> {
  const [voce] = await tx
    .select()
    .from(registroVip)
    .where(and(eq(registroVip.ordineId, ordineId), sql`${registroVip.tipo} <> 'revoca'`));
  if (!voce || voce.tipo === "revoca") return;
  const [giaRevocata] = await tx.select({ id: registroVip.id }).from(registroVip).where(eq(registroVip.revocaDi, voce.id));
  if (giaRevocata) return;
  const p = await parametriCorrenti();
  const revoca = daRevocare({ tipo: voce.tipo, conteggio: { pagati: voce.prodottiPagati, aListino: voce.prodottiListino }, rimborsato, p });
  if (!revoca) return;
  await tx
    .insert(registroVip)
    .values({
      clienteId: voce.clienteId,
      tipo: "revoca",
      ordineId,
      giorno: await giornoItaliano(tx, quando),
      revocaDi: voce.id,
      prodottiPagati: voce.prodottiPagati,
      prodottiListino: voce.prodottiListino,
    })
    .onConflictDoNothing();
}

/** Email di benvenuto alla nuova cliente VIP, con le condizioni e il link al suo profilo (dove vede i prezzi VIP). */
async function emailBenvenutoVip(
  tx: Esecutore,
  cliente: typeof clienti.$inferSelect,
  validaFino: string,
  p: { vipSconto: bigint; vipSoglia: bigint; vipMesi: number },
): Promise<Messaggio> {
  const [consulente] = cliente.incaricatoId
    ? await tx.select({ nome: incaricati.nome, cognome: incaricati.cognome, codice: incaricati.codice }).from(incaricati).where(eq(incaricati.id, cliente.incaricatoId))
    : [];
  const sconto = `${Number(p.vipSconto) / 100}`.replace(".", ",");
  const accesso = cliente.utenteId
    ? `Entra nel tuo profilo per vedere i tuoi prezzi VIP: ${indirizzoApp()}/cliente/accesso`
    : `I prezzi VIP li vedi nel tuo profilo cliente. Crealo con questa stessa email (ti mandiamo un link per scegliere la password):\n` +
      `${indirizzoApp()}/cliente/registrazione${consulente ? `?negozio=${consulente.codice}` : ""}`;
  return {
    a: cliente.email,
    oggetto: "Benvenuta tra le clienti VIP G LUXE",
    testo:
      `Ciao ${cliente.nome},\n\ngrazie per il tuo ordine. Da oggi sei cliente VIP G LUXE.\n\n` +
      `- ${sconto}% di sconto su tutto il listino, già dal tuo prossimo ordine;\n` +
      `- valido fino al ${dataItaliana(validaFino)};\n` +
      `- si rinnova per altri ${p.vipMesi} mesi con un ordine da almeno ${formattaEuro(p.vipSoglia)} a listino.\n\n` +
      `I prodotti in promozione restano al loro prezzo.\n\n${accesso}\n\n` +
      (consulente ? `La tua consulente G LUXE è ${consulente.nome} ${consulente.cognome.slice(0, 1)}.: per un consiglio, è lei il tuo punto di riferimento.\n\n` : "") +
      `Con affetto,\nGiovanna Di Lillo e il team G LUXE`,
  };
}

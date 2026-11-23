import "server-only";
import { and, asc, desc, eq, inArray, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { clienti, incaricati, ordini, storicoLegamiClienti, utenti } from "@/db/schema";
import { segnalazioniCliente, type Impronte, type Motivo } from "./clienti-fittizi";
import { registra } from "./registro";

/**
 * Clienti del negozio per la sede (amministrazione e contabilità: dati personali, regola 16).
 * Il controllo dei clienti fittizi si calcola qui, sul server, a ogni lettura (sezione 10).
 */

/** Telefoni, indirizzi e metodi di pagamento usati negli ordini, per cliente o per incaricata (acquisti personali). */
async function improntePerOrdini(per: "cliente" | "incaricata", ids: string[]) {
  const mappa = new Map<string, Omit<Impronte, "email">>();
  if (ids.length === 0) return mappa;
  const colonna = per === "cliente" ? ordini.clienteId : ordini.incaricatoId;
  const righe = await db()
    .select({ proprietario: colonna, telefono: ordini.telefono, indirizzo: ordini.indirizzo, cap: ordini.cap, metodo: ordini.metodoImpronta })
    .from(ordini)
    .where(per === "cliente" ? inArray(ordini.clienteId, ids) : and(inArray(ordini.incaricatoId, ids), ne(ordini.tipo, "online")));
  for (const r of righe) {
    if (!r.proprietario) continue;
    const x = mappa.get(r.proprietario) ?? { telefoni: [], indirizzi: [], metodi: [] };
    x.telefoni.push(r.telefono);
    x.indirizzi.push({ indirizzo: r.indirizzo, cap: r.cap });
    if (r.metodo) x.metodi.push(r.metodo);
    mappa.set(r.proprietario, x);
  }
  return mappa;
}

/** Segnalazioni di un gruppo di clienti, confrontati con l'incaricata a cui sono legati. */
async function segnalazioni(tutti: { id: string; email: string; telefono: string; incaricatoId: string | null }[]) {
  // I clienti senza consulente non hanno nessuno con cui confrontarli.
  const elenco = tutti.filter((c): c is typeof c & { incaricatoId: string } => c.incaricatoId !== null);
  const esito = new Map<string, Motivo[]>();
  if (elenco.length === 0) return esito;
  const idIncaricate = [...new Set(elenco.map((c) => c.incaricatoId))];
  const [perCliente, perIncaricata, profili] = await Promise.all([
    improntePerOrdini("cliente", elenco.map((c) => c.id)),
    improntePerOrdini("incaricata", idIncaricate),
    db()
      .select({ id: incaricati.id, email: utenti.email, telefono: incaricati.telefono, indirizzo: incaricati.indirizzo, cap: incaricati.cap })
      .from(incaricati)
      .innerJoin(utenti, eq(utenti.id, incaricati.utenteId))
      .where(inArray(incaricati.id, idIncaricate)),
  ]);
  const vuote = { telefoni: [], indirizzi: [], metodi: [] };
  for (const c of elenco) {
    const profilo = profili.find((p) => p.id === c.incaricatoId);
    if (!profilo) continue;
    const ordiniCliente = perCliente.get(c.id) ?? vuote;
    const ordiniIncaricata = perIncaricata.get(c.incaricatoId) ?? vuote;
    esito.set(
      c.id,
      segnalazioniCliente(
        { email: c.email, telefoni: [c.telefono, ...ordiniCliente.telefoni], indirizzi: ordiniCliente.indirizzi, metodi: ordiniCliente.metodi },
        {
          email: profilo.email,
          telefoni: [profilo.telefono, ...ordiniIncaricata.telefoni],
          indirizzi: [{ indirizzo: profilo.indirizzo, cap: profilo.cap }, ...ordiniIncaricata.indirizzi],
          metodi: ordiniIncaricata.metodi,
        },
      ),
    );
  }
  return esito;
}

/** Elenco dei clienti con incaricata, ordini pagati, totale e segnalazioni. */
export async function elencoClienti() {
  const righe = await db()
    .select({
      id: clienti.id,
      nome: clienti.nome,
      cognome: clienti.cognome,
      email: clienti.email,
      telefono: clienti.telefono,
      incaricatoId: clienti.incaricatoId,
      codice: incaricati.codice,
      incaricata: sql<string | null>`${incaricati.nome} || ' ' || ${incaricati.cognome}`,
      profilo: sql<boolean>`${clienti.utenteId} is not null`,
      ordini: sql<number>`(select count(*)::int from app.ordini o where o.cliente_id = ${clienti.id} and o.pagato_il is not null)`,
      totale: sql<string>`(select coalesce(sum(o.totale), 0)::text from app.ordini o where o.cliente_id = ${clienti.id} and o.pagato_il is not null and o.stato not in ('annullato', 'reso'))`,
      creatoIl: clienti.creatoIl,
    })
    .from(clienti)
    .leftJoin(incaricati, eq(incaricati.id, clienti.incaricatoId))
    .orderBy(desc(clienti.creatoIl))
    .limit(500);
  const motivi = await segnalazioni(righe);
  return righe.map((r) => ({ ...r, totale: BigInt(r.totale), motivi: motivi.get(r.id) ?? [] }));
}

/** Scheda di un cliente: dati, ordini, storico dei legami e segnalazioni. */
export async function schedaCliente(id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return undefined;
  const [c] = await db()
    .select({
      cliente: clienti,
      codice: incaricati.codice,
      incaricata: sql<string | null>`${incaricati.nome} || ' ' || ${incaricati.cognome}`,
    })
    .from(clienti)
    .leftJoin(incaricati, eq(incaricati.id, clienti.incaricatoId))
    .where(eq(clienti.id, id));
  if (!c) return undefined;
  const [elencoOrdini, legami, motivi] = await Promise.all([
    db()
      .select({
        id: ordini.id,
        numero: ordini.numero,
        stato: ordini.stato,
        totale: ordini.totale,
        punti: ordini.punti,
        creatoIl: ordini.creatoIl,
        codice: incaricati.codice,
      })
      .from(ordini)
      .innerJoin(incaricati, eq(incaricati.id, ordini.incaricatoId))
      .where(eq(ordini.clienteId, id))
      .orderBy(desc(ordini.creatoIl)),
    db()
      .select({ dal: storicoLegamiClienti.dal, motivo: storicoLegamiClienti.motivo, codice: incaricati.codice, da: utenti.nome })
      .from(storicoLegamiClienti)
      .innerJoin(incaricati, eq(incaricati.id, storicoLegamiClienti.incaricatoId))
      .leftJoin(utenti, eq(utenti.id, storicoLegamiClienti.modificatoDa))
      .where(eq(storicoLegamiClienti.clienteId, id))
      .orderBy(asc(storicoLegamiClienti.id)),
    segnalazioni([c.cliente]),
  ]);
  return { ...c, ordini: elencoOrdini, legami, motivi: motivi.get(id) ?? [] };
}

/** Sposta un cliente a un'altra incaricata (solo amministrazione): vale per gli ordini futuri. */
export async function spostaCliente(dati: { clienteId: string; incaricatoId: string; motivo: string; utenteId: string }) {
  return db().transaction(async (tx) => {
    const [prima] = await tx.select().from(clienti).where(eq(clienti.id, dati.clienteId)).for("update");
    if (!prima) return "assente" as const;
    if (prima.incaricatoId === dati.incaricatoId) return "uguale" as const;
    // Il database accetta il cambio solo se dichiarato come intervento tracciato della sede (migrazione 0008).
    await tx.execute(sql`select set_config('app.sposta_cliente', 'tracciato', true)`);
    await tx.update(clienti).set({ incaricatoId: dati.incaricatoId }).where(eq(clienti.id, dati.clienteId));
    await tx.insert(storicoLegamiClienti).values({ clienteId: dati.clienteId, incaricatoId: dati.incaricatoId, motivo: dati.motivo, modificatoDa: dati.utenteId });
    await registra(tx, {
      utenteId: dati.utenteId,
      azione: "cliente.spostato",
      entita: "cliente",
      entitaId: dati.clienteId,
      prima: { incaricatoId: prima.incaricatoId },
      dopo: { incaricatoId: dati.incaricatoId, motivo: dati.motivo },
    });
    return prima.incaricatoId ? ("ok" as const) : ("assegnato" as const);
  });
}

import "server-only";
import { desc, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { parametriVersioni } from "@/db/schema";
import { parametriDaJson } from "../parametri";
import { calcolaMese, type DatiMese, type EsitoMese } from "./motore";

/**
 * Prepara i dati del mese per il motore, leggendoli dal database, e lancia il calcolo.
 * Solo lettura: niente viene scritto (anteprima ricalcolabile quante volte si vuole).
 * Le pagine che la usano controllano prima chi può vedere cosa.
 *
 * "Ordine del mese" = ordine con data di pagamento nel mese, ora italiana; annullati e resi esclusi
 * (docs/garanzie-calcolo.md, sezione 2). I resi dopo la chiusura diventeranno storni (Fase 6).
 */

/** Mese corrente in Italia, "AAAA-MM". */
export async function meseCorrente(): Promise<string> {
  const {
    rows: [r],
  } = await db().execute<{ mese: string }>(sql`select to_char(now() at time zone 'Europe/Rome', 'YYYY-MM') as mese`);
  return r.mese;
}

export const MESE_VALIDO = /^\d{4}-(0[1-9]|1[0-2])$/;

export type CalcoloDelMese = EsitoMese & {
  versioneParametri: bigint;
  parametri: DatiMese["parametri"];
  nomi: Map<string, { codice: string; nome: string }>;
};

export async function calcoloDelMese(mese: string): Promise<CalcoloDelMese> {
  if (!MESE_VALIDO.test(mese)) throw new Error("Mese non valido");
  const inizio = `${mese}-01`;
  const fine = sql`(${inizio}::date + interval '1 month' - interval '1 day')::date`;

  const [versione] = await db()
    .select()
    .from(parametriVersioni)
    .where(lte(parametriVersioni.validoDal, fine))
    .orderBy(desc(parametriVersioni.validoDal), desc(parametriVersioni.id))
    .limit(1);
  if (!versione) throw new Error("Nessuna versione dei parametri valida per il mese");

  const [incaricate, ordini, bloccate, fondatori, quote] = await Promise.all([
    db().execute<{ id: string; sponsor_id: string | null; stato: string; codice: string; nome: string; esclusa_pool: boolean; esclusa_bonus_auto: boolean }>(sql`
      select id, sponsor_id, stato, codice, nome || ' ' || cognome as nome, esclusa_pool, esclusa_bonus_auto
      from app.incaricati`),
    db().execute<{ id: string; incaricato_id: string; tipo: "start_kit" | "personale" | "online"; punti: string; punti_promo: string; imponibile: string }>(sql`
      select o.id, o.incaricato_id, o.tipo, o.punti::text, o.merce_iva_esclusa::text as imponibile,
        coalesce((select sum(r.totale_punti) from app.righe_ordine r
                  where r.ordine_id = o.id and r.tipo_prezzo = 'promozione' and o.tipo = 'personale'), 0)::text as punti_promo
      from app.ordini o
      where o.pagato_il is not null
        and o.stato not in ('annullato', 'reso')
        and (o.pagato_il at time zone 'Europe/Rome')::date between ${inizio}::date and ${fine}`),
    db().execute<{ incaricato_id: string; percentuale: number }>(sql`
      select incaricato_id, percentuale from app.qualifiche_bloccate
      where dal <= ${fine} and (al is null or al >= ${inizio}::date)
        and (revocata_il is null or (revocata_il at time zone 'Europe/Rome')::date >= ${inizio}::date)`),
    db().execute<{ incaricato_id: string; ingresso: string; decade_dal: string | null }>(sql`
      select incaricato_id, ingresso::text, to_char(decade_dal, 'YYYY-MM') as decade_dal from app.leader_fondatori`),
    db().execute<{ incaricato_id: string; tipo: "master_president" | "quota_riservata"; percentuale: number; solo_se_attiva: boolean }>(sql`
      select incaricato_id, tipo, percentuale, solo_se_attiva from app.quote_speciali
      where dal <= ${fine} and (al is null or al >= ${inizio}::date)`),
  ]);

  const dati: DatiMese = {
    mese,
    parametri: parametriDaJson(versione.valori),
    // Sospese, cessate e tornate clienti non maturano nulla tranne la provvigione online.
    incaricate: incaricate.rows.map((i) => ({ id: i.id, sponsorId: i.sponsor_id, sospesa: i.stato !== "attivo" })),
    ordini: ordini.rows.map((o) => ({
      id: o.id,
      incaricataId: o.incaricato_id,
      tipo: o.tipo,
      punti: BigInt(o.punti),
      puntiPromo: BigInt(o.punti_promo),
      imponibile: BigInt(o.imponibile),
    })),
    bloccate: bloccate.rows.map((b) => ({ incaricataId: b.incaricato_id, percentuale: BigInt(b.percentuale) })),
    fondatori: fondatori.rows.map((f) => ({ incaricataId: f.incaricato_id, ingresso: f.ingresso, decadeDal: f.decade_dal })),
    quoteSpeciali: quote.rows.map((q) => ({
      incaricataId: q.incaricato_id,
      tipo: q.tipo,
      percentuale: BigInt(q.percentuale),
      soloSeAttiva: q.solo_se_attiva,
    })),
    esclusiPool: incaricate.rows.filter((i) => i.esclusa_pool).map((i) => i.id),
    esclusiBonusAuto: incaricate.rows.filter((i) => i.esclusa_bonus_auto).map((i) => i.id),
  };

  return {
    ...calcolaMese(dati),
    versioneParametri: versione.id,
    parametri: dati.parametri,
    nomi: new Map(incaricate.rows.map((i) => [i.id, { codice: i.codice, nome: i.nome }])),
  };
}

export const ETICHETTE_VOCE: Record<string, string> = {
  online: "Provvigione negozio online",
  promozione: "Provvigione promozioni",
  kit: "Provvigione start kit delle dirette",
  qualifica: "Qualifica sui punti personali",
  differenza: "Differenza imprenditoriale",
  generazione: "Generazioni",
  fondatore: "Bonus Leader Fondatore",
  pool: "Pool manager",
  quota_riservata: "Quota riservata",
  master_president: "Master President",
  bonus_auto: "Bonus auto",
};

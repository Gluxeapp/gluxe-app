import "server-only";
import { desc, eq, sql, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { mesiChiusi, parametriVersioni } from "@/db/schema";
import { datiDaFotografia } from "./congelamento";
import { schemaParametri, type Parametri } from "../parametri";
import { meseDecadenzaFondatore, puntiRequisitoFondatore, type OrdinePagato } from "./fondatori";
import { calcolaMese, type DatiMese, type EsitoMese, type IncaricataRete } from "./motore";

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
  parametri: Parametri;
  nomi: Map<string, { codice: string; nome: string }>;
};

/**
 * Ordini pagati tra due date (ora italiana, estremi compresi), annullati e resi esclusi,
 * con i punti delle righe in promozione separati (punti PR degli acquisti personali).
 */
async function ordiniPagati(dal: string | null, al: SQL, soloNonChiusi = false): Promise<OrdinePagato[]> {
  const righe = await db().execute<{
    id: string;
    incaricato_id: string;
    tipo: OrdinePagato["tipo"];
    punti: string;
    punti_promo: string;
    imponibile: string;
    pagato_il: string;
  }>(sql`
    select o.id, o.incaricato_id, o.tipo, o.punti::text, o.merce_iva_esclusa::text as imponibile,
      to_char(o.pagato_il at time zone 'Europe/Rome', 'YYYY-MM-DD') as pagato_il,
      coalesce((select sum(r.totale_punti) from app.righe_ordine r
                where r.ordine_id = o.id and r.tipo_prezzo = 'promozione' and o.tipo = 'personale'), 0)::text as punti_promo
    from app.ordini o
    where o.pagato_il is not null
      and o.stato not in ('annullato', 'reso')
      and (o.pagato_il at time zone 'Europe/Rome')::date <= ${al}
      and (${dal}::date is null or (o.pagato_il at time zone 'Europe/Rome')::date >= ${dal}::date)
      and (not ${soloNonChiusi} or not exists (select 1 from app.ordini_chiusi c where c.ordine_id = o.id))`);
  return righe.rows.map((o) => ({
    id: o.id,
    incaricataId: o.incaricato_id,
    tipo: o.tipo,
    punti: BigInt(o.punti),
    puntiPromo: BigInt(o.punti_promo),
    imponibile: BigInt(o.imponibile),
    pagatoIl: o.pagato_il,
  }));
}

export type RequisitoFondatore = { punti: bigint; fineFinestra: string; decadeDal: string | null };

/** Requisito dei 90 giorni per ogni fondatrice: punti raccolti finora e mese di decadenza se manca. */
export async function requisitiFondatori(
  fondatori: { incaricataId: string; ingresso: string }[],
  incaricate: IncaricataRete[],
  p: Parametri,
): Promise<Map<string, RequisitoFondatore>> {
  const esito = new Map<string, RequisitoFondatore>();
  if (fondatori.length === 0) return esito;
  const fine = (ingresso: string) => {
    const d = new Date(`${ingresso}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + p.fondatoriRequisitoGiorni - 1);
    return d.toISOString().slice(0, 10);
  };
  const dal = fondatori.map((f) => f.ingresso).sort()[0];
  const al = fondatori.map((f) => fine(f.ingresso)).sort().at(-1)!;
  const [ordini, oggi] = await Promise.all([ordiniPagati(dal, sql`${al}::date`), giornoDiOggi()]);
  for (const f of fondatori) {
    const fineFinestra = fine(f.ingresso);
    esito.set(f.incaricataId, {
      punti: puntiRequisitoFondatore(f.incaricataId, f.ingresso, incaricate, ordini, p),
      fineFinestra,
      // Si decide solo a finestra chiusa.
      decadeDal: fineFinestra < oggi ? meseDecadenzaFondatore(f.incaricataId, f.ingresso, incaricate, ordini, p) : null,
    });
  }
  return esito;
}

/** Oggi in Italia, "AAAA-MM-GG". */
export async function giornoDiOggi(): Promise<string> {
  const {
    rows: [r],
  } = await db().execute<{ oggi: string }>(sql`select to_char(now() at time zone 'Europe/Rome', 'YYYY-MM-DD') as oggi`);
  return r.oggi;
}

/** Rete completa per i calcoli: sospese, cessate e tornate clienti non maturano nulla tranne la provvigione online. */
export async function reteCompleta() {
  const righe = await db().execute<{
    id: string;
    sponsor_id: string | null;
    stato: string;
    codice: string;
    nome: string;
    esclusa_pool: boolean;
    esclusa_bonus_auto: boolean;
  }>(sql`select id, sponsor_id, stato, codice, nome || ' ' || cognome as nome, esclusa_pool, esclusa_bonus_auto from app.incaricati`);
  return righe.rows;
}

/** Mese successivo, "AAAA-MM". */
export function meseDopo(mese: string): string {
  const [a, m] = mese.split("-").map(Number);
  return new Date(Date.UTC(a, m, 1)).toISOString().slice(0, 7);
}

/** Ultimo mese chiuso, se c'è. */
export async function ultimoMeseChiuso(): Promise<string | null> {
  const [r] = await db().select({ mese: sql<string | null>`max(${mesiChiusi.mese})` }).from(mesiChiusi);
  return r?.mese ?? null;
}

/**
 * Versione dei parametri valida a fine mese. Le versioni di prima del piano rev. 6 (Fasi 2 e 3) non
 * contengono le regole delle provvigioni: per i mesi precedenti vale la prima versione completa,
 * perché il piano si applica dal primo ordine (decisione 1).
 */
async function versionePerIlMese(fine: SQL) {
  const versioni = await db()
    .select()
    .from(parametriVersioni)
    .orderBy(desc(parametriVersioni.validoDal), desc(parametriVersioni.id));
  const {
    rows: [{ giorno }],
  } = await db().execute<{ giorno: string }>(sql`select ${fine}::text as giorno`);
  const complete = versioni.flatMap((v) => {
    const letto = schemaParametri.safeParse(v.valori);
    return letto.success ? [{ versione: v, parametri: letto.data }] : [];
  });
  // A parità di data vale l'ultima registrata (l'elenco è già in quest'ordine).
  const primaData = complete.at(-1)?.versione.validoDal;
  const scelta = complete.find((c) => c.versione.validoDal <= giorno) ?? complete.find((c) => c.versione.validoDal === primaData);
  if (!scelta) throw new Error("Nessuna versione dei parametri valida per il mese");
  return scelta;
}

export type DatiDelMese = { dati: DatiMese; versioneParametri: bigint; chiuso: boolean };

/**
 * Dati in ingresso al motore per un mese. Mese chiuso: la sua fotografia (non cambia più).
 * Mese aperto: ordini pagati nel mese non ancora entrati in un mese chiuso; il primo mese aperto
 * prende anche i pagamenti arrivati in ritardo per mesi già chiusi (decisione 18).
 */
export async function datiDelMese(mese: string): Promise<DatiDelMese> {
  if (!MESE_VALIDO.test(mese)) throw new Error("Mese non valido");
  const [chiuso] = await db().select().from(mesiChiusi).where(eq(mesiChiusi.mese, mese)).limit(1);
  if (chiuso) return { dati: datiDaFotografia(chiuso.fotografia), versioneParametri: chiuso.parametriVersioneId, chiuso: true };

  const inizio = `${mese}-01`;
  const fine = sql`(${inizio}::date + interval '1 month' - interval '1 day')::date`;
  const ultimo = await ultimoMeseChiuso();
  const primoAperto = ultimo !== null && meseDopo(ultimo) === mese;

  const { versione, parametri } = await versionePerIlMese(fine);

  const [incaricate, ordini, bloccate, fondatori, quote] = await Promise.all([
    reteCompleta(),
    ordiniPagati(primoAperto ? null : inizio, fine, true),
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

  const rete = incaricate.map((i) => ({ id: i.id, sponsorId: i.sponsor_id, sospesa: i.stato !== "attivo" }));
  const requisiti = await requisitiFondatori(
    fondatori.rows.filter((f) => f.decade_dal === null).map((f) => ({ incaricataId: f.incaricato_id, ingresso: f.ingresso })),
    rete,
    parametri,
  );

  const dati: DatiMese = {
    mese,
    parametri,
    incaricate: rete,
    ordini: ordini.map((o) => ({
      id: o.id,
      incaricataId: o.incaricataId,
      tipo: o.tipo,
      punti: o.punti,
      puntiPromo: o.puntiPromo,
      imponibile: o.imponibile,
    })),
    bloccate: bloccate.rows.map((b) => ({ incaricataId: b.incaricato_id, percentuale: BigInt(b.percentuale) })),
    // Decadenza: quella registrata dalla sede o, se manca, quella che risulta dal requisito dei 90 giorni.
    fondatori: fondatori.rows.map((f) => ({
      incaricataId: f.incaricato_id,
      ingresso: f.ingresso,
      decadeDal: f.decade_dal ?? requisiti.get(f.incaricato_id)?.decadeDal ?? null,
    })),
    quoteSpeciali: quote.rows.map((q) => ({
      incaricataId: q.incaricato_id,
      tipo: q.tipo,
      percentuale: BigInt(q.percentuale),
      soloSeAttiva: q.solo_se_attiva,
    })),
    esclusiPool: incaricate.filter((i) => i.esclusa_pool).map((i) => i.id),
    esclusiBonusAuto: incaricate.filter((i) => i.esclusa_bonus_auto).map((i) => i.id),
  };

  return { dati, versioneParametri: versione.id, chiuso: false };
}

export async function calcoloDelMese(mese: string): Promise<CalcoloDelMese & { chiuso: boolean }> {
  const [{ dati, versioneParametri, chiuso }, incaricate] = await Promise.all([datiDelMese(mese), reteCompleta()]);
  return {
    ...calcolaMese(dati),
    versioneParametri,
    parametri: dati.parametri,
    chiuso,
    nomi: new Map(incaricate.map((i) => [i.id, { codice: i.codice, nome: i.nome }])),
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

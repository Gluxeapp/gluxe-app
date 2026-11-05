"use server";

import { and, count, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { incaricati, leaderFondatori, parametriVersioni, qualificheBloccate, quoteSpeciali } from "@/db/schema";
import { erroriPerCampo, valoriDa, type EsitoModulo } from "@/components/ui";
import { richiediStaff } from "@/lib/accesso";
import { parametriCorrenti } from "@/lib/catalogo";
import { daTesto } from "@/lib/denaro";
import { parametriInJson } from "@/lib/parametri";
import { parametriDaModulo } from "@/lib/parametri-modulo";
import { giornoDiOggi } from "@/lib/provvigioni/dati";
import { registra } from "@/lib/registro";
import { normalizzaCodiceIncaricato } from "@/lib/validazioni";

/**
 * Impostazioni del piano compensi dall'area sede (solo amministrazione).
 * Ogni modifica si registra nel registro modifiche, nella stessa transazione (CLAUDE.md, regola 11).
 */

const data = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Data non valida");
const dataFacoltativa = z
  .string()
  .transform((s) => s.trim() || null)
  .pipe(data.nullable());
const codice = z.string().transform(normalizzaCodiceIncaricato).pipe(z.string().regex(/^GL\d{6}$/, "Codice non valido (es. GL000123)"));
const motivo = z.string().trim().min(3, "Indica il motivo");
const percentuale = (massimo: bigint, messaggio: string) =>
  z.string().transform((s, ctx) => {
    try {
      const v = daTesto(s);
      if (v > 0n && v <= massimo) return v;
    } catch {}
    ctx.addIssue({ code: "custom", message: messaggio });
    return z.NEVER;
  });

async function incaricataDaCodice(c: string) {
  const [i] = await db().select({ id: incaricati.id }).from(incaricati).where(eq(incaricati.codice, c)).limit(1);
  return i;
}

const aggiorna = () => {
  revalidatePath("/staff/piano");
  revalidatePath("/staff/provvigioni");
};

// ── Qualifiche bloccate ─────────────────────────────────────────────────────

const schemaBloccata = z
  .object({ codice, percentuale: percentuale(2000n, "Scegli una percentuale fino al 20%"), dal: data, al: dataFacoltativa, motivo })
  .refine((v) => !v.al || v.al >= v.dal, { path: ["al"], message: "La fine non può venire prima dell'inizio" });

export async function aggiungiQualificaBloccata(_: EsitoModulo, formData: FormData): Promise<EsitoModulo> {
  const staff = await richiediStaff(["amministrazione"]);
  const valori = valoriDa(formData);
  const letto = schemaBloccata.safeParse(Object.fromEntries(formData));
  if (!letto.success) return { errori: erroriPerCampo(letto.error.issues), valori };
  const v = letto.data;
  const incaricata = await incaricataDaCodice(v.codice);
  if (!incaricata) return { errori: { codice: "Nessuna incaricata con questo codice." }, valori };

  await db().transaction(async (tx) => {
    const [nuova] = await tx
      .insert(qualificheBloccate)
      .values({ incaricatoId: incaricata.id, percentuale: Number(v.percentuale), dal: v.dal, al: v.al, motivo: v.motivo, creatoDa: staff.utenteId })
      .returning({ id: qualificheBloccate.id });
    await registra(tx, {
      utenteId: staff.utenteId,
      azione: "piano.qualifica_bloccata",
      entita: "incaricato",
      entitaId: incaricata.id,
      dopo: { id: String(nuova.id), percentuale: Number(v.percentuale), dal: v.dal, al: v.al, motivo: v.motivo },
    });
  });
  aggiorna();
  return { ok: true, messaggio: "Qualifica bloccata salvata." };
}

const schemaRevoca = z.object({ id: z.coerce.bigint(), motivo });

export async function revocaQualificaBloccata(_: EsitoModulo, formData: FormData): Promise<EsitoModulo> {
  const staff = await richiediStaff(["amministrazione"]);
  const letto = schemaRevoca.safeParse(Object.fromEntries(formData));
  if (!letto.success) return { errori: erroriPerCampo(letto.error.issues) };
  const { id, motivo: perche } = letto.data;
  const esito = await db().transaction(async (tx) => {
    const [riga] = await tx
      .update(qualificheBloccate)
      .set({ revocataIl: new Date() })
      .where(and(eq(qualificheBloccate.id, id), isNull(qualificheBloccate.revocataIl)))
      .returning();
    if (!riga) return false;
    await registra(tx, {
      utenteId: staff.utenteId,
      azione: "piano.qualifica_bloccata_revocata",
      entita: "incaricato",
      entitaId: riga.incaricatoId,
      prima: { id: String(id), percentuale: riga.percentuale, dal: riga.dal, al: riga.al },
      dopo: { revocata: true, motivo: perche },
    });
    return true;
  });
  aggiorna();
  return esito ? { ok: true, messaggio: "Qualifica bloccata revocata." } : { messaggio: "Già revocata." };
}

// ── Leader Fondatori ────────────────────────────────────────────────────────

const schemaFondatore = z.object({ codice, ingresso: data });

export async function aggiungiFondatore(_: EsitoModulo, formData: FormData): Promise<EsitoModulo> {
  const staff = await richiediStaff(["amministrazione"]);
  const valori = valoriDa(formData);
  const letto = schemaFondatore.safeParse(Object.fromEntries(formData));
  if (!letto.success) return { errori: erroriPerCampo(letto.error.issues), valori };
  const { codice: c, ingresso } = letto.data;
  const incaricata = await incaricataDaCodice(c);
  if (!incaricata) return { errori: { codice: "Nessuna incaricata con questo codice." }, valori };
  const p = await parametriCorrenti();

  if (p.dataLancioPiano) {
    const limite = new Date(`${p.dataLancioPiano}T00:00:00Z`);
    limite.setUTCMonth(limite.getUTCMonth() + p.fondatoriMesiIngresso);
    if (ingresso < p.dataLancioPiano || ingresso >= limite.toISOString().slice(0, 10)) {
      return {
        errori: { ingresso: `L'ingresso deve essere entro ${p.fondatoriMesiIngresso} mesi dal lancio del piano (${p.dataLancioPiano}).` },
        valori,
      };
    }
  }

  const esito = await db().transaction(async (tx) => {
    // Blocco: due inserimenti contemporanei non possono superare il massimo.
    await tx.execute(sql`lock table app.leader_fondatori in share row exclusive mode`);
    const [{ n }] = await tx.select({ n: count() }).from(leaderFondatori);
    if (n >= p.fondatoriMassimo) return "pieno" as const;
    const inserite = await tx
      .insert(leaderFondatori)
      .values({ incaricatoId: incaricata.id, ingresso, creatoDa: staff.utenteId })
      .onConflictDoNothing()
      .returning({ id: leaderFondatori.incaricatoId });
    if (inserite.length === 0) return "gia" as const;
    await registra(tx, {
      utenteId: staff.utenteId,
      azione: "piano.leader_fondatore",
      entita: "incaricato",
      entitaId: incaricata.id,
      dopo: { ingresso },
    });
    return "ok" as const;
  });
  if (esito === "pieno") return { messaggio: `Ci sono già ${p.fondatoriMassimo} Leader Fondatori: è il massimo del piano.`, valori };
  if (esito === "gia") return { messaggio: "È già nel programma Leader Fondatori.", valori };
  aggiorna();
  return { ok: true, messaggio: "Leader Fondatore aggiunta." };
}

// ── Quote speciali ed esclusioni ────────────────────────────────────────────

const schemaQuota = z
  .object({
    codice,
    tipo: z.enum(["master_president", "quota_riservata"]),
    percentuale: percentuale(10000n, "Percentuale dell'incasso tra 0 e 100"),
    soloSeAttiva: z.enum(["si", "no"]),
    dal: data,
    al: dataFacoltativa,
  })
  .refine((v) => !v.al || v.al >= v.dal, { path: ["al"], message: "La fine non può venire prima dell'inizio" });

export async function aggiungiQuotaSpeciale(_: EsitoModulo, formData: FormData): Promise<EsitoModulo> {
  const staff = await richiediStaff(["amministrazione"]);
  const valori = valoriDa(formData);
  const letto = schemaQuota.safeParse(Object.fromEntries(formData));
  if (!letto.success) return { errori: erroriPerCampo(letto.error.issues), valori };
  const v = letto.data;
  const incaricata = await incaricataDaCodice(v.codice);
  if (!incaricata) return { errori: { codice: "Nessuna incaricata con questo codice." }, valori };
  await db().transaction(async (tx) => {
    const [nuova] = await tx
      .insert(quoteSpeciali)
      .values({
        incaricatoId: incaricata.id,
        tipo: v.tipo,
        percentuale: Number(v.percentuale),
        soloSeAttiva: v.soloSeAttiva === "si",
        dal: v.dal,
        al: v.al,
        creatoDa: staff.utenteId,
      })
      .returning({ id: quoteSpeciali.id });
    await registra(tx, {
      utenteId: staff.utenteId,
      azione: "piano.quota_speciale",
      entita: "incaricato",
      entitaId: incaricata.id,
      dopo: { id: String(nuova.id), tipo: v.tipo, percentuale: Number(v.percentuale), soloSeAttiva: v.soloSeAttiva === "si", dal: v.dal, al: v.al },
    });
  });
  aggiorna();
  return { ok: true, messaggio: "Quota salvata." };
}

const schemaFineQuota = z.object({ id: z.coerce.bigint(), al: data });

/** Fa finire una quota speciale in una data (la riga resta, con la sua storia). */
export async function terminaQuotaSpeciale(_: EsitoModulo, formData: FormData): Promise<EsitoModulo> {
  const staff = await richiediStaff(["amministrazione"]);
  const letto = schemaFineQuota.safeParse(Object.fromEntries(formData));
  if (!letto.success) return { errori: erroriPerCampo(letto.error.issues) };
  const { id, al } = letto.data;
  const esito = await db().transaction(async (tx) => {
    const [prima] = await tx.select().from(quoteSpeciali).where(eq(quoteSpeciali.id, id)).for("update");
    if (!prima) return "assente";
    if (al < prima.dal) return "prima";
    await tx.update(quoteSpeciali).set({ al }).where(eq(quoteSpeciali.id, id));
    await registra(tx, {
      utenteId: staff.utenteId,
      azione: "piano.quota_speciale_terminata",
      entita: "incaricato",
      entitaId: prima.incaricatoId,
      prima: { id: String(id), al: prima.al },
      dopo: { al },
    });
    return "ok";
  });
  if (esito === "prima") return { messaggio: "La fine non può venire prima dell'inizio della quota." };
  if (esito === "assente") return { messaggio: "Quota non trovata." };
  aggiorna();
  return { ok: true, messaggio: "Fine della quota salvata." };
}

const schemaEsclusioni = z.object({ codice, esclusaPool: z.enum(["si", "no"]), esclusaBonusAuto: z.enum(["si", "no"]), motivo });

export async function impostaEsclusioni(_: EsitoModulo, formData: FormData): Promise<EsitoModulo> {
  const staff = await richiediStaff(["amministrazione"]);
  const valori = valoriDa(formData);
  const letto = schemaEsclusioni.safeParse(Object.fromEntries(formData));
  if (!letto.success) return { errori: erroriPerCampo(letto.error.issues), valori };
  const v = letto.data;
  const incaricata = await incaricataDaCodice(v.codice);
  if (!incaricata) return { errori: { codice: "Nessuna incaricata con questo codice." }, valori };
  const dopo = { esclusaPool: v.esclusaPool === "si", esclusaBonusAuto: v.esclusaBonusAuto === "si" };
  await db().transaction(async (tx) => {
    const [prima] = await tx
      .select({ esclusaPool: incaricati.esclusaPool, esclusaBonusAuto: incaricati.esclusaBonusAuto })
      .from(incaricati)
      .where(eq(incaricati.id, incaricata.id))
      .for("update");
    await tx.update(incaricati).set(dopo).where(eq(incaricati.id, incaricata.id));
    await registra(tx, {
      utenteId: staff.utenteId,
      azione: "piano.esclusioni",
      entita: "incaricato",
      entitaId: incaricata.id,
      prima,
      dopo: { ...dopo, motivo: v.motivo },
    });
  });
  aggiorna();
  return { ok: true, messaggio: "Esclusioni salvate." };
}

// ── Parametri del piano ─────────────────────────────────────────────────────

/** Nuova versione dei parametri, in vigore da una data non passata. Le versioni precedenti restano. */
export async function nuovaVersioneParametri(_: EsitoModulo, formData: FormData): Promise<EsitoModulo> {
  const staff = await richiediStaff(["amministrazione"]);
  const valori = valoriDa(formData);
  const validoDal = String(formData.get("validoDal") ?? "");
  const note = String(formData.get("note") ?? "").trim();
  const errori: Record<string, string> = {};
  const oggi = await giornoDiOggi();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(validoDal) || validoDal < oggi) errori.validoDal = "Scegli oggi o una data futura";
  if (note.length < 3) errori.note = "Descrivi in breve cosa cambia e perché";

  const attuali = await parametriCorrenti();
  const letto = parametriDaModulo(valori, attuali);
  if (!letto.ok) Object.assign(errori, letto.errori);
  if (Object.keys(errori).length > 0 || !letto.ok) {
    return { messaggio: "Controlla i campi evidenziati.", errori, valori };
  }

  const prima = parametriInJson(attuali) as Record<string, unknown>;
  const dopo = parametriInJson(letto.parametri) as Record<string, unknown>;
  const cambiati = Object.keys(dopo).filter((k) => JSON.stringify(prima[k]) !== JSON.stringify(dopo[k]));
  if (cambiati.length === 0) return { messaggio: "Nessun valore cambiato rispetto alla versione in vigore.", valori };

  await db().transaction(async (tx) => {
    const [nuova] = await tx
      .insert(parametriVersioni)
      .values({ validoDal, valori: dopo, note, creatoDa: staff.utenteId })
      .returning({ id: parametriVersioni.id });
    await registra(tx, {
      utenteId: staff.utenteId,
      azione: "parametri.nuova_versione",
      entita: "parametri",
      entitaId: String(nuova.id),
      prima: Object.fromEntries(cambiati.map((k) => [k, prima[k]])),
      dopo: { ...Object.fromEntries(cambiati.map((k) => [k, dopo[k]])), validoDal, note },
    });
  });
  revalidatePath("/staff/parametri");
  redirect("/staff/parametri");
}

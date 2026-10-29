"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { incaricati, richiesteContatto, storicoSponsor, utenti } from "@/db/schema";
import { erroriPerCampo, valoriDa, type EsitoModulo } from "@/components/ui";
import { richiediStaff } from "@/lib/accesso";
import { cercaSponsor, creaIncaricato, ErroreDatiDuplicati, schemaAnagrafica } from "@/lib/incaricati";
import { inviaLinkPassword } from "@/lib/password";
import { registra } from "@/lib/registro";
import { normalizzaCodiceIncaricato } from "@/lib/validazioni";

function letturaAnagrafica(formData: FormData) {
  return schemaAnagrafica.safeParse({
    ...Object.fromEntries(formData),
    haPartitaIva: formData.get("haPartitaIva") === "si",
  });
}

/** Inserimento di un incaricato da parte dell'amministrazione. Senza sponsor diventa capostipite della rete. */
export async function inserisciIncaricato(_: EsitoModulo, formData: FormData): Promise<EsitoModulo> {
  const staff = await richiediStaff(["amministrazione"]);
  const valori = valoriDa(formData);
  const letto = letturaAnagrafica(formData);
  if (!letto.success) {
    return { messaggio: "Controlla i campi evidenziati.", errori: erroriPerCampo(letto.error.issues), valori };
  }

  const codiceSponsor = String(formData.get("codiceSponsor") ?? "").trim();
  let sponsorId: string | null = null;
  if (codiceSponsor) {
    const sponsor = await cercaSponsor(codiceSponsor);
    if (!sponsor) return { errori: { codiceSponsor: "Nessun incaricato attivo con questo codice." }, valori };
    sponsorId = sponsor.id;
  }

  let nuovo;
  try {
    nuovo = await creaIncaricato(letto.data, { sponsorId, password: null, creatoDa: staff.utenteId });
  } catch (e) {
    if (e instanceof ErroreDatiDuplicati) return { messaggio: e.message, valori };
    throw e;
  }
  await inviaLinkPassword(
    { id: nuovo.utenteId, email: letto.data.email, nome: letto.data.nome },
    "nuovo",
  );
  redirect(`/staff/incaricati/${nuovo.id}`);
}

/** Correzione dei dati anagrafici, con valore prima e dopo nel registro. */
export async function modificaAnagrafica(_: EsitoModulo, formData: FormData): Promise<EsitoModulo> {
  const staff = await richiediStaff(["amministrazione"]);
  const id = String(formData.get("id") ?? "");
  const valori = valoriDa(formData);
  const letto = letturaAnagrafica(formData);
  if (!letto.success) {
    return { messaggio: "Controlla i campi evidenziati.", errori: erroriPerCampo(letto.error.issues), valori };
  }
  const { email, haPartitaIva, partitaIva, ...dati } = letto.data;

  try {
    await db().transaction(async (tx) => {
      const [prima] = await tx
        .select({ incaricato: incaricati, email: utenti.email })
        .from(incaricati)
        .innerJoin(utenti, eq(utenti.id, incaricati.utenteId))
        .where(eq(incaricati.id, id))
        .for("update");
      if (!prima) throw new Error("Incaricato non trovato");

      const nuovi = { ...dati, partitaIva: haPartitaIva ? (partitaIva ?? null) : null };
      await tx.update(incaricati).set(nuovi).where(eq(incaricati.id, id));
      await tx
        .update(utenti)
        .set({ email, nome: `${dati.nome} ${dati.cognome}` })
        .where(eq(utenti.id, prima.incaricato.utenteId));

      const vecchi = { ...prima.incaricato, email: prima.email } as Record<string, unknown>;
      const cambiati = Object.fromEntries(
        Object.entries({ ...nuovi, email }).filter(([k, v]) => String(vecchi[k] ?? "") !== String(v ?? "")),
      );
      if (Object.keys(cambiati).length > 0) {
        await registra(tx, {
          utenteId: staff.utenteId,
          azione: "incaricato.dati_modificati",
          entita: "incaricato",
          entitaId: id,
          prima: Object.fromEntries(Object.keys(cambiati).map((k) => [k, vecchi[k] ?? null])),
          dopo: cambiati,
        });
      }
    });
  } catch (e) {
    const codice = (e as { cause?: { code?: string } }).cause?.code ?? (e as { code?: string }).code;
    if (codice === "23505") return { messaggio: "Codice fiscale o email già usati da un altro incaricato.", valori };
    throw e;
  }
  revalidatePath(`/staff/incaricati/${id}`);
  return { ok: true, messaggio: "Dati salvati.", valori };
}

const schemaSponsor = z.object({
  id: z.uuid(),
  codiceSponsor: z.string().transform(normalizzaCodiceIncaricato),
  motivo: z.string().trim().min(3, "Indica il motivo del cambio"),
});

/** Sposta un incaricato sotto un altro sponsor. Vietato metterlo sotto se stesso o sotto qualcuno della sua rete. */
export async function cambiaSponsor(_: EsitoModulo, formData: FormData): Promise<EsitoModulo> {
  const staff = await richiediStaff(["amministrazione"]);
  const valori = valoriDa(formData);
  const letto = schemaSponsor.safeParse(Object.fromEntries(formData));
  if (!letto.success) return { errori: erroriPerCampo(letto.error.issues), valori };
  const { id, codiceSponsor, motivo } = letto.data;

  const sponsor = await cercaSponsor(codiceSponsor);
  if (!sponsor) return { errori: { codiceSponsor: "Nessun incaricato attivo con questo codice." }, valori };

  const esito = await db().transaction(async (tx) => {
    // Tutta la rete sotto l'incaricato (lui compreso): il nuovo sponsor non può stare lì dentro.
    const rete = await tx.execute<{ id: string }>(sql`
      with recursive rete as (
        select id from app.incaricati where id = ${id}
        union all
        select i.id from app.incaricati i join rete r on i.sponsor_id = r.id
      )
      select id from rete where id = ${sponsor.id}
    `);
    if (rete.rows.length > 0) return "ciclo" as const;

    const [prima] = await tx
      .select({ sponsorId: incaricati.sponsorId })
      .from(incaricati)
      .where(eq(incaricati.id, id))
      .for("update");
    if (!prima) return "assente" as const;
    if (prima.sponsorId === sponsor.id) return "uguale" as const;

    await tx.update(incaricati).set({ sponsorId: sponsor.id }).where(eq(incaricati.id, id));
    await tx.insert(storicoSponsor).values({ incaricatoId: id, sponsorId: sponsor.id, motivo, modificatoDa: staff.utenteId });
    await registra(tx, {
      utenteId: staff.utenteId,
      azione: "incaricato.sponsor_cambiato",
      entita: "incaricato",
      entitaId: id,
      prima: { sponsorId: prima.sponsorId },
      dopo: { sponsorId: sponsor.id, motivo },
    });
    return "ok" as const;
  });

  const messaggi = {
    ciclo: "Non puoi spostare un incaricato sotto se stesso o sotto una persona della sua rete.",
    assente: "Incaricato non trovato.",
    uguale: "È già lo sponsor attuale.",
  };
  if (esito !== "ok") return { messaggio: messaggi[esito], valori };
  revalidatePath(`/staff/incaricati/${id}`);
  return { ok: true, messaggio: `Sponsor cambiato: ora è ${sponsor.etichetta}` };
}

const schemaStato = z.object({
  id: z.uuid(),
  stato: z.enum(["attivo", "sospeso", "cessato"]),
  motivo: z.string().trim().min(3, "Indica il motivo"),
});

export async function cambiaStato(_: EsitoModulo, formData: FormData): Promise<EsitoModulo> {
  const staff = await richiediStaff(["amministrazione"]);
  const letto = schemaStato.safeParse(Object.fromEntries(formData));
  if (!letto.success) return { errori: erroriPerCampo(letto.error.issues), valori: valoriDa(formData) };
  const { id, stato, motivo } = letto.data;

  await db().transaction(async (tx) => {
    const [prima] = await tx.select({ stato: incaricati.stato }).from(incaricati).where(eq(incaricati.id, id)).for("update");
    if (!prima || prima.stato === stato) return;
    await tx.update(incaricati).set({ stato }).where(eq(incaricati.id, id));
    await registra(tx, {
      utenteId: staff.utenteId,
      azione: "incaricato.stato_cambiato",
      entita: "incaricato",
      entitaId: id,
      prima: { stato: prima.stato },
      dopo: { stato, motivo },
    });
  });
  revalidatePath(`/staff/incaricati/${id}`);
  return { ok: true, messaggio: "Stato aggiornato." };
}

/** Invia di nuovo all'incaricato il link per impostare la password (per esempio se non l'ha ricevuto). */
export async function inviaNuovoLinkPassword(formData: FormData) {
  const staff = await richiediStaff(["amministrazione"]);
  const id = z.uuid().parse(formData.get("id"));
  const [riga] = await db()
    .select({ utenteId: utenti.id, email: utenti.email, nome: incaricati.nome })
    .from(incaricati)
    .innerJoin(utenti, eq(utenti.id, incaricati.utenteId))
    .where(eq(incaricati.id, id));
  if (!riga) return;
  await inviaLinkPassword({ id: riga.utenteId, email: riga.email, nome: riga.nome }, "recupero");
  await registra(db(), { utenteId: staff.utenteId, azione: "incaricato.link_password_inviato", entita: "incaricato", entitaId: id });
  revalidatePath(`/staff/incaricati/${id}`);
}

export async function segnaRichiestaGestita(formData: FormData) {
  const staff = await richiediStaff(["amministrazione"]);
  const id = z.uuid().parse(formData.get("id"));
  const note = String(formData.get("note") ?? "").trim().slice(0, 500) || null;
  await db().transaction(async (tx) => {
    await tx
      .update(richiesteContatto)
      .set({ stato: "gestita", note, gestitaDa: staff.utenteId, gestitaIl: new Date() })
      .where(eq(richiesteContatto.id, id));
    await registra(tx, { utenteId: staff.utenteId, azione: "richiesta.gestita", entita: "richiesta_contatto", entitaId: id, dopo: { note } });
  });
  revalidatePath("/staff/richieste");
}

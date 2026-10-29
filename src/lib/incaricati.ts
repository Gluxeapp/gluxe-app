import "server-only";
import { and, eq, inArray, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { incaricati, storicoSponsor, utenti } from "@/db/schema";
import { registra } from "./registro";
import { cifraPassword } from "./sicurezza";
import {
  codiceFiscaleValido,
  ibanValido,
  normalizzaCodiceFiscale,
  normalizzaCodiceIncaricato,
  normalizzaIban,
  partitaIvaValida,
  problemaPassword,
} from "./validazioni";

const testo = (nome: string, max = 120) =>
  z.string().trim().min(1, `${nome}: campo obbligatorio`).max(max, `${nome}: testo troppo lungo`);

/** Dati anagrafici comuni a registrazione e inserimento da amministrazione. */
export const schemaAnagrafica = z
  .object({
    nome: testo("Nome", 60),
    cognome: testo("Cognome", 60),
    codiceFiscale: z
      .string()
      .transform(normalizzaCodiceFiscale)
      .refine(codiceFiscaleValido, "Codice fiscale non valido"),
    dataNascita: z.iso.date("Data di nascita non valida").refine((d) => {
      const anni = (Date.now() - new Date(d).getTime()) / (365.25 * 86_400_000);
      return anni >= 18 && anni < 110;
    }, "Per diventare incaricato devi essere maggiorenne"),
    indirizzo: testo("Indirizzo", 160),
    cap: z.string().trim().regex(/^\d{5}$/, "CAP non valido (5 cifre)"),
    citta: testo("Città", 80),
    provincia: z
      .string()
      .trim()
      .toUpperCase()
      .regex(/^[A-Z]{2}$/, "Provincia: 2 lettere (es. MI)"),
    telefono: z
      .string()
      .trim()
      .regex(/^\+?[\d\s]{8,16}$/, "Numero di telefono non valido"),
    email: z.string().trim().toLowerCase().pipe(z.email("Email non valida")),
    iban: z.string().transform(normalizzaIban).refine(ibanValido, "IBAN non valido"),
    haPartitaIva: z.boolean(),
    partitaIva: z.string().trim().optional(),
  })
  .refine((d) => !d.haPartitaIva || (d.partitaIva && partitaIvaValida(d.partitaIva)), {
    message: "Partita IVA non valida (11 cifre)",
    path: ["partitaIva"],
  });

export type Anagrafica = z.infer<typeof schemaAnagrafica>;

export const schemaPassword = z.string().superRefine((p, ctx) => {
  const problema = problemaPassword(p);
  if (problema) ctx.addIssue({ code: "custom", message: problema });
});

/** Cerca uno sponsor per codice. Restituisce solo nome e iniziale del cognome (privacy). */
export async function cercaSponsor(codice: string) {
  const [sponsor] = await db()
    .select({ id: incaricati.id, nome: incaricati.nome, cognome: incaricati.cognome })
    .from(incaricati)
    .where(and(eq(incaricati.codice, normalizzaCodiceIncaricato(codice)), inArray(incaricati.stato, ["attivo", "sospeso"])))
    .limit(1);
  if (!sponsor) return undefined;
  return { id: sponsor.id, etichetta: `${sponsor.nome} ${sponsor.cognome.charAt(0)}.` };
}

export class ErroreDatiDuplicati extends Error {}

/** Messaggio leggibile per i dati che devono essere unici. */
function erroreDuplicato(e: unknown): ErroreDatiDuplicati | undefined {
  const errore = (e as { cause?: { code?: string; constraint_name?: string } }).cause ?? (e as { code?: string; constraint_name?: string });
  if (errore?.code !== "23505") return undefined;
  if (errore.constraint_name?.includes("codice_fiscale")) {
    return new ErroreDatiDuplicati("Esiste già un incaricato con questo codice fiscale.");
  }
  if (errore.constraint_name?.includes("email")) {
    return new ErroreDatiDuplicati("Esiste già un incaricato con questa email.");
  }
  return new ErroreDatiDuplicati("Alcuni dati risultano già registrati.");
}

/**
 * Crea un incaricato con il prossimo codice GL libero, in un'unica transazione:
 * utente, scheda incaricato, storico sponsor e registro modifiche.
 */
export async function creaIncaricato(
  dati: Anagrafica,
  opzioni: { sponsorId: string | null; password: string | null; creatoDa: string | null },
) {
  const passwordHash = opzioni.password ? await cifraPassword(opzioni.password) : null;
  try {
    return await db().transaction(async (tx) => {
      const [utente] = await tx
        .insert(utenti)
        .values({ ruolo: "incaricato", email: dati.email, nome: `${dati.nome} ${dati.cognome}`, passwordHash })
        .returning({ id: utenti.id });

      const {
        rows: [{ numero }],
      } = await tx.execute<{ numero: string }>(
        sql`select nextval('app.sequenza_codice_incaricato')::text as numero`,
      );
      const codice = `GL${numero.padStart(6, "0")}`;

      const [nuovo] = await tx
        .insert(incaricati)
        .values({
          utenteId: utente.id,
          codice,
          nome: dati.nome,
          cognome: dati.cognome,
          codiceFiscale: dati.codiceFiscale,
          dataNascita: dati.dataNascita,
          indirizzo: dati.indirizzo,
          cap: dati.cap,
          citta: dati.citta,
          provincia: dati.provincia,
          telefono: dati.telefono,
          iban: dati.iban,
          partitaIva: dati.haPartitaIva ? (dati.partitaIva ?? null) : null,
          sponsorId: opzioni.sponsorId,
          privacyAccettataIl: new Date(),
        })
        .returning({ id: incaricati.id, codice: incaricati.codice });

      await tx.insert(storicoSponsor).values({
        incaricatoId: nuovo.id,
        sponsorId: opzioni.sponsorId,
        motivo: opzioni.creatoDa ? "Inserimento da amministrazione" : "Registrazione",
        modificatoDa: opzioni.creatoDa,
      });

      await registra(tx, {
        utenteId: opzioni.creatoDa ?? utente.id,
        azione: opzioni.creatoDa ? "incaricato.inserito" : "incaricato.registrato",
        entita: "incaricato",
        entitaId: nuovo.id,
        dopo: { codice, nome: dati.nome, cognome: dati.cognome, sponsorId: opzioni.sponsorId },
      });

      return { ...nuovo, utenteId: utente.id };
    });
  } catch (e) {
    throw erroreDuplicato(e) ?? e;
  }
}

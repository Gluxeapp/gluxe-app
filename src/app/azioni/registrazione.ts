"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { richiesteContatto, utenti } from "@/db/schema";
import { erroriPerCampo, valoriDa, type EsitoModulo } from "@/components/ui";
import { inviaEmail } from "@/lib/email";
import { cercaSponsor, creaIncaricato, ErroreDatiDuplicati, schemaAnagrafica, schemaPassword } from "@/lib/incaricati";
import { indirizzoApp } from "@/lib/indirizzo-app";
import { creaSessione, DURATA_INCARICATO_ORE } from "@/lib/sessione";
import { CODICE_INCARICATO, normalizzaCodiceIncaricato } from "@/lib/validazioni";

/** Usata dal modulo di registrazione per mostrare "Il tuo sponsor è Maria R." prima dell'invio. */
export async function verificaCodiceSponsor(codice: string): Promise<{ etichetta?: string; errore?: string }> {
  const normalizzato = normalizzaCodiceIncaricato(codice);
  if (!CODICE_INCARICATO.test(normalizzato)) return { errore: "Il codice sponsor ha la forma GL seguito da 6 cifre." };
  const sponsor = await cercaSponsor(normalizzato);
  return sponsor ? { etichetta: sponsor.etichetta } : { errore: "Nessun incaricato attivo con questo codice." };
}

const schemaRegistrazione = schemaAnagrafica.and(
  z
    .object({
      codiceSponsor: z.string().transform(normalizzaCodiceIncaricato),
      password: schemaPassword,
      confermaPassword: z.string(),
      privacy: z.literal(true, "Per registrarti devi accettare l'informativa privacy"),
    })
    .refine((d) => d.password === d.confermaPassword, {
      message: "Le due password non coincidono",
      path: ["confermaPassword"],
    }),
);

export async function registraIncaricato(_: EsitoModulo, formData: FormData): Promise<EsitoModulo> {
  const valori = valoriDa(formData);
  const letto = schemaRegistrazione.safeParse({
    ...Object.fromEntries(formData),
    haPartitaIva: formData.get("haPartitaIva") === "si",
    privacy: formData.get("privacy") === "on",
  });
  if (!letto.success) {
    return { messaggio: "Controlla i campi evidenziati.", errori: erroriPerCampo(letto.error.issues), valori };
  }

  const sponsor = await cercaSponsor(letto.data.codiceSponsor);
  if (!sponsor) {
    return {
      messaggio: "Controlla il codice sponsor.",
      errori: { codiceSponsor: "Nessun incaricato attivo con questo codice." },
      valori,
    };
  }

  let nuovo;
  try {
    nuovo = await creaIncaricato(letto.data, { sponsorId: sponsor.id, password: letto.data.password, creatoDa: null });
  } catch (e) {
    if (e instanceof ErroreDatiDuplicati) return { messaggio: e.message, valori };
    throw e;
  }

  await inviaEmail({
    a: letto.data.email,
    oggetto: `Benvenuta in G LUXE: il tuo codice incaricato è ${nuovo.codice}`,
    testo:
      `Ciao ${letto.data.nome},\n\nla tua registrazione come incaricata G LUXE è completata.\n\n` +
      `Il tuo codice incaricato è: ${nuovo.codice}\n` +
      `Usalo con la tua password per accedere all'app: ${indirizzoApp()}\n\n` +
      `Il tuo sponsor è ${sponsor.etichetta}\n\nNata per brillare.\nG LUXE`,
  });

  await creaSessione(nuovo.utenteId, { verificata: true, durataOre: DURATA_INCARICATO_ORE });
  redirect("/area/benvenuto");
}

const schemaRichiesta = z.object({
  nome: z.string().trim().min(1, "Nome: campo obbligatorio").max(60),
  cognome: z.string().trim().min(1, "Cognome: campo obbligatorio").max(60),
  telefono: z.string().trim().regex(/^\+?[\d\s]{8,16}$/, "Numero di telefono non valido"),
  email: z.string().trim().toLowerCase().pipe(z.email("Email non valida")),
  citta: z.string().trim().min(1, "Città: campo obbligatorio").max(80),
  privacy: z.literal(true, "Devi accettare l'informativa privacy"),
});

/** "Non ho un codice sponsor": salva la richiesta e avvisa l'amministrazione. */
export async function inviaRichiestaSponsor(_: EsitoModulo, formData: FormData): Promise<EsitoModulo> {
  const valori = valoriDa(formData);
  const letto = schemaRichiesta.safeParse({ ...Object.fromEntries(formData), privacy: formData.get("privacy") === "on" });
  if (!letto.success) {
    return { messaggio: "Controlla i campi evidenziati.", errori: erroriPerCampo(letto.error.issues), valori };
  }
  const { nome, cognome, telefono, email, citta } = letto.data;
  const dati = { nome, cognome, telefono, email, citta };
  await db().insert(richiesteContatto).values(dati);

  const amministratori = await db()
    .select({ email: utenti.email })
    .from(utenti)
    .where(and(eq(utenti.ruolo, "amministrazione"), eq(utenti.attivo, true)));
  for (const { email } of amministratori) {
    await inviaEmail({
      a: email,
      oggetto: "G LUXE: nuova richiesta di codice sponsor",
      testo:
        `${dati.nome} ${dati.cognome} (${dati.citta}) vorrebbe diventare incaricata e non ha un codice sponsor.\n\n` +
        `Trovi la richiesta con i recapiti nell'area amministrazione: ${indirizzoApp()}/staff/richieste`,
    });
  }

  return {
    ok: true,
    messaggio: "Richiesta inviata! L'azienda ti contatterà al più presto per darti un codice sponsor.",
  };
}

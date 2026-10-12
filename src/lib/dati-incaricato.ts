import "server-only";
import { eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { incaricati, utenti } from "@/db/schema";
import { richiediIncaricato } from "./accesso";

const sponsor = alias(incaricati, "sponsor");

/** Profilo dell'incaricato collegato: solo i suoi dati, più nome e iniziale dello sponsor. */
export async function mioProfilo() {
  const { incaricato } = await richiediIncaricato();
  const [profilo] = await db()
    .select({
      codice: incaricati.codice,
      nome: incaricati.nome,
      cognome: incaricati.cognome,
      codiceFiscale: incaricati.codiceFiscale,
      dataNascita: incaricati.dataNascita,
      indirizzo: incaricati.indirizzo,
      cap: incaricati.cap,
      citta: incaricati.citta,
      provincia: incaricati.provincia,
      telefono: incaricati.telefono,
      email: utenti.email,
      iban: incaricati.iban,
      partitaIva: incaricati.partitaIva,
      stato: incaricati.stato,
      creatoIl: incaricati.creatoIl,
      sponsorNome: sponsor.nome,
      sponsorCognome: sponsor.cognome,
      sponsorCodice: sponsor.codice,
    })
    .from(incaricati)
    .innerJoin(utenti, eq(utenti.id, incaricati.utenteId))
    .leftJoin(sponsor, eq(sponsor.id, incaricati.sponsorId))
    .where(eq(incaricati.id, incaricato.id))
    .limit(1);
  return {
    ...profilo,
    sponsor: profilo.sponsorNome
      ? `${profilo.sponsorNome} ${profilo.sponsorCognome?.charAt(0)}. (${profilo.sponsorCodice})`
      : "Nessuno (capostipite)",
  };
}

/** IBAN con le cifre centrali nascoste: IT60 •••• •••• 3456 */
export function ibanNascosto(iban: string): string {
  return `${iban.slice(0, 4)} •••• •••• ${iban.slice(-4)}`;
}

export function dataItaliana(data: string | Date): string {
  const d = typeof data === "string" ? new Date(`${data}T12:00:00`) : data;
  return d.toLocaleDateString("it-IT", { timeZone: "Europe/Rome", day: "2-digit", month: "2-digit", year: "numeric" });
}

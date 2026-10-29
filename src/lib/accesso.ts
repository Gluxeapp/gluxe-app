import "server-only";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/db";
import { incaricati } from "@/db/schema";
import { leggiSessione } from "./sessione";

/**
 * Controlli di accesso, in un solo posto. Ogni pagina e ogni azione riservata chiama una di
 * queste funzioni sul server: nascondere un pulsante nell'interfaccia non basta.
 *
 * Le versioni "richiedi…" sono memorizzate per la durata di una pagina (la sessione si legge una volta).
 * Le azioni dei moduli usano le versioni "verifica…", non memorizzate: la memoria di React condivisa
 * tra azione e pagina fa leggere a Next.js i cookie sbagliati.
 */

export const sessioneCorrente = cache(leggiSessione);

export type RuoloStaff = "amministrazione" | "contabilita" | "ordini";

/** Incaricato collegato, altrimenti rimanda alla schermata di accesso. */
export async function verificaIncaricato(sessione?: Awaited<ReturnType<typeof leggiSessione>>) {
  sessione ??= await leggiSessione();
  if (!sessione || sessione.ruolo !== "incaricato") redirect("/");
  const [incaricato] = await db()
    .select({
      id: incaricati.id,
      codice: incaricati.codice,
      nome: incaricati.nome,
      cognome: incaricati.cognome,
      stato: incaricati.stato,
      sponsorId: incaricati.sponsorId,
      startKitPagato: incaricati.startKitPagato,
    })
    .from(incaricati)
    .where(eq(incaricati.utenteId, sessione.utenteId))
    .limit(1);
  if (!incaricato || incaricato.stato === "cessato" || incaricato.stato === "cliente") redirect("/");
  return { sessione, incaricato };
}

/**
 * Incaricata che può usare l'app: start kit pagato (altrimenti la manda a pagarlo).
 * Le sospese possono guardare ma non ordinare: lo controllano le azioni degli ordini.
 */
export async function verificaIncaricataOperativa(accesso?: Awaited<ReturnType<typeof verificaIncaricato>>) {
  accesso ??= await verificaIncaricato();
  if (!accesso.incaricato.startKitPagato) redirect("/area/start-kit");
  return accesso;
}

export const richiediIncaricato = cache(async () => verificaIncaricato(await sessioneCorrente()));
export const richiediIncaricataOperativa = cache(async () => verificaIncaricataOperativa(await richiediIncaricato()));

/** Persona dello staff collegata e verificata con il codice via email; facoltativamente con un ruolo preciso. */
export async function richiediStaff(ruoli: RuoloStaff[] = ["amministrazione", "contabilita", "ordini"]) {
  const sessione = await sessioneCorrente();
  if (!sessione || sessione.ruolo === "incaricato") redirect("/staff/accesso");
  if (!sessione.verificata) redirect("/staff/verifica");
  if (!ruoli.includes(sessione.ruolo)) redirect("/staff");
  return { ...sessione, ruolo: sessione.ruolo as RuoloStaff };
}

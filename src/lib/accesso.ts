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
 */

export const sessioneCorrente = cache(leggiSessione);

export type RuoloStaff = "amministrazione" | "contabilita";

/** Incaricato collegato, altrimenti rimanda alla schermata di accesso. */
export const richiediIncaricato = cache(async () => {
  const sessione = await sessioneCorrente();
  if (!sessione || sessione.ruolo !== "incaricato") redirect("/");
  const [incaricato] = await db()
    .select({
      id: incaricati.id,
      codice: incaricati.codice,
      nome: incaricati.nome,
      cognome: incaricati.cognome,
      stato: incaricati.stato,
      sponsorId: incaricati.sponsorId,
    })
    .from(incaricati)
    .where(eq(incaricati.utenteId, sessione.utenteId))
    .limit(1);
  if (!incaricato || incaricato.stato === "cessato" || incaricato.stato === "cliente") redirect("/");
  return { sessione, incaricato };
});

/** Persona dello staff collegata e verificata con il codice via email; facoltativamente con un ruolo preciso. */
export async function richiediStaff(ruoli: RuoloStaff[] = ["amministrazione", "contabilita"]) {
  const sessione = await sessioneCorrente();
  if (!sessione || sessione.ruolo === "incaricato") redirect("/staff/accesso");
  if (!sessione.verificata) redirect("/staff/verifica");
  if (!ruoli.includes(sessione.ruolo)) redirect("/staff");
  return { ...sessione, ruolo: sessione.ruolo as RuoloStaff };
}

import "server-only";
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/db";
import { clienti, incaricati } from "@/db/schema";
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
export async function verificaIncaricato(sessione?: Awaited<ReturnType<typeof leggiSessione>>, opzioni: { ancheTornataCliente?: boolean } = {}) {
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
  if (!incaricato || incaricato.stato === "cessato") redirect("/");
  // Chi è tornata cliente (per esempio licenza decaduta) entra solo per chiedere il saldo provvigioni residuo.
  if (incaricato.stato === "cliente" && !opzioni.ancheTornataCliente) redirect("/area/provvigioni");
  return { sessione, incaricato };
}

/** Pagine e azioni del saldo provvigioni: aperte anche a chi è tornata cliente (saldo residuo, sezione 3a). */
export async function verificaAccessoProvvigioni(sessione?: Awaited<ReturnType<typeof leggiSessione>>) {
  const accesso = await verificaIncaricato(sessione, { ancheTornataCliente: true });
  if (!accesso.incaricato.startKitPagato) redirect("/area/start-kit");
  return accesso;
}
export const richiediAccessoProvvigioni = cache(async () => verificaAccessoProvvigioni(await sessioneCorrente()));

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
  if (!sessione || sessione.ruolo === "incaricato" || sessione.ruolo === "cliente") redirect("/staff/accesso");
  if (!sessione.verificata) redirect("/staff/verifica");
  if (!ruoli.includes(sessione.ruolo)) redirect("/staff");
  return { ...sessione, ruolo: sessione.ruolo as RuoloStaff };
}

/** Cliente del negozio collegato con il suo profilo (decisione 32), altrimenti alla pagina di accesso dei clienti. */
export async function verificaCliente(sessione?: Awaited<ReturnType<typeof leggiSessione>>) {
  sessione ??= await leggiSessione();
  if (!sessione || sessione.ruolo !== "cliente") redirect("/cliente/accesso");
  const [cliente] = await db().select().from(clienti).where(eq(clienti.utenteId, sessione.utenteId)).limit(1);
  if (!cliente) redirect("/cliente/accesso");
  return { sessione, cliente };
}
export const richiediCliente = cache(async () => verificaCliente(await sessioneCorrente()));

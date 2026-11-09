"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { erroriPerCampo, valoriDa, type EsitoModulo } from "@/components/ui";
import { db } from "@/db";
import { incaricati } from "@/db/schema";
import { richiediStaff } from "@/lib/accesso";
import { ErroreOrdine, QUANTITA_MASSIMA } from "@/lib/calcolo-ordine";
import { spostaCliente } from "@/lib/clienti";
import { indirizzoApp } from "@/lib/indirizzo-app";
import { creaOrdineOnline, ordineDelCliente } from "@/lib/negozio";
import { registraStato } from "@/lib/ordini";
import { apriPagamentoCliente, chiudiPagamento } from "@/lib/pagamenti";
import { schemaSpedizione, schemaTelefono, testoObbligatorio } from "@/lib/spedizione";
import { pagamentiAttivi } from "@/lib/stripe";
import { normalizzaCodiceIncaricato } from "@/lib/validazioni";

/**
 * Azioni del negozio online. Le prime tre sono pubbliche (cliente senza account): ogni dato arriva dal
 * modulo e si ricontrolla qui; prezzi e punti li calcola il server.
 */

const schemaCliente = z.object({
  nome: testoObbligatorio("Nome", 60),
  cognome: testoObbligatorio("Cognome", 60),
  email: z.string().trim().toLowerCase().max(160).email("Email non valida"),
  telefono: schemaTelefono,
});

const linkOrdine = (id: string, codice: string) => `/negozio/ordine/${id}?c=${encodeURIComponent(codice)}`;

function erroreDiPagamento(e: unknown) {
  console.error(`Pagamento del negozio non aperto: ${e instanceof Error ? e.message : "errore"}`);
}

/** Il cliente conferma il carrello e i suoi dati: si crea l'ordine e si apre subito il pagamento Stripe. */
export async function ordinaDalNegozio(_: EsitoModulo, formData: FormData): Promise<EsitoModulo> {
  const valori = valoriDa(formData);
  // Campo nascosto che le persone non vedono: se è compilato è un programma automatico.
  if (String(formData.get("sito") ?? "") !== "") return { messaggio: "Richiesta non valida.", valori };
  if (!pagamentiAttivi()) return { messaggio: "Il pagamento online sarà attivo a breve.", valori };
  const codiceNegozio = normalizzaCodiceIncaricato(String(formData.get("negozio") ?? ""));

  const richiesti: { prodottoId: string; quantita: number }[] = [];
  for (const [chiave, valore] of formData) {
    if (!chiave.startsWith("q_") || typeof valore !== "string" || valore.trim() === "") continue;
    const quantita = Number(valore);
    if (!Number.isInteger(quantita) || quantita < 0 || quantita > QUANTITA_MASSIMA) {
      return { messaggio: `Le quantità vanno da 0 a ${QUANTITA_MASSIMA}.`, valori };
    }
    const prodottoId = chiave.slice(2);
    if (quantita > 0 && z.uuid().safeParse(prodottoId).success) richiesti.push({ prodottoId, quantita });
  }
  if (richiesti.length === 0) return { messaggio: "Scegli almeno un prodotto.", valori };

  const cliente = schemaCliente.safeParse(Object.fromEntries(formData));
  const spedizione = schemaSpedizione.safeParse({
    ...Object.fromEntries(formData),
    destinatario: `${String(formData.get("nome") ?? "").trim()} ${String(formData.get("cognome") ?? "").trim()}`.trim(),
  });
  if (!cliente.success || !spedizione.success) {
    return {
      messaggio: "Controlla i campi evidenziati.",
      errori: erroriPerCampo([...(cliente.error?.issues ?? []), ...(spedizione.error?.issues ?? [])]),
      valori,
    };
  }
  if (formData.get("privacy") !== "on") {
    return { messaggio: "Per ordinare serve la presa visione dell'informativa privacy.", errori: { privacy: "Obbligatorio" }, valori };
  }

  let creato: { id: string; codice: string };
  try {
    creato = await creaOrdineOnline({
      codiceNegozio,
      richiesti,
      cliente: cliente.data,
      spedizione: spedizione.data,
      consensoContatti: formData.get("consensoContatti") === "on",
    });
  } catch (e) {
    if (e instanceof ErroreOrdine) return { messaggio: e.message, valori };
    throw e;
  }

  let url: string;
  try {
    url = await apriPagamentoCliente(creato.id, cliente.data.email, `${indirizzoApp()}${linkOrdine(creato.id, creato.codice)}`);
  } catch (e) {
    // L'ordine c'è: dalla sua pagina il cliente può riprovare a pagare.
    erroreDiPagamento(e);
    redirect(linkOrdine(creato.id, creato.codice));
  }
  redirect(url);
}

const schemaAccesso = z.object({ id: z.uuid(), c: z.string().min(10).max(100) });

/** "Paga" dalla pagina dell'ordine del cliente (link segreto). */
export async function pagaOrdineCliente(_: EsitoModulo, formData: FormData): Promise<EsitoModulo> {
  const letto = schemaAccesso.safeParse(Object.fromEntries(formData));
  if (!letto.success) return { messaggio: "Ordine non valido." };
  const ordine = await ordineDelCliente(letto.data.id, letto.data.c);
  if (!ordine) return { messaggio: "Ordine non trovato." };
  if (!pagamentiAttivi()) return { messaggio: "Il pagamento online sarà attivo a breve." };
  let url: string;
  try {
    url = await apriPagamentoCliente(ordine.ordine.id, ordine.cliente.email, `${indirizzoApp()}${linkOrdine(ordine.ordine.id, letto.data.c)}`);
  } catch (e) {
    if (e instanceof ErroreOrdine) {
      revalidatePath(`/negozio/ordine/${ordine.ordine.id}`);
      return { messaggio: e.message };
    }
    erroreDiPagamento(e);
    return { messaggio: "Il pagamento non si è aperto. Riprova tra un minuto." };
  }
  redirect(url);
}

/** Il cliente annulla un suo ordine non ancora pagato. */
export async function annullaOrdineCliente(_: EsitoModulo, formData: FormData): Promise<EsitoModulo> {
  const letto = schemaAccesso.safeParse(Object.fromEntries(formData));
  if (!letto.success) return { messaggio: "Ordine non valido." };
  const ordine = await ordineDelCliente(letto.data.id, letto.data.c);
  if (!ordine || ordine.ordine.stato !== "inserito") return { messaggio: "Si possono annullare solo gli ordini non pagati." };
  if (ordine.ordine.stripeSessioneId && !(await chiudiPagamento(ordine.ordine.stripeSessioneId))) {
    return { messaggio: "Il pagamento risulta già fatto: stiamo aspettando la conferma." };
  }
  await db().transaction((tx) => registraStato(tx, ordine.ordine.id, "annullato", { nota: "Annullato dal cliente" }));
  revalidatePath(`/negozio/ordine/${ordine.ordine.id}`);
  return { ok: true, messaggio: "Ordine annullato." };
}

/** La sede sposta un cliente a un'altra incaricata (solo amministrazione, con motivo). */
export async function spostaClienteAzione(_: EsitoModulo, formData: FormData): Promise<EsitoModulo> {
  const staff = await richiediStaff(["amministrazione"]);
  const valori = valoriDa(formData);
  const letto = z
    .object({ id: z.uuid(), codice: z.string().trim().min(1, "Indica il codice"), motivo: z.string().trim().min(5, "Indica il motivo").max(300) })
    .safeParse(Object.fromEntries(formData));
  if (!letto.success) return { messaggio: "Controlla i campi.", errori: erroriPerCampo(letto.error.issues), valori };
  const [destinazione] = await db()
    .select({ id: incaricati.id, nome: incaricati.nome, cognome: incaricati.cognome, codice: incaricati.codice })
    .from(incaricati)
    .where(eq(incaricati.codice, normalizzaCodiceIncaricato(letto.data.codice)));
  if (!destinazione) return { messaggio: "Nessuna incaricata con questo codice.", errori: { codice: "Codice non trovato" }, valori };
  const esito = await spostaCliente({ clienteId: letto.data.id, incaricatoId: destinazione.id, motivo: letto.data.motivo, utenteId: staff.utenteId });
  if (esito === "assente") return { messaggio: "Cliente non trovato." };
  if (esito === "uguale") return { messaggio: "Il cliente è già legato a questa incaricata.", valori };
  revalidatePath(`/staff/clienti/${letto.data.id}`);
  revalidatePath("/staff/clienti");
  return { ok: true, messaggio: `Cliente spostato a ${destinazione.nome} ${destinazione.cognome} (${destinazione.codice}): vale per i prossimi ordini.` };
}

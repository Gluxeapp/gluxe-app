"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { erroriPerCampo, valoriDa, type EsitoModulo } from "@/components/ui";
import { db } from "@/db";
import { clienti } from "@/db/schema";
import { verificaCliente } from "@/lib/accesso";
import { ErroreOrdine, QUANTITA_MASSIMA } from "@/lib/calcolo-ordine";
import { schemaPassword } from "@/lib/incaricati";
import { indirizzoApp } from "@/lib/indirizzo-app";
import { creaOrdineDaProfilo } from "@/lib/negozio";
import { registraStato } from "@/lib/ordini";
import { apriPagamentoCliente, chiudiPagamento } from "@/lib/pagamenti";
import { aggiornaProfilo, chiediConsulente, ordineDelProfilo, registraCliente } from "@/lib/profilo-cliente";
import { creaSessione, DURATA_INCARICATO_ORE } from "@/lib/sessione";
import { schemaSpedizione, schemaTelefono, testoObbligatorio } from "@/lib/spedizione";
import { pagamentiAttivi } from "@/lib/stripe";
import { normalizzaCodiceIncaricato } from "@/lib/validazioni";

/** Azioni del profilo cliente (decisione 32). Ogni azione ricontrolla sul server chi è collegato. */

const schemaRegistrazione = z.object({
  nome: testoObbligatorio("Nome", 60),
  cognome: testoObbligatorio("Cognome", 60),
  email: z.string().trim().toLowerCase().max(160).email("Email non valida"),
  telefono: schemaTelefono,
  password: schemaPassword,
});

export async function registratiCliente(_: EsitoModulo, formData: FormData): Promise<EsitoModulo> {
  const valori = valoriDa(formData);
  if (String(formData.get("sito") ?? "") !== "") return { messaggio: "Richiesta non valida.", valori };
  const letto = schemaRegistrazione.safeParse(Object.fromEntries(formData));
  if (!letto.success) return { messaggio: "Controlla i campi evidenziati.", errori: erroriPerCampo(letto.error.issues), valori };
  if (letto.data.password !== formData.get("confermaPassword")) {
    return { messaggio: "Le due password non coincidono.", errori: { confermaPassword: "Le due password non coincidono" }, valori };
  }
  if (formData.get("privacy") !== "on") {
    return { messaggio: "Per registrarti serve la presa visione dell'informativa privacy.", errori: { privacy: "Obbligatorio" }, valori };
  }
  const negozio = normalizzaCodiceIncaricato(String(formData.get("negozio") ?? ""));
  const esito = await registraCliente({ ...letto.data, codiceNegozio: negozio || undefined });
  if (esito.esito === "esiste") {
    return { messaggio: "Hai già un profilo con questa email: accedi, oppure recupera la password.", valori };
  }
  if (esito.esito === "conferma") {
    return {
      ok: true,
      messaggio:
        "Con questa email risultano già degli acquisti: per proteggerli ti abbiamo mandato un'email con il link per scegliere la password e attivare il profilo.",
    };
  }
  await creaSessione(esito.utenteId, { verificata: true, durataOre: DURATA_INCARICATO_ORE });
  redirect("/cliente");
}

const schemaProfilo = z.object({
  nome: testoObbligatorio("Nome", 60),
  cognome: testoObbligatorio("Cognome", 60),
  telefono: schemaTelefono,
  indirizzo: testoObbligatorio("Indirizzo", 160),
  cap: z.string().trim().regex(/^\d{5}$/, "CAP non valido (5 cifre)"),
  citta: testoObbligatorio("Città", 80),
  provincia: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/, "Provincia: 2 lettere (es. MI)"),
});

export async function salvaProfiloCliente(_: EsitoModulo, formData: FormData): Promise<EsitoModulo> {
  const { cliente } = await verificaCliente();
  const valori = valoriDa(formData);
  const letto = schemaProfilo.safeParse(Object.fromEntries(formData));
  if (!letto.success) return { messaggio: "Controlla i campi evidenziati.", errori: erroriPerCampo(letto.error.issues), valori };
  await aggiornaProfilo(cliente.id, { ...letto.data, consensoContatti: formData.get("consensoContatti") === "on" });
  revalidatePath("/cliente/profilo");
  return { ok: true, messaggio: "Dati salvati." };
}

export async function chiediConsulenteAzione(_: EsitoModulo, formData: FormData): Promise<EsitoModulo> {
  const { cliente } = await verificaCliente();
  if (cliente.incaricatoId) return { messaggio: "Hai già una consulente." };
  const citta = String(formData.get("citta") ?? "").trim().slice(0, 80);
  if (!citta) return { messaggio: "Indica la tua città: ci aiuta a trovarti una consulente vicina.", errori: { citta: "Obbligatoria" } };
  const nuova = await chiediConsulente(cliente, citta);
  return {
    ok: true,
    messaggio: nuova
      ? "Richiesta inviata: l'azienda ti contatterà con il codice della tua consulente."
      : "Hai già una richiesta in corso: l'azienda ti contatterà a breve.",
  };
}

const linkOrdine = (id: string) => `/cliente/ordini/${id}`;

/** Carrello del profilo: crea l'ordine e apre subito il pagamento Stripe. */
export async function ordinaDalProfilo(_: EsitoModulo, formData: FormData): Promise<EsitoModulo> {
  const { cliente } = await verificaCliente();
  const valori = valoriDa(formData);
  if (!pagamentiAttivi()) return { messaggio: "Il pagamento online sarà attivo a breve.", valori };
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
  const spedizione = schemaSpedizione.safeParse(Object.fromEntries(formData));
  if (!spedizione.success) {
    return { messaggio: "Controlla l'indirizzo di spedizione.", errori: erroriPerCampo(spedizione.error.issues), valori };
  }
  let creato: { id: string };
  try {
    creato = await creaOrdineDaProfilo({
      clienteId: cliente.id,
      richiesti,
      spedizione: spedizione.data,
      codiceConsulente: normalizzaCodiceIncaricato(String(formData.get("codiceConsulente") ?? "")) || undefined,
    });
  } catch (e) {
    if (e instanceof ErroreOrdine) return { messaggio: e.message, valori, errori: e.message.includes("codice") ? { codiceConsulente: "Codice non valido" } : undefined };
    throw e;
  }
  let url: string;
  try {
    url = await apriPagamentoCliente(creato.id, cliente.email, `${indirizzoApp()}${linkOrdine(creato.id)}`);
  } catch (e) {
    console.error(`Pagamento del profilo non aperto: ${e instanceof Error ? e.message : "errore"}`);
    redirect(linkOrdine(creato.id));
  }
  redirect(url);
}

export async function pagaOrdineProfilo(_: EsitoModulo, formData: FormData): Promise<EsitoModulo> {
  const { cliente } = await verificaCliente();
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return { messaggio: "Ordine non valido." };
  const letto = await ordineDelProfilo(id.data, cliente.id);
  if (!letto) return { messaggio: "Ordine non trovato." };
  if (!pagamentiAttivi()) return { messaggio: "Il pagamento online sarà attivo a breve." };
  // Ordine preparato dalla consulente per un cliente che non aveva ancora accettato l'informativa.
  if (!cliente.privacyAccettataIl) {
    if (formData.get("privacy") !== "on") return { messaggio: "Per pagare serve la presa visione dell'informativa privacy." };
  }
  let url: string;
  try {
    if (!cliente.privacyAccettataIl) {
      await db().update(clienti).set({ privacyAccettataIl: new Date() }).where(eq(clienti.id, cliente.id));
    }
    url = await apriPagamentoCliente(letto.ordine.id, cliente.email, `${indirizzoApp()}${linkOrdine(letto.ordine.id)}`);
  } catch (e) {
    if (e instanceof ErroreOrdine) {
      revalidatePath(linkOrdine(id.data));
      return { messaggio: e.message };
    }
    console.error(`Pagamento del profilo non aperto: ${e instanceof Error ? e.message : "errore"}`);
    return { messaggio: "Il pagamento non si è aperto. Riprova tra un minuto." };
  }
  redirect(url);
}

export async function annullaOrdineProfilo(_: EsitoModulo, formData: FormData): Promise<EsitoModulo> {
  const { cliente } = await verificaCliente();
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return { messaggio: "Ordine non valido." };
  const letto = await ordineDelProfilo(id.data, cliente.id);
  if (!letto || letto.ordine.stato !== "inserito") return { messaggio: "Si possono annullare solo gli ordini non pagati." };
  if (letto.ordine.stripeSessioneId && !(await chiudiPagamento(letto.ordine.stripeSessioneId))) {
    return { messaggio: "Il pagamento risulta già fatto: stiamo aspettando la conferma." };
  }
  await db().transaction((tx) => registraStato(tx, letto.ordine.id, "annullato", { nota: "Annullato dal cliente" }));
  revalidatePath(linkOrdine(id.data));
  return { ok: true, messaggio: "Ordine annullato." };
}

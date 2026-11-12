"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { erroriPerCampo, valoriDa, type EsitoModulo } from "@/components/ui";
import { db } from "@/db";
import { clienti, incaricati, ordini, utenti } from "@/db/schema";
import { richiediStaff, verificaIncaricataOperativa, verificaIncaricato } from "@/lib/accesso";
import { ErroreOrdine, QUANTITA_MASSIMA } from "@/lib/calcolo-ordine";
import { inviaEmail } from "@/lib/email";
import { indirizzoApp } from "@/lib/indirizzo-app";
import { creaOrdinePersonale, ETICHETTE_STATO, leggiOrdine, numeroOrdine, ordineStartKit, registraStato, type StatoOrdine } from "@/lib/ordini";
import { apriPagamento, chiudiPagamento } from "@/lib/pagamenti";
import { registra } from "@/lib/registro";
import { schemaSpedizione } from "@/lib/spedizione";
import { licenzaScaduta, MESSAGGIO_LICENZA_SCADUTA, ordineLicenza } from "@/lib/licenze";
import { pagamentiAttivi } from "@/lib/stripe";


/** Errori di Stripe o di rete: messaggio semplice per l'incaricata, dettagli solo nel log del server. */
function erroreDiPagamento(e: unknown): EsitoModulo {
  console.error(`Pagamento non aperto: ${e instanceof Error ? e.message : "errore"}`);
  return { messaggio: "Il pagamento non si è aperto. Riprova tra un minuto; se il problema continua contatta l'azienda." };
}

async function emailIncaricata(utenteId: string) {
  const [u] = await db().select({ email: utenti.email }).from(utenti).where(eq(utenti.id, utenteId));
  return u.email;
}

/** Nuovo acquisto personale: crea l'ordine "in attesa di pagamento" e mostra il riepilogo calcolato dal server. */
export async function nuovoOrdine(_: EsitoModulo, formData: FormData): Promise<EsitoModulo> {
  const { incaricato } = await verificaIncaricataOperativa();
  const valori = valoriDa(formData);
  if (incaricato.stato === "sospeso") return { messaggio: "Il tuo account è sospeso: contatta l'azienda.", valori };
  if (await licenzaScaduta(incaricato.id)) return { messaggio: MESSAGGIO_LICENZA_SCADUTA, valori };

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
  if (richiesti.length === 0) return { messaggio: "Indica la quantità di almeno un prodotto.", valori };

  const spedizione = schemaSpedizione.safeParse(Object.fromEntries(formData));
  if (!spedizione.success) {
    return { messaggio: "Controlla l'indirizzo di spedizione.", errori: erroriPerCampo(spedizione.error.issues), valori };
  }

  let id: string;
  try {
    id = await creaOrdinePersonale({
      incaricatoId: incaricato.id,
      richiesti,
      spedizione: spedizione.data,
      riordinoConfermato: formData.get("riordino") === "on",
    });
  } catch (e) {
    if (e instanceof ErroreOrdine) return { messaggio: e.message, valori };
    throw e;
  }
  revalidatePath("/area/ordini");
  redirect(`/area/ordini/${id}`);
}

/** "Paga": porta alla pagina di pagamento di Stripe. */
export async function pagaOrdine(_: EsitoModulo, formData: FormData): Promise<EsitoModulo> {
  const { incaricato, sessione } = await verificaIncaricato();
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return { messaggio: "Ordine non valido." };
  if (incaricato.stato === "sospeso") return { messaggio: "Il tuo account è sospeso: contatta l'azienda." };
  // Con la licenza scaduta si paga solo il rinnovo (decisione 31).
  const letto = await leggiOrdine(id.data, incaricato.id);
  if (letto && letto.ordine.tipo !== "licenza" && (await licenzaScaduta(incaricato.id))) return { messaggio: MESSAGGIO_LICENZA_SCADUTA };
  let url: string;
  try {
    url = await apriPagamento(id.data, incaricato.id, await emailIncaricata(sessione.utenteId));
  } catch (e) {
    if (e instanceof ErroreOrdine) {
      revalidatePath(`/area/ordini/${id.data}`);
      return { messaggio: e.message };
    }
    return erroreDiPagamento(e);
  }
  redirect(url);
}

/** Start kit: crea (o riprende) l'ordine e porta subito al pagamento. */
export async function pagaStartKit(_: EsitoModulo, formData: FormData): Promise<EsitoModulo> {
  const { incaricato, sessione } = await verificaIncaricato();
  if (incaricato.startKitPagato) redirect("/area");
  const valori = valoriDa(formData);
  const spedizione = schemaSpedizione.safeParse(Object.fromEntries(formData));
  if (!spedizione.success) {
    return { messaggio: "Controlla l'indirizzo di spedizione.", errori: erroriPerCampo(spedizione.error.issues), valori };
  }
  let url: string;
  try {
    const id = await ordineStartKit(incaricato.id, spedizione.data);
    url = await apriPagamento(id, incaricato.id, await emailIncaricata(sessione.utenteId));
  } catch (e) {
    if (e instanceof ErroreOrdine) return { messaggio: e.message, valori };
    return { ...erroreDiPagamento(e), valori };
  }
  redirect(url);
}

/** L'incaricata annulla un suo ordine non ancora pagato. */
export async function annullaOrdine(_: EsitoModulo, formData: FormData): Promise<EsitoModulo> {
  const { incaricato, sessione } = await verificaIncaricato();
  const id = z.uuid().safeParse(formData.get("id"));
  if (!id.success) return { messaggio: "Ordine non valido." };
  const letto = await leggiOrdine(id.data, incaricato.id);
  if (!letto || letto.ordine.stato !== "inserito") return { messaggio: "Si possono annullare solo gli ordini non pagati." };
  if (letto.ordine.stripeSessioneId && !(await chiudiPagamento(letto.ordine.stripeSessioneId))) {
    return { messaggio: "Il pagamento risulta già fatto: stiamo aspettando la conferma da Stripe." };
  }
  await db().transaction((tx) => registraStato(tx, id.data, "annullato", { utenteId: sessione.utenteId, nota: "Annullato dall'incaricata" }));
  revalidatePath("/area/ordini");
  revalidatePath(`/area/ordini/${id.data}`);
  return { ok: true, messaggio: "Ordine annullato." };
}

/** Passaggi di stato che lo staff può fare a mano. "Pagato" arriva solo da Stripe; resi e annullamenti dai rimborsi. */
const PASSAGGI: Partial<Record<StatoOrdine, StatoOrdine[]>> = {
  pagato: ["in_preparazione", "spedito"],
  in_preparazione: ["spedito"],
  spedito: ["consegnato"],
};

export async function cambiaStatoOrdine(_: EsitoModulo, formData: FormData): Promise<EsitoModulo> {
  const staff = await richiediStaff(["amministrazione", "ordini"]);
  const letto = z
    .object({
      id: z.uuid(),
      stato: z.enum(["in_preparazione", "spedito", "consegnato"]),
      corriere: z.string().trim().max(60).optional(),
      tracciamento: z.string().trim().max(80).optional(),
    })
    .safeParse(Object.fromEntries(formData));
  if (!letto.success) return { messaggio: "Dati non validi." };
  const { id, stato, corriere, tracciamento } = letto.data;
  if (stato === "spedito" && (!corriere || !tracciamento)) {
    return {
      messaggio: "Per segnare l'ordine come spedito indica corriere e numero di tracciamento.",
      errori: { ...(!corriere && { corriere: "Obbligatorio" }), ...(!tracciamento && { tracciamento: "Obbligatorio" }) },
      valori: valoriDa(formData),
    };
  }

  const esito = await db().transaction(async (tx) => {
    const [ordine] = await tx.select().from(ordini).where(eq(ordini.id, id)).for("update");
    if (!ordine) return { messaggio: "Ordine non trovato." };
    if (ordine.tipo === "licenza") return { messaggio: "Il rinnovo della licenza non si prepara né si spedisce." };
    if (!PASSAGGI[ordine.stato]?.includes(stato)) {
      return { messaggio: `Da "${ETICHETTE_STATO[ordine.stato]}" non si può passare a "${ETICHETTE_STATO[stato]}".` };
    }
    if (stato === "spedito") await tx.update(ordini).set({ corriere, tracciamento }).where(eq(ordini.id, id));
    await registraStato(tx, id, stato, {
      utenteId: staff.utenteId,
      nota: stato === "spedito" ? `${corriere} ${tracciamento}` : undefined,
    });
    await registra(tx, {
      utenteId: staff.utenteId,
      azione: "ordine.stato",
      entita: "ordine",
      entitaId: id,
      prima: { stato: ordine.stato },
      dopo: { stato, ...(stato === "spedito" && { corriere, tracciamento }) },
    });
    return { ok: true, messaggio: `Ordine ${numeroOrdine(ordine.numero)}: ${ETICHETTE_STATO[stato].toLowerCase()}.`, ordine };
  });

  if ("ordine" in esito && esito.ordine && stato === "spedito" && esito.ordine.clienteId) {
    // Ordine dal negozio: l'avviso va al cliente.
    const [cliente] = await db().select({ email: clienti.email, nome: clienti.nome }).from(clienti).where(eq(clienti.id, esito.ordine.clienteId));
    await inviaEmail({
      a: cliente.email,
      oggetto: `G LUXE: ordine ${numeroOrdine(esito.ordine.numero)} spedito`,
      testo:
        `Ciao ${cliente.nome},\n\nil tuo ordine ${numeroOrdine(esito.ordine.numero)} è partito.\n` +
        `Corriere: ${corriere}\nNumero di tracciamento: ${tracciamento}\n\nGrazie per aver scelto G LUXE.`,
    });
  } else if ("ordine" in esito && esito.ordine && stato === "spedito") {
    const [persona] = await db()
      .select({ email: utenti.email, nome: incaricati.nome })
      .from(incaricati)
      .innerJoin(utenti, eq(utenti.id, incaricati.utenteId))
      .where(eq(incaricati.id, esito.ordine.incaricatoId));
    await inviaEmail({
      a: persona.email,
      oggetto: `G LUXE: ordine ${numeroOrdine(esito.ordine.numero)} spedito`,
      testo:
        `Ciao ${persona.nome},\n\nil tuo ordine ${numeroOrdine(esito.ordine.numero)} è partito.\n` +
        `Corriere: ${corriere}\nNumero di tracciamento: ${tracciamento}\n\n` +
        `Dettagli nell'app: ${indirizzoApp()}/area/ordini/${id}\n\nG LUXE`,
    });
  }
  revalidatePath("/staff/ordini");
  revalidatePath(`/staff/ordini/${id}`);
  return { ok: esito.ok, messaggio: esito.messaggio };
}

/** Rinnovo della licenza annuale (decisione 31): crea (o riprende) l'ordine e porta subito al pagamento Stripe. */
export async function rinnovaLicenza(): Promise<EsitoModulo> {
  const { incaricato, sessione } = await verificaIncaricataOperativa();
  if (!pagamentiAttivi()) return { messaggio: "Il pagamento online sarà attivo a breve." };
  let url: string;
  try {
    const id = await ordineLicenza(incaricato.id);
    url = await apriPagamento(id, incaricato.id, await emailIncaricata(sessione.utenteId));
  } catch (e) {
    if (e instanceof ErroreOrdine) return { messaggio: e.message };
    return erroreDiPagamento(e);
  }
  redirect(url);
}

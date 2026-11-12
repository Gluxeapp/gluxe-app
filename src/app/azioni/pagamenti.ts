"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { datiAzienda } from "@/db/schema";
import { erroriPerCampo, valoriDa, type EsitoModulo } from "@/components/ui";
import { richiediStaff, verificaAccessoProvvigioni } from "@/lib/accesso";
import { formattaEuro } from "@/lib/denaro";
import { registra } from "@/lib/registro";
import { chiudiMese, ErroreChiusura } from "@/lib/provvigioni/chiusura";
import {
  annullaDistinta,
  approvaRichiesta,
  creaDistinta,
  creaRichiesta,
  ErrorePagamento,
  registraVersamentoF24,
  rifiutaRichiesta,
  segnaPagata,
} from "@/lib/provvigioni/conti";
import { MESE_VALIDO } from "@/lib/provvigioni/dati";
import { ibanValido, normalizzaIban, partitaIvaValida } from "@/lib/validazioni";

/**
 * Azioni della Fase 6: chiusura del mese (amministrazione), richiesta di pagamento (incaricata),
 * decisioni, bonifici, F24 e dati dell'azienda (amministrazione e contabilità).
 * Ogni scrittura passa da src/lib/provvigioni e finisce nel registro modifiche.
 */

const CONTABILITA = ["amministrazione", "contabilita"] as const;
const DATA = /^\d{4}-\d{2}-\d{2}$/;
const UUID = /^[0-9a-f-]{36}$/i;

/** Gli errori previsti diventano un messaggio; gli altri restano errori veri (senza dati personali). */
async function esegui(fn: () => Promise<string>): Promise<EsitoModulo> {
  try {
    return { ok: true, messaggio: await fn() };
  } catch (e) {
    if (e instanceof ErrorePagamento || e instanceof ErroreChiusura) return { messaggio: e.message };
    const codice = (e as { cause?: { code?: string } }).cause?.code ?? (e as { code?: string }).code;
    if (codice === "23505") return { messaggio: "Operazione già fatta: ricarica la pagina." };
    throw e;
  }
}

const aggiornaContabilita = () => {
  revalidatePath("/staff/contabilita");
  revalidatePath("/area/provvigioni");
};

export async function chiudiIlMese(_: EsitoModulo, formData: FormData): Promise<EsitoModulo> {
  const staff = await richiediStaff(["amministrazione"]);
  const mese = String(formData.get("mese") ?? "");
  if (!MESE_VALIDO.test(mese)) return { messaggio: "Mese non valido." };
  if (formData.get("conferma") !== "on") return { messaggio: "Spunta la conferma: dopo la chiusura il mese non si può più cambiare." };
  const esito = await esegui(async () => {
    const r = await chiudiMese(mese, staff.utenteId);
    return `Mese chiuso: ${r.voci} voci per ${formattaEuro(r.totaleCompensi)}${r.ordiniStornati > 0 ? `, ${r.ordiniStornati} ordini resi stornati (${formattaEuro(r.totaleStorni)})` : ""}.`;
  });
  revalidatePath("/staff/chiusura");
  revalidatePath("/staff/provvigioni");
  aggiornaContabilita();
  return esito;
}

export async function richiediPagamento(): Promise<EsitoModulo> {
  const { sessione, incaricato } = await verificaAccessoProvvigioni();
  const esito = await esegui(async () => {
    const r = await creaRichiesta(incaricato.id, sessione.utenteId);
    return `Richiesta inviata: ${formattaEuro(r.lordo)} lordi. La contabilità la controlla e ti avvisa qui.`;
  });
  aggiornaContabilita();
  return esito;
}

export async function approva(_: EsitoModulo, formData: FormData): Promise<EsitoModulo> {
  const staff = await richiediStaff([...CONTABILITA]);
  const id = String(formData.get("id") ?? "");
  if (!UUID.test(id)) return { messaggio: "Richiesta non valida." };
  const esito = await esegui(async () => {
    const d = await approvaRichiesta(id, staff.utenteId);
    return `Approvata: creato il documento n. ${d.numero}.`;
  });
  aggiornaContabilita();
  return esito;
}

export async function rifiuta(_: EsitoModulo, formData: FormData): Promise<EsitoModulo> {
  const staff = await richiediStaff([...CONTABILITA]);
  const id = String(formData.get("id") ?? "");
  const motivo = String(formData.get("motivo") ?? "").trim();
  if (!UUID.test(id)) return { messaggio: "Richiesta non valida." };
  if (motivo.length < 3) return { messaggio: "Scrivi il motivo del rifiuto: lo vede l'incaricata." };
  const esito = await esegui(async () => {
    await rifiutaRichiesta(id, motivo.slice(0, 300), staff.utenteId);
    return "Richiesta rifiutata: l'importo torna nel saldo dell'incaricata.";
  });
  aggiornaContabilita();
  return esito;
}

export async function creaFileBonifici(_: EsitoModulo, formData: FormData): Promise<EsitoModulo> {
  const staff = await richiediStaff([...CONTABILITA]);
  const data = String(formData.get("dataPagamento") ?? "");
  if (!DATA.test(data)) return { messaggio: "Data non valida." };
  const esito = await esegui(async () => {
    const r = await creaDistinta(data, staff.utenteId);
    return r.scartate.length > 0
      ? `File creato. Lasciate fuori per IBAN non valido: ${r.scartate.join(", ")} (correggi l'IBAN nella scheda e crea un altro file).`
      : "File creato: scaricalo dall'elenco e caricalo nell'home banking.";
  });
  aggiornaContabilita();
  return esito;
}

export async function annullaFileBonifici(_: EsitoModulo, formData: FormData): Promise<EsitoModulo> {
  const staff = await richiediStaff([...CONTABILITA]);
  const id = String(formData.get("id") ?? "");
  if (!UUID.test(id)) return { messaggio: "File non valido." };
  const esito = await esegui(async () => {
    await annullaDistinta(id, staff.utenteId);
    return "File annullato: i bonifici tornano da mettere in un nuovo file.";
  });
  aggiornaContabilita();
  return esito;
}

export async function segnaBonificiPagati(_: EsitoModulo, formData: FormData): Promise<EsitoModulo> {
  const staff = await richiediStaff([...CONTABILITA]);
  const id = String(formData.get("id") ?? "");
  if (!UUID.test(id)) return { messaggio: "File non valido." };
  const esito = await esegui(async () => {
    await segnaPagata(id, staff.utenteId);
    return "Bonifici segnati come pagati.";
  });
  aggiornaContabilita();
  return esito;
}

export async function segnaF24Versato(_: EsitoModulo, formData: FormData): Promise<EsitoModulo> {
  const staff = await richiediStaff([...CONTABILITA]);
  const periodo = String(formData.get("periodo") ?? "");
  const versatoIl = String(formData.get("versatoIl") ?? "");
  if (!MESE_VALIDO.test(periodo) || !DATA.test(versatoIl)) return { messaggio: "Indica la data del versamento." };
  const esito = await esegui(async () => {
    await registraVersamentoF24(periodo, versatoIl, staff.utenteId);
    return "Versamento registrato.";
  });
  aggiornaContabilita();
  return esito;
}

const facoltativo = (max: number) => z.string().trim().max(max, "Testo troppo lungo");
const schemaAzienda = z.object({
  ragioneSociale: facoltativo(120),
  indirizzo: facoltativo(160),
  cap: z.string().trim().regex(/^(\d{5})?$/, "CAP non valido (5 cifre)"),
  citta: facoltativo(80),
  provincia: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^([A-Z]{2})?$/, "Provincia: 2 lettere"),
  codiceFiscale: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^([A-Z0-9]{11}|[A-Z0-9]{16})?$/, "Codice fiscale non valido (11 o 16 caratteri)"),
  partitaIva: z
    .string()
    .trim()
    .refine((v) => v === "" || partitaIvaValida(v), "Partita IVA non valida (11 cifre)"),
  iban: z
    .string()
    .transform(normalizzaIban)
    .refine((v) => v === "" || (ibanValido(v) && v.startsWith("IT")), "IBAN italiano non valido"),
  cuc: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^([A-Z0-9]{8})?$/, "Codice CUC: 8 caratteri, te lo dà la banca"),
  autorizzazioneBollo: facoltativo(200),
});

export async function salvaDatiAzienda(_: EsitoModulo, formData: FormData): Promise<EsitoModulo> {
  const staff = await richiediStaff([...CONTABILITA]);
  const valori = valoriDa(formData);
  const letto = schemaAzienda.safeParse(Object.fromEntries(formData));
  if (!letto.success) return { messaggio: "Controlla i campi evidenziati.", errori: erroriPerCampo(letto.error.issues), valori };
  await db().transaction(async (tx) => {
    const [prima] = await tx.select().from(datiAzienda).where(eq(datiAzienda.id, 1)).for("update");
    await tx.update(datiAzienda).set({ ...letto.data, modificatoIl: new Date() }).where(eq(datiAzienda.id, 1));
    const cambiati = Object.entries(letto.data).filter(([k, v]) => String(prima?.[k as keyof typeof prima] ?? "") !== v);
    if (cambiati.length > 0) {
      await registra(tx, {
        utenteId: staff.utenteId,
        azione: "contabilita.dati_azienda",
        entita: "azienda",
        entitaId: "1",
        prima: Object.fromEntries(cambiati.map(([k]) => [k, prima?.[k as keyof typeof prima] ?? null])),
        dopo: Object.fromEntries(cambiati),
      });
    }
  });
  revalidatePath("/staff/contabilita");
  return { ok: true, messaggio: "Dati dell'azienda salvati.", valori };
}

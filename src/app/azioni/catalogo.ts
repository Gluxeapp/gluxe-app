"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { immagini, prodotti, promozioni } from "@/db/schema";
import { erroriPerCampo, valoriDa, type EsitoModulo } from "@/components/ui";
import { richiediStaff } from "@/lib/accesso";
import { daTesto } from "@/lib/denaro";
import { registra } from "@/lib/registro";

const TIPI_FOTO = ["image/png", "image/jpeg", "image/webp"];
const FOTO_MASSIMA = 900 * 1024;

const prezzo = (nome: string) =>
  z.string().transform((v, ctx) => {
    try {
      const c = daTesto(v);
      if (c <= 0n) throw new RangeError();
      return c;
    } catch {
      ctx.addIssue({ code: "custom", message: `${nome}: importo non valido (es. 32,90)` });
      return z.NEVER;
    }
  });

const schemaProdotto = z.object({
  codice: z.string().trim().toUpperCase().regex(/^[A-Z0-9-]{2,20}$/, "Codice: lettere, numeri e trattini (es. HB-SH)"),
  nome: z.string().trim().min(2, "Nome obbligatorio").max(80),
  linea: z.string().trim().max(60).optional(),
  formato: z.string().trim().max(40).optional(),
  descrizione: z.string().trim().max(1000).optional(),
  prezzoListino: prezzo("Prezzo al pubblico"),
  ordine: z.coerce.number().int().min(0).max(9999).default(0),
});

/** Legge e controlla la foto caricata: restituisce i dati da salvare, un errore, o niente se non c'è foto. */
async function leggiFoto(formData: FormData): Promise<{ tipo: string; dati: string } | { errore: string } | undefined> {
  const file = formData.get("foto");
  if (!(file instanceof File) || file.size === 0) return undefined;
  if (!TIPI_FOTO.includes(file.type)) return { errore: "Foto: formato non valido (usa PNG, JPG o WEBP)" };
  if (file.size > FOTO_MASSIMA) return { errore: "Foto troppo grande: massimo 900 KB" };
  return { tipo: file.type, dati: Buffer.from(await file.arrayBuffer()).toString("base64") };
}

/** Crea un prodotto (senza id) o lo modifica (con id). */
export async function salvaProdotto(_: EsitoModulo, formData: FormData): Promise<EsitoModulo> {
  const staff = await richiediStaff(["amministrazione"]);
  const id = String(formData.get("id") ?? "") || undefined;
  const valori = valoriDa(formData);
  const letto = schemaProdotto.safeParse(Object.fromEntries([...formData].filter(([, v]) => typeof v === "string")));
  if (!letto.success) {
    return { messaggio: "Controlla i campi evidenziati.", errori: erroriPerCampo(letto.error.issues), valori };
  }
  const foto = await leggiFoto(formData);
  if (foto && "errore" in foto) return { errori: { foto: foto.errore }, valori };

  const dati = {
    ...letto.data,
    linea: letto.data.linea || null,
    formato: letto.data.formato || null,
    descrizione: letto.data.descrizione || null,
  };

  let nuovoId: string | undefined;
  try {
    await db().transaction(async (tx) => {
      const immagineId = foto
        ? (await tx.insert(immagini).values(foto).returning({ id: immagini.id }))[0].id
        : undefined;
      if (id) {
        const [prima] = await tx.select().from(prodotti).where(eq(prodotti.id, id)).for("update");
        if (!prima) throw new Error("Prodotto non trovato");
        await tx.update(prodotti).set({ ...dati, ...(immagineId ? { immagineId } : {}) }).where(eq(prodotti.id, id));
        await registra(tx, {
          utenteId: staff.utenteId,
          azione: "prodotto.modificato",
          entita: "prodotto",
          entitaId: id,
          prima: { ...prima, prezzoListino: prima.prezzoListino.toString() },
          dopo: { ...dati, prezzoListino: dati.prezzoListino.toString(), nuovaFoto: Boolean(immagineId) },
        });
      } else {
        const [nuovo] = await tx.insert(prodotti).values({ ...dati, immagineId }).returning({ id: prodotti.id });
        nuovoId = nuovo.id;
        await registra(tx, {
          utenteId: staff.utenteId,
          azione: "prodotto.creato",
          entita: "prodotto",
          entitaId: nuovo.id,
          dopo: { ...dati, prezzoListino: dati.prezzoListino.toString() },
        });
      }
    });
  } catch (e) {
    const codice = (e as { cause?: { code?: string } }).cause?.code ?? (e as { code?: string }).code;
    if (codice === "23505") return { errori: { codice: "Esiste già un prodotto con questo codice" }, valori };
    throw e;
  }

  revalidatePath("/staff/catalogo");
  revalidatePath("/area/prodotti");
  if (nuovoId) redirect(`/staff/catalogo/${nuovoId}`);
  return { ok: true, messaggio: "Prodotto salvato.", valori };
}

export async function cambiaAttivoProdotto(formData: FormData) {
  const staff = await richiediStaff(["amministrazione"]);
  const id = z.uuid().parse(formData.get("id"));
  const attivo = formData.get("attivo") === "si";
  await db().transaction(async (tx) => {
    await tx.update(prodotti).set({ attivo }).where(eq(prodotti.id, id));
    await registra(tx, {
      utenteId: staff.utenteId,
      azione: attivo ? "prodotto.attivato" : "prodotto.disattivato",
      entita: "prodotto",
      entitaId: id,
    });
  });
  revalidatePath(`/staff/catalogo/${id}`);
  revalidatePath("/area/prodotti");
}

const schemaPromozione = z
  .object({
    prodottoId: z.uuid("Scegli un prodotto"),
    titolo: z.string().trim().min(2, "Titolo obbligatorio").max(80),
    prezzoPromo: prezzo("Prezzo in promozione"),
    dal: z.iso.date("Data di inizio non valida"),
    al: z.iso.date("Data di fine non valida"),
  })
  .refine((d) => d.al >= d.dal, { message: "La fine deve essere uguale o successiva all'inizio", path: ["al"] });

export async function creaPromozione(_: EsitoModulo, formData: FormData): Promise<EsitoModulo> {
  const staff = await richiediStaff(["amministrazione"]);
  const valori = valoriDa(formData);
  const letto = schemaPromozione.safeParse(Object.fromEntries(formData));
  if (!letto.success) {
    return { messaggio: "Controlla i campi evidenziati.", errori: erroriPerCampo(letto.error.issues), valori };
  }
  const [prodotto] = await db().select().from(prodotti).where(eq(prodotti.id, letto.data.prodottoId));
  if (!prodotto || prodotto.tipo === "start_kit") return { errori: { prodottoId: "Prodotto non valido" }, valori };
  if (letto.data.prezzoPromo >= prodotto.prezzoListino) {
    return { errori: { prezzoPromo: "Il prezzo in promozione deve essere più basso del listino" }, valori };
  }
  await db().transaction(async (tx) => {
    const [nuova] = await tx.insert(promozioni).values(letto.data).returning({ id: promozioni.id });
    await registra(tx, {
      utenteId: staff.utenteId,
      azione: "promozione.creata",
      entita: "promozione",
      entitaId: nuova.id,
      dopo: { ...letto.data, prodotto: prodotto.nome, prezzoPromo: letto.data.prezzoPromo.toString() },
    });
  });
  revalidatePath("/staff/catalogo/promozioni");
  revalidatePath("/area/prodotti");
  return { ok: true, messaggio: "Promozione creata." };
}

export async function disattivaPromozione(formData: FormData) {
  const staff = await richiediStaff(["amministrazione"]);
  const id = z.uuid().parse(formData.get("id"));
  await db().transaction(async (tx) => {
    await tx.update(promozioni).set({ attiva: false }).where(eq(promozioni.id, id));
    await registra(tx, { utenteId: staff.utenteId, azione: "promozione.disattivata", entita: "promozione", entitaId: id });
  });
  revalidatePath("/staff/catalogo/promozioni");
  revalidatePath("/area/prodotti");
}

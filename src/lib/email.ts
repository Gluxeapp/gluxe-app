import "server-only";
import { eq } from "drizzle-orm";
import { database } from "@/db";
import { emailInUscita } from "@/db/schema";

type Messaggio = { a: string; oggetto: string; testo: string };

/**
 * Invia un'email tramite Resend (https://resend.com) e ne tiene traccia in email_in_uscita
 * (solo destinatario e oggetto: il contenuto può contenere link riservati e non si salva).
 *
 * Senza RESEND_API_KEY, sul computer di sviluppo il messaggio viene scritto nel terminale.
 */
export async function inviaEmail({ a, oggetto, testo }: Messaggio): Promise<boolean> {
  const db = database()?.db;
  const [riga] = db
    ? await db.insert(emailInUscita).values({ destinatario: a, oggetto }).returning({ id: emailInUscita.id })
    : [];

  const chiave = process.env.RESEND_API_KEY;
  let errore: string | null = null;

  // Sul computer di sviluppo il messaggio si vede sempre nel terminale (database di prova, indirizzi finti).
  if (process.env.NODE_ENV === "development") {
    console.info(`\n[email di prova]\nA: ${a}\nOggetto: ${oggetto}\n\n${testo}\n`);
  }
  if (!chiave) {
    if (process.env.NODE_ENV !== "development") errore = "RESEND_API_KEY non configurata";
  } else {
    const risposta = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${chiave}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_MITTENTE ?? "G LUXE <onboarding@resend.dev>",
        to: [a],
        subject: oggetto,
        text: testo,
      }),
    }).catch((e: unknown) => ({ ok: false, status: 0, text: async () => String(e) }));
    if (!risposta.ok) errore = `Resend ${risposta.status}: ${(await risposta.text()).slice(0, 300)}`;
  }

  if (db && riga) {
    await db
      .update(emailInUscita)
      .set(errore ? { errore } : { inviataIl: new Date() })
      .where(eq(emailInUscita.id, riga.id));
  }
  if (errore) console.error(`Email non inviata (${oggetto}): ${errore}`);
  return errore === null;
}

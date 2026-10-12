"use server";

import { and, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { incaricati, utenti } from "@/db/schema";
import type { EsitoModulo } from "@/components/ui";
import { consumaTokenRecupero } from "@/lib/codici-verifica";
import { schemaPassword } from "@/lib/incaricati";
import { inviaLinkPassword } from "@/lib/password";
import { registra } from "@/lib/registro";
import { cifraPassword } from "@/lib/sicurezza";
import { chiudiTutteLeSessioni } from "@/lib/sessione";
import { CODICE_INCARICATO, normalizzaCodiceIncaricato } from "@/lib/validazioni";

/** Invia il link per scegliere una nuova password. La risposta è sempre la stessa, per non rivelare chi è registrato. */
export async function richiediRecuperoPassword(_: EsitoModulo, formData: FormData): Promise<EsitoModulo> {
  const valore = String(formData.get("identificativo") ?? "").trim();
  const codice = normalizzaCodiceIncaricato(valore);

  const trovati = CODICE_INCARICATO.test(codice)
    ? await db()
        .select({ id: utenti.id, email: utenti.email, nome: utenti.nome })
        .from(incaricati)
        .innerJoin(utenti, eq(utenti.id, incaricati.utenteId))
        .where(and(eq(incaricati.codice, codice), eq(utenti.attivo, true)))
    : await db()
        .select({ id: utenti.id, email: utenti.email, nome: utenti.nome })
        .from(utenti)
        .where(and(sql`lower(${utenti.email}) = ${valore.toLowerCase()}`, eq(utenti.attivo, true)));

  for (const utente of trovati) await inviaLinkPassword(utente, "recupero");

  return {
    ok: true,
    messaggio:
      "Se i dati corrispondono a un account, riceverai a breve un'email con il link per scegliere una nuova password. Il link vale un'ora.",
  };
}

export async function reimpostaPassword(_: EsitoModulo, formData: FormData): Promise<EsitoModulo> {
  const token = String(formData.get("token") ?? "");
  const password = schemaPassword.safeParse(formData.get("password") ?? "");
  if (!password.success) return { errori: { password: password.error.issues[0].message } };
  if (password.data !== formData.get("confermaPassword")) {
    return { errori: { confermaPassword: "Le due password non coincidono" } };
  }

  const utenteId = await consumaTokenRecupero(token);
  if (!utenteId) return { messaggio: "Il link non è più valido. Richiedine uno nuovo." };

  await db()
    .update(utenti)
    .set({ passwordHash: await cifraPassword(password.data), tentativiFalliti: 0, bloccatoFino: null })
    .where(eq(utenti.id, utenteId));
  await chiudiTutteLeSessioni(utenteId);
  await registra(db(), { utenteId, azione: "password.reimpostata", entita: "utente", entitaId: utenteId });

  const [utente] = await db().select({ ruolo: utenti.ruolo }).from(utenti).where(eq(utenti.id, utenteId));
  return {
    ok: true,
    messaggio: "Password salvata. Ora puoi accedere.",
    valori: { destinazione: utente && utente.ruolo !== "incaricato" ? "/staff/accesso" : "/" },
  };
}


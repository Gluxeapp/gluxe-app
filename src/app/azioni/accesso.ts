"use server";

import { and, eq, ne, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { incaricati, utenti } from "@/db/schema";
import type { EsitoModulo } from "@/components/ui";
import { creaCodice, verificaCodiceStaff } from "@/lib/codici-verifica";
import { inviaEmail } from "@/lib/email";
import { registra } from "@/lib/registro";
import { attesaUguale, passwordCorretta } from "@/lib/sicurezza";
import {
  chiudiSessione,
  creaSessione,
  DURATA_INCARICATO_ORE,
  DURATA_STAFF_ORE,
  leggiSessione,
} from "@/lib/sessione";
import { normalizzaCodiceIncaricato } from "@/lib/validazioni";

const TENTATIVI_MASSIMI = 5;
const BLOCCO_MINUTI = 15;

type UtenteDaVerificare = {
  id: string;
  passwordHash: string | null;
  tentativiFalliti: number;
  bloccatoFino: Date | null;
};

/** Controlla la password con blocco temporaneo dopo 5 errori. Restituisce un messaggio d'errore o null. */
async function controllaPassword(utente: UtenteDaVerificare | undefined, password: string): Promise<string | null> {
  const generico = "Credenziali non corrette.";
  if (!utente) {
    await attesaUguale(password);
    return generico;
  }
  if (utente.bloccatoFino && utente.bloccatoFino > new Date()) {
    return `Troppi tentativi sbagliati. Riprova tra ${BLOCCO_MINUTI} minuti o reimposta la password.`;
  }
  if (await passwordCorretta(utente.passwordHash, password)) {
    await db()
      .update(utenti)
      .set({ tentativiFalliti: 0, bloccatoFino: null, ultimoAccesso: new Date() })
      .where(eq(utenti.id, utente.id));
    return null;
  }
  const tentativi = utente.tentativiFalliti + 1;
  await db()
    .update(utenti)
    .set(
      tentativi >= TENTATIVI_MASSIMI
        ? { tentativiFalliti: 0, bloccatoFino: new Date(Date.now() + BLOCCO_MINUTI * 60_000) }
        : { tentativiFalliti: tentativi },
    )
    .where(eq(utenti.id, utente.id));
  return generico;
}

export async function accediIncaricato(_: EsitoModulo, formData: FormData): Promise<EsitoModulo> {
  const codice = normalizzaCodiceIncaricato(String(formData.get("codice") ?? ""));
  const password = String(formData.get("password") ?? "");
  const valori = { codice };

  const [utente] = await db()
    .select({
      id: utenti.id,
      passwordHash: utenti.passwordHash,
      tentativiFalliti: utenti.tentativiFalliti,
      bloccatoFino: utenti.bloccatoFino,
      stato: incaricati.stato,
    })
    .from(incaricati)
    .innerJoin(utenti, eq(utenti.id, incaricati.utenteId))
    .where(and(eq(incaricati.codice, codice), eq(utenti.attivo, true)))
    .limit(1);

  const errore = await controllaPassword(utente, password);
  if (errore) return { messaggio: errore.replace("Credenziali", "Codice incaricato o password"), valori };
  if (utente.stato === "cessato" || utente.stato === "cliente") {
    return { messaggio: "Il tuo account incaricato non è più attivo. Contatta l'azienda.", valori };
  }

  await creaSessione(utente.id, { verificata: true, durataOre: DURATA_INCARICATO_ORE });
  redirect("/area");
}

export async function accediStaff(_: EsitoModulo, formData: FormData): Promise<EsitoModulo> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  const [utente] = await db()
    .select({
      id: utenti.id,
      email: utenti.email,
      passwordHash: utenti.passwordHash,
      tentativiFalliti: utenti.tentativiFalliti,
      bloccatoFino: utenti.bloccatoFino,
    })
    .from(utenti)
    .where(and(sql`lower(${utenti.email}) = ${email}`, ne(utenti.ruolo, "incaricato"), eq(utenti.attivo, true)))
    .limit(1);

  const errore = await controllaPassword(utente, password);
  if (errore) return { messaggio: errore.replace("Credenziali", "Email o password"), valori: { email } };

  const codice = await creaCodice(utente.id, "accesso_staff");
  await inviaEmail({
    a: utente.email,
    oggetto: "G LUXE: il tuo codice di accesso",
    testo: `Il tuo codice di accesso all'area amministrazione G LUXE è: ${codice}\n\nVale 10 minuti. Se non hai provato ad accedere, cambia subito la password.`,
  });
  await creaSessione(utente.id, { verificata: false, durataOre: DURATA_STAFF_ORE });
  redirect("/staff/verifica");
}

export async function verificaStaff(_: EsitoModulo, formData: FormData): Promise<EsitoModulo> {
  const sessione = await leggiSessione();
  if (!sessione || sessione.ruolo === "incaricato") redirect("/staff/accesso");

  const codice = String(formData.get("codice") ?? "").replace(/\s/g, "");
  if (!(await verificaCodiceStaff(sessione.utenteId, codice))) {
    return { messaggio: "Codice non corretto o scaduto. Dopo 5 tentativi serve un nuovo accesso." };
  }

  // Sessione nuova (verificata) al posto di quella a metà: il codice del cookie cambia.
  await chiudiSessione();
  await creaSessione(sessione.utenteId, { verificata: true, durataOre: DURATA_STAFF_ORE });
  await registra(db(), { utenteId: sessione.utenteId, azione: "staff.accesso", entita: "utente", entitaId: sessione.utenteId });
  redirect("/staff");
}

export async function esci() {
  const sessione = await leggiSessione();
  await chiudiSessione();
  redirect(sessione && sessione.ruolo !== "incaricato" ? "/staff/accesso" : "/");
}

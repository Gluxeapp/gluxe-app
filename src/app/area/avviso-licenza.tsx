import { eq } from "drizzle-orm";
import Link from "next/link";
import { db } from "@/db";
import { incaricati } from "@/db/schema";
import { sessioneCorrente } from "@/lib/accesso";
import { dataItaliana } from "@/lib/dati-incaricato";
import { situazioneLicenza } from "@/lib/licenze";

/**
 * Avviso in cima a ogni pagina dell'area: licenza in scadenza (negli ultimi 30 giorni) o scaduta (decisione 31).
 * Non rimanda da nessuna parte: i controlli di accesso li fanno le pagine.
 */
export async function AvvisoLicenza() {
  const sessione = await sessioneCorrente();
  if (!sessione || sessione.ruolo !== "incaricato") return null;
  const [i] = await db()
    .select({ id: incaricati.id, stato: incaricati.stato, startKitPagato: incaricati.startKitPagato })
    .from(incaricati)
    .where(eq(incaricati.utenteId, sessione.utenteId));
  if (!i || i.stato === "cliente" || i.stato === "cessato" || !i.startKitPagato) return null;
  const s = await situazioneLicenza(i.id);
  if (s.stato !== "in_scadenza" && s.stato !== "scaduta") return null;

  const scaduta = s.stato === "scaduta";
  return (
    <Link
      href="/area/licenza"
      className={`block border-b px-5 py-3 text-sm ${scaduta ? "border-errore/50 bg-errore/10 text-errore" : "border-oro/40 bg-oro/10 text-oro-chiaro"}`}
    >
      {scaduta
        ? `Licenza scaduta: l'app è in sola visualizzazione. Rinnova entro il ${dataItaliana(s.rinnovabileFino)} →`
        : `La tua licenza scade il ${dataItaliana(s.validaFino)}: rinnova ora, non perdi nessun giorno →`}
    </Link>
  );
}

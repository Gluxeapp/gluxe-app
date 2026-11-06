import { and, eq } from "drizzle-orm";
import { timingSafeEqual } from "node:crypto";
import { db } from "@/db";
import { utenti } from "@/db/schema";
import { formattaEuro } from "@/lib/denaro";
import { inviaEmail } from "@/lib/email";
import { indirizzoApp } from "@/lib/indirizzo-app";
import { meseDaChiudere } from "@/lib/provvigioni/chiusura";
import { calcoloDelMese } from "@/lib/provvigioni/dati";

/**
 * Il giorno 1 di ogni mese (vercel.json) prepara il calcolo del mese finito e avvisa l'amministrazione
 * via email. Non chiude nulla: il mese si congela solo con la conferma "Chiudi il mese" (decisione 17).
 * Lo chiama solo Vercel, con il segreto CRON_SECRET.
 */
export async function GET(richiesta: Request) {
  const segreto = process.env.CRON_SECRET;
  if (!segreto) return new Response("Non configurato", { status: 503 });
  const ricevuto = Buffer.from(richiesta.headers.get("authorization") ?? "");
  const atteso = Buffer.from(`Bearer ${segreto}`);
  if (ricevuto.length !== atteso.length || !timingSafeEqual(ricevuto, atteso)) return new Response("Non autorizzato", { status: 401 });

  const mese = await meseDaChiudere();
  if (!mese) return Response.json({ mese: null });
  const e = await calcoloDelMese(mese);
  const amministratori = await db()
    .select({ email: utenti.email })
    .from(utenti)
    .where(and(eq(utenti.ruolo, "amministrazione"), eq(utenti.attivo, true)));
  const esito = e.ok ? "Tutti i controlli sono superati." : "ATTENZIONE: alcuni controlli non tornano, il mese non si può chiudere finché non si sistemano.";
  for (const a of amministratori) {
    await inviaEmail({
      a: a.email,
      oggetto: `G LUXE · calcolo di ${mese} pronto da controllare`,
      testo: `Il calcolo delle provvigioni di ${mese} è pronto.\n\nCompensi: ${formattaEuro(e.totaleCompensi)} (${e.voci.length} voci).\n${esito}\n\nControlla l'anteprima e chiudi il mese da qui:\n${indirizzoApp()}/staff/chiusura\n\nDopo la chiusura le incaricate possono chiedere il pagamento.`,
    });
  }
  return Response.json({ mese, ok: e.ok, avvisati: amministratori.length });
}

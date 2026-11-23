import { timingSafeEqual } from "node:crypto";
import { inviaAvvisiVip } from "@/lib/clienti-vip";
import { inviaAvvisiLicenza } from "@/lib/licenze";

/**
 * Ogni giorno (vercel.json) manda gli avvisi di scadenza: della licenza delle incaricate (30 e 7 giorni prima,
 * decisione 31) e dello status delle clienti VIP (da 30 giorni prima, decisione 35). Ogni avviso parte una volta sola
 * anche se la chiamata si ripete. Lo chiama solo Vercel, con il segreto CRON_SECRET.
 */
export async function GET(richiesta: Request) {
  const segreto = process.env.CRON_SECRET;
  if (!segreto) return new Response("Non configurato", { status: 503 });
  const ricevuto = Buffer.from(richiesta.headers.get("authorization") ?? "");
  const atteso = Buffer.from(`Bearer ${segreto}`);
  if (ricevuto.length !== atteso.length || !timingSafeEqual(ricevuto, atteso)) return new Response("Non autorizzato", { status: 401 });
  const inviati = await inviaAvvisiLicenza();
  const vip = await inviaAvvisiVip();
  return Response.json({ avvisi: inviati, avvisiVip: vip });
}

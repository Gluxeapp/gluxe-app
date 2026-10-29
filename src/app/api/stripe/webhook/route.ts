import type Stripe from "stripe";
import { gestisciEventoStripe } from "@/lib/pagamenti";
import { segretoWebhook, stripe } from "@/lib/stripe";

/**
 * Webhook di Stripe: l'unico punto da cui un ordine diventa "pagato".
 * Si accettano solo messaggi con la firma di Stripe; gli altri vengono rifiutati.
 */
export async function POST(request: Request) {
  const firma = request.headers.get("stripe-signature");
  const corpo = await request.text();
  let evento: Stripe.Event;
  try {
    if (!firma) throw new Error("Firma mancante");
    evento = stripe().webhooks.constructEvent(corpo, firma, segretoWebhook());
  } catch {
    return new Response("Firma non valida", { status: 400 });
  }
  try {
    await gestisciEventoStripe(evento);
  } catch (e) {
    // Risposta di errore: Stripe ritenterà più tardi lo stesso evento.
    console.error(`Evento Stripe ${evento.id} (${evento.type}) non elaborato: ${e instanceof Error ? e.message : "errore"}`);
    return new Response("Errore", { status: 500 });
  }
  return Response.json({ ricevuto: true });
}

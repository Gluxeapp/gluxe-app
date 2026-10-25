import "server-only";
import { and, eq, isNull } from "drizzle-orm";
import type Stripe from "stripe";
import { db, type Esecutore } from "@/db";
import { eventiStripe, incaricati, ordini, righeOrdine, rimborsi, utenti } from "@/db/schema";
import { ErroreOrdine } from "./calcolo-ordine";
import { formattaEuro } from "./denaro";
import { inviaEmail } from "./email";
import { indirizzoApp } from "./indirizzo-app";
import { leggiOrdine, numeroOrdine, ORE_PER_PAGARE, registraStato } from "./ordini";
import { configurazionePagamenti, stripe } from "./stripe";

/**
 * Pagamenti degli ordini con Stripe Checkout (pagina di pagamento ospitata da Stripe:
 * i dati della carta non passano mai dal nostro server).
 * I metodi offerti (carta, PayPal, Klarna) sono quelli della configurazione STRIPE_CONFIGURAZIONE_PAGAMENTI.
 */

const MINUTI_SESSIONE = 30;

/** Restituisce l'indirizzo della pagina di pagamento Stripe per un ordine in attesa. */
export async function apriPagamento(ordineId: string, incaricatoId: string, email: string): Promise<string> {
  const letto = await leggiOrdine(ordineId, incaricatoId);
  if (!letto) throw new ErroreOrdine("Ordine non trovato.");
  const { ordine, righe, scaduto } = letto;
  if (ordine.stato !== "inserito") throw new ErroreOrdine("Questo ordine non è in attesa di pagamento.");
  if (scaduto) {
    await db().transaction((tx) =>
      registraStato(tx, ordine.id, "annullato", { nota: `Non pagato entro ${ORE_PER_PAGARE} ore` }),
    );
    throw new ErroreOrdine(`L'ordine non è stato pagato entro ${ORE_PER_PAGARE} ore ed è stato annullato: creane uno nuovo.`);
  }

  // Se c'è già una pagina di pagamento aperta si riusa: due pagine aperte potrebbero far pagare due volte.
  if (ordine.stripeSessioneId) {
    const sessione = await stripe().checkout.sessions.retrieve(ordine.stripeSessioneId);
    if (sessione.status === "open" && sessione.url) return sessione.url;
    if (sessione.status === "complete") {
      throw new ErroreOrdine("Il pagamento risulta già fatto: stiamo aspettando la conferma da Stripe.");
    }
  }

  // Due clic ravvicinati su "Paga" (stesso minuto) devono ricevere la stessa pagina di pagamento: stessa chiave
  // e stessi dati per Stripe, scadenza compresa. Un tentativo in un minuto diverso apre una pagina nuova.
  const minuto = Math.floor(Date.now() / 60_000);
  const ritorno = `${indirizzoApp()}/area/ordini/${ordine.id}`;
  const sessione = await stripe().checkout.sessions.create(
    {
      mode: "payment",
      locale: "it",
      payment_method_configuration: configurazionePagamenti(),
      client_reference_id: ordine.id,
      metadata: { ordineId: ordine.id },
      payment_intent_data: { metadata: { ordineId: ordine.id } },
      customer_email: email,
      expires_at: (minuto + 1 + MINUTI_SESSIONE) * 60,
      line_items: [
        ...righe.map((r) => ({
          quantity: r.quantita,
          price_data: {
            currency: "eur",
            unit_amount: Number(r.prezzoUnitarioIvato),
            product_data: { name: r.nome },
          },
        })),
        {
          quantity: 1,
          price_data: { currency: "eur", unit_amount: Number(ordine.speseSpedizione), product_data: { name: "Spedizione" } },
        },
      ],
      success_url: `${ritorno}?esito=pagato`,
      cancel_url: ritorno,
    },
    { idempotencyKey: `checkout-${ordine.id}-${minuto}` },
  );
  if (sessione.amount_total !== Number(ordine.totale)) {
    throw new Error(`Totale Stripe diverso dall'ordine ${ordine.id}`);
  }
  await db().update(ordini).set({ stripeSessioneId: sessione.id }).where(eq(ordini.id, ordine.id));
  if (!sessione.url) throw new Error("Stripe non ha restituito la pagina di pagamento");
  return sessione.url;
}

/** Chiude la pagina di pagamento aperta (quando l'incaricata annulla l'ordine). False se il pagamento è già avvenuto. */
export async function chiudiPagamento(stripeSessioneId: string): Promise<boolean> {
  const sessione = await stripe().checkout.sessions.retrieve(stripeSessioneId);
  if (sessione.status === "open") {
    await stripe().checkout.sessions.expire(stripeSessioneId);
    return true;
  }
  return sessione.status === "expired";
}

type DaInviare = Parameters<typeof inviaEmail>[0];

/**
 * Elabora un evento già verificato con la firma di Stripe. Idempotente: lo stesso evento
 * ricevuto due volte si elabora una volta sola (tabella eventi_stripe, nella stessa transazione).
 */
export async function gestisciEventoStripe(evento: Stripe.Event): Promise<void> {
  const email: DaInviare[] = [];
  await db().transaction(async (tx) => {
    const [nuovo] = await tx
      .insert(eventiStripe)
      .values({ id: evento.id, tipo: evento.type })
      .onConflictDoNothing()
      .returning({ id: eventiStripe.id });
    if (!nuovo) return;

    switch (evento.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded": {
        const sessione = evento.data.object;
        // Con alcuni metodi il pagamento si conferma più tardi (evento async_payment_succeeded).
        if (sessione.payment_status !== "paid") return;
        const ordineId = sessione.metadata?.ordineId;
        if (!ordineId) return;
        const [ordine] = await tx.select().from(ordini).where(eq(ordini.id, ordineId)).for("update");
        if (!ordine || ordine.pagatoIl) return;
        if (sessione.amount_total !== Number(ordine.totale) || sessione.currency !== "eur") {
          throw new Error(`Importo pagato diverso dal totale dell'ordine ${ordine.id}`);
        }
        const pagatoIl = new Date(evento.created * 1000);
        const pagamento = typeof sessione.payment_intent === "string" ? sessione.payment_intent : (sessione.payment_intent?.id ?? null);
        await tx
          .update(ordini)
          .set({ pagatoIl, stripePagamentoId: pagamento, stripeSessioneId: sessione.id })
          .where(eq(ordini.id, ordine.id));
        await registraStato(tx, ordine.id, "pagato", {
          nota: ordine.stato === "annullato" ? "Pagamento arrivato dopo l'annullamento" : undefined,
        });
        if (ordine.tipo === "start_kit") {
          await tx.update(incaricati).set({ startKitPagato: true }).where(eq(incaricati.id, ordine.incaricatoId));
        }
        email.push(await emailPagato(tx, ordine.id, ordine.incaricatoId));
        return;
      }

      case "checkout.session.expired": {
        // Pagina di pagamento scaduta: l'ordine resta in attesa e si può ripagare con una pagina nuova.
        const sessione = evento.data.object;
        await tx
          .update(ordini)
          .set({ stripeSessioneId: null })
          .where(and(eq(ordini.stripeSessioneId, sessione.id), isNull(ordini.pagatoIl)));
        return;
      }

      case "charge.refunded": {
        const addebito = evento.data.object;
        const pagamento = typeof addebito.payment_intent === "string" ? addebito.payment_intent : addebito.payment_intent?.id;
        if (!pagamento) return;
        const [ordine] = await tx.select().from(ordini).where(eq(ordini.stripePagamentoId, pagamento)).for("update");
        if (!ordine) return;
        const elenco = await stripe().refunds.list({ payment_intent: pagamento, limit: 100 });
        for (const r of elenco.data) {
          if (r.status !== "succeeded") continue;
          await tx
            .insert(rimborsi)
            .values({ id: r.id, ordineId: ordine.id, importo: BigInt(r.amount), rimborsatoIl: new Date(r.created * 1000) })
            .onConflictDoNothing();
        }
        const rimborsato = elenco.data.filter((r) => r.status === "succeeded").reduce((t, r) => t + BigInt(r.amount), 0n);
        if (rimborsato >= ordine.totale && ordine.stato !== "annullato" && ordine.stato !== "reso") {
          const giaPartito = ordine.stato === "spedito" || ordine.stato === "consegnato";
          await registraStato(tx, ordine.id, giaPartito ? "reso" : "annullato", {
            nota: `Rimborsato su Stripe: ${formattaEuro(rimborsato)}`,
          });
        }
        return;
      }
    }
  });
  for (const messaggio of email) await inviaEmail(messaggio);
}

async function emailPagato(tx: Esecutore, ordineId: string, incaricatoId: string): Promise<DaInviare> {
  const [persona] = await tx
    .select({ email: utenti.email, nome: incaricati.nome })
    .from(incaricati)
    .innerJoin(utenti, eq(utenti.id, incaricati.utenteId))
    .where(eq(incaricati.id, incaricatoId));
  const [ordine] = await tx.select().from(ordini).where(eq(ordini.id, ordineId));
  const righe = await tx.select().from(righeOrdine).where(eq(righeOrdine.ordineId, ordineId));
  const elenco = righe.map((r) => `- ${r.quantita} × ${r.nome}: ${formattaEuro(r.totaleIvato)}`).join("\n");
  return {
    a: persona.email,
    oggetto: `G LUXE: ordine ${numeroOrdine(ordine.numero)} pagato`,
    testo:
      `Ciao ${persona.nome},\n\nabbiamo ricevuto il pagamento del tuo ordine ${numeroOrdine(ordine.numero)}.\n\n${elenco}\n` +
      `- Spedizione: ${formattaEuro(ordine.speseSpedizione)}\nTotale: ${formattaEuro(ordine.totale)}\n\n` +
      (ordine.tipo === "start_kit" ? "Il tuo account è attivo: da ora puoi ordinare con lo sconto del 40%.\n\n" : "") +
      `Segui l'ordine nell'app: ${indirizzoApp()}/area/ordini/${ordine.id}\n\nG LUXE`,
  };
}

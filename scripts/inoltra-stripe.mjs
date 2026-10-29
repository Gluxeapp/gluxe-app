// Solo per il computer di sviluppo: fa arrivare all'app locale gli eventi di Stripe (modalità di prova),
// come farebbe il webhook vero. Legge gli eventi nuovi da Stripe, li firma con STRIPE_WEBHOOK_SECRET
// e li manda a http://localhost:3000/api/stripe/webhook. Si ferma con Ctrl+C.
// Uso: npm run stripe:inoltra
import Stripe from "stripe";

const chiave = process.env.STRIPE_SECRET_KEY ?? "";
if (!chiave.startsWith("sk_test_")) {
  console.error("Serve una chiave di prova (sk_test_…) in STRIPE_SECRET_KEY.");
  process.exit(1);
}
const stripe = new Stripe(chiave);
const segreto = process.env.STRIPE_WEBHOOK_SECRET;
const destinazione = "http://localhost:3000/api/stripe/webhook";
const tipi = [
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
  "checkout.session.expired",
  "charge.refunded",
];

let dal = Math.floor(Date.now() / 1000) - 60;
const visti = new Set();
console.log(`Inoltro degli eventi Stripe a ${destinazione}…`);
for (;;) {
  try {
    const { data } = await stripe.events.list({ created: { gte: dal }, types: tipi, limit: 100 });
    for (const evento of data.reverse()) {
      if (visti.has(evento.id)) continue;
      const corpo = JSON.stringify(evento);
      const firma = stripe.webhooks.generateTestHeaderString({ payload: corpo, secret: segreto });
      const r = await fetch(destinazione, { method: "POST", body: corpo, headers: { "stripe-signature": firma, "content-type": "application/json" } });
      console.log(`${evento.type} ${evento.id} → ${r.status}`);
      if (r.ok) visti.add(evento.id);
      dal = Math.max(dal, evento.created - 5);
    }
  } catch (e) {
    console.error(`Errore: ${e.message}`);
  }
  await new Promise((fatto) => setTimeout(fatto, 2000));
}

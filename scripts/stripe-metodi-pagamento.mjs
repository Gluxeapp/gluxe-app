// Crea (o aggiorna) su Stripe la configurazione dei metodi di pagamento usata dagli ordini G LUXE:
// solo carta (con Apple Pay e Google Pay, che sono pagamenti con carta), Klarna e PayPal.
// La configurazione predefinita dell'account Stripe non viene toccata.
// Uso: npm run stripe:metodi            (chiavi di prova di .env.local)
// Poi mettere il codice pmc_… stampato in STRIPE_CONFIGURAZIONE_PAGAMENTI.
import Stripe from "stripe";

const NOME = "G LUXE ordini";
const AMMESSI = new Set(["card", "apple_pay", "google_pay", "klarna", "paypal"]);

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const { data } = await stripe.paymentMethodConfigurations.list({ limit: 100 });
const predefinita = data.find((c) => c.is_default);
const metodi = Object.keys(predefinita).filter((k) => predefinita[k] && typeof predefinita[k] === "object" && "display_preference" in predefinita[k]);
const impostazioni = Object.fromEntries(
  metodi.map((m) => [m, { display_preference: { preference: AMMESSI.has(m) ? "on" : "off" } }]),
);

const esistente = data.find((c) => c.name === NOME && c.active);
const configurazione = esistente
  ? await stripe.paymentMethodConfigurations.update(esistente.id, impostazioni)
  : await stripe.paymentMethodConfigurations.create({ name: NOME, ...impostazioni });

const stato = [...AMMESSI].map((m) => `${m}: ${configurazione[m]?.display_preference?.value} (disponibile: ${configurazione[m]?.available})`);
console.log(`${esistente ? "Aggiornata" : "Creata"} la configurazione "${NOME}": ${configurazione.id}`);
console.log(stato.join("\n"));

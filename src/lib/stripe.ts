import "server-only";
import Stripe from "stripe";

/**
 * Collegamento a Stripe con la chiave segreta del server (STRIPE_SECRET_KEY).
 * Anteprime e computer di sviluppo usano le chiavi di prova (sk_test_…), il sito vero quelle vere.
 */
let istanza: Stripe | undefined;

export function stripe(): Stripe {
  const chiave = process.env.STRIPE_SECRET_KEY;
  if (!chiave) throw new Error("Pagamenti non configurati: manca STRIPE_SECRET_KEY");
  istanza ??= new Stripe(chiave, { appInfo: { name: "G LUXE app" } });
  return istanza;
}

/** Segreto per verificare che i webhook arrivino davvero da Stripe (STRIPE_WEBHOOK_SECRET). */
export function segretoWebhook(): string {
  const segreto = process.env.STRIPE_WEBHOOK_SECRET;
  if (!segreto) throw new Error("Webhook Stripe non configurato: manca STRIPE_WEBHOOK_SECRET");
  return segreto;
}

/**
 * Configurazione dei metodi di pagamento offerti negli ordini (solo carta, Klarna e PayPal),
 * creata con `npm run stripe:metodi` (STRIPE_CONFIGURAZIONE_PAGAMENTI, codice pmc_…).
 */
export function configurazionePagamenti(): string {
  const id = process.env.STRIPE_CONFIGURAZIONE_PAGAMENTI;
  if (!id) throw new Error("Pagamenti non configurati: manca STRIPE_CONFIGURAZIONE_PAGAMENTI");
  return id;
}

/** Vero quando i pagamenti sono configurati. Finché mancano le chiavi, l'app avvisa invece di mostrare un errore. */
export function pagamentiAttivi(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_CONFIGURAZIONE_PAGAMENTI);
}

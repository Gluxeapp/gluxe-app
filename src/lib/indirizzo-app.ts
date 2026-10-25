import "server-only";

/**
 * Indirizzo pubblico dell'app, usato nei link delle email e nei ritorni da Stripe.
 * Non si ricava dalla richiesta (l'intestazione "Host" può essere falsificata):
 * su Vercel arriva da VERCEL_PROJECT_PRODUCTION_URL (sito vero) o VERCEL_BRANCH_URL (anteprime),
 * altrimenti da APP_URL.
 */
export function indirizzoApp(): string {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  if (process.env.VERCEL_ENV === "preview" && process.env.VERCEL_BRANCH_URL) return `https://${process.env.VERCEL_BRANCH_URL}`;
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  return "http://localhost:3000";
}

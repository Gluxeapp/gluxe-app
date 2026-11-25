/**
 * Controllo dei clienti fittizi (docs/piano-compensi.md, sezione 10, decisione 29). Modulo puro:
 * confronta i dati di un cliente con quelli dell'incaricata a cui è legato. Solo segnalazioni per la sede.
 */

export type Indirizzo = { indirizzo: string; cap: string };

export type Impronte = {
  email: string;
  /** Codice fiscale (decisione 36); vuoto per i clienti nati prima. */
  codiceFiscale?: string | null;
  telefoni: string[];
  /** Indirizzi di consegna (per l'incaricata anche quello del profilo). */
  indirizzi: Indirizzo[];
  /** Impronte dei metodi di pagamento date da Stripe. */
  metodi: string[];
};

export type Motivo = "codice_fiscale" | "indirizzo" | "pagamento" | "email" | "telefono";

export const ETICHETTE_MOTIVO: Record<Motivo, string> = {
  codice_fiscale: "stesso codice fiscale dell'incaricata",
  indirizzo: "stesso indirizzo di consegna",
  pagamento: "stesso metodo di pagamento",
  email: "stessa email",
  telefono: "stesso telefono",
};

/** Solo cifre, senza prefisso internazionale italiano (+39 o 0039). */
export function normalizzaTelefono(t: string): string {
  const cifre = t.replace(/\D/g, "");
  if (cifre.startsWith("0039")) return cifre.slice(4);
  if (cifre.startsWith("39") && cifre.length > 10) return cifre.slice(2);
  return cifre;
}

/** Via e CAP in maiuscolo, senza accenti e punteggiatura, spazi singoli; lettere e numeri separati. */
export function normalizzaIndirizzo({ indirizzo, cap }: Indirizzo): string {
  const via = indirizzo
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, " ")
    .replace(/([A-Z])(\d)/g, "$1 $2")
    .replace(/(\d)([A-Z])/g, "$1 $2")
    .replace(/\s+/g, " ")
    .trim();
  return `${via}|${cap.trim()}`;
}

const comune = (a: string[], b: string[]) => {
  const insieme = new Set(b.filter(Boolean));
  return a.some((x) => x && insieme.has(x));
};

export function segnalazioniCliente(cliente: Impronte, incaricata: Impronte): Motivo[] {
  const motivi: Motivo[] = [];
  // Il cliente è l'incaricata stessa (decisione 36): il segnale più forte.
  if (cliente.codiceFiscale && incaricata.codiceFiscale && cliente.codiceFiscale.toUpperCase() === incaricata.codiceFiscale.toUpperCase()) {
    motivi.push("codice_fiscale");
  }
  if (comune(cliente.indirizzi.map(normalizzaIndirizzo), incaricata.indirizzi.map(normalizzaIndirizzo))) motivi.push("indirizzo");
  if (comune(cliente.metodi, incaricata.metodi)) motivi.push("pagamento");
  if (cliente.email.trim().toLowerCase() === incaricata.email.trim().toLowerCase()) motivi.push("email");
  if (comune(cliente.telefoni.map(normalizzaTelefono), incaricata.telefoni.map(normalizzaTelefono))) motivi.push("telefono");
  return motivi;
}

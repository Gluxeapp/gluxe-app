/**
 * Controlli sui dati anagrafici. Usati sul server (sempre) e nel browser (solo per avvisare prima).
 */

const DISPARI: Record<string, number> = {
  "0": 1, "1": 0, "2": 5, "3": 7, "4": 9, "5": 13, "6": 15, "7": 17, "8": 19, "9": 21,
  A: 1, B: 0, C: 5, D: 7, E: 9, F: 13, G: 15, H: 17, I: 19, J: 21, K: 2, L: 4, M: 18,
  N: 20, O: 11, P: 3, Q: 6, R: 8, S: 12, T: 14, U: 16, V: 10, W: 22, X: 25, Y: 24, Z: 23,
};

function valorePari(c: string): number {
  return /\d/.test(c) ? Number(c) : c.charCodeAt(0) - 65;
}

/** Normalizza (maiuscolo, senza spazi) e verifica formato e carattere di controllo del codice fiscale. */
export function codiceFiscaleValido(valore: string): boolean {
  const cf = normalizzaCodiceFiscale(valore);
  if (!/^[A-Z]{6}[0-9LMNPQRSTUV]{2}[ABCDEHLMPRST][0-9LMNPQRSTUV]{2}[A-Z][0-9LMNPQRSTUV]{3}[A-Z]$/.test(cf)) {
    return false;
  }
  let somma = 0;
  for (let i = 0; i < 15; i++) {
    somma += i % 2 === 0 ? DISPARI[cf[i]] : valorePari(cf[i]);
  }
  return String.fromCharCode(65 + (somma % 26)) === cf[15];
}

export function normalizzaCodiceFiscale(valore: string): string {
  return valore.replace(/\s/g, "").toUpperCase();
}

/** Verifica un IBAN (qualsiasi paese SEPA) con il controllo modulo 97. */
export function ibanValido(valore: string): boolean {
  const iban = normalizzaIban(valore);
  if (!/^[A-Z]{2}\d{2}[A-Z0-9]{11,30}$/.test(iban)) return false;
  if (iban.startsWith("IT") && iban.length !== 27) return false;
  const riordinato = iban.slice(4) + iban.slice(0, 4);
  let resto = 0;
  for (const c of riordinato) {
    const cifre = /\d/.test(c) ? c : String(c.charCodeAt(0) - 55);
    for (const d of cifre) resto = (resto * 10 + Number(d)) % 97;
  }
  return resto === 1;
}

export function normalizzaIban(valore: string): string {
  return valore.replace(/\s/g, "").toUpperCase();
}

/** Partita IVA italiana: 11 cifre con cifra di controllo. */
export function partitaIvaValida(valore: string): boolean {
  const piva = valore.replace(/\s/g, "");
  if (!/^\d{11}$/.test(piva)) return false;
  let somma = 0;
  for (let i = 0; i < 10; i++) {
    let n = Number(piva[i]);
    if (i % 2 === 1) {
      n *= 2;
      if (n > 9) n -= 9;
    }
    somma += n;
  }
  return (10 - (somma % 10)) % 10 === Number(piva[10]);
}

export const CODICE_INCARICATO = /^GL\d{6}$/;

export function normalizzaCodiceIncaricato(valore: string): string {
  return valore.replace(/\s/g, "").toUpperCase();
}

export const PASSWORD_MINIMA = 10;

/** Regole della password: almeno 10 caratteri, con almeno una lettera e un numero. */
export function problemaPassword(password: string): string | null {
  if (password.length < PASSWORD_MINIMA) return `La password deve avere almeno ${PASSWORD_MINIMA} caratteri.`;
  if (!/[A-Za-zÀ-ÿ]/.test(password) || !/\d/.test(password)) {
    return "La password deve contenere almeno una lettera e un numero.";
  }
  return null;
}

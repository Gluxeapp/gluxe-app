import "server-only";
import { createHash, randomBytes, randomInt, timingSafeEqual } from "node:crypto";
import { hash, verify } from "@node-rs/argon2";

/** Codice casuale lungo, da mettere in un cookie o in un link. */
export function generaToken(): string {
  return randomBytes(32).toString("base64url");
}

/** Impronta (hash SHA-256) di un token: nel database salviamo solo questa, mai il token. */
export function impronta(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Codice numerico di 6 cifre per la verifica in due passaggi. */
export function generaCodiceSeiCifre(): string {
  return String(randomInt(0, 1_000_000)).padStart(6, "0");
}

export function improntaUguale(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

/** Password → hash argon2id (CLAUDE.md, regola 14). */
export function cifraPassword(password: string): Promise<string> {
  return hash(password);
}

export async function passwordCorretta(passwordHash: string | null, password: string): Promise<boolean> {
  if (!passwordHash) return false;
  try {
    return await verify(passwordHash, password);
  } catch {
    return false;
  }
}

/** Hash finto usato quando l'utente non esiste, così la risposta impiega lo stesso tempo. */
const HASH_FINTO = hash("password-finta-per-tempi-uguali");
export async function attesaUguale(password: string): Promise<void> {
  await verify(await HASH_FINTO, password).catch(() => false);
}

// Codici fiscali finti ma validi (formato e carattere di controllo), diversi a ogni lancio: per le prove sul database.
import { randomInt } from "node:crypto";
import { codiceFiscaleValido } from "@/lib/validazioni";

const LETTERE = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
const lettera = () => LETTERE[randomInt(26)];
const cifre = (n: number) => Array.from({ length: n }, () => String(randomInt(10))).join("");

export function codiceFiscaleCasuale(): string {
  const base = `${Array.from({ length: 6 }, lettera).join("")}${cifre(2)}${"ABCDEHLMPRST"[randomInt(12)]}${cifre(2)}${lettera()}${cifre(3)}`;
  const controllo = [...LETTERE].find((c) => codiceFiscaleValido(base + c));
  return base + controllo;
}

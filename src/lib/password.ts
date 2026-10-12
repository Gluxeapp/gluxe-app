import "server-only";
import { creaCodice } from "./codici-verifica";
import { inviaEmail } from "./email";
import { indirizzoApp } from "./indirizzo-app";

/**
 * Email con il link per impostare o reimpostare la password.
 * Sta qui e non tra le azioni ("use server") perché non deve essere chiamabile dal browser.
 */
export async function inviaLinkPassword(utente: { id: string; email: string; nome: string }, motivo: "recupero" | "nuovo") {
  const token = await creaCodice(utente.id, "recupero_password");
  const link = `${indirizzoApp()}/reimposta-password?token=${token}`;
  await inviaEmail({
    a: utente.email,
    oggetto: motivo === "nuovo" ? "G LUXE: imposta la tua password" : "G LUXE: reimposta la tua password",
    testo:
      `Ciao ${utente.nome},\n\n` +
      (motivo === "nuovo"
        ? "è stato creato il tuo account G LUXE. Scegli la tua password da questo link:\n"
        : "abbiamo ricevuto una richiesta per reimpostare la tua password. Sceglila da questo link:\n") +
      `${link}\n\nIl link vale un'ora e si può usare una sola volta. Se non hai chiesto nulla, ignora questa email.`,
  });
}

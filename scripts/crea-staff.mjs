// Crea un account di amministrazione o contabilità e invia il link per scegliere la password.
// Uso: npm run crea-staff -- email@azienda.it "Nome Cognome" amministrazione|contabilita
import { createHash, randomBytes } from "node:crypto";
import postgres from "postgres";

const [email, nome, ruolo = "amministrazione"] = process.argv.slice(2);
if (!email || !nome || !["amministrazione", "contabilita"].includes(ruolo)) {
  console.error('Uso: npm run crea-staff -- email@azienda.it "Nome Cognome" amministrazione|contabilita');
  process.exit(1);
}

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1, onnotice: () => {} });
try {
  const [utente] = await sql`
    insert into app.utenti (ruolo, email, nome) values (${ruolo}, ${email.trim().toLowerCase()}, ${nome})
    returning id`;
  const token = randomBytes(32).toString("base64url");
  const impronta = createHash("sha256").update(token).digest("hex");
  await sql`
    insert into app.codici_verifica (utente_id, scopo, impronta, scade_il)
    values (${utente.id}, 'recupero_password', ${impronta}, now() + interval '24 hours')`;
  await sql`
    insert into app.registro_modifiche (utente_id, azione, entita, entita_id, dopo)
    values (${utente.id}, 'staff.creato', 'utente', ${utente.id}, ${sql.json({ email, nome, ruolo })})`;

  // Il database è lo stesso per il computer e per il sito online: il link porta al sito online.
  const base = (process.env.APP_URL ?? "https://gluxe-app.vercel.app").replace(/\/$/, "");
  const link = `${base}/reimposta-password?token=${token}`;
  if (process.env.RESEND_API_KEY) {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${process.env.RESEND_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: process.env.EMAIL_MITTENTE ?? "G LUXE <onboarding@resend.dev>",
        to: [email],
        subject: "G LUXE: imposta la tua password",
        text: `Ciao ${nome},\n\nè stato creato il tuo account staff G LUXE. Scegli la password da questo link (vale 24 ore):\n${link}`,
      }),
    });
    console.log(r.ok ? `Account creato. Email inviata a ${email}.` : `Account creato, ma email non inviata (${r.status}).`);
    if (!r.ok) console.log(`Apri questo link per scegliere la password (vale 24 ore):\n${link}`);
  } else {
    console.log(`Account creato. Apri questo link per scegliere la password (vale 24 ore):\n${link}`);
  }
} catch (e) {
  console.error(e.code === "23505" ? "Esiste già un account staff con questa email." : e.message);
  process.exitCode = 1;
} finally {
  await sql.end();
}

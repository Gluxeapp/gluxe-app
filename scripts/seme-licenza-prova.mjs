// Incaricata FINTA con la licenza già scaduta (rinnovabile fino alla fine di questo mese), per provare il rinnovo.
// Solo database di PROVA. La password la genera lo script, la salva in .env.local (PROVA_LICENZA_CODICE e
// PROVA_LICENZA_PASSWORD) e la copia negli appunti: non viene mai stampata. Si può rilanciare.
// Uso: npm run db:seme-licenza-prova
import { execSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { appendFileSync, readFileSync, writeFileSync } from "node:fs";
import { hash } from "@node-rs/argon2";
import postgres from "postgres";

if (!process.env.DATABASE_URL || process.env.DATABASE_URL === process.env.DATABASE_URL_PRODUZIONE) {
  console.error("Serve il database di prova in DATABASE_URL.");
  process.exit(1);
}
const EMAIL = "licenza.scaduta@gluxe.test";
const password = randomBytes(9).toString("base64url");
const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1, onnotice: () => {} });

try {
  const codice = await sql.begin(async (tx) => {
    const [sponsor] = await tx`select id from app.incaricati where codice = 'GL000002'`;
    let [i] = await tx`select i.id, i.codice, u.id as utente from app.incaricati i join app.utenti u on u.id = i.utente_id where lower(u.email) = ${EMAIL}`;
    if (!i) {
      const [u] = await tx`insert into app.utenti (ruolo, email, nome) values ('incaricato', ${EMAIL}, 'Scaduta Prova') returning id`;
      [i] = await tx`
        insert into app.incaricati (utente_id, codice, nome, cognome, codice_fiscale, data_nascita, indirizzo, cap, citta, provincia,
          telefono, iban, sponsor_id, start_kit_pagato, privacy_accettata_il)
        values (${u.id}, 'GL' || lpad(nextval('app.sequenza_codice_incaricato')::text, 6, '0'), 'Scaduta', 'Prova', 'SCDPRV85A41H501Z',
          '1985-01-01', 'Via delle Prove 5', '20100', 'Milano', 'MI', '3335555555', 'IT60X0542811101000000123456', ${sponsor.id}, true, now())
        returning id, codice, ${u.id}::uuid as utente`;
      await tx`insert into app.storico_sponsor (incaricato_id, sponsor_id, motivo) values (${i.id}, ${sponsor.id}, 'Incaricata finta per provare la licenza')`;
    }
    await tx`update app.utenti set password_hash = ${await hash(password)}, tentativi_falliti = 0, bloccato_fino = null where id = ${i.utente}`;

    // Licenza scaduta all'inizio di questo mese: start kit "pagato" 12 mesi fa (ordine annullato: non conta nei punti).
    const [{ attuale }] = await tx`select max(valida_fino)::text as attuale from app.licenze where incaricato_id = ${i.id}`;
    const [{ fine }] = await tx`select (date_trunc('month', now() at time zone 'Europe/Rome') - interval '1 day')::date::text as fine`;
    if (!attuale) {
      const [parametri] = await tx`select id from app.parametri_versioni order by valido_dal desc, id desc limit 1`;
      const [kit] = await tx`
        insert into app.ordini (incaricato_id, tipo, stato, parametri_versione_id, merce_iva_inclusa, merce_iva_esclusa, punti,
          provvigione_acquisto, spese_spedizione, totale, destinatario, indirizzo, cap, citta, provincia, telefono)
        values (${i.id}, 'start_kit', 'annullato', ${parametri.id}, 5990, 4910, 3300, 0, 690, 6680, 'Scaduta Prova', 'Via delle Prove 5',
          '20100', 'Milano', 'MI', '3335555555')
        returning id`;
      await tx`
        insert into app.licenze (incaricato_id, ordine_id, pagato_il, dal, valida_fino)
        values (${i.id}, ${kit.id}, (${fine}::date - interval '1 year' + interval '1 day')::date, (${fine}::date - interval '1 year' + interval '1 day')::date, ${fine}::date)`;
      console.log(`Licenza scaduta: valida fino al ${fine}.`);
    } else if (attuale > fine) {
      console.log(`Attenzione: la licenza di ${i.codice} è già stata rinnovata (valida fino al ${attuale}).`);
    }
    return i.codice;
  });

  // Credenziali in .env.local (mai in chat) e password negli appunti.
  const percorso = ".env.local";
  const righe = readFileSync(percorso, "utf8").split(/\r?\n/).filter((r) => !r.startsWith("PROVA_LICENZA_"));
  writeFileSync(percorso, righe.join("\n").replace(/\n*$/, "\n"));
  appendFileSync(percorso, `PROVA_LICENZA_CODICE=${codice}\nPROVA_LICENZA_PASSWORD=${password}\n`);
  try {
    execSync("clip", { input: password });
    console.log(`Incaricata ${codice} pronta: la password è negli appunti (e in .env.local).`);
  } catch {
    console.log(`Incaricata ${codice} pronta: la password è in .env.local (PROVA_LICENZA_PASSWORD).`);
  }
} finally {
  await sql.end();
}

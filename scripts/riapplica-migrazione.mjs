// Riapplica UNA migrazione annullata con db:annulla, anche se nel database ce ne sono di più recenti
// (db:aggiorna applica solo le migrazioni più nuove dell'ultima registrata, quindi la salterebbe).
// Solo database di PROVA. Uso: npm run db:riapplica -- 0006_fase6_chiusura_pagamenti
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import postgres from "postgres";

const nome = process.argv[2];
if (!nome) {
  console.error("Uso: npm run db:riapplica -- 0006_nome_migrazione");
  process.exit(1);
}
if (!process.env.DATABASE_URL || process.env.DATABASE_URL === process.env.DATABASE_URL_PRODUZIONE) {
  console.error("Serve il database di prova in DATABASE_URL.");
  process.exit(1);
}
const journal = JSON.parse(readFileSync("drizzle/meta/_journal.json", "utf8"));
const voce = journal.entries.find((e) => e.tag === nome);
if (!voce) {
  console.error(`Migrazione ${nome} non trovata in drizzle/meta/_journal.json`);
  process.exit(1);
}
const testo = readFileSync(`drizzle/${nome}.sql`, "utf8");
// Stessa impronta che usa drizzle per riconoscere le migrazioni applicate.
const hash = createHash("sha256").update(testo).digest("hex");

const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1, onnotice: () => {} });
try {
  const [gia] = await sql`select 1 from drizzle.__drizzle_migrations where created_at = ${voce.when}`;
  if (gia) {
    console.log(`Migrazione ${nome} già applicata.`);
  } else {
    await sql.begin(async (t) => {
      for (const istruzione of testo.split("--> statement-breakpoint")) {
        if (istruzione.trim()) await t.unsafe(istruzione);
      }
      await t`insert into drizzle.__drizzle_migrations (hash, created_at) values (${hash}, ${voce.when})`;
    });
    console.log(`Migrazione ${nome} riapplicata.`);
  }
} finally {
  await sql.end();
}

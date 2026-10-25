// Annulla una migrazione: esegue drizzle-annulla/<nome>.sql e la toglie dall'elenco di quelle applicate.
// Uso: npm run db:annulla -- 0001_fase2_catalogo [--produzione]
import { readFileSync } from "node:fs";
import postgres from "postgres";

const produzione = process.argv.includes("--produzione");
const nome = process.argv.slice(2).find((a) => a !== "--produzione");
if (!nome) {
  console.error("Uso: npm run db:annulla -- 0001_nome_migrazione [--produzione]");
  process.exit(1);
}
const journal = JSON.parse(readFileSync("drizzle/meta/_journal.json", "utf8"));
const voce = journal.entries.find((e) => e.tag === nome);
if (!voce) {
  console.error(`Migrazione ${nome} non trovata in drizzle/meta/_journal.json`);
  process.exit(1);
}
const annulla = readFileSync(`drizzle-annulla/${nome}.sql`, "utf8");

console.log(`Database: ${produzione ? "PRODUZIONE (vero)" : "prova"}`);
const sql = postgres(produzione ? process.env.DATABASE_URL_PRODUZIONE : process.env.DATABASE_URL, {
  prepare: false,
  max: 1,
  onnotice: () => {},
});
try {
  await sql.begin(async (t) => {
    await t.unsafe(annulla);
    await t`delete from drizzle.__drizzle_migrations where created_at = ${voce.when}`;
  });
  console.log(`Migrazione ${nome} annullata.`);
} finally {
  await sql.end();
}

// Applica al database le migrazioni della cartella drizzle/ non ancora applicate.
// Uso: npm run db:aggiorna  (legge DATABASE_URL da .env.local)
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";

// Senza opzioni usa il database di PROVA; con --produzione quello vero.
const produzione = process.argv.includes("--produzione");
const url = produzione ? process.env.DATABASE_URL_PRODUZIONE : process.env.DATABASE_URL;
console.log(`Database: ${produzione ? "PRODUZIONE (vero)" : "prova"}`);
if (!url) {
  console.error(`Manca ${produzione ? "DATABASE_URL_PRODUZIONE" : "DATABASE_URL"}: controlla il file .env.local`);
  process.exit(1);
}

const client = postgres(url, { prepare: false, max: 1, onnotice: () => {} });
try {
  await migrate(drizzle(client), { migrationsFolder: "drizzle" });
  console.log("Database aggiornato.");
} finally {
  await client.end();
}

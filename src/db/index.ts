import "server-only";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "./schema";

/**
 * Collegamento al database PostgreSQL (Supabase). Usabile solo dal server:
 * `server-only` blocca la compilazione se un componente del browser prova a importarlo.
 *
 * Si usa node-postgres (pg): manda ogni interrogazione in un unico messaggio. La libreria usata
 * prima (postgres.js) la mandava in due tempi e, dentro Next.js con più pagine aperte insieme,
 * il secondo tempo a volte non partiva: la connessione restava a metà e la pagina si bloccava su
 * "Caricamento…" (29/10/2026). Gli script in scripts/ usano ancora postgres.js, fuori da Next.js.
 */
let istanza: ReturnType<typeof crea> | undefined;

function crea(url: string) {
  // Pooler di Supabase in modalità sessione (porta 5432): ogni connessione occupa un posto sul
  // database, quindi poche per istanza e chiuse dopo 20 secondi di inattività.
  const client = new Pool({ connectionString: url, max: 5, idleTimeoutMillis: 20_000, connectionTimeoutMillis: 10_000 });
  return { client, db: drizzle(client, { schema }) };
}

/** Restituisce il database, oppure undefined se DATABASE_URL non è ancora configurato. */
export function database() {
  const url = process.env.DATABASE_URL;
  if (!url) return undefined;
  istanza ??= crea(url);
  return istanza;
}

/** Il database per le pagine e le azioni che non possono funzionare senza. */
export function db() {
  const collegamento = database();
  if (!collegamento) throw new Error("Database non configurato: manca DATABASE_URL");
  return collegamento.db;
}

export type Db = ReturnType<typeof db>;
/** Il database o una transazione in corso: entrambi permettono le stesse operazioni. */
export type Esecutore = Pick<Db, "insert" | "update" | "select" | "delete" | "execute">;

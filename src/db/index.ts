import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "./schema";
import postgres from "postgres";

/**
 * Collegamento al database PostgreSQL (Supabase). Usabile solo dal server:
 * `server-only` blocca la compilazione se un componente del browser prova a importarlo.
 */
let istanza: ReturnType<typeof crea> | undefined;

function crea(url: string) {
  // prepare: false è richiesto dal "transaction pooler" di Supabase (porta 6543).
  const client = postgres(url, { prepare: false, max: 5, onnotice: () => {} });
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

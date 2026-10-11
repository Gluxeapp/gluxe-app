import "server-only";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";

/**
 * Collegamento al database PostgreSQL (Supabase). Usabile solo dal server:
 * `server-only` blocca la compilazione se un componente del browser prova a importarlo.
 */
let istanza: ReturnType<typeof crea> | undefined;

function crea(url: string) {
  // prepare: false è richiesto dal "transaction pooler" di Supabase (porta 6543).
  const client = postgres(url, { prepare: false, max: 5 });
  return { client, db: drizzle(client) };
}

/** Restituisce il database, oppure undefined se DATABASE_URL non è ancora configurato. */
export function database() {
  const url = process.env.DATABASE_URL;
  if (!url) return undefined;
  istanza ??= crea(url);
  return istanza;
}

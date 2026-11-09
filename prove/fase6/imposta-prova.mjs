// Regimi fiscali e dati d'azienda FINTI per le prove della Fase 6. Solo database di prova.
import postgres from "postgres";
if (!process.env.DATABASE_URL || process.env.DATABASE_URL === process.env.DATABASE_URL_PRODUZIONE) {
  console.error("Serve il database di prova in DATABASE_URL.");
  process.exit(1);
}
const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1, onnotice: () => {} });
await sql`update app.incaricati set regime_fiscale = 'piva_forfettaria' where partita_iva = '09876543217'`;
await sql`update app.dati_azienda set ragione_sociale = 'G LUXE S.r.l. (DATI DI PROVA)', indirizzo = 'Via delle Prove 10', cap = '20100',
  citta = 'Milano', provincia = 'MI', codice_fiscale = '12345678903', partita_iva = '12345678903',
  iban = 'IT42X0306909606100000063127', cuc = 'PROVA001',
  autorizzazione_bollo = 'Autorizzazione Agenzia delle Entrate (DI PROVA) n. 0 del 01/01/2026' where id = 1`;
await sql.end();

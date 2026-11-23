// Porta il prezzo dello start kit a 69,90 € (decisione 34), con una riga nel registro modifiche.
// Uso: node --env-file=.env.local scripts/prezzo-start-kit.mjs [--produzione]
import postgres from "postgres";

const produzione = process.argv.includes("--produzione");
const url = produzione ? process.env.DATABASE_URL_PRODUZIONE : process.env.DATABASE_URL;
if (!url) { console.error("Indirizzo del database mancante."); process.exit(1); }
const NUOVO = 6990n;
const sql = postgres(url, { prepare: false, max: 1, onnotice: () => {} });
try {
  await sql.begin(async (tx) => {
    const [kit] = await tx`select id, prezzo_listino from app.prodotti where tipo = 'start_kit' for update`;
    if (!kit) throw new Error("Start kit non trovato");
    if (BigInt(kit.prezzo_listino) === NUOVO) { console.log("Già a 69,90 €: nessuna modifica."); return; }
    await tx`update app.prodotti set prezzo_listino = ${NUOVO.toString()} where id = ${kit.id}`;
    await tx`insert into app.registro_modifiche (azione, entita, entita_id, prima, dopo)
      values ('prodotto.modificato', 'prodotto', ${kit.id}, ${tx.json({ prezzoListino: String(kit.prezzo_listino) })},
        ${tx.json({ prezzoListino: NUOVO.toString(), motivo: "Decisione 34: start kit a 69,90 €, punti invariati" })})`;
    console.log(`Start kit: ${Number(kit.prezzo_listino) / 100} € → 69,90 € (${produzione ? "database vero" : "database di prova"}).`);
  });
} finally {
  await sql.end();
}

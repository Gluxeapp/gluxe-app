// Carica i dati iniziali della Fase 2: parametri del piano (rev. 5) e prodotti di esempio.
// Si può rilanciare: non duplica nulla (salta ciò che esiste già).
// Uso: npm run db:seme-catalogo [-- --produzione]
import { readFileSync } from "node:fs";
import postgres from "postgres";
import { PARAMETRI_INIZIALI, parametriInJson } from "../src/lib/parametri.ts";

const produzione = process.argv.includes("--produzione");
console.log(`Database: ${produzione ? "PRODUZIONE (vero)" : "prova"}`);
const sql = postgres((produzione ? process.env.DATABASE_URL_PRODUZIONE : process.env.DATABASE_URL) as string, {
  prepare: false,
  max: 1,
  onnotice: () => {},
});

const prodotti = [
  { codice: "HB-SH", nome: "Shampoo Hair Botox", linea: "Hair Botox", prezzo: 3290, foto: "shampoo-hair-botox.png", ordine: 10 },
  { codice: "HB-MA", nome: "Mask Hair Botox", linea: "Hair Botox", prezzo: 3290, foto: "mask-hair-botox.png", ordine: 20 },
  { codice: "HB-FS", nome: "Final Spray Hair Botox", linea: "Hair Botox", prezzo: 3990, foto: "final-spray-hair-botox.png", ordine: 30 },
  { codice: "DX-SH", nome: "Shampoo Detox", linea: "Detox", prezzo: 3290, foto: "shampoo-detox.png", ordine: 40 },
];

try {
  const [{ n }] = await sql`select count(*)::int as n from app.parametri_versioni`;
  if (n === 0) {
    await sql`insert into app.parametri_versioni (valido_dal, valori, note)
      values ('2026-01-01', ${sql.json(parametriInJson(PARAMETRI_INIZIALI) as never)}, 'Piano Compensi G LUXE rev. 5: valori iniziali')`;
    console.log("Parametri del piano: versione iniziale creata.");
  } else {
    console.log("Parametri del piano: già presenti.");
  }

  for (const p of prodotti) {
    const [esiste] = await sql`select id from app.prodotti where codice = ${p.codice}`;
    if (esiste) continue;
    const dati = readFileSync(`assets/esempi-prodotti/${p.foto}`).toString("base64");
    const [img] = await sql`insert into app.immagini (tipo, dati) values ('image/png', ${dati}) returning id`;
    await sql`insert into app.prodotti (codice, nome, linea, descrizione, prezzo_listino, immagine_id, ordine)
      values (${p.codice}, ${p.nome}, ${p.linea}, 'Descrizione in arrivo.', ${p.prezzo}, ${img.id}, ${p.ordine})`;
    console.log(`Prodotto creato: ${p.nome}`);
  }

  const [kit] = await sql`select id from app.prodotti where tipo = 'start_kit'`;
  if (!kit) {
    await sql`insert into app.prodotti (codice, nome, descrizione, tipo, prezzo_listino, ordine)
      values ('KIT', 'Start kit', 'Shampoo, spray 12in1, licenza account incaricata, borsa campionario e materiale formativo.', 'start_kit', 5990, 0)`;
    console.log("Prodotto creato: Start kit");
  }
} finally {
  await sql.end();
}

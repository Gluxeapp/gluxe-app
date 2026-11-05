// Controlla che nel codice non finiscano chiavi o password (piano compensi, sezione 11: "Segreti").
// Uso:  npm run controlla:segreti            → tutti i file del progetto (anche prima di ogni build su Vercel)
//       node scripts/controlla-segreti.mjs --staged  → solo i file pronti per il commit (lo usa il controllo pre-commit)
// Se trova qualcosa si ferma con errore e dice file e riga, senza stampare il segreto.
import { execSync } from "node:child_process";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const SEGRETI = [
  ["chiave segreta Stripe", /\b(sk|rk)_(live|test)_[0-9A-Za-z]{16,}/],
  ["segreto webhook Stripe", /\bwhsec_[0-9A-Za-z]{16,}/],
  ["chiave Resend", /\bre_[0-9A-Za-z]{6,}_[0-9A-Za-z]{12,}/],
  ["chiave segreta Supabase", /\bsb_secret_[0-9A-Za-z_-]{16,}/],
  ["token JWT (per esempio service_role di Supabase)", /\beyJ[0-9A-Za-z_-]{10,}\.eyJ[0-9A-Za-z_-]{10,}\.[0-9A-Za-z_-]{10,}/],
  ["indirizzo di database con password", /postgres(?:ql)?:\/\/[^:\s"'`/]+:(?![^@\s]*(?:PASSWORD|[Pp]assword|\$\{|\[|<))[^@\s"'`]{6,}@/],
  ["chiave privata", /-----BEGIN [A-Z ]*PRIVATE KEY-----/],
  ["token Vercel", /\bvercel_[0-9A-Za-z]{20,}/],
];

const ESCLUSE = ["node_modules", ".next", ".git", ".vercel", "coverage"];
const BINARI = /\.(png|jpe?g|gif|webp|ico|svg|pdf|woff2?|ttf|otf|mp4|zip)$/i;
const soloPronti = process.argv.includes("--staged");

function fileDelProgetto() {
  if (soloPronti) {
    return execSync("git diff --cached --name-only --diff-filter=ACMR", { encoding: "utf8" }).split("\n").filter(Boolean);
  }
  if (existsSync(".git")) {
    // File tracciati e nuovi non ignorati.
    return execSync("git ls-files --cached --others --exclude-standard", { encoding: "utf8" }).split("\n").filter(Boolean);
  }
  // Su Vercel la cartella .git non c'è: si guardano tutti i file.
  const elenco = [];
  const visita = (cartella) => {
    for (const nome of readdirSync(cartella)) {
      if (ESCLUSE.includes(nome)) continue;
      const percorso = join(cartella, nome);
      if (statSync(percorso).isDirectory()) visita(percorso);
      else elenco.push(relative(".", percorso).replace(/\\/g, "/"));
    }
  };
  visita(".");
  return elenco;
}

const problemi = [];
for (const file of fileDelProgetto()) {
  if (BINARI.test(file) || !existsSync(file)) continue;
  const nome = file.split("/").at(-1);
  // I file .env con i valori veri non devono mai entrare nel codice (solo .env.example, con valori finti).
  if (/^\.env(\..+)?$/.test(nome) && nome !== ".env.example") {
    if (!existsSync(".git") || soloPronti || execSync(`git ls-files -- "${file}"`, { encoding: "utf8" }).trim()) {
      problemi.push(`${file}: file di configurazione con i segreti (va lasciato solo sul computer e su Vercel)`);
    }
    continue;
  }
  let testo;
  try {
    testo = soloPronti ? execSync(`git show ":${file}"`, { encoding: "utf8", maxBuffer: 20e6 }) : readFileSync(file, "utf8");
  } catch {
    continue;
  }
  testo.split("\n").forEach((riga, i) => {
    for (const [tipo, schema] of SEGRETI) if (schema.test(riga)) problemi.push(`${file}:${i + 1}: possibile ${tipo}`);
  });
}

if (problemi.length > 0) {
  console.error("Possibili segreti nel codice: tolti prima di continuare (vanno nelle variabili d'ambiente).\n");
  for (const p of problemi) console.error(`  ${p}`);
  process.exit(1);
}
console.log("Nessun segreto trovato nel codice.");

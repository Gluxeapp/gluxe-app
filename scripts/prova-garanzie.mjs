// Verifica le garanzie contro doppi conteggi e modifiche (docs/garanzie-calcolo.md). Solo database di PROVA.
// 1) Il database rifiuta modifiche agli ordini fotografati, agli storici e un secondo pagamento.
// 2) Venti conferme di pagamento contemporanee per lo stesso ordine lo segnano pagato una volta sola.
// Uso: avviare l'app (npm run dev oppure next start) e poi: npm run prova:garanzie [-- http://localhost:3000]
import { randomUUID } from "node:crypto";
import postgres from "postgres";
import Stripe from "stripe";

const base = process.argv[2] ?? "http://localhost:3000";
const segreto = process.env.STRIPE_WEBHOOK_SECRET;
if (!process.env.DATABASE_URL || process.env.DATABASE_URL === process.env.DATABASE_URL_PRODUZIONE) {
  console.error("Serve il database di prova in DATABASE_URL.");
  process.exit(1);
}
const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 3, onnotice: () => {} });
const stripe = new Stripe("sk_test_solo_per_firmare");
let errori = 0;
const esito = (ok, testo) => {
  console.log(`${ok ? "OK " : "ERRORE"}  ${testo}`);
  if (!ok) errori++;
};

/**
 * Esegue un tentativo vietato dentro una transazione annullata: deve essere rifiutato dalle nostre
 * protezioni (blocchi e controlli: codice 23514; doppioni: 23505), non da un errore qualsiasi.
 */
async function deveFallire(descrizione, prova) {
  try {
    await sql.begin(async (tx) => {
      await prova(tx);
      throw new Error("ACCETTATO");
    });
  } catch (e) {
    const protetto = e.code === "23514" || e.code === "23505";
    esito(protetto, `rifiutato: ${descrizione}${protetto ? "" : ` (motivo inatteso: ${e.message})`}`);
  }
}

try {
  // Ordine finto di prova, creato come lo crea l'app.
  const [incaricata] = await sql`select id from app.incaricati where start_kit_pagato order by codice limit 1`;
  const [parametri] = await sql`select id from app.parametri_versioni order by id desc limit 1`;
  const [prodotto] = await sql`select id, codice, nome from app.prodotti where tipo = 'prodotto' limit 1`;
  const [ordine] = await sql`
    insert into app.ordini (incaricato_id, tipo, parametri_versione_id, merce_iva_inclusa, merce_iva_esclusa, punti,
      provvigione_acquisto, spese_spedizione, totale, destinatario, indirizzo, cap, citta, provincia, telefono)
    values (${incaricata.id}, 'personale', ${parametri.id}, 1974, 1618, 1294, 0, 690, 2664,
      'Prova Garanzie', 'Via Prova 1', '20100', 'Milano', 'MI', '3330000000')
    returning id, numero`;
  await sql`
    insert into app.righe_ordine (ordine_id, prodotto_id, codice, nome, tipo_prezzo, quantita, prezzo_unitario_ivato,
      prezzo_unitario_iva_esclusa, punti_unitari, provvigione_unitaria, totale_ivato, totale_iva_esclusa, totale_punti, totale_provvigione)
    values (${ordine.id}, ${prodotto.id}, ${prodotto.codice}, ${prodotto.nome}, 'listino_scontato', 1, 1974, 1618, 1294, 0, 1974, 1618, 1294, 0)`;
  await sql`insert into app.storico_stati_ordine (ordine_id, stato) values (${ordine.id}, 'inserito')`;
  console.log(`Ordine di prova n. ${ordine.numero}`);

  // 1) Protezioni del database
  await deveFallire("cambiare il totale di un ordine", (tx) => tx`update app.ordini set totale = 1 where id = ${ordine.id}`);
  await deveFallire("cambiare i punti di un ordine", (tx) => tx`update app.ordini set punti = punti * 2 where id = ${ordine.id}`);
  await deveFallire("cambiare l'incaricata di un ordine", (tx) => tx`update app.ordini set incaricato_id = (select id from app.incaricati where id <> ${incaricata.id} limit 1) where id = ${ordine.id}`);
  await deveFallire("cancellare un ordine", (tx) => tx`delete from app.ordini where id = ${ordine.id}`);
  await deveFallire("modificare una riga d'ordine", (tx) => tx`update app.righe_ordine set quantita = 2 where ordine_id = ${ordine.id}`);
  await deveFallire("cancellare una riga d'ordine", (tx) => tx`delete from app.righe_ordine where ordine_id = ${ordine.id}`);
  await deveFallire("riga con totale incoerente", (tx) => tx`
    insert into app.righe_ordine (ordine_id, prodotto_id, codice, nome, tipo_prezzo, quantita, prezzo_unitario_ivato,
      prezzo_unitario_iva_esclusa, punti_unitari, provvigione_unitaria, totale_ivato, totale_iva_esclusa, totale_punti, totale_provvigione)
    values (${ordine.id}, ${prodotto.id}, 'X', 'X', 'listino_scontato', 2, 100, 82, 66, 0, 100, 82, 66, 0)`);
  await deveFallire("modificare lo storico degli stati", (tx) => tx`update app.storico_stati_ordine set stato = 'pagato' where ordine_id = ${ordine.id}`);
  await deveFallire("modificare il registro modifiche", (tx) => tx`update app.registro_modifiche set azione = 'x' where id = (select max(id) from app.registro_modifiche)`);

  // 2) Conferme di pagamento contemporanee: 10 copie di due eventi diversi per lo stesso ordine.
  if (!segreto) throw new Error("Manca STRIPE_WEBHOOK_SECRET");
  const sessione = `cs_test_prova_${randomUUID()}`;
  const evento = (id, type) => ({
    id,
    object: "event",
    type,
    created: Math.floor(Date.now() / 1000),
    data: {
      object: {
        id: sessione,
        object: "checkout.session",
        payment_status: "paid",
        amount_total: 2664,
        currency: "eur",
        metadata: { ordineId: ordine.id },
        payment_intent: `pi_prova_${randomUUID()}`,
      },
    },
  });
  const eventi = [evento(`evt_prova_${randomUUID()}`, "checkout.session.completed"), evento(`evt_prova_${randomUUID()}`, "checkout.session.async_payment_succeeded")];
  const invii = Array.from({ length: 20 }, (_, i) => {
    const corpo = JSON.stringify(eventi[i % 2]);
    const firma = stripe.webhooks.generateTestHeaderString({ payload: corpo, secret: segreto });
    return fetch(`${base}/api/stripe/webhook`, { method: "POST", body: corpo, headers: { "stripe-signature": firma } }).then((r) => r.status);
  });
  const stati = await Promise.all(invii);
  esito(stati.every((s) => s === 200), `20 conferme contemporanee ricevute (risposte: ${[...new Set(stati)].join(", ")})`);

  const [{ pagati }] = await sql`select count(*)::int pagati from app.storico_stati_ordine where ordine_id = ${ordine.id} and stato = 'pagato'`;
  const [{ registrati }] = await sql`select count(*)::int registrati from app.eventi_stripe where id in ${sql(eventi.map((e) => e.id))}`;
  const [{ pagato_il, stripe_pagamento_id }] = await sql`select pagato_il, stripe_pagamento_id from app.ordini where id = ${ordine.id}`;
  esito(pagati === 1, `ordine segnato "pagato" una sola volta (${pagati})`);
  esito(registrati === 2, `ogni evento registrato una sola volta (${registrati} su 2)`);
  esito(pagato_il !== null, "data di pagamento (mese di competenza) scritta");
  const [{ codice }] = await sql`select stripe_pagamento_id codice from app.ordini where id = ${ordine.id}`;
  esito(codice === stripe_pagamento_id, "codice del pagamento invariato");
  await deveFallire("cambiare la data di pagamento", (tx) => tx`update app.ordini set pagato_il = pagato_il + interval '40 days' where id = ${ordine.id}`);
  await deveFallire("pagare un secondo ordine con lo stesso pagamento Stripe", async (tx) => {
    const [altro] = await tx`select id from app.ordini where pagato_il is null and id <> ${ordine.id} limit 1`;
    if (!altro) throw new Error("nessun altro ordine da provare");
    await tx`update app.ordini set stripe_pagamento_id = ${stripe_pagamento_id} where id = ${altro.id}`;
  });

  // L'ordine di prova resta nel database di prova, annullato, così non si confonde con quelli veri.
  await sql`update app.ordini set stato = 'annullato' where id = ${ordine.id}`;
  await sql`insert into app.storico_stati_ordine (ordine_id, stato, nota) values (${ordine.id}, 'annullato', 'Ordine della prova automatica delle garanzie')`;
} finally {
  await sql.end();
}
console.log(errori === 0 ? "\nTutte le garanzie rispettate." : `\n${errori} garanzie NON rispettate.`);
process.exitCode = errori === 0 ? 0 : 1;

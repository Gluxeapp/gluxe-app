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
async function deveFallire(descrizione, prova, codici = ["23514", "23505"]) {
  try {
    await sql.begin(async (tx) => {
      await prova(tx);
      throw new Error("ACCETTATO");
    });
  } catch (e) {
    const protetto = codici.includes(e.code);
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

  // 1b) Rete e accessi (migrazione 0004)
  const [a, b] = await sql`select id from app.incaricati order by codice limit 2`;
  await deveFallire("cambiare lo sponsor senza l'intervento tracciato della sede", (tx) =>
    tx`update app.incaricati set sponsor_id = case when sponsor_id is null then ${a.id}::uuid else null end where id = ${b.id}`);
  await deveFallire("creare un ciclo nella rete, anche come sede", async (tx) => {
    await tx`select set_config('app.cambio_sponsor', 'tracciato', true)`;
    await tx`update app.incaricati set sponsor_id = ${b.id} where id = ${a.id}`;
    await tx`update app.incaricati set sponsor_id = ${a.id} where id = ${b.id}`;
  });
  const senzaProtezione = await sql`select tablename from pg_tables where schemaname = 'app' and not rowsecurity`;
  esito(senzaProtezione.length === 0, `Row Level Security attiva su tutte le tabelle${senzaProtezione.length ? ` (mancano: ${senzaProtezione.map((t) => t.tablename).join(", ")})` : ""}`);
  const vietato = ["42501"];
  await deveFallire("leggere i dati delle incaricate con le chiavi pubbliche di Supabase", async (tx) => {
    await tx`set local role anon`;
    await tx`select codice_fiscale, iban from app.incaricati limit 1`;
  }, vietato);
  await deveFallire("scrivere punti o ordini con le chiavi pubbliche di Supabase", async (tx) => {
    await tx`set local role authenticated`;
    await tx`update app.ordini set punti = 0`;
  }, vietato);
  await deveFallire("scrivere qualifiche bloccate con le chiavi pubbliche di Supabase", async (tx) => {
    await tx`set local role anon`;
    await tx`insert into app.qualifiche_bloccate (incaricato_id, percentuale, dal, motivo) values (${a.id}, 2000, current_date, 'x')`;
  }, vietato);
  await deveFallire("modificare una versione dei parametri del piano", (tx) => tx`update app.parametri_versioni set note = 'x' where id = ${parametri.id}`);
  await deveFallire("cancellare una versione dei parametri del piano", (tx) => tx`delete from app.parametri_versioni where id = ${parametri.id}`);
  await deveFallire("punti negativi scritti a mano su un prodotto", (tx) => tx`update app.prodotti set punti_online_manuali = -1 where id = ${prodotto.id}`);
  await deveFallire("qualifica bloccata oltre il 20%", (tx) => tx`insert into app.qualifiche_bloccate (incaricato_id, percentuale, dal, motivo) values (${a.id}, 2500, current_date, 'x')`);

  // 1c) Fase 6: chiusura, registro provvigioni, richieste, documenti, bonifici (tutto in transazioni annullate,
  // con un mese finto del 1999 che non esiste davvero).
  const mese = "1999-01";
  const chiudi = (tx, m = mese) =>
    tx`insert into app.mesi_chiusi (mese, parametri_versione_id, fotografia, punti_aziendali, incasso, totale_compensi)
       values (${m}, ${parametri.id}, '{}'::jsonb, 0, 0, 0)`;
  const richiesta = async (tx) => {
    await chiudi(tx);
    const [r] = await tx`insert into app.richieste_pagamento (incaricato_id, mese, lordo, data_pagamento)
      values (${a.id}, ${mese}, 10000, '1999-02-22') returning id`;
    return r;
  };
  const documento = (tx, r, numero = 1, totale = 8006) =>
    tx`insert into app.documenti_provvigioni (richiesta_id, incaricato_id, anno, numero, tipo, data, imponibile, iva, aliquota_iva,
         ritenuta, inps_base, inps_incaricata, inps_azienda, bollo, totale, incaricata, azienda, competenza, parametri_versione_id)
       values (${r.id}, ${a.id}, 1999, ${numero}, 'ricevuta', '1999-02-22', 10000, 0, 2200, 1794, 0, 0, 0, 200, ${totale},
         '{}'::jsonb, '{}'::jsonb, '01/1999', ${parametri.id})`;
  await deveFallire("chiudere due volte lo stesso mese", async (tx) => {
    await chiudi(tx);
    await chiudi(tx);
  });
  await deveFallire("modificare un mese chiuso", async (tx) => {
    await chiudi(tx);
    await tx`update app.mesi_chiusi set totale_compensi = 1 where mese = ${mese}`;
  });
  await deveFallire("cancellare un mese chiuso", async (tx) => {
    await chiudi(tx);
    await tx`delete from app.mesi_chiusi where mese = ${mese}`;
  });
  await deveFallire("contare lo stesso ordine in due mesi chiusi", async (tx) => {
    await chiudi(tx);
    await chiudi(tx, "1999-02");
    await tx`insert into app.ordini_chiusi (ordine_id, mese) values (${ordine.id}, ${mese})`;
    await tx`insert into app.ordini_chiusi (ordine_id, mese) values (${ordine.id}, '1999-02')`;
  });
  await deveFallire("scrivere due volte la stessa voce nel registro provvigioni", async (tx) => {
    await chiudi(tx);
    await tx`insert into app.movimenti (incaricato_id, tipo, mese, tipo_voce, importo) values (${a.id}, 'voce', ${mese}, 'online', 100)`;
    await tx`insert into app.movimenti (incaricato_id, tipo, mese, tipo_voce, importo) values (${a.id}, 'voce', ${mese}, 'online', 100)`;
  });
  await deveFallire("modificare una riga del registro provvigioni", async (tx) => {
    await chiudi(tx);
    await tx`insert into app.movimenti (incaricato_id, tipo, mese, tipo_voce, importo) values (${a.id}, 'voce', ${mese}, 'online', 100)`;
    await tx`update app.movimenti set importo = 99999 where mese = ${mese}`;
  });
  await deveFallire("cancellare una riga del registro provvigioni", async (tx) => {
    await chiudi(tx);
    await tx`insert into app.movimenti (incaricato_id, tipo, mese, tipo_voce, importo) values (${a.id}, 'voce', ${mese}, 'online', 100)`;
    await tx`delete from app.movimenti where mese = ${mese}`;
  });
  await deveFallire("voce negativa senza rettifica", async (tx) => {
    await chiudi(tx);
    await tx`insert into app.movimenti (incaricato_id, tipo, mese, tipo_voce, importo) values (${a.id}, 'voce', ${mese}, 'online', -100)`;
  });
  await deveFallire("due richieste di pagamento nello stesso mese", async (tx) => {
    await richiesta(tx);
    await tx`insert into app.richieste_pagamento (incaricato_id, mese, lordo, data_pagamento) values (${a.id}, ${mese}, 5000, '1999-02-22')`;
  });
  await deveFallire("addebitare due volte la stessa richiesta", async (tx) => {
    const r = await richiesta(tx);
    await tx`insert into app.movimenti (incaricato_id, tipo, mese, importo, richiesta_id) values (${a.id}, 'richiesta', ${mese}, -10000, ${r.id})`;
    await tx`insert into app.movimenti (incaricato_id, tipo, mese, importo, richiesta_id) values (${a.id}, 'richiesta', ${mese}, -10000, ${r.id})`;
  });
  await deveFallire("cambiare l'importo di una richiesta di pagamento", async (tx) => {
    const r = await richiesta(tx);
    await tx`update app.richieste_pagamento set lordo = 99999 where id = ${r.id}`;
  });
  await deveFallire("riportare indietro lo stato di una richiesta (pagata → richiesta)", async (tx) => {
    const r = await richiesta(tx);
    await tx`update app.richieste_pagamento set stato = 'approvata', decisa_il = now() where id = ${r.id}`;
    await tx`update app.richieste_pagamento set stato = 'pagata', pagata_il = now() where id = ${r.id}`;
    await tx`update app.richieste_pagamento set stato = 'richiesta' where id = ${r.id}`;
  });
  await deveFallire("cancellare una richiesta di pagamento", async (tx) => {
    const r = await richiesta(tx);
    await tx`delete from app.richieste_pagamento where id = ${r.id}`;
  });
  await deveFallire("due documenti con lo stesso numero nello stesso anno", async (tx) => {
    const r1 = await richiesta(tx);
    await documento(tx, r1);
    await tx`update app.richieste_pagamento set stato = 'rifiutata', decisa_il = now() where id = ${r1.id}`;
    const [r2] = await tx`insert into app.richieste_pagamento (incaricato_id, mese, lordo, data_pagamento) values (${a.id}, ${mese}, 10000, '1999-02-22') returning id`;
    await documento(tx, r2);
  });
  await deveFallire("documento con totale che non torna", async (tx) => documento(tx, await richiesta(tx), 1, 9999));
  await deveFallire("modificare un documento già emesso", async (tx) => {
    const r = await richiesta(tx);
    await documento(tx, r);
    await tx`update app.documenti_provvigioni set totale = 1 where richiesta_id = ${r.id}`;
  });
  await deveFallire("mettere la stessa richiesta in due file bonifici validi", async (tx) => {
    const r = await richiesta(tx);
    for (const n of [1, 2]) {
      const [d] = await tx`insert into app.distinte_bonifici (data_pagamento, id_messaggio, numero_bonifici, totale, xml)
        values ('1999-02-22', ${`PROVA-GARANZIE-${n}-${randomUUID()}`}, 1, 8006, '<x/>') returning id`;
      await tx`insert into app.righe_distinta (distinta_id, richiesta_id) values (${d.id}, ${r.id})`;
    }
  });
  await deveFallire("riattivare un file bonifici annullato", async (tx) => {
    const [d] = await tx`insert into app.distinte_bonifici (data_pagamento, id_messaggio, numero_bonifici, totale, xml)
      values ('1999-02-22', ${`PROVA-GARANZIE-${randomUUID()}`}, 1, 8006, '<x/>') returning id`;
    await tx`update app.distinte_bonifici set annullata_il = now() where id = ${d.id}`;
    await tx`update app.distinte_bonifici set annullata_il = null where id = ${d.id}`;
  });
  await deveFallire("stornare due volte lo stesso ordine reso", async (tx) => {
    await chiudi(tx);
    await tx`insert into app.ordini_chiusi (ordine_id, mese) values (${ordine.id}, ${mese})`;
    for (let n = 0; n < 2; n++) {
      const [r] = await tx`insert into app.rettifiche (mese, mese_origine) values (${mese}, ${mese}) returning id`;
      await tx`insert into app.ordini_stornati (ordine_id, rettifica_id) values (${ordine.id}, ${r.id})`;
    }
  });
  await deveFallire("regime con partita IVA senza numero di partita IVA", (tx) =>
    tx`update app.incaricati set regime_fiscale = 'piva_ordinaria', partita_iva = null where id = ${a.id}`);

  // 1d) Fase 7: negozio online e clienti (migrazione 0008), in transazioni annullate.
  const cliente = async (tx, email = `garanzie-${randomUUID()}@gluxe.test`) => {
    const [c] = await tx`insert into app.clienti (incaricato_id, email, nome, cognome, telefono, privacy_accettata_il)
      values (${a.id}, ${email}, 'Prova', 'Garanzie', '3470000000', now()) returning id`;
    return c.id;
  };
  const ordineOnline = (tx, clienteId) => tx`
    insert into app.ordini (incaricato_id, tipo, parametri_versione_id, merce_iva_inclusa, merce_iva_esclusa, punti,
      provvigione_acquisto, spese_spedizione, totale, destinatario, indirizzo, cap, citta, provincia, telefono, cliente_id)
    values (${a.id}, 'online', ${parametri.id}, 3390, 2779, 2223, 1112, 690, 4080, 'Prova', 'Via Prova 2', '20100', 'Milano', 'MI', '3470000000', ${clienteId})
    returning id`;
  await deveFallire("ordine dal negozio senza cliente", (tx) => ordineOnline(tx, null));
  await deveFallire("acquisto personale con un cliente", async (tx) => {
    const c = await cliente(tx);
    await tx`update app.ordini set cliente_id = ${c} where id = ${ordine.id}`;
  });
  await deveFallire("cambiare il cliente di un ordine dal negozio", async (tx) => {
    const [o] = await ordineOnline(tx, await cliente(tx));
    await tx`update app.ordini set cliente_id = ${await cliente(tx)} where id = ${o.id}`;
  });
  await deveFallire("due clienti con la stessa email", async (tx) => {
    await cliente(tx, "doppio-garanzie@gluxe.test");
    await cliente(tx, "doppio-garanzie@gluxe.test");
  });
  await deveFallire("email del cliente con le maiuscole", (tx) => cliente(tx, "Maiuscole@gluxe.test"));
  await deveFallire("spostare un cliente senza l'intervento tracciato della sede", async (tx) => {
    const c = await cliente(tx);
    await tx`update app.clienti set incaricato_id = ${b.id} where id = ${c}`;
  });
  await deveFallire("cambiare l'email di un cliente", async (tx) => {
    const c = await cliente(tx);
    await tx`update app.clienti set email = 'altra-garanzie@gluxe.test' where id = ${c}`;
  });
  await deveFallire("cancellare un cliente", async (tx) => {
    const c = await cliente(tx);
    await tx`delete from app.clienti where id = ${c}`;
  });
  await deveFallire("modificare lo storico dei legami dei clienti", async (tx) => {
    const c = await cliente(tx);
    await tx`insert into app.storico_legami_clienti (cliente_id, incaricato_id, motivo) values (${c}, ${a.id}, 'prova')`;
    await tx`update app.storico_legami_clienti set motivo = 'x' where cliente_id = ${c}`;
  });
  try {
    await sql.begin(async (tx) => {
      const c = await cliente(tx);
      await tx`select set_config('app.sposta_cliente', 'tracciato', true)`;
      await tx`update app.clienti set incaricato_id = ${b.id} where id = ${c}`;
      throw new Error("ANNULLA");
    });
  } catch (e) {
    esito(e.message === "ANNULLA", "accettato: spostamento di un cliente come intervento tracciato della sede");
  }

  // 1e) Licenza annuale (migrazione 0009), in transazioni annullate.
  const rinnovo = (tx, punti, spedizione) => tx`
    insert into app.ordini (incaricato_id, tipo, parametri_versione_id, merce_iva_inclusa, merce_iva_esclusa, punti,
      provvigione_acquisto, spese_spedizione, totale, destinatario, indirizzo, cap, citta, provincia, telefono)
    values (${a.id}, 'licenza', ${parametri.id}, 2990, 2451, ${punti}, 0, ${spedizione}, ${2990 + spedizione}, 'Prova', 'Via Prova 3', '20100', 'Milano', 'MI', '3330000000')
    returning id`;
  await deveFallire("rinnovo della licenza con punti", (tx) => rinnovo(tx, 100, 0));
  await deveFallire("rinnovo della licenza con spedizione", (tx) => rinnovo(tx, 0, 690));
  await deveFallire("due periodi di licenza per lo stesso pagamento", async (tx) => {
    const [o] = await rinnovo(tx, 0, 0);
    await tx`insert into app.licenze (incaricato_id, ordine_id, pagato_il, dal, valida_fino) values (${a.id}, ${o.id}, current_date, current_date, current_date + 364)`;
    await tx`insert into app.licenze (incaricato_id, ordine_id, pagato_il, dal, valida_fino) values (${a.id}, ${o.id}, current_date, current_date, current_date + 364)`;
  });
  await deveFallire("allungare a mano un periodo di licenza", async (tx) => {
    const [o] = await rinnovo(tx, 0, 0);
    await tx`insert into app.licenze (incaricato_id, ordine_id, pagato_il, dal, valida_fino) values (${a.id}, ${o.id}, current_date, current_date, current_date + 364)`;
    await tx`update app.licenze set valida_fino = valida_fino + 365 where ordine_id = ${o.id}`;
  });
  await deveFallire("periodo di licenza che finisce prima di iniziare", async (tx) => {
    const [o] = await rinnovo(tx, 0, 0);
    await tx`insert into app.licenze (incaricato_id, ordine_id, pagato_il, dal, valida_fino) values (${a.id}, ${o.id}, current_date, current_date, current_date - 1)`;
  });

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

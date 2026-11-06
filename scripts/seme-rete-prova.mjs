// Crea una piccola rete FINTA sotto GL000002, con ordini pagati nel mese in corso, per provare
// Carriera, albero della rete e anteprima provvigioni. Solo database di PROVA. Si può rilanciare:
// le persone già create non si duplicano, gli ordini sì (ogni lancio aggiunge un giro di ordini).
// Uso: npm run db:seme-rete-prova
// Gli ordini sono inseriti direttamente come pagati (senza Stripe): vanno bene solo per le prove.
import postgres from "postgres";

if (!process.env.DATABASE_URL || process.env.DATABASE_URL === process.env.DATABASE_URL_PRODUZIONE) {
  console.error("Serve il database di prova in DATABASE_URL.");
  process.exit(1);
}
const sql = postgres(process.env.DATABASE_URL, { prepare: false, max: 1, onnotice: () => {} });

// sponsor: codice esistente oppure email di una persona finta creata prima nell'elenco.
const PERSONE = [
  { email: "alice.finta@gluxe.test", nome: "Alice", cognome: "Finta", sponsor: "GL000002", cf: "FNTLCA80A41H501A" },
  { email: "bruna.finta@gluxe.test", nome: "Bruna", cognome: "Finta", sponsor: "GL000002", cf: "FNTBRN81B42H501B" },
  { email: "carla.finta@gluxe.test", nome: "Carla", cognome: "Finta", sponsor: "alice.finta@gluxe.test", cf: "FNTCRL82C43H501C" },
  { email: "elena.finta@gluxe.test", nome: "Elena", cognome: "Finta", sponsor: "carla.finta@gluxe.test", cf: "FNTLNE83D44H501D" },
];

// Ordini del mese: personali (Shampoo Botox con sconto 40%) e online (Kit Routine Botox a listino pieno).
const ORDINI = [
  { chi: "GL000002", tipo: "personale", shampoo: 3 },
  { chi: "alice.finta@gluxe.test", tipo: "online", kit: 8 },
  { chi: "alice.finta@gluxe.test", tipo: "personale", shampoo: 2 },
  { chi: "bruna.finta@gluxe.test", tipo: "online", kit: 1 },
  { chi: "carla.finta@gluxe.test", tipo: "online", kit: 2 },
  { chi: "elena.finta@gluxe.test", tipo: "personale", shampoo: 1 },
];

try {
  await sql.begin(async (tx) => {
    const id = new Map();
    for (const [codice] of [["GL000002"]]) {
      const [r] = await tx`select id from app.incaricati where codice = ${codice}`;
      if (!r) throw new Error(`${codice} non esiste nel database di prova`);
      id.set(codice, r.id);
    }
    for (const p of PERSONE) {
      const [esiste] = await tx`select i.id from app.incaricati i join app.utenti u on u.id = i.utente_id where lower(u.email) = ${p.email}`;
      if (esiste) {
        id.set(p.email, esiste.id);
        continue;
      }
      const [u] = await tx`insert into app.utenti (ruolo, email, nome) values ('incaricato', ${p.email}, ${`${p.nome} ${p.cognome}`}) returning id`;
      const [i] = await tx`
        insert into app.incaricati (utente_id, codice, nome, cognome, codice_fiscale, data_nascita, indirizzo, cap, citta, provincia,
          telefono, iban, sponsor_id, start_kit_pagato, privacy_accettata_il)
        values (${u.id}, 'GL' || lpad(nextval('app.sequenza_codice_incaricato')::text, 6, '0'), ${p.nome}, ${p.cognome}, ${p.cf},
          '1985-01-01', 'Via delle Prove 1', '20100', 'Milano', 'MI', '3330000000', 'IT60X0542811101000000123456',
          ${id.get(p.sponsor)}, true, now())
        returning id, codice`;
      await tx`insert into app.storico_sponsor (incaricato_id, sponsor_id, motivo) values (${i.id}, ${id.get(p.sponsor)}, 'Rete finta per le prove')`;
      id.set(p.email, i.id);
      console.log(`Creata ${p.nome} ${p.cognome} (${i.codice})`);
    }

    const [parametri] = await tx`select id from app.parametri_versioni order by valido_dal desc, id desc limit 1`;
    const prodotti = Object.fromEntries((await tx`select codice, id, nome from app.prodotti where codice in ('HB-SH', 'HB-SH-10')`).map((p) => [p.codice, p]));
    for (const o of ORDINI) {
      // Prezzi e punti per pezzo come li calcola l'app (piano rev. 6).
      const riga =
        o.tipo === "online"
          ? { prodotto: prodotti["HB-SH-10"], tipo: "listino_pieno", q: o.kit, ivato: 10690, iva: 8762, punti: 7010 }
          : { prodotto: prodotti["HB-SH"], tipo: "listino_scontato", q: o.shampoo, ivato: 2034, iva: 1667, punti: 1334 };
      const t = { ivato: riga.ivato * riga.q, iva: riga.iva * riga.q, punti: riga.punti * riga.q };
      const [ordine] = await tx`
        insert into app.ordini (incaricato_id, tipo, stato, parametri_versione_id, merce_iva_inclusa, merce_iva_esclusa, punti,
          provvigione_acquisto, spese_spedizione, totale, destinatario, indirizzo, cap, citta, provincia, telefono, pagato_il)
        values (${id.get(o.chi)}, ${o.tipo}, 'pagato', ${parametri.id}, ${t.ivato}, ${t.iva}, ${t.punti}, 0, 690, ${t.ivato + 690},
          'Cliente Finta', 'Via delle Prove 1', '20100', 'Milano', 'MI', '3330000000', now())
        returning id, numero`;
      await tx`
        insert into app.righe_ordine (ordine_id, prodotto_id, codice, nome, tipo_prezzo, quantita, prezzo_unitario_ivato,
          prezzo_unitario_iva_esclusa, punti_unitari, provvigione_unitaria, totale_ivato, totale_iva_esclusa, totale_punti, totale_provvigione)
        values (${ordine.id}, ${riga.prodotto.id}, ${riga.tipo === "listino_pieno" ? "HB-SH-10" : "HB-SH"}, ${riga.prodotto.nome}, ${riga.tipo},
          ${riga.q}, ${riga.ivato}, ${riga.iva}, ${riga.punti}, 0, ${t.ivato}, ${t.iva}, ${t.punti}, 0)`;
      await tx`insert into app.storico_stati_ordine (ordine_id, stato, nota) values (${ordine.id}, 'pagato', 'Ordine finto per le prove')`;
    }
    console.log(`${ORDINI.length} ordini finti pagati oggi.`);
  });
} finally {
  await sql.end();
}

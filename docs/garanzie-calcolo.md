# Garanzie di calcolo: niente doppi conteggi, niente errori con ordini contemporanei

Regole tecniche che rendono **impossibili per costruzione** i doppi conteggi e gli errori dovuti a ordini, pagamenti o rimborsi che arrivano nello stesso momento. Valgono per tutte le fasi; ogni nuova funzione che tocca soldi o punti deve rispettarle e superare `npm run prova:garanzie`.

Le regole di calcolo (percentuali, qualifiche…) restano in [piano-compensi.md](piano-compensi.md). Qui si descrive solo **come** si garantisce che vengano applicate una volta sola e sempre allo stesso modo.

## 1. Gli ordini: fotografati e pagati una volta sola (attive dalla Fase 3)

| Garanzia | Come è ottenuta |
| --- | --- |
| Prezzi, punti, provvigioni, incaricata e versione del piano di un ordine non cambiano mai dopo la creazione | Blocco nel database (`ordini_protetti`): qualsiasi modifica viene rifiutata, anche se un errore del codice ci provasse |
| Le righe di un ordine non si modificano né si cancellano | Blocco nel database (`righe_ordine_solo_aggiunta`) |
| Totali sempre coerenti (riga = prezzo unitario × quantità; ordine = merce + spedizione) | Controlli nel database su ogni riga e ogni ordine |
| Un ordine diventa "pagato" una volta sola | La conferma di Stripe si elabora in una transazione che blocca l'ordine (`for update`); se la data di pagamento c'è già, non si fa nulla |
| La stessa conferma di Stripe ricevuta due o venti volte conta una volta | Ogni evento Stripe si registra con il suo codice univoco nella stessa transazione (`eventi_stripe`); il secondo arrivo trova il codice e si ferma |
| Il mese di competenza non cambia | La data di pagamento si scrive una sola volta: il database rifiuta ogni modifica successiva |
| Un pagamento Stripe vale per un solo ordine | Indice univoco sul codice del pagamento |
| Un rimborso conta una volta | Il rimborso si registra con il codice univoco di Stripe |
| Storico stati, eventi, rimborsi e registro modifiche non si riscrivono | Blocchi nel database: solo aggiunta |

Verifica automatica: `npm run prova:garanzie` (app avviata, database di prova). Tenta tutte le modifiche vietate e manda 20 conferme di pagamento contemporanee per lo stesso ordine: l'ordine deve risultare pagato una volta sola.

## 2. Il calcolo delle provvigioni (Fase 4)

1. **Nessun contatore aggiornato a ogni ordine.** Non esiste un "totale punti" o "saldo" che si incrementa quando arriva un ordine: è lì che nascono i doppi conteggi con ordini contemporanei. Punti, qualifiche e provvigioni si **ricalcolano da zero** leggendo gli ordini pagati del mese.
2. **Una sola regola per "ordine del mese":** ordine con data di pagamento nel mese, ora italiana. Ogni ordine ha una sola data di pagamento, quindi appartiene a **un solo mese**.
3. **Motore puro e deterministico:** riceve l'elenco degli ordini e la rete, restituisce le voci. Stessi dati → stesso risultato, al centesimo, qualunque sia l'ordine di arrivo. Test automatici: i casi T1–T16 del piano, più lo stesso mese calcolato con gli ordini mescolati in ordini diversi (risultato identico) e calcolato due volte (risultato identico).
4. **Ogni voce dice da dove viene:** incaricata, tipo di voce, mese, ordine o incaricata di origine. Così si vede subito se qualcosa compare due volte.
5. **Controlli di quadratura** dopo ogni calcolo: totale punti = somma dei punti degli ordini del mese; ogni ordine pagato contato una e una sola volta; nessuna voce negativa fuori dalle rettifiche. Se un controllo non torna, il calcolo si ferma e non salva nulla.
6. **Anteprima** sempre ricalcolabile, quante volte si vuole: non scrive nulla di definitivo.

## 3. La chiusura del mese e il registro provvigioni (Fase 6)

1. **Chiusura una volta sola:** il mese chiuso si registra con chiave univoca (un mese = una chiusura). Durante la chiusura un blocco esclusivo impedisce che due chiusure partano insieme (due clic, due persone).
2. **Tutto o niente:** voci del mese, totali e chiusura si scrivono in un'unica transazione.
3. **Registro solo in aggiunta**, con chiave univoca per voce (mese + incaricata + tipo + origine): la stessa voce non può essere scritta due volte.
4. **Dopo la chiusura nulla cambia:** blocco nel database sulle voci dei mesi chiusi. Correzioni e resi diventano **rettifiche** nel mese aperto, collegate al rimborso che le ha causate (un rimborso = una rettifica).
5. **Saldo = somma dei movimenti**, mai un numero salvato a parte.
6. **Richiesta di pagamento:** una per incaricata per periodo (chiave univoca); al momento della richiesta il saldo si ricalcola con l'incaricata bloccata, così due richieste contemporanee non possono superare il saldo.

## Domande aperte (da decidere prima della Fase 6)

- **Pagamento confermato da Stripe dopo la chiusura del mese a cui apparterrebbe** (caso raro: Stripe ritenta l'avviso per qualche giorno se il sito non risponde). Proposta: conta nel primo mese ancora aperto, come le rettifiche.
- **Quando si chiude il mese:** in automatico il giorno 1 alle 3:00, oppure a mano dall'amministrazione dopo l'anteprima.

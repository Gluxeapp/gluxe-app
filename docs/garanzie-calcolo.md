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
3. **Motore puro e deterministico:** riceve l'elenco degli ordini e la rete, restituisce le voci. Stessi dati → stesso risultato, al centesimo, qualunque sia l'ordine di arrivo. Test automatici: i casi T1–T20 del piano, più lo stesso mese calcolato con gli ordini mescolati in ordini diversi (risultato identico) e calcolato due volte (risultato identico).
4. **Ogni voce dice da dove viene:** incaricata, tipo di voce, mese, ordine o incaricata di origine. Così si vede subito se qualcosa compare due volte.
5. **Controlli di quadratura** dopo ogni calcolo: totale punti = somma dei punti degli ordini del mese; ogni ordine pagato contato una e una sola volta; ogni sponsor esiste e nessun ciclo nella rete; nessuna voce negativa fuori dalle rettifiche; compensi entro il limite del piano. Se un controllo sui dati non torna, il calcolo si ferma e non produce voci; se non torna il limite, l'anteprima si vede ma il mese non si può chiudere.
7. **Rete protetta nel database** (migrazione 0004): lo sponsor si cambia solo con l'intervento tracciato della sede e mai creando un ciclo; Row Level Security su tutte le tabelle, così con le chiavi pubbliche di Supabase non si legge né si scrive nulla. Le versioni dei parametri non si modificano né si cancellano: ogni cambio è una nuova versione con data di efficacia. Verificato da `npm run prova:garanzie`.
8. **Nessun segreto nel codice:** `npm run controlla:segreti` cerca chiavi Stripe, Resend, Supabase, token e indirizzi di database con password; gira prima di ogni commit e prima di ogni build su Vercel, che si ferma se trova qualcosa.
6. **Anteprima** sempre ricalcolabile, quante volte si vuole: non scrive nulla di definitivo.

## 3. La chiusura del mese e il registro provvigioni (Fase 6)

1. **Chiusura una volta sola:** il mese chiuso si registra con chiave univoca (un mese = una chiusura). Durante la chiusura un blocco esclusivo impedisce che due chiusure partano insieme (due clic, due persone).
2. **Tutto o niente:** voci del mese, totali e chiusura si scrivono in un'unica transazione.
3. **Registro solo in aggiunta**, con chiave univoca per voce (mese + incaricata + tipo + origine): la stessa voce non può essere scritta due volte.
4. **Dopo la chiusura nulla cambia:** blocco nel database sulle voci dei mesi chiusi. Correzioni e resi diventano **rettifiche** nel mese aperto, collegate al rimborso che le ha causate (un rimborso = una rettifica).
5. **Saldo = somma dei movimenti**, mai un numero salvato a parte.
6. **Richiesta di pagamento:** una per incaricata per periodo (chiave univoca); al momento della richiesta il saldo si ricalcola con l'incaricata bloccata, così due richieste contemporanee non possono superare il saldo.

Come è fatto (migrazione 0006, attiva dalla Fase 6):

| Garanzia | Come è ottenuta |
| --- | --- |
| Un mese si chiude una volta sola, in ordine e solo dopo la sua fine | Chiave del mese in `mesi_chiusi`; blocco esclusivo durante la chiusura; il prossimo mese da chiudere è sempre quello dopo l'ultimo chiuso |
| Un mese chiuso non cambia più, nemmeno se cambiano parametri, rete o impostazioni | Alla chiusura si salva la **fotografia** di tutti i dati in ingresso al motore; da lì il motore ridà le stesse voci al centesimo (test). Mesi chiusi, ordini chiusi, rettifiche, storni, movimenti, documenti e F24 versati: solo in aggiunta (blocchi nel database) |
| Ogni ordine conta in un solo mese chiuso | Chiave dell'ordine in `ordini_chiusi`. Un pagamento arrivato tardi per un mese già chiuso entra nel primo mese aperto (decisione 18) |
| Un reso dopo la chiusura si storna una volta sola | Chiave dell'ordine in `ordini_stornati`. Storni fatti in mesi diversi sullo stesso mese d'origine si calcolano "a scalare" (storno di tutti i resi finora − storno dei resi precedenti): se tutto viene reso il mese torna a zero al centesimo (test) |
| La stessa voce non entra due volte nel registro | Indice univoco mese + incaricata + tipo + origine (voci) e rettifica + incaricata + tipo + origine (storni); ogni tipo di movimento ha segno e collegamenti controllati |
| Richieste di pagamento | Una per incaricata per mese (una rifiutata non conta); importo, incaricata e date non cambiano; gli stati vanno solo avanti (richiesta → approvata o rifiutata; approvata → pagata); non si cancellano. Il rifiuto restituisce l'importo con un movimento nuovo |
| Documenti | Numero progressivo per incaricata e anno con chiave univoca (l'incaricata si blocca durante l'approvazione); totale = imponibile + IVA − ritenute − bollo controllato dal database; dati di incaricata e azienda fotografati |
| File bonifici | Una richiesta sta in un solo file valido (indice univoco); un file si può solo annullare, una volta, e non dopo che i bonifici sono segnati pagati |
| Mesi prima del piano rev. 6 | Le versioni dei parametri delle Fasi 2 e 3 non hanno le regole delle provvigioni: per quei mesi vale la prima versione completa (a parità di data, l'ultima registrata), perché il piano si applica dal primo ordine (decisione 1) |

Verifiche: `npm run prova:garanzie` tenta tutte le modifiche vietate qui sopra; `npm run prova:fase6` (database di prova, rete finta con ordini del mese scorso) chiude il mese, prova tre richieste contemporanee della stessa incaricata (ne passa una), approva e rifiuta, crea il file bonifici e l'F24, poi riporta il database di prova a prima della chiusura.

## 4. Il negozio online e i clienti (Fase 7)

Rischi: lo stesso cliente creato due volte da due ordini contemporanei (e quindi legato a due incaricate), un ordine attribuito all'incaricata sbagliata, un legame cambiato senza traccia, un ordine aperto da chi non ne ha il link.

| Garanzia | Come è ottenuta (migrazione 0008, attiva dalla Fase 7) |
| --- | --- |
| Un cliente esiste una volta sola | Email in minuscolo con chiave univoca; ordini contemporanei della stessa email si mettono in fila (blocco sull'email nella transazione): un solo cliente, un solo legame (prova con tre ordini insieme da due negozi) |
| L'ordine va all'incaricata del cliente | Al primo ordine il cliente si lega all'incaricata del link; gli ordini dopo vanno a lei qualunque link usi. Incaricata e cliente dell'ordine sono fotografati: non cambiano più |
| Il legame non cambia di nascosto | Il database rifiuta il cambio di incaricata di un cliente se non è dichiarato come intervento tracciato della sede; ogni spostamento lascia una riga nello storico dei legami (solo in aggiunta) e nel registro modifiche, e vale solo per gli ordini futuri |
| Ordini online sempre con il cliente, e solo loro | Controllo nel database (tipo "online" ⇔ cliente presente) |
| Clienti non cancellabili, email e identità non modificabili | Blocco nel database |
| Solo il cliente apre il suo ordine | Link con un codice casuale lungo; nel database se ne salva solo l'impronta (come per le password). L'incaricata vede gli ordini dei suoi clienti senza indirizzo |
| Abusi | Al massimo 5 ordini non pagati per cliente nelle 24 ore; campo nascosto contro i programmi automatici |
| Punti e provvigioni | Come per tutti gli ordini: contano solo con il pagamento confermato dal webhook di Stripe (una volta sola) |

Verifiche: `npm run prova:garanzie` (tentativi vietati sui clienti e sugli ordini online) e `npm run prova:fase7` (database di prova: ordini dal negozio, legame, consenso, ordini contemporanei, limite, clienti fittizi, spostamento, apertura del pagamento Stripe di prova).

## 5. La licenza annuale (decisione 31)

Rischi: un rinnovo che dà punti o entra nell'incasso, due periodi per lo stesso pagamento, una scadenza allungata a mano, una decadenza che cambia un mese già chiuso o sposta la squadra senza traccia.

| Garanzia | Come è ottenuta (migrazione 0009) |
| --- | --- |
| Il rinnovo non dà punti a nessuno | Controllo nel database: un ordine "licenza" ha punti, provvigione e spedizione a zero. Il calcolo del mese non legge gli ordini di licenza (né punti né incasso aziendale) |
| Un pagamento vale un solo periodo | Chiave univoca dell'ordine nei periodi di licenza; il webhook di Stripe registra il periodo nella stessa transazione del pagamento, una volta sola anche se l'avviso arriva due volte (prova) |
| La scadenza non si cambia a mano | Periodi di licenza solo in aggiunta; due rinnovi della stessa incaricata si mettono in fila (blocco sull'incaricata), perché la nuova scadenza dipende dalla precedente |
| Mese fermo stabile | Il mese è fermo se la licenza è scaduta all'ultimo giorno del mese contando solo i pagamenti fatti entro quel giorno: un rinnovo successivo non cambia il passato. Alla chiusura il dato entra nella fotografia del mese |
| Decadenza ordinata e tracciata | Avviene solo con la chiusura del mese (dopo la fotografia), con i cambi di sponsor e di cliente dichiarati come interventi tracciati: storico degli sponsor, storico dei legami dei clienti e registro modifiche |
| Avvisi una volta sola | Tabella degli avvisi mandati con chiave incaricata + scadenza + giorni |

Verifiche: `npm run prova:garanzie` (rinnovo con punti o spedizione, doppio periodo, periodo modificato) e `npm run prova:licenza` (database di prova: scadenza, negozio chiuso, mese fermo, rinnovo dopo la scadenza, punti e incasso invariati, decadenza con passaggio di dirette e clienti alla sponsor).

## Decisioni

- **Pagamento confermato da Stripe dopo la chiusura del suo mese** (caso raro: Stripe ritenta l'avviso per qualche giorno se il sito non risponde): conta nel **primo mese ancora aperto**, come le rettifiche (fondatore, 29/10/2026).
- **Chiusura del mese:** il giorno 1 alle 3:00 l'app prepara il calcolo e i controlli e avvisa l'amministrazione; il mese si congela solo con la conferma "Chiudi il mese" (fondatore, 29/10/2026).

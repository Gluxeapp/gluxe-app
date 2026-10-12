# G LUXE · Specifiche motore provvigioni

Versione: 12 ottobre 2026 · rev. 4 (qualifica bloccata, quote fondatrici Giovanna Di Lillo e Margherita Suma)

Questo documento traduce il piano compensi in regole univoche per il motore di calcolo dell'app G LUXE. Ogni regola deve dare un solo risultato possibile, senza interpretazioni. È la fonte ufficiale: se il codice non coincide con il documento, vale il documento.

Per lo sviluppo: scrivere prima i test della sezione "Casi di test", poi il codice, finché passano tutti. Se una regola sembra ambigua o in conflitto con un'altra, fermarsi e chiedere.

## Definizioni

Tutto il piano gira sui punti: 1 punto = 1 € pagato all'azienda al prezzo incaricato, IVA esclusa. I € del cliente servono solo per ricavarli.

| Termine | Regola | Esempio |
| --- | --- | --- |
| Prezzo al pubblico | Prezzo di listino IVA 22% inclusa | 129,00 € |
| Prezzo netto | Prezzo al pubblico ÷ 1,22, arrotondato al centesimo | 105,74 € |
| Prezzo incaricato | Prezzo netto × 50% | 52,87 € |
| Punti di un ordine | Somma dei prezzi incaricato × quantità, sul prezzo realmente pagato (anche per i prodotti scontati). Spedizioni e start kit: 0 punti | 52,87 punti |
| Acquisti personali (AP) | Punti degli ordini che l'incaricato paga a prezzo incaricato | 300 punti |
| Ordini negozio online (ON) | Punti degli ordini pagati dal cliente sul negozio personale dell'incaricato | 52,87 punti |
| Punti personali (PP) | AP + ON del mese, senza limiti | 352,87 punti |
| Punti personali per qualifica (PPQ) | min(AP; 300) + ON | AP 500, ON 100 → 400 |
| Punti di gruppo (PG) | PPQ proprio + PPQ di tutti i discendenti, a ogni profondità, compresi i rami con leader al 20% | vedi Casi di test |
| Attivo | PP ≥ 50 nel mese | 50 punti = 100 € netti di listino |
| Linea | Un incaricato diretto (primo livello) con tutta la sua discendenza | — |
| Leader | Incaricato attivo con PG ≥ 7.000 nel mese (percentuale di qualifica 20%). Il flag Leader Fondatore e la qualifica bloccata non rendono Leader | — |
| Mese di competenza | Mese in cui Stripe conferma il pagamento dell'ordine (ora italiana). Gli ordini si pagano solo con carta, PayPal o Klarna: niente bonifici | — |

Arrotondamento: ogni voce si calcola a 2 decimali con arrotondamento commerciale (0,005 va in su). Il totale è la somma delle voci già arrotondate. Esempio: 211,48 × 4% = 8,4592 → 8,46 €.

Codici sconto sull'intero ordine: lo sconto si ripartisce in proporzione sulle righe dell'ordine; i punti si calcolano sul prezzo realmente pagato da ogni riga.

## Regole di calcolo

Ogni mese un incaricato può avere fino a sette voci: provvigione negozio online, margine, bonus qualifica, differenza, generazioni, pool, bonus auto. I Leader Fondatori possono avere in più due voci extra piano: integrazione Fondatore e bonus avvio. Solo il margine non lo paga l'azienda.

### 1. Margine e provvigione negozio online (50%)

- **Acquisti personali**: l'incaricato guadagna rivendendo. L'azienda non paga nulla. L'app mostra il margine solo come informazione ("margine stimato" = punti AP), fuori dal totale da pagare.
- **Ordini negozio online**: l'azienda paga una provvigione pari ai punti ON (50% del netto). È dovuta sempre, anche se l'incaricato non è attivo o è sospeso.

### 2. Qualifica (percentuale del mese)

La percentuale dipende dai punti di gruppo (PG) del mese. Soglie con "maggiore o uguale".

| Punti di gruppo | Qualifica | Percentuale |
| --- | --- | --- |
| 0 – 99,99 | Nessuna | 0% |
| 100 | New Star | 4% |
| 600 | Partner | 8% |
| 1.500 | Expert | 12% |
| 3.500 | Director | 16% |
| 7.000 | Leader | 20% |

Percentuale pagata (P) = percentuale di qualifica se l'incaricato è attivo e non sospeso, altrimenti 0%. Il flag Leader Fondatore non cambia P (regola 7).

**Qualifica bloccata.** L'amministrazione può bloccare manualmente un incaricato a una qualifica, al massimo Leader 20%. Il blocco:
- è **dentro il piano**: la percentuale bloccata vale anche per il calcolo della differenza di chi sta sopra;
- fa da **minimo**: P = la più alta tra la percentuale bloccata e la P calcolata normalmente;
- vale **anche se l'incaricato è inattivo** nel mese;
- dura **finché l'amministrazione non lo toglie**; ogni attivazione e rimozione va nel registro modifiche;
- non vale per gli incaricati sospesi (la sospensione prevale: P = 0%);
- non rende Leader per linee al 20%, titoli manager e generazioni (né per sé né per chi sta sopra): la zona manager richiede i punti reali.

### 3. Bonus qualifica e differenza

Si calcola punto per punto. Base: i punti personali per qualifica (PPQ). Gli ordini online, pagati dal cliente a prezzo pieno, valgono tutti. Gli acquisti personali con lo sconto valgono fino a 300 punti al mese; oltre danno solo il margine. Esempio: 500 punti di acquisti personali + 200 di ordini online → base 300 + 200 = 500 punti.

Il tetto vale anche verso l'alto: a ogni sponsor, per qualifica e differenza, arrivano al massimo 300 punti di acquisti personali di ciascuna persona della squadra (caso T11).

1. Chi genera i punti incassa la propria P sui propri punti ("qualifica sui suoi punti").
2. Si risale la catena degli sponsor. Ogni sponsor incassa la propria P meno la P più alta già pagata sotto di lui su quel percorso, se positiva.
3. Quando la P più alta pagata arriva al 20%, sopra non si paga più differenza su quei punti.

Chi è inattivo o sospeso (P = 0%) non blocca chi sta sopra: lo sponsor incassa la differenza come se quella persona fosse al 0%. I punti di inattivi e sospesi contano comunque nei punti di gruppo di chi sta sopra.

### 4. Titoli manager

Un Leader (vedi Definizioni) riceve un titolo in base al numero di linee al 20%. Una linea conta se contiene almeno un Leader nel mese, a qualsiasi profondità. Ogni linea conta una volta sola, anche se contiene più Leader. Un Leader Fondatore entra nella zona manager solo quando è Leader con i suoi punti reali.

| Titolo | Linee al 20% | Generazioni pagate | Quote pool | Bonus auto |
| --- | --- | --- | --- | --- |
| Leader in crescita | 1 | 1ª 3% | 0 | 0 € |
| Gold Leader | 2 | 1ª 4% | 1 | 0 € |
| Prestige Director | 3 | 1ª 4%, 2ª 3% | 2 | 300 € |
| President | 4 | 1ª 4%, 2ª 3%, 3ª 2% | 3 | 500 € |
| Diamond President | 5 o più | 1ª 4%, 2ª 3%, 3ª 2%, 4ª 2%, 5ª 1,5% | 5 | 800 € |

Il titolo si ricalcola ogni mese. Nessun titolo è permanente, tranne il nome "Leader Fondatore".

### 5. Generazioni

- **Volume di un Leader**: i suoi PPQ più quelli della sua discendenza, esclusi i rami guidati da un altro Leader.
- **1ª generazione** di un manager: il primo Leader che si incontra scendendo lungo ogni percorso della sua discendenza.
- **2ª generazione**: il primo Leader sotto ciascun Leader di 1ª generazione, e così via.
- Il manager incassa la percentuale della generazione sul volume di ogni Leader di quella generazione.
- Anche qui contano solo i Leader con PG ≥ 7.000; il flag Leader Fondatore non conta.

### 6. Pool manager e bonus auto

- Fondo del mese = 3% della **somma dei PPQ di tutti gli incaricati** nel mese (acquisti personali fino a 300 punti a persona + tutti gli ordini online).
- Valore di una quota = fondo ÷ somma delle quote di tutti i manager qualificati quel mese. I manager esclusi dal pool (regola 8) non contano: le loro quote non entrano nella somma.
- Ogni manager incassa fondo × sue quote ÷ quote totali, calcolato in modo esatto e arrotondato al centesimo solo alla fine. I centesimi avanzati restano all'azienda.
- Bonus auto: importo fisso del titolo, solo nei mesi in cui il titolo è raggiunto.

### 7. Leader Fondatori (qualifica extra piano)

Il Leader Fondatore è una qualifica **aggiuntiva, fuori dal piano**. Il piano (regole 1–6) si calcola per tutti come se il flag non esistesse: il Fondatore ha la sua qualifica e la sua P reali, e chi sta sopra incassa la differenza sulla sua P reale. Quando il Fondatore raggiunge davvero i requisiti in punti, entra anche nella zona manager come chiunque altro.

- Massimo 10, entrati nei primi 12 mesi dal lancio, con flag assegnato da amministrazione.
- Periodo: il mese di ingresso più gli 11 mesi successivi.
- Nel periodo, **se attivo** (PP ≥ 50), riceve due voci extra piano:
  - **Integrazione Fondatore** = (qualifica + differenza che incasserebbe con P = 20%) − (qualifica + differenza che incassa con la P reale). Per il calcolo "con P = 20%" si usano le P reali di chi sta sotto. Se la P reale è già 20%, l'integrazione è 0.
  - **Bonus avvio** = 3% dei suoi punti di gruppo.
- Se inattivo nel mese: nessuna integrazione e nessun bonus avvio.
- Le voci extra piano non cambiano i guadagni di nessun altro.
- Requisito: almeno 1.000 punti di gruppo nei primi 90 giorni, contando i PPQ degli ordini pagati dal giorno di ingresso al 90° giorno compreso. Se non lo raggiungono, perdono garanzia e bonus dal mese successivo.
- Il titolo "Leader Fondatore" resta per sempre, ma è solo un'etichetta.

### 8. Quote fondatrici (extra piano)

Due persone ricevono ogni mese una **quota sui punti di tutta l'azienda**. La base è la stessa del pool: somma dei PPQ di tutti gli incaricati nel mese (regola 6). La quota si arrotonda al centesimo. Le quote sono **extra piano**: non cambiano i guadagni di nessun altro e non riducono il fondo del pool.

| Persona | Codice | Quota | Condizione | Altre regole |
| --- | --- | --- | --- | --- |
| Giovanna Di Lillo, fondatrice | GL000001 | 2% | Sempre, anche se inattiva | Qualifica bloccata a Leader 20% per sempre (regola 2). Titoli e generazioni come tutti, fino a Diamond President, in base a punti e linee reali. **Esclusa dal pool manager e dal bonus auto**. Etichetta "Master President" (solo un nome) |
| Margherita Suma, Leader Fondatrice | — | 1% | Solo nei mesi in cui è attiva (PP ≥ 50) | Leader Fondatrice (regola 7). Titoli, generazioni, pool e bonus auto come tutti, fino a Diamond President |

- Le quote durano finché l'amministrazione non le toglie.
- Nell'app sono parametri della scheda incaricato (percentuale, condizione di attività, esclusione da pool e bonus auto), modificabili solo dall'amministrazione e registrati nel registro modifiche.
- Come il pool, le quote **non si ricalcolano per i resi**.

## Algoritmo mensile

Il calcolo gira sul server, in quest'ordine. Durante il mese si può rilanciare quante volte si vuole come anteprima.

1. Prendi gli ordini con mese di competenza uguale al mese calcolato, pagati e non annullati. I resi di ordini di mesi già chiusi **non** entrano qui: si gestiscono solo con le rettifiche (vedi "Rettifiche").
2. Per ogni incaricato calcola AP, ON, PP, PPQ e se è attivo.
3. Calcola i punti di gruppo dal basso verso l'alto dell'albero, in una sola passata.
4. Assegna qualifica e percentuale pagata P, applicando le sospensioni.
5. Per ogni Leader conta le linee al 20% e assegna il titolo manager.
6. Calcola la provvigione negozio online.
7. Calcola bonus qualifica e differenza, punto per punto, risalendo gli sponsor.
8. Calcola le generazioni per ogni manager.
9. Calcola il pool: fondo, valore quota, importo per manager (esclusi i manager esclusi dal pool).
10. Aggiungi bonus auto (non a chi ne è escluso) e, per i Leader Fondatori, integrazione Fondatore e bonus avvio.
11. Calcola le quote fondatrici (regola 8).
12. Salva ogni voce come riga del registro provvigioni: beneficiario, tipo voce, mese, base punti, percentuale, importo, da chi provengono i punti, versione del piano.
13. Il mese si chiude sempre **l'ultimo giorno del mese** (23:59:59, ora italiana). Il calcolo definitivo gira automaticamente subito dopo e congela il mese. Da qui nessuna riga si modifica: ogni correzione diventa una rettifica nel mese in corso.
14. Calcola il saldo richiedibile: importi non richiesti dei mesi precedenti + voci pagabili del mese chiuso (tutte tranne il margine).
15. Il pulsante "Richiedi pagamento" è attivo **dal 10 al 13 di ogni mese** se il saldo è almeno 50 €. Le richieste vanno alla contabilità e si pagano **il 20 del mese** con bonifico all'IBAN del profilo. Ciò che non viene richiesto resta nel saldo per il mese dopo.

## Rettifiche (resi, recessi, riacquisti, correzioni)

Quando un ordine di un mese già chiuso viene reso, riacquistato, rimborsato tramite Stripe o corretto:

1. Si rifà il calcolo completo di quel mese **come se l'ordine non ci fosse mai stato** (o con l'ordine corretto), ricalcolando anche qualifiche, titoli e generazioni.
2. Per ogni beneficiario e ogni voce, la differenza tra il calcolo originale e il ricalcolo diventa una riga di rettifica nel mese in cui avviene il reso.
3. Il **pool** e le **quote fondatrici** non si ricalcolano per i resi.
4. Il mese originale resta congelato e invariato.

Se un ordine viene reso nello stesso mese in cui è stato pagato, prima della chiusura, si annulla e basta: il calcolo del mese non lo conta.

## Ritenuta e pagamento

| Incaricato | Regola |
| --- | --- |
| Senza partita IVA | Ritenuta = importo richiesto × 78% × 23% (17,94%), arrotondata al centesimo. L'azienda la trattiene e la versa. Bonifico del netto |
| Con partita IVA | Bonifico del lordo. Gli adempimenti fiscali sono a carico dell'incaricato |

La ritenuta si calcola su ogni pagamento, non sulle singole voci.

## Regole operative

| Tema | Regola per l'app |
| --- | --- |
| Pagamenti | Pulsante attivo dal 10 al 13 di ogni mese se il saldo è almeno 50 €. Pagamento il 20. Sotto 50 €, o se non richiesto, il saldo si riporta senza scadenza |
| Recesso cliente (14 giorni) | Rettifica con il metodo della sezione "Rettifiche" |
| Riacquisto dall'incaricato (90%, entro 12 mesi) | Rimborso del 90% del prezzo pagato per merce integra. Si tolgono il 100% dei punti dell'acquisto originale, con il metodo della sezione "Rettifiche" |
| Spedizioni | 6 € per ordine, gratis sopra 75 € pagati IVA inclusa. Non generano punti |
| Start kit | 59,90 €, restituibile, 0 punti |
| Riordino al 70% | L'app non può verificarlo. A ogni acquisto personale chiede una conferma ("ho venduto o consumato almeno il 70% dell'ordine precedente") e la salva con data e ora |
| Inattività | Dopo 6 mesi di fila con 0 punti personali l'incaricato diventa cliente. I suoi diretti passano al suo sponsor. Operazione automatica il primo del mese, registrata nel log. Il saldo provvigioni residuo resta richiedibile. Se riprende a comprare come incaricato riparte da capo con lo stesso sponsor, salvo diversa richiesta approvata dall'amministrazione |
| Marketplace vietati | Nessun calcolo. L'amministrazione può sospendere un incaricato: chi è sospeso non matura voci, tranne la provvigione online |

## Casi di test

Il motore è pronto quando tutti questi casi danno esattamente questi importi. "Da pagare" esclude il margine sugli acquisti personali, che non paga l'azienda. Tutti gli incaricati sono attivi, salvo dove indicato.

| Caso | Dati in ingresso | Voci attese | Da pagare |
| --- | --- | --- | --- |
| T1 Anna, primo mese | 211,48 punti ON (4 kit), nessuna squadra | PG 211,48 → New Star. Provvigione online 211,48 €; qualifica 8,46 € | 219,94 € |
| T2 Luca, piccola squadra | Luca 300 AP. Due diretti con 200 AP ciascuno | PG 700 → Partner. Margine 300 € (informativo); qualifica 24,00 €; differenza 400 × 4% = 16,00 €. Ogni diretto: New Star, qualifica 8,00 € | 40,00 € |
| T3 Sara, tre linee | Sara 400 ON. Diretti: A 900 ON, B 1.600 ON, C 700 ON | PG 3.600 → Director. Online 400 €; qualifica 64 €; differenze 72 + 64 + 56 = 192 €. A: Partner, 72 € di qualifica; B: Expert, 192 €; C: Partner, 56 € | 656,00 € |
| T4 Paola, manager | Paola 500 ON. Linee L1, L2, L3: un Leader con 8.000 ON e sotto un Leader con 7.000 ON. Linee D1, D2: un Director con 3.500 ON ciascuno. Azienda: 300.000 PPQ nel mese, altri manager con 10 quote | PG 52.500 → Leader, 3 linee al 20% → Prestige Director. Online 500; qualifica 100; differenza D1+D2 7.000 × 4% = 280; 1ª gen 24.000 × 4% = 960; 2ª gen 21.000 × 3% = 630; pool 9.000 ÷ 12 × 2 = 1.500; auto 300 | 4.270,00 € |
| T5 Tetto acquisti | Marco 700 AP, nessuna squadra | PPQ 300 → New Star (non Partner). Margine 700 informativo; qualifica 300 × 4% = 12,00 € | 12,00 € |
| T6 Inattivo in mezzo | S 100 ON. Sotto S: M 30 ON. Sotto M: X e Y, 400 ON ciascuno | M: PG 830 ma inattivo → P 0%, solo online 30 €. S: PG 930 → Partner; qualifica 8 €; differenza su M 2,40 €; su X e Y 800 × 4% = 32 €. X e Y: New Star, 16 € di qualifica ciascuno | S: 142,40 € |
| T7 Soglia esatta | Un incaricato con PG esattamente 600 | Partner, 8% | — |
| T8 Reso dopo chiusura | Settembre come T1 (Anna 4 ordini ON da 52,87 punti). Uno dei 4 ordini viene reso a ottobre | Ricalcolo di settembre senza l'ordine: PG 158,61 → New Star, online 158,61, qualifica 6,34. Ottobre: rettifiche −52,87 € online e −2,12 € qualifica (8,46 − 6,34). Settembre resta invariato | −54,99 € a ottobre |
| T9 Soglia 50 € | Luca come T2 (40 €); mese dopo matura 15 € | Mese 1: pulsante non attivo, 40 € riportati. Mese 2: saldo 55 €, richiedibile dal 10 al 13 | Mese 1: 0 €; mese 2: 55,00 € se richiesti |
| T10 Richiesta mancata | Saldo 80 €, nessuna richiesta tra il 10 e il 13; il mese dopo matura 30 € | Gli 80 € restano nel saldo; il mese dopo il saldo è 110 € | 0 €, poi 110,00 € se richiesti |
| T11 Tetto verso lo sponsor | Mario 1.000 ON. Sotto Mario: Giulia 800 AP | Giulia: PPQ 300 → New Star, qualifica 12 €, margine 800 informativo. Mario: PG 1.000 + 300 = 1.300 → Partner (non Expert); online 1.000 €; qualifica 80 €; differenza 300 × 4% = 12 € | Mario: 1.092,00 € |
| T12 Riacquisto che fa perdere la qualifica | Settembre come T2 (Luca 300 AP; diretti A e B con 200 AP ciascuno). A ottobre l'azienda riacquista l'intero ordine di B | Ricalcolo di settembre senza l'ordine di B: B inattivo, PPQ 0. Luca PG 500 → New Star; qualifica 12 €; differenza su A 0 €. Ottobre: Luca −12,00 € qualifica, −16,00 € differenza; B −8,00 € qualifica. A invariato | Luca −28,00 €; B −8,00 € a ottobre |
| T13 Fondatore inattivo | F Leader Fondatore nel periodo, 30 ON. Sotto F: Z 470 ON | F: PP 30 → inattivo, P 0%, niente integrazione né bonus avvio; online 30 €. Z: PG 470 → New Star, qualifica 18,80 € | F: 30,00 € |
| T14 Fondatore sotto un Leader | S 7.000 ON. Sotto S: F Leader Fondatore nel periodo, attivo, 200 ON | F: PG 200 → New Star, P reale 4%; online 200; qualifica 8; integrazione Fondatore 40 − 8 = 32; bonus avvio 3% × 200 = 6. S: PG 7.200 → Leader; linee al 20%: 0 → nessun titolo; online 7.000; qualifica 1.400; differenza su F (20% − 4%) × 200 = 32 | F: 246,00 €; S: 8.432,00 € |
| T15 Ritenuta | Richiesta di 100,00 € | Senza partita IVA: ritenuta 17,94 €, bonifico 82,06 €. Con partita IVA: bonifico 100,00 € | — |
| T16 Base del pool | Azienda con solo due incaricati: A 1.000 AP, B 200 ON | Somma PPQ = 300 + 200 = 500 → fondo 3% = 15,00 € | — |
| T17 Fondatore con squadra | F Leader Fondatore nel periodo, attivo, 400 ON. Sotto F: G 1.600 ON | G: PG 1.600 → Expert 12%, qualifica 192. F: PG 2.000 → Expert, P reale 12%; online 400; qualifica 48; differenza su G 0. Con P 20%: qualifica 80 + differenza (20% − 12%) × 1.600 = 128 → 208. Integrazione 208 − 48 = 160; bonus avvio 3% × 2.000 = 60 | F: 668,00 € |
| T18 Qualifica bloccata | S 1.000 ON. Sotto S: B, bloccato a Director 16%, 200 ON | B: PG 200 (sarebbe New Star) → P 16%; online 200; qualifica 32. S: PG 1.200 → Partner 8%; online 1.000; qualifica 80; differenza su B 0 (8% − 16% è negativo) | B: 232,00 €; S: 1.080,00 € |
| T19 Bloccato e inattivo | B bloccato a Partner 8%, 30 ON (inattivo). Sotto B: C 300 ON | B: P 8% anche se inattivo; online 30; qualifica 2,40; differenza su C (8% − 4%) × 300 = 12. C: New Star, qualifica 12 | B: 44,40 €; C: 312,00 € |
| T20 Bloccato a Leader sotto un Leader | S 7.000 ON. Sotto S: B, bloccato a Leader 20%, 500 ON | B: P 20%; online 500; qualifica 100; non è Leader per la zona manager. S: PG 7.500 → Leader; linee al 20%: 0 (B non conta) → nessun titolo, nessuna generazione; online 7.000; qualifica 1.400; differenza su B 0 (20% − 20%) | B: 600,00 €; S: 8.400,00 € |
| T21 Quota Giovanna | Somma PPQ dell'azienda nel mese: 300.000. Giovanna inattiva (PP 0) | Quota 2% = 6.000,00 €, pagata anche se inattiva | Giovanna: 6.000,00 € |
| T22 Pool senza Giovanna | Somma PPQ 300.000 → fondo 9.000. Manager del mese: Giovanna Prestige Director (2 quote), M1 Prestige Director (2 quote), M2 President (3 quote) | Giovanna esclusa: quote totali 5, valore quota 1.800. M1 pool 3.600 + auto 300; M2 pool 5.400 + auto 500. Giovanna: pool 0, auto 0 (più la sua quota 2% = 6.000) | M1: 3.900,00 €; M2: 5.900,00 € |
| T23 Quota Margherita | Somma PPQ 50.000. Mese A: Margherita attiva (PP 120). Mese B: inattiva (PP 30) | Mese A: quota 1% = 500,00 €. Mese B: quota 0 | A: 500,00 €; B: 0,00 € |

## Decisioni prese

| # | Tema | Decisione |
| --- | --- | --- |
| 1 | Base del bonus qualifica e differenza | Acquisti personali fino a 300 punti al mese, anche verso lo sponsor; ordini online tutti |
| 2 | Differenza di un incaricato inattivo o sospeso | Va allo sponsor |
| 3 | Punti dei rami guidati da un Leader | Contano nei punti di gruppo di chi sta sopra |
| 4 | Base del pool | Somma dei PPQ di tutti gli incaricati (acquisti fino a 300 punti + ordini online) |
| 5 | Linea al 20% | Basta un Leader vero a qualsiasi profondità della linea; ogni linea conta una volta |
| 6 | Mese di competenza | Mese in cui l'ordine è pagato |
| 7 | Pagamento provvigioni | Pulsante attivo dal 10 al 13 di ogni mese, soglia 50 €, pagamento il 20 con bonifico all'IBAN del profilo |
| 8 | Prodotti scontati e codici sconto | Punti sul prezzo realmente pagato; sconti sull'ordine ripartiti in proporzione sulle righe |
| 9 | Spedizioni e start kit | Non danno punti |
| 10 | Riacquisto al 90% | Si tolgono il 100% dei punti dell'acquisto originale |
| 11 | Soglia spedizione gratuita | 75 € IVA inclusa |
| 12 | Leader Fondatore sotto 1.000 punti in 90 giorni | Perde garanzia del 20% e bonus avvio dal mese successivo |
| 13 | Resi dopo la chiusura | Solo righe di rettifica; i punti del mese del reso non cambiano |
| 14 | Calcolo delle rettifiche | Ricalcolo del mese senza l'ordine, qualifiche comprese; differenza come rettifica; pool escluso |
| 15 | Leader Fondatore | Qualifica extra piano: il piano si calcola con la sua P reale (anche per lo sponsor); in più, se attivo, integrazione fino al 20% e bonus avvio. Entra nella zona manager solo con i punti reali |
| 16 | Sospesi | Come gli inattivi, ma ricevono la provvigione online |
| 17 | Chiusura del mese | Sempre l'ultimo giorno del mese, calcolo definitivo automatico |
| 18 | Incaricato diventato cliente | Saldo residuo richiedibile; se riparte, stesso sponsor salvo diversa richiesta |
| 19 | Ritenuta | 23% sul 78%; senza partita IVA la versa l'azienda, con partita IVA l'incaricato |
| 20 | Negozio online | Pagina personale dentro l'app |
| 21 | Pagamento ordini | Solo carta, PayPal, Klarna tramite Stripe; nessun bonifico. Il mese di competenza è dato dalla conferma di Stripe |
| 22 | Qualifica bloccata | Fino a Leader 20%, dentro il piano, fa da minimo, vale anche da inattivo, finché l'amministrazione non la toglie; la sospensione prevale; non dà accesso alla zona manager |
| 23 | Giovanna Di Lillo (GL000001) | Quota 2% sui PPQ dell'azienda anche se inattiva; qualifica bloccata a Leader 20%; titoli e generazioni fino a Diamond President; esclusa da pool e bonus auto; etichetta Master President |
| 24 | Margherita Suma | Leader Fondatrice; quota 1% sui PPQ dell'azienda solo se attiva; per il resto piano normale, pool e bonus auto compresi |
| 25 | Quote fondatrici e resi | Come il pool, non si ricalcolano |


## Verifiche esterne prima del lancio

- Commercialista: trattamento IVA sugli acquisti degli incaricati, ritenute sulle provvigioni, contributi INPS per gli incaricati occasionali oltre la soglia annua, trattamento fiscale delle quote fondatrici (2% Giovanna Di Lillo, socia fondatrice; 1% Margherita Suma).
- Legale: conformità del piano alla Legge 173/2005.

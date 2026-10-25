# G LUXE · Piano Compensi (specifiche del motore di calcolo)

Versione: 16 ottobre 2026 · **rev. 5 "Piano Compensi G LUXE"**. Sostituisce tutte le versioni precedenti (la rev. 4 resta solo nello storico di Git e non è mai stata applicata a ordini reali).

Questo documento traduce il piano compensi in regole univoche per il motore di calcolo dell'app G LUXE. Ogni regola deve dare un solo risultato possibile. È la fonte ufficiale: se il codice non coincide con il documento, vale il documento.

Per lo sviluppo: scrivere prima i test della sezione "Casi di test", poi il codice, finché passano tutti. Se una regola sembra ambigua o in conflitto con un'altra, fermarsi e chiedere.

**Entrata in vigore:** dal primo ordine dell'app. Non esistono ordini o compensi calcolati con regole precedenti.

**Parametri:** tutti i numeri di questo documento (percentuali, soglie, importi, coefficienti, regole fiscali) sono parametri modificabili dall'area sede, salvati in versioni con data di efficacia. I valori indicati sono quelli iniziali.

## 1. Definizioni

| Termine | Regola | Valore iniziale |
| --- | --- | --- |
| Listino | Prezzo al pubblico IVA inclusa | Shampoo 32,90 €, maschera 32,90 €, spray 12in1 39,90 €, olio capelli al caramello 44,90 €, kit routine 139,00 € |
| Aliquota IVA | Parametro | 22% |
| Prezzo IVA esclusa | Prezzo IVA inclusa ÷ (1 + IVA), arrotondato al centesimo, **per unità** | 139,00 → 113,93 € |
| Prezzo pagato | Quanto viene pagato all'azienda per una riga d'ordine, IVA esclusa, spedizione esclusa | — |
| Punti di una riga | Coefficiente × prezzo pagato IVA esclusa **di un'unità**, arrotondato a 2 decimali, × quantità | Coefficiente 0,80. Kit routine: 0,80 × 113,93 = 91,14 punti |
| Punti AP | Punti degli acquisti personali dell'incaricata nel mese | — |
| Punti ON | Punti degli ordini dei suoi clienti sul negozio online nel mese | — |
| Punti KIT | 33 punti fissi dello start kit, solo nel mese in cui è pagato | 33 |
| Punti personali (PP) | AP + ON + KIT | — |
| Punti personali per qualifica (PPQ) | ON + MIN(AP; 250) + KIT | Tetto 250 |
| Punti di gruppo per qualifica (PGQ) | PPQ propri + PPQ di tutta la downline, a ogni profondità, attive o no | — |
| Punti di gruppo reali (PGR) | PP propri + PP di tutta la downline, senza tetto | — |
| Attiva | PP ≥ 33 nel mese | 33 |
| Incasso aziendale del mese | Somma dei prezzi pagati IVA esclusa di **tutti** gli ordini del mese (start kit compresi), spedizioni escluse | — |
| Mese di competenza | Mese in cui Stripe conferma il pagamento dell'ordine (ora italiana) | — |

Arrotondamento: ogni voce si calcola a 2 decimali con arrotondamento commerciale (0,005 va in su). Il totale è la somma delle voci già arrotondate. Esempio: 364,56 × 4% = 14,5824 → 14,58 €.

Codici sconto sull'intero ordine: lo sconto si ripartisce in proporzione sulle righe; i punti si calcolano sul prezzo realmente pagato da ogni riga.

## 2. Tipi di ordine

| Tipo | Prezzo | Punti | Chi guadagna |
| --- | --- | --- | --- |
| **Start kit** (ingresso) | 59,90 € IVA inclusa. Contiene shampoo, spray 12in1, licenza account incaricata, borsa campionario e materiale formativo | **33 punti fissi** (non con il coefficiente) | La nuova incaricata **non guadagna nulla** sui 33 punti, ma valgono per la sua attività e per le sue soglie di qualifica. **L'upline guadagna** su questi punti con le regole normali (differenza, generazioni) |
| **Acquisto personale** | Listino − **40%** (sconto calcolato sul prezzo IVA inclusa; parametro `sconto_su_prezzo_ivato`, iniziale vero, da confermare con il commercialista) | Coefficiente × prezzo pagato IVA esclusa | Nessuna provvigione per l'incaricata: lo sconto è il suo guadagno (margine, mostrato solo come informazione) |
| **Acquisto personale di un prodotto in promozione** | Prezzo in promozione, **senza** lo sconto del 40% (lo sconto vale solo per i prodotti a listino) | Coefficiente × prezzo pagato IVA esclusa; contano come acquisti personali (tetto di 250 per le soglie) | **Provvigione = 50% dei punti** dell'acquisto, come una vendita dal negozio online; dovuta sempre, anche se l'incaricata è inattiva |
| **Ordine cliente dal negozio online** | Listino pieno, pagato dal cliente legato all'incaricata del link | Coefficiente × prezzo pagato IVA esclusa, attribuiti all'incaricata | **Provvigione online = 50% dei punti** dell'ordine (= 40% del prezzo IVA esclusa) |

- Lo start kit attiva l'account. **Sconto del 40% e negozio online si attivano dall'ordine successivo.**
- **Spedizione:** 6,90 € per ogni ordine, a carico di chi ordina, senza soglia di gratuità. Non genera punti né compensi e non entra nell'incasso aziendale.
- Esempio acquisto personale: shampoo 32,90 € → pagato 19,74 € IVA inclusa → 16,18 € IVA esclusa → 12,94 punti.

## 3. Attività e tetto

- **Attiva:** PP ≥ 33 nel mese.
- Chi **non è attiva** nel mese non matura qualifica, differenze, bonus Leader Fondatori, generazioni, pool né bonus auto. **La provvigione online e il margine sugli acquisti restano sempre.**
- **Tetto:** gli acquisti personali contano per le **soglie di qualifica** fino a 250 punti al mese. Gli ordini online e lo start kit contano per intero. Il tetto riguarda solo le soglie: **i compensi si calcolano su tutti i punti.**
- **Inattività prolungata:** dopo 6 mesi di fila con 0 PP l'incaricata torna cliente. I suoi diretti passano al suo sponsor. Operazione automatica il primo del mese, registrata nel registro modifiche. Il saldo provvigioni residuo resta richiedibile. Se riprende a comprare come incaricata riparte con lo stesso sponsor, salvo diversa richiesta approvata dalla sede.

## 4. Qualifiche

**Qualifica reale** in base ai PGQ del mese. Soglie con "maggiore o uguale".

| Qualifica | PGQ del mese | Percentuale |
| --- | --- | --- |
| Nessuna | 0 – 79,99 | 0% |
| New Star | 80 | 4% |
| Partner | 480 | 8% |
| Expert | 1.200 | 12% |
| Director | 2.800 | 16% |
| Leader | 5.600 | 20% |

**Qualifica bloccata** (impostata dalla sede): percentuale (massimo 20%), data di inizio, data di fine (vuota = senza scadenza), motivo, utente che l'ha impostata; ogni modifica va nel registro modifiche.

**Percentuale applicata (A)** = la maggiore tra la percentuale della qualifica reale e quella bloccata valida nel mese. La percentuale applicata esiste anche per chi è inattiva (serve per la differenza di chi sta sopra), ma chi è inattiva non incassa nulla su di essa.

**Leader del mese** = incaricata **attiva** con **qualifica reale** Leader (PGQ ≥ 5.600). Una qualifica bloccata al 20% dà la percentuale del 20% ma **non** rende Leader: titoli manager, linee al 20% e generazioni richiedono i punti veri. (Nella pratica chi ha una Leader sotto di sé ha già almeno 5.600 PGQ.)

## 5. Compensi mensili

Ogni mese un'incaricata può avere queste voci: provvigione online, provvigione su acquisti in promozione, margine (solo informativo), qualifica, differenza, generazioni, bonus Leader Fondatore, pool, quota pool riservata, Master President, bonus auto.

### 5a. Provvigione online
50% dei punti ON del mese. Dovuta sempre, anche se l'incaricata è inattiva.

### 5b. Qualifica sui punti personali
(AP + ON) × A, solo se attiva. Calcolata su tutti i punti, senza tetto. I punti KIT sono esclusi (sul kit la nuova incaricata non guadagna).

### 5c. Differenza imprenditoriale
Per ogni ordine (start kit compreso) con punti P generato dall'incaricata X:
1. si risale la catena degli sponsor partendo dallo sponsor di X;
2. "percentuale già pagata" iniziale = A di X (anche se X è inattiva);
3. per ogni upline U: se A di U è maggiore della percentuale già pagata, U riceve P × (A di U − percentuale già pagata), **solo se U è attiva**. In ogni caso la percentuale già pagata diventa A di U: se U è inattiva la sua quota resta all'azienda;
4. ci si ferma quando la percentuale già pagata arriva al 20%.

### 5d. Zona manager e generazioni
- **Linee al 20%** di una Leader = numero di suoi **diretti** che sono Leader del mese (attive, con qualifica reale Leader). Una Leader inattiva non conta come linea. Parametro `bloccate_contano_come_linee`, iniziale falso.
- Titolo manager, solo per le Leader del mese:

| Linee al 20% | Titolo | Generazioni pagate | Quote pool | Bonus auto |
| --- | --- | --- | --- | --- |
| 1 | Leader in crescita | 1ª 3% | 0 | — |
| 2 | Gold Leader | 1ª 4% | 1 | — |
| 3 | Prestige Director | 1ª 4%, 2ª 3% | 2 | 300 €/mese |
| 4 | President | 1ª 4%, 2ª 3%, 3ª 2% | 3 | 500 €/mese |
| 5 o più | Diamond President | 1ª 4%, 2ª 3%, 3ª 2%, 4ª 2%, 5ª 1,5% | 5 | 800 €/mese |

- **Team di una Leader L:** PP di L più i PP della sua downline, fermandosi alle Leader del mese successive (escluse, con le loro downline). Punti reali, senza tetto.
- **Leader inattiva (compressione):** chi avrebbe la qualifica reale Leader ma è inattiva non è Leader del mese: non incassa, non conta come linea e **viene saltata**. Il suo team confluisce nel team della prima Leader del mese sopra di lei; se sopra non c'è nessuna Leader del mese, quei punti non generano generazioni (restano all'azienda).
- **Generazioni:** per ogni Leader del mese L, si risale la catena: la 1ª, 2ª, 3ª… Leader del mese incontrata sopra L riceve sul team di L la percentuale della generazione corrispondente, se il suo titolo la prevede.
- **Bonus auto:** importo fisso del titolo, nei mesi in cui il titolo è raggiunto. Voce separata, finanziata dal budget marketing.

### 5e. Pool manager
- Fondo = **4% dell'incasso aziendale** del mese.
- **Quota riservata:** 1% dell'incasso a Margherita Suma, **solo se attiva** nel mese; se è inattiva quell'1% resta all'azienda. (Quota configurabile per utente dall'area sede.)
- Il resto (**3% dell'incasso**) si divide in proporzione alle quote del titolo tra i manager del mese, **esclusi quelli esclusi dal pool** (Giovanna Di Lillo). Se nessuno ha quote, resta all'azienda.
- Ogni manager incassa 3% × incasso × sue quote ÷ quote totali, calcolato in modo esatto e arrotondato al centesimo solo alla fine.

### 5f. Master President
**2% dell'incasso aziendale** del mese a Giovanna Di Lillo, ogni mese, anche se inattiva. Configurabile dall'area sede. Nei report è una voce distinta.

### 5g. Programma Leader Fondatori
- Flag per utente con data di ingresso, assegnato dalla sede. Massimo **10**, ingresso entro **12 mesi** dal lancio.
- Per **12 mesi** dall'ingresso (mese di ingresso + 11 successivi): **qualifica bloccata al 16%** (dentro il piano: vale anche per la differenza di chi sta sopra) e **bonus del 3% sui PGR** del mese, solo se attiva.
- Requisito: almeno **1.000 PGQ** sommando i PPQ suoi e della sua downline degli ordini pagati dal giorno di ingresso al 90° giorno compreso. Altrimenti blocco e bonus decadono dal mese successivo.
- Il titolo "Leader Fondatore" resta a vita, senza effetti economici.

## 6. Figure speciali

| Persona | Regole |
| --- | --- |
| **Giovanna Di Lillo** (GL000001), fondatrice, "Master President" | Master President 2% dell'incasso aziendale, anche se inattiva. Qualifica bloccata al 20% senza scadenza. Titoli e generazioni come tutti, con i punti veri. **Esclusa dal pool e dal bonus auto.** |
| **Margherita Suma**, Leader Fondatrice | Quota riservata del pool: 1% dell'incasso, solo se attiva. Programma Leader Fondatori (5g). Se diventa manager riceve **anche** le quote normali del pool e il bonus auto. |

## 7. Algoritmo mensile

Il calcolo gira sul server, in quest'ordine. Durante il mese si può rilanciare come anteprima.

1. Prendi gli ordini del mese pagati e non annullati né resi. I resi di ordini di mesi già chiusi non entrano qui: si gestiscono con gli storni (sezione 9).
2. Per ogni incaricata calcola AP, ON, KIT, PP, PPQ e se è attiva.
3. Calcola PGQ e PGR dal basso verso l'alto dell'albero, in una sola passata.
4. Assegna qualifica reale, percentuale applicata A (blocchi e Leader Fondatori compresi) e Leader del mese.
5. Conta le linee al 20% e assegna i titoli manager.
6. Calcola provvigione online e qualifica sui punti personali.
7. Calcola le differenze, ordine per ordine, risalendo gli sponsor.
8. Calcola i team (con la compressione delle Leader inattive) e le generazioni.
9. Calcola l'incasso aziendale, il pool (quota riservata e quote) e il Master President.
10. Aggiungi bonus auto e bonus Leader Fondatori.
11. Salva ogni voce come riga del registro provvigioni: beneficiaria, tipo voce, mese, base, percentuale, importo, ordini da cui provengono i punti, versione dei parametri.
12. Il mese si chiude sempre **l'ultimo giorno del mese** (23:59:59, ora italiana). Il calcolo definitivo gira subito dopo e congela il mese.

## 8. Pagamenti

- **Saldo richiedibile** = importi non ancora richiesti dei mesi precedenti + voci pagabili del mese chiuso (tutte tranne il margine) ± storni.
- Il pulsante **"Richiedi pagamento"** è attivo **dal 1° al 4 del mese successivo**, se il saldo è almeno **50 €**.
- Le richieste vanno alla contabilità e si pagano **il 20 del mese**; se il 20 è sabato, domenica o festivo nazionale, il **primo giorno lavorativo successivo**. Bonifico all'IBAN del profilo.
- Sotto 50 €, o se non richiesto, il saldo si riporta al mese dopo, senza scadenza. Un saldo negativo (per storni) si riporta e si compensa con i mesi successivi.
- **Ritenuta d'imposta:** 23% sul 78% dell'importo (17,94%), calcolata su **ogni** pagamento e per **tutte** le incaricate, arrotondata al centesimo. Bonifico del netto.
- **IVA e INPS:** per ogni incaricata "partita IVA sì/no" e "contributi INPS a carico dell'azienda sì/no". Parametri globali: aliquota IVA, aliquota contributiva, quota a carico dell'azienda, base imponibile in % dei compensi, soglia di esenzione annua. Il costo IVA e INPS a carico dell'azienda va in un report mensile separato dai compensi. Valori in attesa del commercialista: nessuna regola fiscale fissa nel codice.
- **Export per la contabilità:** compensi per incaricata e per voce (provvigione online, qualifica, differenze, generazioni, Leader Fondatori, pool, quota pool riservata, Master President, bonus auto), con dati fiscali.

## 9. Resi, storni e riacquisti

- **Reso nello stesso mese, prima della chiusura:** l'ordine si esclude dal calcolo.
- **Reso dopo la chiusura:** le qualifiche del mese passato **non si ricalcolano**. Si stornano punti e compensi collegati all'ordine, per l'incaricata e per la sua upline, nel mese in cui avviene il reso. Metodo: per ogni beneficiaria e voce, storno = importo originale − importo ricalcolato senza quell'ordine, **tenendo ferme** le percentuali applicate, i titoli, le Leader del mese e lo stato di attività del mese originale. Così, se tutto viene reso, il totale torna esattamente a zero.
- Pool, quota riservata e Master President **non si stornano** per i resi.
- **Riacquisto merce delle incaricate:** al 90% del prezzo pagato, per merce integra e rivendibile, entro 12 mesi. Si stornano il 100% dei punti dell'acquisto originale e i compensi collegati, con lo stesso metodo.
- Rimborsi Stripe → storni con lo stesso metodo.

## 10. Regole e controlli

- **Riordino responsabile:** a ogni acquisto personale l'incaricata conferma con una spunta di aver venduto o consumato almeno il 70% dell'acquisto precedente; si salva con data e ora.
- **Clienti fittizi:** segnalare alla sede i clienti con stesso indirizzo di consegna, stesso metodo di pagamento, stessa email o stesso telefono dell'incaricata a cui sono legati.
- **Vendite a clienti finali:** per ogni incaricata e per la rete, quota mensile di punti ON sul totale dei PP. Visibile nell'area sede.
- **Marketplace vietati:** la sede può sospendere un'incaricata. Chi è sospesa è trattata come inattiva (riceve solo la provvigione online).

## 11. Casi di test

Importi in euro. Tutte attive salvo dove indicato. "Totale" esclude il margine sugli acquisti personali.

| Caso | Dati | Voci attese | Totale |
| --- | --- | --- | --- |
| T1 Anna, New Star | 4 kit routine dal negozio online: 113,93 € → 91,14 punti ciascuno, 364,56 punti | PGQ 364,56 → New Star 4%. Online 50% = 182,28; qualifica 364,56 × 4% = 14,58 | 196,86 |
| T2 Luca, Partner | 546,84 punti ON; 2 diretti con 150 punti ciascuno (New Star) | PGQ 846,84 → Partner 8%. Online 273,42; qualifica 43,75; differenza 300 × 4% = 12,00 | 329,17 |
| T3 Sara, Director | 400 punti ON; 3 linee: Partner con PGQ 700, Expert con 1.300, Partner con 600 | PGQ 3.000 → Director 16%. Online 200,00; qualifica 64,00; differenze 56,00 + 52,00 + 48,00 | 420,00 |
| T4 Leader Fondatore | 300 punti AP; 5 diretti New Star per 1.450 punti in tutto | PGQ 250 + 1.450 = 1.700 → Expert reale, bloccata al 16%. Qualifica 300 × 16% = 48,00; differenze 1.450 × 12% = 174,00; bonus fondatore 3% × PGR 1.750 = 52,50 | 274,50 |
| T5 Paola, Prestige Director | 500 punti ON. 3 diretti Leader, ciascuno con team di 6.000 e sotto un'altra Leader con team di 5.600. Altre 2 linee **Expert** con 4.000 punti in tutto. Incasso aziendale 300.000 €, 12 quote pool totali tra i manager | Leader, 3 linee al 20% → Prestige Director. Online 250,00; qualifica 100,00; differenze 4.000 × 8% = 320,00; 1ª gen 18.000 × 4% = 720,00; 2ª gen 16.800 × 3% = 504,00; pool 9.000 ÷ 12 × 2 = 1.500,00; bonus auto 300,00 | 3.694,00 |
| T6 Tetto acquisti | 400 punti AP, nessun ON, nessuna squadra | PPQ 250 → New Star 4%; qualifica su tutti i punti: 400 × 4% = 16,00 | 16,00 |
| T7 Upline inattiva | X: 100 ON. Sponsor di X: U con 20 ON (inattiva) e un altro diretto Y con 400 ON → U PGQ 520, Partner 8%. Sponsor di U: V con 700 ON → PGQ 1.220, Expert 12% | X: New Star 4%. U inattiva: solo online 10,00. V: online 350,00; qualifica 84,00; differenze su X 100 × 4% = 4,00, su Y 400 × 4% = 16,00, su U 20 × 4% = 0,80. La quota di U (8% − 4%) resta all'azienda | V: 454,80 |
| T8 Start kit | Mara nuova con solo lo start kit. Sponsor di Mara: Bea, Partner 8% | Mara: PP 33 → attiva; PGQ 33 → nessuna qualifica; guadagna 0. Bea: differenza 33 × 8% = 2,64. Ordine successivo di Mara: shampoo a 19,74 € IVA inclusa (−40%) → 16,18 € → 12,94 punti | Mara 0,00; Bea 2,64 dal kit |
| T9 Pagamento minimo | Compensi del mese 42 € | Pulsante non attivo, i 42 € si sommano al mese dopo | 0,00 |
| T10 Reso dopo la chiusura | Come T1 a settembre; uno dei 4 kit routine reso a ottobre | Ricalcolo senza l'ordine a percentuali ferme: 273,42 punti → online 136,71 (−45,57), qualifica 10,94 (−3,64). Settembre invariato | −49,21 a ottobre |
| T11 Leader inattiva saltata | Paola: 600 ON, Leader. Diretti di Paola: Lina (5.600 ON, Leader) e Carla (20 ON, inattiva, PGQ 11.020). Sotto Carla: Sonia (5.000 ON, Director) e Rita (6.000 ON, Leader) | Carla non è Leader del mese: Paola ha 1 linea (Lina) → Leader in crescita, 1ª gen 3%. Online 300,00; qualifica 120,00; differenze 0 (sopra Carla al 20% non si paga). Generazioni: Lina 5.600 e Rita 6.000 (Carla saltata) → 11.600 × 3% = 348,00. Carla: solo online 10,00 | Paola: 768,00 |
| T12 Pool con le figure speciali | Incasso 300.000 €. Manager: Giovanna Prestige Director (2 quote), Margherita Gold Leader (1 quota), M2 President (3 quote). Mese A: Margherita attiva. Mese B: Margherita inattiva | A: quota riservata Margherita 3.000; 3% = 9.000 su 4 quote (Giovanna esclusa) → 2.250 a quota: Margherita 2.250, M2 6.750 + auto 500. Giovanna: Master President 6.000, pool 0, auto 0. B: l'1% resta all'azienda; M2 unico manager con quote → 9.000 + auto 500; Giovanna 6.000 | A: Margherita 5.250,00; M2 7.250,00; Giovanna 6.000,00 |
| T13 Ritenuta | Pagamento di 100,00 € | Ritenuta 17,94; bonifico 82,06, per tutte le incaricate | — |
| T14 Data di pagamento | Saldo 80 € a fine novembre 2026, richiesto il 2 dicembre | Il 20 dicembre 2026 è domenica → pagamento lunedì 21 dicembre | 80,00 lordi |
| T15 Soglia esatta | PGQ esattamente 480 | Partner 8% | — |
| T16 Acquisto in promozione | Shampoo in promozione a 27,90 €, comprato dall'incaricata per sé | Paga 27,90 € (niente sconto 40%) → 22,87 € IVA esclusa → 18,30 punti, contati come acquisti personali; provvigione 50% = 9,15 € | 9,15 |

## 12. Decisioni prese

| # | Tema | Decisione |
| --- | --- | --- |
| 1 | Entrata in vigore | Dal primo ordine; nessuno storico da convertire |
| 2 | Start kit | 33 punti fissi: contano per attività e soglie della nuova incaricata, che non guadagna su di essi; l'upline guadagna con le regole normali |
| 3 | Linee al 20% | Solo i diretti che sono Leader del mese |
| 4 | Qualifica bloccata al 20% | Dà la percentuale ma non rende Leader: titoli e generazioni con i punti veri |
| 5 | Leader inattiva | Saltata: il suo team confluisce nella prima Leader del mese sopra di lei; se non c'è, resta all'azienda |
| 6 | Differenza su un'upline inattiva | La percentuale già pagata avanza comunque, la quota resta all'azienda |
| 7 | Pagamenti | Richiesta dal 1° al 4 del mese successivo, minimo 50 €, pagamento il 20 o il primo giorno lavorativo successivo |
| 8 | Resi dopo la chiusura | Storno a percentuali ferme, senza ricalcolare le qualifiche; pool e quote fisse non si stornano |
| 9 | Margherita Suma | 1% dell'incasso solo se attiva; Leader Fondatrice; anche quote normali del pool se manager |
| 10 | Giovanna Di Lillo | Master President 2% sempre; bloccata al 20% senza scadenza; esclusa da pool e bonus auto |
| 11 | Ritenuta | 23% sul 78% su tutti i pagamenti, per tutte; IVA e INPS come parametri dove previsto |
| 12 | Ruoli sede | Amministrazione, contabilità e un terzo ruolo "ordini" |
| 13 | Caso T5 | Due linee Expert con 4.000 punti, totale 3.694,00 € |
| 14 | Leader inattiva e linee | Una Leader inattiva non conta come linea al 20% della sua sponsor nel mese |
| 15 | Requisito Leader Fondatori | I 1.000 punti in 90 giorni si contano come punti per qualifica (con il tetto di 250 sugli acquisti) |
| 16 | Promozioni | Niente sconto 40% sui prodotti in promozione; l'incaricata che li compra riceve il 50% dei punti come provvigione |

## 13. Verifiche esterne prima del lancio

- Commercialista: base dello sconto (IVA inclusa o esclusa), IVA sugli acquisti delle incaricate, ritenuta, contributi INPS, trattamento fiscale di Master President e quota riservata.
- Legale: conformità del piano alla Legge 173/2005.

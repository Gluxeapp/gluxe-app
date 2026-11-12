# G LUXE · Piano Compensi (specifiche del motore di calcolo)

Versione: 5 novembre 2026 · **rev. 6 "Piano Compensi G LUXE"**. Sostituisce la rev. 5 (resta solo nello storico di Git e non è mai stata applicata a ordini reali). Nasce dal testo del fondatore del 5/11/2026, con le sue modifiche: Giovanna Di Lillo, promozioni, start kit, Leader inattive, catalogo, limite dei compensi e linee forti (decisioni 19–26).

Questo documento traduce il piano compensi in regole univoche per il motore di calcolo dell'app G LUXE. Ogni regola deve dare un solo risultato possibile. È la fonte ufficiale: se il codice non coincide con il documento, vale il documento.

Per lo sviluppo: scrivere prima i test della sezione "Casi di test", poi il codice, finché passano tutti. Se una regola sembra ambigua o in conflitto con un'altra, fermarsi e chiedere.

**Entrata in vigore:** dal primo ordine dell'app. Non esistono ordini o compensi calcolati con regole precedenti.

**Parametri:** tutti i numeri di questo documento (percentuali, soglie, importi, coefficienti, regole fiscali) sono parametri modificabili dall'area sede, salvati in versioni con data di efficacia. Le quote delle figure speciali (Master President, quota riservata) sono impostazioni per persona, anch'esse modificabili dalla sede e registrate. I valori indicati sono quelli iniziali.

## 1. Definizioni

| Termine | Regola | Valore iniziale |
| --- | --- | --- |
| Listino | Prezzo al pubblico IVA inclusa | Shampoo Botox 33,90 €, Shampoo Detox 32,90 €, Maschera Botox 39,90 €, Spray Botox 10in1 34,90 €, Kit Routine Botox 106,90 €, start kit 59,90 € |
| Aliquota IVA | Parametro | 22% |
| Prezzo IVA esclusa | Prezzo IVA inclusa ÷ (1 + IVA), arrotondato al centesimo, **per unità** | 139,00 → 113,93 € |
| Prezzo pagato | Quanto viene pagato all'azienda per una riga d'ordine, IVA esclusa, spedizione esclusa | — |
| Punti di una riga | Coefficiente × prezzo pagato IVA esclusa **di un'unità**, arrotondato a 2 decimali, × quantità; oppure i **punti per pezzo scritti a mano** dalla sede per quel prodotto o promozione (decisione 27) | Coefficiente 0,80. 113,93 € → 91,14 punti |
| Punti AP | Punti degli acquisti personali **a listino** (con lo sconto del 40%) dell'incaricata nel mese | — |
| Punti PR | Punti degli acquisti personali **in promozione** intestati all'incaricata nel mese | — |
| Punti ON | Punti degli ordini dei suoi clienti sul negozio online nel mese, anche di prodotti in promozione | — |
| Punti KIT | 33 punti fissi del proprio start kit, nel mese in cui è pagato | 33 |
| Punti KS (kit sponsorizzati) | 33 punti per ogni start kit pagato nel mese dai suoi **diretti** | — |
| Punti personali (PP) | AP + PR + ON + KIT | — |
| Punti per l'attività | PP + KS | — |
| Punti personali per qualifica (PPQ) | ON + MIN(AP + PR; 250) + KIT | Tetto 250 sugli acquisti intestati all'incaricata |
| Punti di gruppo per qualifica (PGQ) | PPQ propri + PPQ di tutta la downline, a ogni profondità, attive o no | — |
| Punti di gruppo reali (PGR) | PP propri + PP di tutta la downline, senza tetto | — |
| Attiva | Punti per l'attività ≥ 33 nel mese | 33 |
| Incasso aziendale del mese | Somma dei prezzi pagati IVA esclusa di **tutti** gli ordini del mese (start kit compresi), spedizioni escluse | Base di Master President e quota riservata |
| Punti aziendali del mese | Somma dei punti di **tutti** gli ordini del mese (start kit compresi, ogni ordine una volta sola) | Base del pool manager |
| Mese di competenza | Mese in cui Stripe conferma il pagamento dell'ordine (ora italiana) | — |

Arrotondamento: ogni voce si calcola a 2 decimali con arrotondamento commerciale (0,005 va in su). Il totale è la somma delle voci già arrotondate. Esempio: 364,56 × 4% = 14,5824 → 14,58 €.

I punti KS **non** entrano in PP, PPQ, PGQ, PGR né nei team: i 33 punti del kit si contano una volta sola, nei punti della nuova incaricata. Alla sponsor servono solo per l'attività e come base della provvigione sul kit (5a-ter).

## 2. Tipi di ordine

| Tipo | Prezzo | Punti | Chi guadagna |
| --- | --- | --- | --- |
| **Start kit** (ingresso) | 59,90 € IVA inclusa. Contiene shampoo, spray, licenza account incaricata, borsa campionario e materiale formativo | **33 punti fissi** (non con il coefficiente): punti KIT della nuova incaricata, KS della sponsor | La nuova incaricata non guadagna sul kit; i 33 punti valgono per la sua attività e per le soglie. **La sponsor** riceve il 50% dei punti (se attiva; i 33 punti contano anche per la sua attività) **più la differenza**; l'upline guadagna con le regole normali (differenza, generazioni) |
| **Acquisto personale** | Listino − **40%** (sconto sul prezzo IVA inclusa; parametro `sconto_su_prezzo_ivato`, iniziale vero, da confermare con il commercialista) | Coefficiente × prezzo pagato IVA esclusa = punti AP | Nessuna provvigione: lo sconto è il suo guadagno (margine, solo informativo). Qualifica e differenze normali |
| **Acquisto personale in promozione** (intestato all'incaricata) | Prezzo in promozione, **senza** lo sconto del 40% | Coefficiente × prezzo pagato IVA esclusa = punti PR, nel tetto di 250 insieme agli AP | Come un ordine online: provvigione del 50% dei punti più la qualifica, ma **solo se attiva**. L'upline guadagna con le regole normali |
| **Ordine cliente dal negozio online** | Listino pieno, o prezzo in promozione se il prodotto è in promozione, pagato dal cliente legato all'incaricata del link | Coefficiente × prezzo pagato IVA esclusa = punti ON, senza tetto | **Provvigione online = 50% dei punti** (= 40% del prezzo IVA esclusa), dovuta sempre; qualifica e differenze normali |

- Lo start kit attiva l'account. **Sconto del 40% e negozio online si attivano dall'ordine successivo.**
- **Spedizione:** 6,90 € per ogni ordine, a carico di chi ordina, senza soglia di gratuità. Non genera punti né compensi e non entra nell'incasso aziendale.
- Esempio acquisto personale: Shampoo Botox 33,90 € → pagato 20,34 € IVA inclusa → 16,67 € IVA esclusa → 13,34 punti.
- **Margine (solo informativo)** = (listino IVA inclusa − prezzo pagato IVA inclusa) × quantità, solo sulle righe a listino scontato (promozioni e start kit non hanno margine). Il listino si fotografa nella riga d'ordine. Conta nel mese in cui Stripe conferma il pagamento; ordini annullati o resi esclusi. L'incaricata lo vede nella pagina Provvigioni (mese in corso, mesi precedenti e totale dell'anno); non entra nel saldo né nei pagamenti. Esempio: 3 Shampoo Botox → (33,90 − 20,34) × 3 = 40,68 €.

## 3. Attività e tetto

- **Attiva:** punti per l'attività (PP + KS) ≥ 33 nel mese.
- Chi **non è attiva** nel mese non matura qualifica, provvigione sulle promozioni, provvigione sui kit, differenze, generazioni, bonus Leader Fondatori, pool, quota riservata né bonus auto. La sua quota resta all'azienda. **La provvigione online e il margine sugli acquisti restano sempre.**
- **Tetto per la qualifica:** gli acquisti intestati all'incaricata (AP + PR) contano per le soglie di qualifica fino a **250 punti al mese**. Ordini online e start kit contano sempre per intero. Il tetto riguarda solo le soglie: **i compensi si calcolano su tutti i punti.**
- **Inattività prolungata:** dopo 6 mesi di fila con 0 PP l'incaricata torna cliente. I suoi diretti passano al suo sponsor (compressione). Operazione automatica il primo del mese, registrata nel registro modifiche. Il saldo provvigioni residuo resta richiedibile.
- **Sospensione** (per esempio vendita su marketplace vietati): chi è sospesa è trattata come inattiva (riceve solo la provvigione online).

### 3a. Licenza annuale dell'app (decisione 31)

- **Validità:** 12 mesi dal pagamento dello start kit (parametro `licenzaMesi`). Esempio: start kit pagato il 15/03/2026 → licenza valida fino al 14/03/2027 compreso, scaduta dal 15/03/2027. Per chi non ha un pagamento dello start kit registrato (incaricate inserite prima della Fase 3) la licenza parte dalla data di lancio del piano (`dataLancioPiano`); finché la data non è decisa non scade. **Esente:** solo Giovanna Di Lillo (GL000001), la cui licenza non scade.
- **Rinnovo:** 29,90 € IVA inclusa (prezzo del prodotto "Licenza annuale" nel catalogo, modificabile dall'amministrazione), pagato con Stripe come gli ordini, senza spedizione. **Non dà punti a nessuno** e l'importo va tutto all'azienda: non entra nei punti, nell'incasso aziendale (Master President, quota riservata) né in nessun compenso.
- **Quando si rinnova:** da 30 giorni prima della scadenza (parametro `licenzaAnticipoGiorni`) fino all'ultimo giorno del mese successivo a quello della scadenza. Rinnovo prima della scadenza: nuova scadenza = vecchia scadenza + 12 mesi (nessun giorno perso). Rinnovo dopo la scadenza: 12 mesi dal giorno del pagamento.
- **Avvisi:** via email e nell'app 30 e 7 giorni prima della scadenza (parametri `licenzaPrimoAvvisoGiorni` e `licenzaSecondoAvvisoGiorni`).
- **Licenza scaduta:** l'incaricata accede all'app solo in visualizzazione. Può solo rinnovare la licenza e chiedere il pagamento delle provvigioni già maturate nei mesi chiusi. Non può ordinare, il suo negozio online è chiuso e non può modificare i suoi dati. Squadra, clienti e punti restano suoi.
- **Mesi fermi:** ogni mese che si chiude con la licenza scaduta all'ultimo giorno del mese, l'incaricata **non matura nulla, nemmeno la provvigione online**. I suoi punti (anche quelli dei suoi clienti) contano per le qualifiche e le differenze di chi sta sopra, come per un'inattiva. Esempio: scade il 15 marzo e rinnova il 10 aprile → marzo fermo, aprile normale.
- **Licenza decaduta:** se non rinnova entro l'ultimo giorno del mese successivo alla scadenza, con la chiusura di quel mese le sue dirette passano alla sua sponsor (compressione) e anche i suoi clienti; lei torna cliente e non accede più come incaricata. Può solo entrare per chiedere il pagamento del saldo provvigioni residuo. Ogni passaggio va nel registro modifiche, nello storico degli sponsor e nello storico dei legami dei clienti.

## 4. Qualifiche

**Qualifica reale** in base ai PGQ del mese. Soglie con "maggiore o uguale".

| Qualifica | PGQ del mese | Percentuale |
| --- | --- | --- |
| Nessuna | 0 – 99,99 | 0% |
| New Star | 100 | 4% |
| Partner | 600 | 8% |
| Expert | 2.400 | 12% |
| Director | 6.000 | 16% |
| Leader | 12.000 | 20% |

**Qualifica bloccata** (impostata dalla sede): percentuale (massimo 20%), data di inizio, data di fine (vuota = senza scadenza), motivo, utente che l'ha impostata; ogni modifica va nel registro modifiche. Vale nel mese se è valida in almeno un giorno del mese.

**Percentuale applicata (A)** = la maggiore tra la percentuale della qualifica reale e quelle bloccate valide nel mese (compreso il blocco dei Leader Fondatori). Esiste anche per chi è inattiva (serve per la differenza di chi sta sopra), ma chi è inattiva non incassa nulla su di essa.

**Leader del mese** = incaricata **attiva** con percentuale applicata del 20% (anche se bloccata). Una Leader inattiva non è Leader del mese (sezione 5d).

## 5. Compensi mensili

Voci possibili: provvigione online, provvigione promozioni, provvigione kit, margine (solo informativo), qualifica, differenza, generazioni, bonus Leader Fondatore, pool, quota riservata, Master President, bonus auto.

### 5a. Provvigione online
50% dei punti ON del mese. Dovuta sempre, anche se l'incaricata è inattiva.

### 5a-bis. Provvigione sugli acquisti in promozione
50% dei punti PR del mese, **solo se attiva**.

### 5a-ter. Provvigione sugli start kit dei diretti
50% dei punti KS del mese alla sponsor, **solo se attiva** (i 33 punti del kit contano per la sua attività, quindi con un kit pagato è attiva).

### 5b. Qualifica sui punti personali
(AP + PR + ON) × A, solo se attiva. Calcolata su tutti i punti, senza tetto. I punti KIT sono esclusi (sul proprio kit la nuova incaricata non guadagna).

### 5c. Differenza imprenditoriale
Per i punti P di ogni incaricata X nel mese (PP, start kit compreso):
1. si risale la catena degli sponsor partendo dallo sponsor di X;
2. "percentuale già pagata" iniziale = A di X (anche se X è inattiva);
3. per ogni upline U: se A di U è maggiore della percentuale già pagata, U riceve P × (A di U − percentuale già pagata), **solo se U è attiva**. In ogni caso la percentuale già pagata diventa A di U: se U è inattiva la sua quota resta all'azienda;
4. ci si ferma quando la percentuale già pagata arriva al 20%.

Una voce per ogni coppia (upline, incaricata di origine), arrotondata al centesimo. Tutti gli ordini di X nel mese hanno la stessa catena e le stesse percentuali, quindi il risultato è uguale a quello ordine per ordine.

### 5d. Zona manager e generazioni
- **Linee forti** di una Leader del mese = numero di suoi **diretti** con PGQ ≥ `soglia_linea_forte` (iniziale **8.000 punti**), anche se non sono al 20% e anche se inattivi. Le linee forti danno il titolo manager, le quote pool e il bonus auto.
- Titolo manager, solo per le Leader del mese:

| Linee forti | Titolo | Generazioni pagate | Quote pool | Bonus auto |
| --- | --- | --- | --- | --- |
| 1 | Leader in crescita | 1ª 3% | 0 | — |
| 2 | Gold Leader | 1ª 4% | 1 | — |
| 3 | Prestige Director | 1ª 4%, 2ª 3% | 2 | 300 €/mese |
| 4 | President | 1ª 4%, 2ª 3%, 3ª 2% | 3 | 500 €/mese |
| 5 o più | Diamond President | 1ª 4%, 2ª 3%, 3ª 2%, 4ª 2%, 5ª 1,5% | 5 | 800 €/mese |

- **Team di una Leader del mese L:** PP di L più i PP della sua downline, fermandosi alle Leader del mese successive (escluse, con le loro downline). Punti reali, senza tetto.
- **Leader inattiva (compressione):** chi ha il 20% ma è inattiva non è Leader del mese: non incassa e **viene saltata**. Il suo team confluisce nel team della prima Leader del mese sopra di lei; se sopra non c'è nessuna Leader del mese, quei punti non generano generazioni (restano all'azienda). La sua linea conta comunque come linea forte per la sua sponsor se il suo gruppo raggiunge la soglia.
- **Generazioni:** si pagano solo sui team delle Leader del mese, così gli stessi punti non si pagano due volte come differenza e come generazione (sopra il 20% la differenza si ferma). Per ogni Leader del mese L si risale la catena: la 1ª, 2ª, 3ª… Leader del mese incontrata sopra L riceve, sul team di L, la percentuale della generazione corrispondente, se il suo titolo la prevede. Una voce per ogni coppia (Leader che riceve, L).
- **Bonus auto:** importo fisso del titolo, nei mesi in cui il titolo è raggiunto. Voce separata, finanziata dal budget marketing.

### 5e. Pool manager
- Fondo = **3% dei punti aziendali** del mese (1 punto = 1 €).
- Si divide in proporzione alle quote del titolo tra le Leader del mese, **escluse quelle escluse dal pool** (Giovanna Di Lillo). Se nessuno ha quote, resta all'azienda.
- Ogni manager incassa 3% × punti aziendali × sue quote ÷ quote totali, calcolato in modo esatto e arrotondato al centesimo solo alla fine.

### 5e-bis. Quota riservata
**1% dell'incasso aziendale** IVA esclusa a **Margherita Suma**, separata dal pool, **solo se attiva** nel mese (se è inattiva resta all'azienda). Configurabile per persona dall'area sede.

### 5f. Master President
**2% dell'incasso aziendale** del mese a Giovanna Di Lillo, ogni mese, **anche se inattiva**. Configurabile dall'area sede. Nei report è una voce distinta.

### 5g. Programma Leader Fondatori
- Flag per utente con data di ingresso, assegnato dalla sede. Massimo **10**, ingresso entro **12 mesi** dal lancio.
- Per **12 mesi** dall'ingresso (mese di ingresso + 11 successivi): **qualifica bloccata al 12%** (Expert: vale anche per la differenza di chi sta sopra) e **bonus del 3% sui PGR** del mese, solo se attiva.
- Requisito: almeno **1.000 PGQ** sommando i punti per qualifica suoi e della sua downline degli ordini pagati dal giorno di ingresso al 90° giorno compreso (tetto di 250 punti al mese sugli acquisti intestati, per ogni incaricata). Altrimenti blocco e bonus decadono dal mese successivo al 90° giorno.
- Il titolo "Leader Fondatore" resta a vita, senza effetti economici.

## 6. Figure speciali

| Persona | Regole |
| --- | --- |
| **Giovanna Di Lillo** (GL000001), fondatrice, "Master President" | Master President 2% dell'incasso aziendale, **anche se inattiva**. Qualifica bloccata al 20% senza scadenza (quindi, se attiva, è Leader del mese: titoli e generazioni con le sue linee forti). **Esclusa dal pool e dal bonus auto.** |
| **Margherita Suma**, Leader Fondatrice | Quota riservata 1% dell'incasso, solo se attiva. Programma Leader Fondatori (5g). Se diventa manager riceve **anche** le quote normali del pool e il bonus auto. |

## 7. Algoritmo mensile

Il calcolo gira sul server, in quest'ordine. Durante il mese si può rilanciare come anteprima.

1. Prendi gli ordini del mese pagati e non annullati né resi. I resi di ordini di mesi già chiusi non entrano qui: si gestiscono con gli storni (sezione 9).
2. Per ogni incaricata calcola AP, PR, ON, KIT, KS, PP, PPQ e se è attiva (le sospese sono inattive).
3. Calcola PGQ e PGR dal basso verso l'alto dell'albero, in una sola passata.
4. Assegna qualifica reale, percentuale applicata A (blocchi e Leader Fondatori compresi) e Leader del mese.
5. Conta le linee forti e assegna i titoli manager.
6. Calcola provvigione online, sulle promozioni, sui kit e qualifica sui punti personali.
7. Calcola le differenze risalendo gli sponsor.
8. Calcola i team (con la compressione delle Leader inattive) e le generazioni.
9. Calcola punti aziendali, incasso aziendale, pool, quota riservata e Master President.
10. Aggiungi bonus auto e bonus Leader Fondatori.
11. Esegui i controlli di quadratura (sezione 10). Salva ogni voce come riga del registro provvigioni: beneficiaria, tipo voce, mese, base, percentuale, importo, origine (incaricata o ordini da cui provengono i punti), versione dei parametri.
12. Il mese comprende gli ordini pagati fino all'**ultimo giorno del mese** (23:59:59, ora italiana). **Chiusura:** il giorno 1 alle 3:00 l'app prepara il calcolo del mese finito con i controlli e avvisa l'amministrazione via email; l'amministrazione controlla l'anteprima e conferma con "Chiudi il mese". Solo con la conferma il mese si congela e le incaricate possono chiedere il pagamento. Finché non è confermato, il calcolo si può rifare.
13. Un pagamento confermato da Stripe dopo la chiusura del mese a cui apparterrebbe conta nel **primo mese ancora aperto**.

## 8. Pagamenti

- **Pagamento mensile**: nessun acconto o saldo quindicinale.
- **Saldo richiedibile** = importi non ancora richiesti dei mesi precedenti + voci pagabili del mese chiuso (tutte tranne il margine) ± storni.
- Il pulsante **"Richiedi pagamento"** è attivo **dal 3 al 6 del mese successivo** (il mese si chiude il 1°), se il saldo è almeno **50 €**.
- Le richieste vanno alla contabilità e si pagano **il 20 del mese**; se il 20 è sabato, domenica o festivo nazionale (il 4 ottobre non si considera), il **primo giorno lavorativo successivo**. Bonifico all'IBAN del profilo.
- Sotto 50 €, o se non richiesto, il saldo si riporta al mese dopo, senza scadenza. Un saldo negativo (per storni) si riporta e si compensa con i mesi successivi.
- **Ritenuta d'imposta:** 23% sul 78% dell'importo (17,94%), calcolata su **ogni** pagamento e per **tutte** le incaricate, arrotondata al centesimo. Bonifico del netto.
- **IVA e INPS:** per ogni incaricata "partita IVA sì/no" e "contributi INPS a carico dell'azienda sì/no". Parametri globali: aliquota IVA, aliquota contributiva, quota a carico dell'azienda, base imponibile in % dei compensi, soglia di esenzione annua. Il costo IVA e INPS a carico dell'azienda va in un report mensile separato dai compensi. Valori in attesa del commercialista: nessuna regola fiscale fissa nel codice.
- **Export per la contabilità:** compensi per incaricata e per voce (provvigione online, promozioni, kit, qualifica, differenze, generazioni, Leader Fondatori, pool, quota riservata, Master President, bonus auto), con dati fiscali.

### 8a. Documento delle provvigioni per l'incaricata (decisione 28)

- Per ogni pagamento l'app prepara il documento che l'incaricata emette verso G LUXE per le provvigioni da vendita a domicilio (Legge 173/2005). Nasce quando la **contabilità approva** la richiesta, porta la **data del pagamento** (il 20 o il primo giorno lavorativo successivo) e un **numero progressivo per incaricata e per anno**. Dopo non si modifica più: una correzione diventa un nuovo documento.
- Intestazione: dati dell'incaricata (nome, indirizzo, telefono, email, codice fiscale, partita IVA se c'è); destinataria G LUXE (ragione sociale, sede, codice fiscale e partita IVA dalle impostazioni dell'azienda). Righe: richiesta di pagamento con il mese di competenza dei guadagni; in fondo IBAN dell'incaricata. Lo scaricano in PDF l'incaricata (solo i suoi) e amministrazione e contabilità.
- Il tipo dipende dal profilo dell'incaricata (campo "regime": nessuna partita IVA, partita IVA ordinaria, partita IVA forfettaria):

| Regime | Documento | Righe, nell'ordine |
| --- | --- | --- |
| Senza partita IVA | **Ricevuta** "Provvigioni per vendite a domicilio (Legge 173/2005)" | Imponibile; ritenuta 23% sul 78%; **bollo 2,00 € tolto all'incaricata** se l'imponibile supera 77,47 € (parametri), con la dicitura del bollo virtuale e il numero di autorizzazione dell'Agenzia delle Entrate; totale da pagare |
| Partita IVA ordinaria | **Fattura proforma** per provvigioni incaricato vendite a domicilio | Imponibile; IVA 22% (parametro); ritenuta 23% sul 78% dell'imponibile; ritenuta INPS gestione separata (quota dell'incaricata, parametri; 0,00 finché non superata la soglia annua); totale da pagare = imponibile + IVA − ritenute |
| Partita IVA forfettaria | **Fattura proforma** senza IVA, con la dicitura del regime forfettario | Imponibile; ritenuta (parametro, iniziale 23% sul 78%, da confermare con il commercialista); bollo 2,00 € tolto all'incaricata sopra 77,47 €; totale da pagare |

- Chi ha la partita IVA riceve una **proforma**: la fattura elettronica valida (Sistema di Interscambio) la emette lei con il suo programma, con gli stessi importi.
- Il bonifico è il **totale da pagare** del documento.

### 8b. F24 delle ritenute (decisione 28)

- Le ritenute dei pagamenti fatti in un mese si versano con l'F24 entro il **16 del mese successivo** (se è sabato, domenica o festivo, il primo giorno lavorativo successivo).
- L'app compila l'F24 in automatico, sezione Erario: **codice tributo 1038**, mese di riferimento e anno = mese e anno dei pagamenti, importo = somma delle ritenute d'imposta di quei pagamenti, dati di G LUXE come contribuente. Si scarica in PDF da stampare o ricopiare nell'home banking, con l'elenco dei pagamenti che lo compongono. La contabilità segna "versato" con la data.
- La quota INPS (quando i parametri saranno diversi da zero) avrà la sua sezione: da definire con il commercialista.
- INPS provvisorio, finché il commercialista non conferma: contributo = aliquota × base imponibile (% dei compensi) sulla parte dei compensi dell'anno oltre la soglia di esenzione; l'azienda paga la sua quota (report separato), il resto si trattiene all'incaricata. Vale per chi non è forfettaria. Con i parametri a zero (oggi) il contributo è zero.

### 8c. File dei bonifici SEPA (decisione 28)

- Per ogni data di pagamento la contabilità scarica un **file XML SEPA Credit Transfer** nel formato **ISO 20022 pain.001.001.03, profilo italiano CBI**, da caricare nell'home banking: un bonifico per ogni richiesta approvata, importo = totale da pagare, IBAN e nome dell'incaricata, causale "Provvigioni MM/AAAA, documento n. X", data di esecuzione = data del pagamento, addebito sul conto di G LUXE (IBAN e codice CUC della banca nelle impostazioni dell'azienda).
- Prima di creare il file l'app controlla ogni IBAN (formato e codice di controllo) e scarta con un avviso le richieste con IBAN non valido. Ogni file scaricato si registra (chi, quando, quali bonifici); un bonifico già messo in un file non si rimette in un altro senza annullare prima il file.
- F24, file bonifici e documenti di tutte le incaricate: solo **amministrazione e contabilità** (lo staff "ordini" non li vede).

## 9. Resi, storni e riacquisti

- **Reso nello stesso mese, prima della chiusura** (per esempio recesso entro 14 giorni): l'ordine si esclude dal calcolo.
- **Reso dopo la chiusura:** le qualifiche del mese passato **non si ricalcolano**. Si stornano punti e compensi collegati all'ordine, per l'incaricata e per la sua upline, dal pagamento del mese in cui avviene il reso. Metodo: per ogni beneficiaria e voce, storno = importo ricalcolato senza quell'ordine − importo originale, **tenendo ferme** le percentuali applicate, i titoli, le Leader del mese e lo stato di attività del mese originale. Così, se tutto viene reso, il totale torna esattamente a zero. Un saldo negativo si riporta sui mesi successivi.
- Pool, quota riservata, Master President e bonus auto **non si stornano** per i resi.
- **Riacquisto merce delle incaricate:** al 90% del prezzo pagato, per merce integra e rivendibile, entro 12 mesi. Si stornano il 100% dei punti dell'acquisto originale e i compensi collegati, con lo stesso metodo.
- Rimborsi Stripe → storni con lo stesso metodo.

## 10. Regole e controlli

- **Riordino responsabile:** dal secondo acquisto personale l'incaricata conferma con una spunta di aver venduto o consumato almeno il 70% dell'acquisto precedente; si salva con data e ora.
- **Clienti fittizi:** segnalare alla sede (solo la segnalazione, calcolata sul server) i clienti con stesso indirizzo di consegna, stesso metodo di pagamento, stessa email o stesso telefono dell'incaricata a cui sono legati.
  - Confronti (decisione 29): indirizzo = via e CAP normalizzati (maiuscole, senza punteggiatura e spazi doppi) di un ordine del cliente uguali a quelli del profilo o di un ordine personale dell'incaricata; metodo di pagamento = stessa impronta della carta (o stesso conto PayPal) fornita da Stripe; email senza differenze tra maiuscole e minuscole; telefono confrontato sulle sole cifre, senza prefisso +39.
- **Vendite a clienti finali:** per ogni incaricata e per la rete, quota mensile di punti ON sul totale dei PP. Visibile nell'area sede. Rete = l'incaricata più tutta la sua downline (punti reali, senza tetto). Senza PP la quota non si calcola (si mostra "—").
- **Controlli prima della chiusura** (bloccano la chiusura se falliscono, l'anteprima li mostra):
  - totale punti delle incaricate = punti aziendali; ogni ordine pagato contato una e una sola volta;
  - ogni ordine appartiene a un'incaricata esistente; ogni sponsor esiste; nessun ciclo nella genealogia;
  - nessun punto o voce negativa;
  - totale compensi = somma delle voci;
  - compensi complessivi (bonus auto escluso, perché a carico del budget marketing) non oltre il **70% dei punti aziendali** del mese (parametro; decisione 26).
- **Sponsor:** non si cambia dopo il primo ordine pagato dell'incaricata, salvo intervento della sede registrato con motivo.

## 11. Casi di test

Importi in euro. Tutte attive salvo dove indicato. "Totale" esclude il margine sugli acquisti personali. I casi usano prezzi d'esempio (per esempio un kit da 139,00 €), non per forza quelli del listino attuale.

| Caso | Dati | Voci attese | Totale |
| --- | --- | --- | --- |
| T1 Anna, New Star | 4 kit da 139,00 € dal negozio online: 113,93 € → 91,14 punti ciascuno, 364,56 punti | PGQ 364,56 → New Star 4%. Online 50% = 182,28; qualifica 364,56 × 4% = 14,58 | 196,86 |
| T2 Luca, Partner | 546,84 punti ON; 2 diretti con 150 punti ciascuno (New Star) | PGQ 846,84 → Partner 8%. Online 273,42; qualifica 43,75; differenza 300 × 4% = 12,00 | 329,17 |
| T3 Sara, Director | 400 punti ON; 3 linee: Expert con PGQ 2.600, Partner con 1.500 e Partner con 1.700 | PGQ 6.200 → Director 16%. Online 200,00; qualifica 64,00; differenze 2.600 × 4% = 104,00 e 3.200 × 8% = 256,00 | 624,00 |
| T4 Leader Fondatore | 300 punti AP; 5 diretti New Star per 1.450 punti in tutto | PGQ 250 + 1.450 = 1.700 → Partner reale, bloccata al 12%. Qualifica 300 × 12% = 36,00; differenze 1.450 × 8% = 116,00; bonus fondatore 3% × PGR 1.750 = 52,50 | 204,50 |
| T5 Paola, Prestige Director | 500 punti ON. 3 diretti Director con 11.600 punti di gruppo ciascuno (linee forti) e 2 diretti Partner con 4.000 punti in tutto. Punti aziendali del mese 240.000, 12 quote pool totali | Leader, 3 linee forti → Prestige Director. Online 250,00; qualifica 100,00; differenze 34.800 × 4% = 1.392,00 e 4.000 × 12% = 480,00; nessuna generazione (nessuna linea al 20%); pool 3% × 240.000 = 7.200 ÷ 12 × 2 = 1.200,00; bonus auto 300,00 | 3.722,00 |
| T6 Tetto acquisti | 400 punti AP, nessun ON, nessuna squadra | PPQ 250 → New Star 4%; qualifica su tutti i punti: 400 × 4% = 16,00 | 16,00 |
| T7 Upline inattiva | X: 150 ON. Sponsor di X: U con 20 ON (inattiva) e un altro diretto Y con 600 ON → U PGQ 770, Partner 8%. Sponsor di U: V con 1.700 ON → PGQ 2.470, Expert 12% | X: New Star 4%. U inattiva: solo online 10,00. V: online 850,00; qualifica 204,00; differenze su X 150 × 4% = 6,00, su Y 600 × 4% = 24,00, su U 20 × 4% = 0,80. La quota di U (8% − 4%) resta all'azienda | V: 1.084,80 |
| T8 Start kit | Mara nuova con solo lo start kit. Sponsor di Mara: Bea, Partner 8% (600 ON) | Mara: PP 33 → attiva; PGQ 33 → nessuna qualifica; guadagna 0. Bea: provvigione kit 50% × 33 = 16,50 e differenza 33 × 8% = 2,64. Ordine successivo di Mara: Shampoo Botox a 20,34 € IVA inclusa (−40%) → 16,67 € → 13,34 punti | Mara 0,00; Bea 19,14 dal kit |
| T9 Pagamento minimo | Compensi del mese 42 € | Pulsante non attivo, i 42 € si sommano al mese dopo | 0,00 |
| T10 Reso dopo la chiusura | Come T1 a settembre; uno dei 4 kit reso a ottobre | Ricalcolo senza l'ordine a percentuali ferme: 273,42 punti → online 136,71 (−45,57), qualifica 10,94 (−3,64). Settembre invariato | −49,21 a ottobre |
| T11 Leader inattiva saltata | Paola: 600 ON. Diretti di Paola: Lina (12.000 ON, Leader) e Carla (20 ON, inattiva, PGQ 18.020). Sotto Carla: Sonia (6.000 ON, Director) e Rita (12.000 ON, Leader). Nessun altro ordine nel mese | Carla non è Leader del mese ma la sua linea è forte: Paola ha 2 linee forti (Lina, Carla) → Gold Leader. Online 300,00; qualifica 120,00; differenze 0 (sopra Carla al 20% non si paga); 1ª gen su Lina 12.000 e Rita 12.000 (Carla saltata) → 24.000 × 4% = 960,00; pool: 3% × 30.620 = 918,60, unica con quote → 918,60. Carla: solo online 10,00 | Paola: 2.298,60 |
| T12 Pool con le figure speciali | Giovanna (bloccata 20%, 3 linee forti → Prestige Director, 2 quote), Margherita (Leader, 2 linee forti → Gold Leader, 1 quota), M2 (Leader, 4 linee forti → President, 3 quote). Punti aziendali 72.300, incasso 90.375 €. Mese B: Margherita senza punti propri (inattiva), punti 72.200, incasso 90.250 € | A: pool 3% × 72.300 = 2.169 su 4 quote (Giovanna esclusa) → Margherita 542,25, M2 1.626,75; quota riservata Margherita 1% = 903,75; Master President Giovanna 2% = 1.807,50; bonus auto M2 500, Giovanna 0. B: Margherita nessuna quota e nessun 1%; pool 2.166 tutto a M2; Giovanna 1.805,00 | — |
| T13 Ritenuta | Pagamento di 100,00 € | Ritenuta 17,94; bonifico 82,06, per tutte le incaricate | — |
| T14 Data di pagamento | Saldo 80 € a fine novembre 2026, richiesto il 4 dicembre | Il 20 dicembre 2026 è domenica → pagamento lunedì 21 dicembre | 80,00 lordi |
| T15 Soglia esatta | PGQ esattamente 600 | Partner 8% | — |
| T16 Acquisto in promozione | Anna compra per sé uno shampoo in promozione a 27,90 € e ha 90 punti ON. Sponsor di Anna: Bea, Expert 12% | Anna paga 27,90 € (niente sconto 40%) → 22,87 € → 18,30 punti PR. PP 108,30 → attiva; PPQ 90 + 18,30 = 108,30 → New Star 4%. Anna: online 45,00; promozione 50% × 18,30 = 9,15; qualifica 108,30 × 4% = 4,33. Bea: differenza 108,30 × 8% = 8,66 | Anna 58,48; Bea 8,66 da Anna |
| T17 Promozione da inattiva | Anna nel mese compra solo lo shampoo in promozione (18,30 punti PR). Sponsor Bea, Expert 12%, attiva | Anna: 18,30 < 33 → inattiva, nessuna qualifica (A = 0%): nessuna provvigione. Bea: differenza 18,30 × 12% = 2,20 | Anna 0,00; Bea 2,20 |
| T18 Tetto anche sulle promozioni per sé | 300 punti AP e 250 punti PR, nessun ON, nessuna squadra | PPQ = MIN(550; 250) = 250 → New Star 4%. Promozione 50% × 250 = 125,00; qualifica 550 × 4% = 22,00 | 147,00 |
| T19 Kit di una sponsor senza altri punti | Bea non compra nulla; Mara (sua diretta) paga lo start kit. Sponsor di Bea: Cleo, Partner 8% | Bea: KS 33 → attiva; PGQ 33 → nessuna qualifica; provvigione kit 16,50; differenza 0. Cleo: differenza 33 × 8% = 2,64 | Bea 16,50; Cleo 2,64 |
| T20 Giovanna inattiva | Giovanna senza punti nel mese, incasso aziendale 10.000 € | Master President 200,00; nessun'altra voce | 200,00 |
| T21 Ricevuta senza partita IVA | Pagamento di 104,87 € | Ritenuta 104,87 × 17,94% = 18,81; bollo 2,00 (oltre 77,47 €) | Totale da pagare 84,06 |
| T22 Ricevuta sotto la soglia del bollo | Pagamento di 60,00 € | Ritenuta 10,76; nessun bollo | Totale da pagare 49,24 |
| T23 Fattura partita IVA ordinaria | Pagamento di 132,20 € | IVA 22% 29,08; ritenuta 23,72; INPS 0,00 (parametri a zero) | Totale da pagare 137,56 |
| T24 Fattura forfettaria | Pagamento di 132,20 € | Niente IVA; ritenuta 23,72 (parametro iniziale); bollo 2,00 | Totale da pagare 106,48 |
| T25 F24 | Pagamenti del 21/12/2026 di T21 e T23 | Codice tributo 1038, mese 12, anno 2026, importo 18,81 + 23,72 = 42,53. Il 16/01/2027 è sabato → scadenza lunedì 18/01/2027 | 42,53 |
| T26 Numerazione | Seconda ricevuta dell'anno della stessa incaricata; prima del nuovo anno | N. 2; a gennaio si riparte da 1 | — |
| T27 Mese fermo per licenza scaduta | X: 150 ON, licenza scaduta all'ultimo giorno del mese. Sponsor di X: V con 1.700 ON | X: PGQ 150 → New Star 4% (serve per la differenza di V), ma non matura nulla: niente provvigione online (75,00 persi). V: PGQ 1.850 → Partner 8%. Online 850,00; qualifica 1.700 × 8% = 136,00; differenza su X 150 × 4% = 6,00 | X 0,00; V 992,00 |
| T28 Date della licenza | Start kit pagato il 15/03/2026 | Valida fino al 14/03/2027. Rinnovabile dal 12/02/2027 (30 giorni prima); avvisi il 12/02/2027 e il 07/03/2027. Rinnovo il 01/03/2027 → valida fino al 14/03/2028. Rinnovo invece il 10/04/2027 (dopo la scadenza) → valida fino al 09/04/2028; marzo 2027 fermo. Ultimo giorno per rinnovare: 30/04/2027; senza rinnovo decade con la chiusura di aprile 2027 | — |

Controlli aggiuntivi automatici: lo stesso mese calcolato con gli ordini e le incaricate in ordine mescolato dà lo stesso risultato al centesimo; lo stesso calcolo ripetuto due volte dà lo stesso risultato; se tutti gli ordini di un mese vengono resi, gli storni riportano a zero le voci stornabili.

## 12. Decisioni prese

| # | Tema | Decisione |
| --- | --- | --- |
| 1 | Entrata in vigore | Dal primo ordine; nessuno storico da convertire |
| 6 | Differenza su un'upline inattiva | La percentuale già pagata avanza comunque, la quota resta all'azienda |
| 7 | Pagamenti | Richiesta dal 3 al 6 del mese successivo (spostata dal 1–4 il 30/10/2026, dopo la chiusura del mese il 1°), minimo 50 €, pagamento il 20 o il primo giorno lavorativo successivo |
| 8 | Resi dopo la chiusura | Storno a percentuali ferme, senza ricalcolare le qualifiche; pool, quote fisse e bonus auto non si stornano |
| 9 | Margherita Suma | 1% dell'incasso solo se attiva; Leader Fondatrice; anche quote normali del pool se manager |
| 11 | Ritenuta | 23% sul 78% su tutti i pagamenti, per tutte; IVA e INPS come parametri dove previsto |
| 12 | Ruoli sede | Amministrazione, contabilità e un terzo ruolo "ordini" |
| 15 | Requisito Leader Fondatori | I 1.000 punti in 90 giorni si contano come punti per qualifica (con il tetto di 250 al mese sugli acquisti intestati) |
| 17 | Chiusura del mese | Preparazione automatica il giorno 1 alle 3:00 con email all'amministrazione; il mese si congela solo con la conferma "Chiudi il mese" |
| 18 | Pagamento confermato dopo la chiusura | Conta nel primo mese ancora aperto |
| 19 | Nuovo piano (rev. 6) | Vale il testo del fondatore del 5/11/2026: soglie 100/600/2.400/6.000/12.000, linee forti a 8.000 punti di gruppo, Leader = 20% applicato (anche bloccato), pool 3% dei punti aziendali, Leader Fondatori bloccate al 12% |
| 20 | Giovanna Di Lillo | Bloccata al 20% senza scadenza, esclusa da pool e bonus auto, Master President 2% anche se inattiva |
| 21 | Promozioni | Niente sconto 40%. Promozione intestata all'incaricata: come un ordine online (50% dei punti più qualifica), ma solo se attiva, e i punti stanno nel tetto di 250 con gli acquisti a listino. Promozione comprata da una cliente nel negozio: ordine online normale, senza tetto (fondatore, 5/11/2026) |
| 22 | Start kit | 33 punti alla nuova incaricata (attività e soglie, nessun guadagno per lei). La sponsor riceve il 50% dei punti più la differenza, solo se attiva; i 33 punti contano anche per la sua attività. L'upline guadagna la differenza normale |
| 23 | Leader inattiva | Saltata (compressione): il suo team confluisce nella prima Leader del mese sopra di lei |
| 24 | Catalogo | Shampoo Botox 33,90 €, Shampoo Detox 32,90 €, Maschera Botox 39,90 €, Spray Botox 10in1 34,90 €; Kit Routine Botox resta a 106,90 € |
| 25 | Soluzioni tecniche | Calcoli sul server dell'app (non Edge Functions), importi e punti come interi in centesimi (esatti come `numeric`), Row Level Security su tutte le tabelle come seconda barriera. Nella Fase 9: cifratura di IBAN e codice fiscale, consensi separati (trattamento e marketing, con data e testo dell'informativa), esportazione e cancellazione o anonimizzazione dei dati |
| 27 | Punti scritti a mano | Lo staff (amministrazione, contabilità, ordini) può scrivere a mano i punti per pezzo di ogni prodotto, separati per acquisto personale e vendita online, e di ogni promozione (un valore unico per acquisto personale e online). Campo vuoto = calcolo automatico. Provvigione online e sulle promozioni = 50% dei punti, anche se scritti a mano. Start kit escluso (33 punti, parametro). Ogni modifica va nel registro modifiche; gli ordini già fatti non cambiano (fondatore, 5/11/2026) |
| 26 | Controlli e conteggi | Limite dei compensi del mese al 70% dei punti aziendali (bonus auto escluso). I 33 punti di uno start kit contano per l'attività della sponsor ma nei punti di gruppo una volta sola. Una linea forte conta anche se la diretta è inattiva, purché il suo gruppo arrivi a 8.000 punti. Il 4 ottobre non si considera festivo per il giorno di pagamento (fondatore, 5/11/2026) |

| 28 | Documenti, F24 e bonifici | Ricevuta (senza partita IVA) o fattura proforma (partita IVA ordinaria o forfettaria, scelta nel profilo) creata all'approvazione della richiesta, con la data del pagamento e numero progressivo per incaricata e anno; bollo 2,00 € tolto all'incaricata sopra 77,47 €. F24 compilato in automatico (codice tributo 1038, mese di riferimento) da versare il 16 del mese dopo i pagamenti. File bonifici SEPA XML pain.001.001.03 profilo CBI. F24, bonifici e documenti di tutte: solo amministrazione e contabilità (fondatore, 6/11/2026) |
| 29 | Negozio online e clienti | Il cliente compra come ospite (nome, cognome, email, telefono, indirizzo; nessuna password) e si riconosce dall'email. Al primo ordine si lega per sempre all'incaricata del link: gli ordini successivi vanno a lei anche se usa il link di un'altra; solo la sede (amministrazione) può spostarlo, con motivo, nel registro modifiche. L'incaricata vede dei suoi clienti nome, cognome e ordini; email e telefono solo se il cliente ha dato il consenso (spunta facoltativa all'ordine, revocabile); mai l'indirizzo. Il negozio è chiuso al pubblico se l'incaricata è sospesa, cessata, tornata cliente o non ha pagato lo start kit (fondatore, 9/11/2026) |
| 31 | Licenza annuale | Rinnovo annuale della licenza d'uso dell'app a 29,90 €, valida 12 mesi dal pagamento dello start kit; nessun punto a nessuno, tutto all'azienda (fuori dall'incasso aziendale). Rinnovo da 30 giorni prima (vecchia scadenza + 12 mesi) fino alla fine del mese dopo la scadenza (12 mesi dal pagamento). Avvisi 30 e 7 giorni prima. Licenza scaduta: sola visualizzazione, rinnovo e richiesta delle provvigioni già maturate; ogni mese chiuso con la licenza scaduta non matura nulla (nemmeno la provvigione online), i punti contano per chi sta sopra. Senza rinnovo entro la fine del mese dopo la scadenza: dirette e clienti passano alla sponsor, lei torna cliente e può solo chiedere il saldo residuo. Esente solo Giovanna Di Lillo. Chi non ha un pagamento dello start kit registrato parte dalla data di lancio del piano (fondatore, 12/11/2026) |

Le decisioni 2–5, 10, 13, 14 e 16 della rev. 5 sono superate dalle decisioni 19–23.

## 13. Verifiche esterne prima del lancio

- Commercialista: base dello sconto (IVA inclusa o esclusa), IVA sugli acquisti delle incaricate, ritenuta, contributi INPS, trattamento fiscale di Master President e quota riservata. Per la decisione 28: ritenuta e bollo per le forfettarie, compilazione del campo "mese di riferimento" dell'F24 con il codice 1038, sezione INPS dell'F24.
- Azienda: autorizzazione al bollo virtuale (numero e data), codice CUC e versione del tracciato CBI indicati dalla banca.
- Legale: conformità del piano alla Legge 173/2005.

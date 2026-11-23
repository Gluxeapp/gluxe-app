# Programma Cliente VIP G LUXE

Versione del 23/11/2026, scritta sul piano deciso dal fondatore. **Sostituisce** le proposte precedenti di questo documento: referral delle amiche e Club Prestige con crediti, che restano solo nello storico.

Lo scopo: far **riordinare** chi ha già comprato e alzare il valore degli ordini verso i 99 €.

**Stato:** le regole qui sotto sono quelle decise dal fondatore, comprese le risposte del 23/11 (soglia, attivazione, rinnovo, punti a mano). Sono scritte in `docs/piano-compensi.md` come **decisione 35** (sezione 2a, test T31–T34) sul branch `cliente-vip`. Tutto ciò che è segnato come *ipotesi* va confermato.

---

## 1. Le regole

| Tema | Regola |
| --- | --- |
| **Chi diventa VIP** | La cliente del negozio online che fa un ordine con almeno **99,00 € di prodotti IVA inclusa**: prodotti a listino e in promozione, al prezzo pagato. La **spedizione (6,90 €) non conta**. Conta il singolo ordine, non la somma di più ordini. |
| **Quando** | Appena **Stripe conferma il pagamento** di quell'ordine (ora italiana). In quel momento parte l'email di benvenuto. |
| **Lo sconto** | **Dall'ordine successivo**, e mai sull'ordine che la fa diventare VIP: **15% sul prezzo di listino IVA inclusa**, su tutti i prodotti a listino. |
| **Promozioni** | Prezzo uguale per tutte: **nessuno sconto VIP** sui prodotti in promozione. |
| **Punti** | Calcolati su quanto **pagato davvero**: 0,80 × prezzo VIP IVA esclusa, per unità. Se lo staff ha scritto i punti a mano (decisione 27), quei punti si **riducono del 15%**, come il prezzo. Provvigione online = 50% di questi punti, come sempre. |
| **Durata** | **12 mesi** dal pagamento dell'ordine che ha attivato lo status. |
| **Rinnovo** | Un nuovo ordine con almeno **99,00 € di valore a listino** (prodotti a listino al prezzo pieno prima dello sconto, più quelli in promozione al loro prezzo; spedizione esclusa) fa ripartire i 12 mesi **dalla data del nuovo pagamento**. Con lo sconto la VIP paga circa 84 €. Se lo status è già scaduto, vale come una prima attivazione: l'ordine è a prezzo pieno e lo sconto torna dal successivo. |
| **Resi** | Se l'ordine che ha attivato o rinnovato lo status viene reso o rimborsato e i prodotti contati scendono sotto 99 €, lo status si toglie (o torna alla scadenza di prima, se era un rinnovo). Gli ordini già fatti con lo sconto restano come sono, perché prezzi e punti sono fotografati nell'ordine. |
| **Incaricata** | La cliente VIP resta legata alla sua incaricata (decisioni 29 e 32): gli ordini VIP le danno punti ON e provvigione online, calcolati sul prezzo scontato. |
| **Parametri** | Soglia 99,00 €, sconto 15% e durata 12 mesi sono **parametri** del piano, modificabili dalla sede in versioni datate. |

### Esempi

| Caso | Calcolo |
| --- | --- |
| Prima attivazione | Kit Routine Botox 106,90 € → più di 99 € → VIP per 12 mesi dal pagamento. Questo ordine è a prezzo pieno. |
| Ordine VIP | Kit Routine Botox: 106,90 × 85% = **90,87 €** → 74,48 € IVA esclusa → **59,58 punti** → provvigione online **29,79 €** (a prezzo pieno: 70,10 punti, 35,05 €). |
| Prodotto con punti a mano | Prodotto con 15,00 punti scritti a mano → con lo sconto VIP **12,75 punti**. |
| Rinnovo riuscito | Shampoo Botox + Maschera Botox + Spray Botox = 108,70 € a listino → la VIP paga 92,41 € → **rinnova**. |
| Rinnovo non riuscito | Shampoo Botox + Maschera Botox = 73,80 € a listino → non rinnova (ordine comunque scontato). |
| Promozione | Shampoo in promozione a 27,90 €: la VIP paga 27,90 €, come tutte. Per i 99 € conta 27,90 €. |

Arrotondamento come in tutto il progetto: prezzo VIP per unità al centesimo (106,90 × 0,85 = 90,865 → 90,87), poi IVA esclusa e punti per unità.

---

## 2. Cosa vede la cliente

### 2.1 Nel carrello e alla cassa (non ancora VIP)

Calcolato sul server a ogni modifica del carrello, solo sui prodotti:

- Sotto i 99 €: **"Ti mancano 25,20 € per diventare cliente VIP G LUXE: dal prossimo ordine avrai il 15% di sconto su tutto il listino per 12 mesi."** Sotto la frase c'è una barra di avanzamento nero e oro.
- Da 99 € in su: **"Con questo ordine diventi cliente VIP G LUXE: dal prossimo ordine 15% di sconto sul listino per 12 mesi."**
- Proposta: sotto la frase, **i prodotti che ti fanno arrivare a 99 €** (per esempio "Aggiungi lo Spray Botox 10in1 a 34,90 €"), presi dal catalogo.

### 2.2 Per la cliente già VIP

- In catalogo: prezzo VIP in evidenza e listino barrato ("Prezzo VIP 28,82 € · listino 33,90 €"); sulle promozioni nessun barrato VIP.
- In alto: **"Sei cliente VIP fino al 14/03/2027."**
- Nel carrello, se l'ordine può rinnovare: **"Ti mancano 12,40 € (a listino) per rinnovare il tuo status VIP fino al 23/11/2027."**

### 2.3 Come l'app riconosce la VIP

Il negozio oggi accetta clienti ospiti riconosciuti dall'email. Mostrare "sei VIP" a chiunque scriva un'email direbbe a un estraneo che quella persona ha comprato da noi. Per non rivelarlo:
- i prezzi VIP si vedono **quando la cliente entra nel suo profilo** (profilo cliente, decisione 32, oggi in prova sul branch `clienti-registrati`);
- oppure con il **link personale** dell'email di benvenuto (codice casuale, nessun dato personale nell'indirizzo);
- una cliente ospite che scrive alla cassa un'email VIP riceve lo sconto **solo dopo aver aperto il link** che le mandiamo a quell'email;
- l'**ordine per un cliente** preparato dall'incaricata (decisione 32) usa già il prezzo VIP se la cliente lo è.

---

## 3. Le email

**Email di benvenuto VIP**, inviata alla conferma del pagamento dell'ordine che attiva lo status:

> **Oggetto:** Benvenuta tra le clienti VIP G LUXE
>
> Ciao [Nome],
>
> grazie per il tuo ordine. Da oggi sei **cliente VIP G LUXE**.
>
> - **15% di sconto su tutto il listino**, già dal tuo prossimo ordine;
> - valido **fino al [gg/mm/aaaa]**;
> - si rinnova per altri 12 mesi con un ordine da almeno 99 € a listino.
>
> I tuoi prezzi VIP ti aspettano qui: [link personale al negozio della tua consulente].
>
> La tua consulente G LUXE è [Nome dell'incaricata]: se hai bisogno di un consiglio, è lei il tuo punto di riferimento.
>
> Con affetto,
> Giovanna Di Lillo e il team G LUXE

**Email facoltative (proposte):**
- **30 giorni prima della scadenza:** "Il tuo status VIP scade il [data]: con un ordine da 99 € a listino lo rinnovi per altri 12 mesi."
- **Rinnovo riuscito:** "Il tuo status VIP è rinnovato fino al [data]."

**Attenzione:** oggi le email dall'app partono solo quando sarà verificato il **dominio aziendale su Resend**. Senza, l'email di benvenuto non arriva. È un prerequisito, come l'accensione dei pagamenti Stripe sul sito vero.

---

## 4. Costi e benefici

### 4.1 Chi paga lo sconto

Lo sconto riduce l'incasso, e quindi anche i punti e i compensi. Esempio con il Kit Routine Botox, con i **costi veri dei prodotti** comunicati dal fondatore il 23/11/2026 (shampoo 3,83 € + maschera 4,70 € + spray 4,60 € = 13,13 € IVA esclusa; la pochette del kit non è compresa):

| | Prezzo pieno | Prezzo VIP | Differenza |
| --- | --- | --- | --- |
| Pagato dalla cliente | 106,90 € | 90,87 € | −16,03 € (IVA compresa) |
| Incasso IVA esclusa | 87,62 € | 74,48 € | −13,14 € |
| Compensi alla rete | 53,80 € | 45,73 € | −8,07 € (61% dello sconto) |
| di cui provvigione online dell'incaricata | 35,05 € | 29,79 € | −5,26 € |
| Commissione Stripe | 1,96 € | 1,72 € | −0,24 € |
| Costo dei prodotti | 13,13 € | 13,13 € | uguale |
| **Margine azienda** | **18,73 €** (21%) | **13,90 €** (19%) | **−4,83 €** (37% dello sconto) |

Su 13,14 € di sconto (IVA esclusa), **circa 6 su 10 li paga la rete**, perché i punti seguono il prezzo, e **circa 4 su 10 l'azienda**. Il costo del prodotto invece resta uguale.

### 4.2 Prodotto per prodotto, con i costi veri

Margine dell'azienda su un ordine dal negozio con un solo prodotto (compensi completi fino al 20%, pool, Master President, quota riservata, Stripe 1,5% + 0,25 €):

| Prodotto | Costo (IVA esclusa) | Costo sul prezzo IVA esclusa | Margine a prezzo pieno | Prezzo VIP | Margine VIP | La VIP deve comprare, per pareggiare |
| --- | --- | --- | --- | --- | --- | --- |
| Shampoo Botox 33,90 € | 3,83 € | 13,8% | 6,02 € (22%) | 28,82 € | 4,49 € (19%) | 1,34 volte |
| Maschera Botox 39,90 € | 4,70 € | 14,4% | 6,98 € (21%) | 33,92 € | 5,16 € (19%) | 1,35 volte |
| Spray Botox 10in1 34,90 € | 4,60 € | 16,1% | 5,55 € (19%) | 29,67 € | 3,99 € (16%) | 1,39 volte |
| Shampoo Detox 32,90 € | 4,00 € | 14,8% | 5,55 € (21%) | 27,97 € | 4,08 € (18%) | 1,36 volte |
| Kit Routine Botox 106,90 € | 13,13 € + pochette | 15,0% | 18,73 € (21%) | 90,87 € | 13,90 € (19%) | 1,35 volte |

**Verdetto: il 15% è sostenibile.** I prodotti costano tra il 14% e il 16% del prezzo IVA esclusa. Con lo sconto VIP ogni ordine resta in guadagno (16–19% dell'incasso) e nessun prodotto va in perdita. Per guadagnare quanto prima, basta che una VIP compri circa **un terzo in più** di quanto comprerebbe senza lo status.

Esempio in un anno: una cliente che senza VIP comprerebbe 2 Kit lascia 37,46 €. Da VIP: il primo Kit a prezzo pieno (18,73 €) più 2 Kit VIP (27,80 €) fanno **46,53 €**. Con un solo Kit VIP (32,63 €) l'azienda guadagna meno di prima (−4,83 €).

**Non sono ancora compresi** e abbassano il margine: costo vero della spedizione rispetto ai 6,90 € pagati dalla cliente, imballo, magazzino, commissioni più alte di Klarna e PayPal, pochette del kit. Nei mesi con generazioni pagate (Leader con linee forti) e bonus dei Leader Fondatori, i compensi salgono fino a circa 7 punti percentuali dei punti. Anche nel caso peggiore, però, il Kit VIP resta in guadagno: circa 9,70 € prima di questi costi.

**Il prodotto più stretto è lo Spray** (16% di margine VIP). Se un giorno si volesse ridurre il rischio, è il primo candidato da tenere fuori dallo sconto o da mettere in promozione.

### 4.3 I benefici

- **Ordini più grandi subito:** la soglia dei 99 € spinge ad aggiungere un prodotto. Chi comprerebbe Shampoo + Maschera (73,80 €) e aggiunge lo Spray (108,70 €) lascia all'azienda circa **+5,90 €** di margine su quell'ordine (da 13,36 € a 19,28 €, con i costi veri). Questo primo ordine è a prezzo pieno.
- **Riordini:** 12 mesi di sconto sono un motivo forte per tornare dalla stessa incaricata, e il rinnovo da 99 € spinge un ordine grande almeno una volta l'anno.
- **Rete:** l'incaricata guadagna il 15% in meno sul singolo ordine VIP, ma su clienti che ordinano di più e più spesso. La pagina "Negozio" le mostra chi è VIP e quando scade (motivo per ricontattarla, con il consenso della cliente).
- **Verso l'incaricata:** lo sconto VIP (15%) resta molto sotto quello delle incaricate (40%). Diventare incaricata resta la scelta più conveniente per chi compra tanto.

### 4.4 Effetto sul limite del 70% (decisione 26)

Nessun cambiamento pratico. Lo sconto abbassa nella stessa misura punti e compensi; solo Master President e quota riservata (sull'incasso) scendono un po' meno.

---

## 5. Attenzioni

- **Sconti e annunci (Codice del Consumo, regola "Omnibus"):** il listino barrato è il prezzo vero di sempre, quindi va bene se il listino non cambia nei 30 giorni prima. Da far confermare al legale insieme ai testi.
- **Privacy:** nessun dato personale nei link; lo status VIP non si rivela a chi scrive solo un'email (sezione 2.3); l'incaricata vede lo status delle sue clienti, ma email e telefono solo con il loro consenso (decisione 29).
- **Fisco:** uno sconto sul prezzo non è un premio né un omaggio: si fattura il prezzo scontato. Niente operazione a premio, a differenza dei crediti della versione precedente. Da confermare con il commercialista.
- **Clienti fittizi:** un'incaricata potrebbe far comprare a una "cliente" di comodo per avere i prezzi VIP. I controlli che già esistono (stesso indirizzo, carta, email o telefono dell'incaricata) valgono anche qui. Una cliente segnalata non diventa VIP finché la sede non controlla (proposta).

---

## 6. Cosa servirebbe nell'app (decisione 35, sezione 2a del piano compensi)

1. **Parametri nuovi** nella versione del piano: soglia VIP 99,00 €, sconto VIP 15% (1500 punti base), durata 12 mesi.
2. **Registro dello status VIP solo in aggiunta**: attivazione, rinnovo, revoca per reso, con l'ordine che l'ha causato e la scadenza. Lo status del giorno si ricava dal registro, mai da un campo modificabile a mano. Ogni intervento della sede va nel registro modifiche.
3. **Prezzo VIP e punti VIP** calcolati sul server alla creazione dell'ordine e **fotografati** nella riga (listino, prezzo pagato, punti), anche per i punti a mano ridotti del 15%. Il motore provvigioni non cambia: usa i punti delle righe come oggi.
4. **Webhook di Stripe:** alla conferma del pagamento controlla soglia e rinnovo, aggiorna lo status e prepara l'email (una volta sola anche se l'evento arriva due volte). Al rimborso, revoca se serve.
5. **Carrello e cassa:** frase "Ti mancano … €", barra, prodotti suggeriti; per le VIP prezzo barrato, scadenza, frase di rinnovo.
6. **Riconoscimento della VIP:** profilo cliente (decisione 32) e link personale; per le ospiti, link via email.
7. **Email:** benvenuto VIP (e, se approvate, scadenza e rinnovo), con il dominio su Resend verificato.
8. **Pagine:** l'incaricata vede quali sue clienti sono VIP e la scadenza; la sede vede l'elenco delle VIP, gli sconti concessi nel mese e il loro costo.
9. **Test prima del codice**, come per il motore: casi T31–T34 del piano compensi.

**Prerequisiti:** pagamenti Stripe accesi sul sito vero, dominio email verificato, profilo cliente (decisione 32) unito a `main`.

---

## 7. Come misurare se funziona

| Indicatore | Da guardare |
| --- | --- |
| Ordini che arrivano a 99 € (prima e dopo la frase nel carrello) | Quota in crescita |
| Valore medio del primo ordine | In crescita |
| VIP che fanno almeno un altro ordine in 12 mesi | Confronto con le clienti non VIP |
| VIP che rinnovano | ≥ 30% (*ipotesi* di obiettivo) |
| Sconti VIP del mese / incasso del negozio | Sotto il tetto deciso dalla sede |
| Margine per cliente VIP in 12 mesi contro una cliente non VIP | Deve essere maggiore o uguale |

---

## 8. Domande ancora aperte (non bloccano la scrittura delle regole)

- ~~V1 – Costo dei prodotti~~: comunicato il 23/11/2026, il 15% regge (sezione 4.2). Resta da sapere: costo della pochette del Kit e costo vero di spedizione e imballo per ordine.
- **V2 – Ordini fatti prima del lancio del programma:** contano per diventare VIP? Proposta: no, si parte dalla data di avvio.
- **V3 – Email di scadenza e di rinnovo:** le vuoi (sezione 3)?
- **V4 – Clienti segnalate come fittizie:** sospendere lo status finché la sede non controlla?
- **V5 – Avvisi all'incaricata** quando una sua cliente diventa VIP o sta per scadere?

---

## 9. Regole ufficiali

Le regole sono scritte in `docs/piano-compensi.md` (23/11/2026, branch `cliente-vip`): riga nella tabella della sezione 2, **sezione 2a "Cliente VIP"**, **decisione 35** e casi di test **T31–T34**. Se questo documento e il piano compensi non coincidono, vale il piano compensi.

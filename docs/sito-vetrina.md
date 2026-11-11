# Sito vetrina G LUXE · proposta di progetto

Bozza del 9/11/2026, **da approvare**. Risposte del fondatore inserite il 9/11/2026 (S1–S7, tranne S3 bis). Le scelte ancora aperte sono nella sezione 8 e vanno confermate dal fondatore prima di scrivere codice.

---

## 1. Obiettivo

Un sito pubblico che **non vende**, ma:

- costruisce l'immagine del marchio G LUXE (nero e oro, caratteri con grazie, come il logo);
- mostra i prodotti della linea;
- racconta la carriera in G LUXE;
- porta visite da Google con il blog;
- **raccoglie contatti**: chi vuole acquistare, chi scarica una risorsa gratuita, chi vuole diventare incaricata;
- si collega all'app G LUXE e, se serve, alla logistica.

Principio guida: **il sito racconta e raccoglie, l'app fa tutto il resto** (prodotti, prezzi, punti, ordini, incaricate, provvigioni). Nessun dato si scrive due volte.

## 2. Due siti separati, un unico marchio

| | Sito vetrina | App G LUXE |
| --- | --- | --- |
| Indirizzo proposto | `gluxegroup.it` (dominio da confermare, S5) | `app.gluxegroup.it` |
| Contenuto | marchio, prodotti, carriera, blog, moduli di contatto | incaricate, ordini, negozio personale, provvigioni, sede |
| Chi lo aggiorna | marketing, senza programmatore (testi, foto, articoli) | la sede, come oggi |
| Dati personali | non ne conserva: li passa subito all'app | li conserva e li protegge |

Perché separati:

- **Sicurezza:** il sito vetrina ospiterà strumenti di marketing (statistiche delle visite, pixel di Facebook e Instagram) che non devono stare accanto a IBAN e provvigioni.
- **Era già previsto:** la Fase 8 del piano di sviluppo ("API e webhook per siti esterni") nasce per questo. Il sito vetrina è il primo "sito esterno" che la usa.
- **Stessa tecnologia:** Next.js su Vercel, regione UE. Nessuno strumento nuovo da imparare o da pagare a parte.

## 2a. Stile grafico (riferimento: Mary Kay)

Il fondatore ha indicato come riferimento il sito di Mary Kay (`marykay.com`, visto il 10/11/2026). Se ne riprendono **l'impostazione e il modo di organizzare le pagine**, non logo, foto, testi, colori o slogan, che sono di Mary Kay. Il risultato deve sembrare G LUXE, non una copia.

**Cosa si riprende**

| Elemento di Mary Kay | Versione G LUXE |
| --- | --- |
| Striscia sottile in alto con "Find a Consultant" | Striscia nera sottile con **"Trova la tua incaricata"** (porta al modulo "Voglio acquistare") |
| Logo a sinistra, menu orizzontale di categorie, a destra "Be a Beauty Consultant" | Logo G LUXE a sinistra; menu: Prodotti, Linee, Test del capello, Blog; a destra, ben visibile, **"Diventa incaricata"** |
| Apertura divisa in due: grande foto di una persona a sinistra, titolo molto grande e **un solo pulsante** a destra | Stessa divisione: foto del prodotto o di una modella con capelli curati, titolo grande con grazie, un solo pulsante dorato |
| Fondo bianco, molto spazio vuoto, un solo colore forte per i pulsanti | Fondo bianco o avorio, testo nero, **oro** come unico colore dei pulsanti e dei dettagli |
| Fila di 4 prodotti ("Trending Now"): foto su fondo pulito, nome, prezzo, link sottolineato | Fila "I più amati": foto, nome, link "Scopri"; il prezzo resta dietro "Scopri il prezzo" (decisione S2) |
| Sezione "Discover": riquadri fotografici di ispirazione (look, tendenze) | Riquadri "Routine": capelli secchi, crespi, colorati, sfibrati, ognuno verso un articolo del blog |
| Strumenti interattivi ("Foundation Finder", prova virtuale) | **Test del capello** messo in evidenza come strumento, non solo come modulo |
| Fascia "Be a Beauty Consultant" ripetuta più in basso | Fascia nera con oro "Diventa incaricata", ripetuta a metà e in fondo alla home |
| Chiusura con frase breve e hashtag social | Frase del marchio + hashtag e link Instagram/Facebook G LUXE |

**Cosa si cambia rispetto a Mary Kay**
- **Colori:** al posto del fucsia, nero e oro del logo G LUXE (`assets/brand/logo-g-luxe.png`). Il nero si usa per fasce intere (carriera, piè di pagina) per dare un tono più lussuoso; il resto della pagina resta chiaro e arioso come in Mary Kay.
- **Caratteri:** titoli con grazie eleganti, come il logo (Mary Kay usa caratteri senza grazie); testi lunghi in un carattere semplice e leggibile. Nella bozza: Cormorant Garamond per i titoli e Montserrat per i testi (gli stessi dell'app); **nomi dei prodotti in Playfair Display**, perché in Cormorant i numeri (es. "10in1") non si leggono bene (fondatore, 10/11/2026).
- **Bozza grafica della home:** pagina privata https://claude.ai/artifact/S8DVkKc7MW1FftY64KfMu6 (10/11/2026).
- **Bozza della scheda prodotto** (esempio: Maschera Botox): pagina privata https://claude.ai/artifact/BTSM5zNzkzzhME9x7cFnzt (11/11/2026).
- **Promozioni:** niente titoloni di promozioni sull'apertura; la home parla del marchio e dei risultati sui capelli.
- **Carriera:** nessuna cifra di guadagno nelle fasce "Diventa incaricata" (legge 173/2005).
- **Telefono prima di tutto:** la maggior parte delle visite arriverà dai social sul telefono; ogni sezione si progetta prima per il telefono (apertura con foto sopra e titolo sotto, prodotti scorrevoli di lato).

**Foto:** lo stile Mary Kay si regge su foto professionali di persone vere su fondo pulito. Per G LUXE servono un servizio fotografico (prodotti su fondo bianco e nero, modelle con capelli curati, mani che applicano i prodotti) prima dell'apertura del sito. È nella lista della sezione 7.

## 3. Le pagine

### Home
- Apertura con foto del prodotto e frase del marchio.
- Filosofia G LUXE e linea Hair Botox.
- 3–4 prodotti in evidenza (dall'app).
- Riquadro della risorsa gratuita.
- Anteprima della carriera.
- Ultimi articoli del blog.

### Prodotti
- Elenco e scheda di ogni prodotto: foto, descrizione, ingredienti, modo d'uso, risultati, domande frequenti.
- Dall'app, in automatico: nome, foto principale, prezzo di listino, promozioni visibili.
- Dal marketing: testi lunghi, foto d'ambiente, domande frequenti.
- Nella scheda, al posto del carrello, **due pulsanti** (S2, S2 bis):
  - **"Scopri il prezzo"**: mostra il prezzo di listino nella stessa pagina;
  - **"Voglio acquistare"**: apre il modulo "Voglio acquistare" (sezione 4).

### Scheda di un prodotto (bozza dell'11/11/2026)

Dall'alto in basso:
1. **Percorso** (Home / Prodotti / Linea / Prodotto).
2. **Galleria** a sinistra (foto principale e 3–4 miniature: confezione, texture, prodotto in uso, kit), **acquisto** a destra:
   - linea, nome (carattere dei nomi dei prodotti), sottotitolo, formato;
   - breve descrizione;
   - **"Per quale porosità"**: le tre porosità con quelle adatte segnate, dalla tabella dei prodotti del test (`docs/test-capello.md`, 4b), e il link al test;
   - **"Scopri il prezzo"** e **"Voglio acquistare"** (S2), con la nota "si acquista tramite un'incaricata" e la spedizione 6,90 €;
   - tre vantaggi in breve;
   - a fisarmonica: **Come si usa** (passi, e tabella per porosità), **Cosa fa**, **Ingredienti** (INCI), **Domande frequenti**.
3. **La routine in tre passaggi** su fascia nera (Shampoo → Maschera → Spray), con il prodotto della pagina segnato e il riquadro del **Kit Routine Botox**.
4. Due inviti affiancati: **Test del capello** e **Consulenza tricologica gratuita**.
5. **Potrebbero servirti anche**: gli altri prodotti della routine.

**Da dove arrivano i dati.** Nome, prezzo, foto e promozioni dall'app (come oggi). Per la scheda servono nuovi campi del prodotto, compilati dalla sede nel catalogo dell'app: sottotitolo, formato, descrizione lunga, modo d'uso, ingredienti (INCI), domande frequenti, porosità adatte. Modo d'uso, quantità, tempi di posa e INCI vengono dalle **schede tecniche** (ancora da preparare); le frasi sui risultati vanno confermate da chi produce la linea (T5 del test). Finché mancano, la scheda non va online.

**Niente recensioni inventate.** La sezione delle recensioni si aggiunge solo quando ci saranno recensioni vere di clienti, raccolte con il loro consenso.

### Carriera in G LUXE
- Perché diventare incaricata, come funziona in 4 passi, storie vere, domande frequenti.
- Modulo "Voglio saperne di più": usa la **richiesta di contatto già esistente nell'app** (la sede la riceve come oggi, area sede + email).
- Regola legale: nella vendita diretta (legge 173/2005) non si promettono guadagni. Nessuna cifra del tipo "guadagni X € al mese"; le regole di carriera, se citate, sono solo quelle di `docs/piano-compensi.md`.

### Blog
- Categorie proposte: cura dei capelli, ingredienti, routine, storie delle incaricate.
- **Chi scrive (S4):** sia Claude sia la sede a mano.
  - Pannello di scrittura semplice (tipo Word online) collegato al sito: la sede scrive e pubblica un articolo senza programmatore. Il servizio deve tenere i dati in UE.
  - Claude prepara gli articoli come **bozze** nello stesso pannello. **Nessuna bozza di Claude va online senza l'approvazione del fondatore** (S4 bis, deciso).
- **Calendario (S4 bis):** 7–8 articoli all'apertura del sito, poi 1 a settimana per 3 mesi (circa 13), poi 1 al mese.
- Ogni articolo ha un pulsante per condividerlo: materiale pronto per le incaricate.

### Pagine obbligatorie
Privacy, cookie (con banner del consenso: si accettano solo i cookie tecnici finché la persona non sceglie), note legali, contatti.

### Pagine della risorsa gratuita
Una pagina dedicata per ogni risorsa (utile anche per le pubblicità), con modulo e pagina di "grazie".

**Prima risorsa (S6): questionario "Test del capello".**
- 8 domande (tipo di capello, trattamenti, abitudini, desideri) e 6 profili di risultato: bozza completa in [docs/test-capello.md](test-capello.md), provabile nella bozza della home (10/11/2026).
- Alla fine si chiede l'email per ricevere il risultato: un profilo del capello con la routine G LUXE consigliata.
- Il risultato arriva via email e appare anche a schermo. Il consiglio di prodotto porta ai pulsanti "Scopri il prezzo" e "Voglio acquistare".
- Le risposte al questionario si salvano insieme al contatto (servono per consigliare l'incaricata e per la newsletter). Nell'informativa privacy va scritto che si raccolgono.
- Domande solo sui capelli: niente domande sulla salute, che sono dati particolari per il GDPR.

## 4. Raccolta dei contatti

Tutti i moduli **salvano i dati nel database dell'app**, non nel sito: un solo posto, stesse protezioni degli altri dati personali (regole 15–17 di `CLAUDE.md`), visibili alla sede nella sua area.

| Modulo | Dati richiesti | Cosa succede dopo |
| --- | --- | --- |
| **Voglio acquistare** | nome, email, telefono, città, prodotto che interessa, consenso al contatto | il contatto va a un'incaricata (link personale, oppure assegnato a mano dalla sede, S1); l'incaricata riceve una notifica |
| **Test del capello** (risorsa gratuita) | risposte al questionario, email (nome facoltativo) | email con conferma dell'indirizzo e risultato del test; consenso alla newsletter **separato e facoltativo** |
| **Diventa incaricata** | nome, cognome, telefono, email, città | richiesta di contatto già esistente nell'app |

### Attribuzione all'incaricata
- Ogni incaricata ha un link personale al sito, es. `gluxegroup.it/?ref=GL000123`, che trova nella sua area dell'app.
- Il sito ricorda il codice durante la visita: se la persona compila "Voglio acquistare" o il test del capello, il contatto va a quell'incaricata.
- **Senza codice (S1, deciso):** il contatto resta "da assegnare" e la sede lo assegna **a mano** a un'incaricata dalla sua area (con registro modifiche: chi, a chi, quando).
- **Legame (S1 bis, deciso):** il contatto assegnato dalla sede **resta a quell'incaricata**.

Come si traduce nell'app (S8, confermato dal fondatore il 9/11/2026; regola ufficiale in `docs/piano-compensi.md`, sezione 10 e decisione 30):
- Il negozio riconosce il cliente dall'email (decisione 29). Il contatto dal sito diventa un **cliente legato** all'incaricata già al momento dell'assegnazione, anche prima di qualsiasi ordine.
- Conseguenza: se poi quella persona compra dal negozio di un'**altra** incaricata, l'ordine e i punti ON vanno all'incaricata assegnata (come oggi per i clienti già legati).
- Se l'email è **già legata** a un'incaricata (perché ha già comprato da lei), vince il legame che c'era prima e la sede lo vede segnalato.
- Lo stesso vale per i contatti arrivati dal link personale di un'incaricata.
- Un contatto ancora "da assegnare" che compra da un negozio si lega all'incaricata di quel negozio, come un cliente nuovo.

### Lista email
- I contatti con consenso alla newsletter formano la lista dell'azienda, oggi assente (`docs/marketing/lancio-nuova-linea.md`, ipotesi I6).
- Le email partono con lo stesso servizio dell'app (Resend), dopo la verifica del dominio aziendale.

## 5. Collegamenti con l'app e con la logistica

| Direzione | Cosa passa | Come |
| --- | --- | --- |
| App → sito | prodotti, foto, prezzi di listino, promozioni visibili, link ai negozi delle incaricate | API in sola lettura `/api/v1/...` con chiave (Fase 8) |
| Sito → app | contatti raccolti dai moduli | API `/api/v1/...` con firma digitale (HMAC) e protezione dai doppioni: lo stesso modulo inviato due volte crea un solo contatto |

Il sito non vede mai punti, provvigioni, dati delle incaricate diversi dal nome pubblico del negozio, né dati dei clienti.

### Logistica (S3): collegamento con l'app degli ordini, non con il sito

La ditta di logistica ha chiesto di collegare il **suo sistema all'app degli ordini**. È un lavoro dell'app (Fase 8, "API e webhook"), separato dal sito vetrina, che non tocca la logistica.

Come potrebbe funzionare (da verificare con la ditta):

| Direzione | Cosa passa |
| --- | --- |
| App → logistica | ogni ordine **pagato** (conferma di Stripe): righe, quantità, indirizzo di spedizione, nome del destinatario |
| Logistica → app | stati "in preparazione", "spedito" (con corriere e numero di tracciamento), "consegnato"; eventualmente le giacenze di magazzino |

Conseguenze da decidere:
- Oggi lo staff "ordini" segna gli stati a mano. Con il collegamento li segnerebbe la logistica in automatico; lo staff resta per le eccezioni.
- L'email all'incaricata "spedito" partirebbe quando arriva il tracciamento dalla logistica.
- La ditta riceve dati personali (indirizzi dei clienti): serve un contratto con la nomina a **responsabile del trattamento** (GDPR).
- Messaggi firmati (HMAC) e protezione dai doppioni in entrambe le direzioni, come per Stripe.

Per progettarlo servono dalla ditta: nome, documentazione tecnica del loro sistema (come ricevono gli ordini e come mandano gli aggiornamenti), un ambiente di prova, un referente tecnico (S3 bis).

## 6. Ordine di lavoro proposto

| Passo | Contenuto | Dove |
| --- | --- | --- |
| 1 | Decisioni della sezione 8, testi, foto vere dei prodotti, dominio aziendale | fondatore |
| 2 | Porta API: prodotti in lettura, ricezione contatti, area sede "Contatti dal sito", link personale nell'area incaricata | app (inizio Fase 8) |
| 3 | Sito: grafica, home, prodotti, carriera, pagine legali | nuovo progetto |
| 4 | Moduli, risorsa gratuita, email automatiche | sito + app |
| 5 | Blog con pannello di scrittura | sito |
| 6 | Collegamento logistica ↔ app degli ordini (sezione 5) | app, dopo la documentazione della ditta |

Ogni passo finisce con qualcosa da provare su un'anteprima, come per le fasi dell'app.

**Tempi:** il lancio della nuova linea è previsto a gennaio (incaricate) e febbraio 2027 (clienti). Conviene avere i passi 1–4 pronti **entro metà dicembre 2026**, così la risorsa gratuita fa crescere la lista prima del lancio.

## 7. Cose da fare comunque

- **Dominio aziendale `gluxegroup.it`:** da confermare e acquistare. Serve sia al sito sia per far partire le email alle incaricate (oggi bloccate).
- **Foto vere dei prodotti e servizio fotografico:** il catalogo dell'app oggi non ne ha; lo stile scelto (sezione 2a) richiede anche foto di persone e d'ambiente.
- **Privacy:** aggiornare l'informativa con le nuove raccolte di dati (finalità, conservazione, consensi separati, risposte al test del capello).
- **Pixel e statistiche (S7):** si useranno i pixel di Meta (Facebook/Instagram) e gli strumenti di Google (statistiche e pubblicità). Quindi:
  - banner dei cookie con scelta vera: i pixel partono **solo dopo il consenso**, e "Rifiuta" è comodo quanto "Accetta";
  - informativa cookie con l'elenco dei servizi;
  - pixel **solo sul sito vetrina**, mai nell'app (né nel negozio, né nell'area incaricate, né nell'area sede).

## 8. Decisioni aperte

| # | Domanda | Risposta del fondatore |
| --- | --- | --- |
| S1 | Chi riceve il contatto "Voglio acquistare" se la persona **non** arriva dal link di un'incaricata? | **Deciso (9/11/2026):** lo assegna la sede a mano. |
| S1 bis | Il contatto dal sito crea già il legame permanente con l'incaricata? | **Deciso (9/11/2026):** il contatto assegnato dalla sede resta a quell'incaricata. |
| S2 | Il sito mostra il prezzo di listino? | **Deciso (9/11/2026):** sì, ma non subito: tramite un pulsante. |
| S2 bis | Cosa fa il pulsante? | **Deciso (9/11/2026):** "Scopri il prezzo" mostra il prezzo; un secondo pulsante "Voglio acquistare" apre il modulo. |
| S3 | Logistica integrata | **Deciso (9/11/2026):** la ditta di logistica collega il suo sistema all'app degli ordini (sezione 5). |
| S3 bis | Nome della ditta, documentazione tecnica, ambiente di prova, referente tecnico. | |
| S4 | Blog: chi scrive gli articoli? | **Deciso (9/11/2026):** sia Claude sia la sede a mano. |
| S4 bis | Gli articoli di Claude vanno online solo dopo l'ok del fondatore? Ogni quanto si pubblica? | **Deciso (9/11/2026):** solo dopo approvazione; 7–8 articoli all'inizio, poi 1 a settimana per 3 mesi, poi 1 al mese. |
| S5 | Dominio | **9/11/2026:** sarà `gluxegroup.it`, non ancora confermato. Proposta: sito su `gluxegroup.it`, app su `app.gluxegroup.it`. |
| S6 | Prima risorsa gratuita | **Deciso (9/11/2026):** questionario "Test del capello" (sezione 3). |
| S7 | Statistiche e pubblicità | **Deciso (9/11/2026):** pixel di Meta e strumenti Google, solo dopo il consenso ai cookie (sezione 7). |
| S8 | Legame dei contatti, conseguenze (sezione 4): (a) se la persona compra dal negozio di un'altra incaricata, ordine e punti ON vanno all'incaricata assegnata? (b) se l'email era già legata a un'altra incaricata, vince il legame precedente? (c) vale anche per i contatti arrivati dal link personale? | **Deciso (9/11/2026):** sì a tutte e tre. Decisione 30 di `docs/piano-compensi.md`. |
| S9 | Test del capello: chi scrive domande e profili dei risultati? | **Deciso (10/11/2026):** bozza di Claude con 8 domande, da approvare (`docs/test-capello.md`, domande T1–T5). |

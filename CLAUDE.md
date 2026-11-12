# G LUXE · App incaricati

App per gli incaricati alle vendite di G LUXE (haircare, vendita diretta multilivello), con area amministrazione, area contabilità e negozio personale online di ogni incaricato.

## Come lavorare con il fondatore

- Il fondatore non è un programmatore: spiega ogni scelta in italiano semplice, senza gergo tecnico non spiegato.
- Tutta l'interfaccia dell'app è in italiano.
- Lavora per fasi (vedi sotto). Ogni fase deve finire con qualcosa che il fondatore può provare, e con le istruzioni per provarlo.
- Se una regola del piano compensi è ambigua o in conflitto con un'altra, **fermati e chiedi** prima di scrivere codice. Non inventare regole.
- Fonte ufficiale delle regole di calcolo: [docs/piano-compensi.md](docs/piano-compensi.md). Le garanzie contro doppi conteggi ed errori con ordini contemporanei sono in [docs/garanzie-calcolo.md](docs/garanzie-calcolo.md): ogni modifica che tocca soldi o punti le rispetta e supera `npm run prova:garanzie`. Se il codice e il documento non coincidono, vale il documento; ogni modifica alle regole va prima approvata e scritta lì.

## Stack

- **Next.js** (App Router) in **TypeScript** con `strict: true`. Un solo progetto per interfaccia e logica server.
- **PWA** installabile da smartphone (manifest + service worker). Mobile first.
- **PostgreSQL** su **Supabase**, regione UE (Irlanda, eu-west-1). Accesso al database solo dal server, con Drizzle ORM e node-postgres.
- **Vercel**, regione UE (Dublino, dub1, vicino al database), per l'hosting dell'app.
- **Stripe** per tutti i pagamenti degli ordini (acquisti personali e negozio online): carta, PayPal, Klarna. Lo stato "pagato" arriva solo dal webhook di Stripe, mai impostato a mano.
- **Postmark** o **Resend** per le email (recupero password, notifiche).
- **Vitest** per i test.
- Fuso orario di riferimento per mesi, scadenze e date: **Europe/Rome**.

## Regole non negoziabili

### Calcoli
1. Tutti i calcoli (punti, qualifiche, provvigioni, saldi, ritenute) avvengono **solo sul server**. Il browser mostra risultati, non li calcola.
2. Importi monetari e punti si salvano come **interi in centesimi** (`bigint`). Mai `float`/`number` decimale per denaro o punti. Percentuali in punti base (12,5% = 1250).
3. Un'unica funzione di arrotondamento in tutto il progetto: **arrotondamento commerciale** a 2 decimali (0,005 va in su). Ogni voce si arrotonda; il totale è la somma delle voci già arrotondate.
4. Il motore provvigioni è un modulo **puro** (dati in ingresso → voci in uscita, senza accessi al database) in modo da poterlo testare in isolamento.
5. I **parametri** del piano (soglie, percentuali, titoli, quote pool, bonus auto, tetto 250 punti, soglia attività 33 punti, linea forte 8.000 punti, soglia pagamento 50 €, pool 3% dei punti aziendali, ritenute, date della finestra di richiesta) sono **configurabili dall'amministrazione** e salvati in versioni datate. La struttura dell'algoritmo è nel codice.
6. Ogni calcolo registra la **versione del piano** usata.

### Dati storici
7. Il mese si chiude e si **congela**. Dopo la chiusura nessuna riga di quel mese si modifica.
8. Il registro provvigioni è **solo in aggiunta**: correzioni, resi e riacquisti diventano **righe di rettifica** nel mese in cui avvengono, mai modifiche al passato.
9. Il saldo di un incaricato è sempre la **somma dei suoi movimenti**, mai un numero modificabile a mano.
10. Righe d'ordine con prezzi e punti **fotografati** al momento dell'ordine.
11. **Registro modifiche** (audit log) di ogni azione di amministrazione e contabilità: chi, cosa, quando, valore prima e dopo.

### Test
12. Per il motore provvigioni: **prima i test, poi il codice**. Tutti i casi di test di `docs/piano-compensi.md` devono passare al centesimo.
13. Nessuna modifica al motore senza che tutti i test passino.

### Sicurezza e GDPR
14. Password salvate solo come hash (argon2id). Mai in chiaro, mai nei log.
15. Ogni incaricato vede solo i propri dati e quelli consentiti della sua rete (controllo sul server per ogni richiesta, non solo nell'interfaccia):
    - tutta la downline: codice incaricata, nome, qualifica, punti e volumi (fondatore, 6/11/2026);
    - telefono ed email: **solo dei diretti** (primo livello);
    - mai IBAN, codice fiscale, indirizzi o provvigioni altrui.
16. Dati personali (IBAN, codice fiscale, dati dei clienti del negozio online) visibili solo ad amministrazione e contabilità, secondo necessità. Eccezioni: lo staff "ordini" vede l'indirizzo di spedizione degli ordini; l'incaricata vede nome e cognome dei **suoi** clienti e, solo con il consenso del cliente, email e telefono (mai l'indirizzo) (decisione 29).
17. Nessun dato personale negli URL, nei log o nei messaggi di errore.

### Integrazioni
18. Livello API versionato (`/api/v1/...`) per un futuro sito esterno: autenticazione con chiave, webhook in uscita **firmati** (HMAC), webhook in entrata con verifica della firma e **idempotenza** (lo stesso evento ricevuto due volte non crea due ordini).

### Prestazioni
19. Volumi attesi: ~50 incaricati al lancio, 500–1.000 in due anni, ~5–6 ordini al mese per incaricato. Volumi mensili precalcolati per incaricato e mese; indici sulle colonne di ricerca. Il calcolo del mese deve restare sotto pochi secondi anche con 1.000 incaricati.

## Ruoli

- **Incaricato**: si registra da solo e accede con codice incaricato + password personale (scelta in registrazione, con recupero via email).
- **Amministrazione**: incaricati, sponsor e struttura della rete, flag Leader Fondatore, blocco manuale della qualifica (fino a Leader 20%), sospensioni, prodotti, listini, promozioni, stati ordini, parametri del piano, anteprima del calcolo.
- **Contabilità**: richieste di pagamento (approva/rifiuta), pagamenti, ritenute, IVA e INPS, export per bonifici e commercialista.
- **Ordini** (terzo ruolo staff): solo gestione degli stati degli ordini e delle spedizioni.
- **Accesso staff** (amministrazione, contabilità, ordini): email + password + codice di 6 cifre inviato via email a ogni accesso.

## Decisioni di prodotto

- **Codice incaricato**: generato in automatico, formato `GL` + 6 cifre progressive (es. `GL000123`). Non si riutilizza mai.
- **Registrazione incaricato**: self-service. Dati: nome, cognome, codice fiscale, data di nascita, indirizzo, telefono, email, IBAN, partita IVA (sì/no + numero), password, **codice sponsor** obbligatorio (l'app mostra nome e iniziale del cognome dello sponsor per conferma). Nessuna approvazione: l'incaricato è attivo subito. **Start kit (59,90 €, 33 punti fissi) obbligatorio** in registrazione: attiva l'account alla conferma di Stripe; sconto 40% e negozio online dall'ordine successivo.
- **Senza codice sponsor**: avviso "Se non hai un codice sponsor chiedilo all'azienda" con un modulo di sola richiesta di contatto (nome, cognome, telefono, email, città). La richiesta arriva all'amministrazione come notifica (area admin + email); l'amministrazione contatta la persona e le comunica un codice sponsor.
- **Pagine incaricato**: Prodotti a listino, Promozioni, Ordini (nuovo ordine + elenco con stato), Carriera (qualifica, requisiti per la successiva, avanzamento in %, rete con **rappresentazione grafica ad albero**), Provvigioni (maturate, disponibili, richieste, pagate, dettaglio voce per voce, pulsante "Richiedi pagamento").
- **Stati ordine**: inserito, pagato, in preparazione, spedito, consegnato, annullato, reso.
  - "Pagato" lo imposta solo il webhook di Stripe. Lo staff (amministrazione e ordini) segna a mano in preparazione, spedito (corriere e numero di tracciamento obbligatori, email all'incaricata) e consegnato.
  - Un ordine non pagato entro 24 ore si annulla; l'incaricata può annullare i suoi ordini non pagati.
  - Rimborso totale su Stripe: l'ordine diventa "reso" se già spedito, altrimenti "annullato". I rimborsi si registrano per le rettifiche della Fase 6.
- **Start kit non pagato**: i dati e il codice GL restano; l'incaricata accede ma vede solo "Paga lo start kit" finché Stripe non conferma. Vale anche per chi è inserito dall'amministrazione; le incaricate esistenti prima della Fase 3 sono già segnate come pagate.
- **Spedizione degli ordini personali**: proposto l'indirizzo del profilo, modificabile per il singolo ordine.
- **Riordino responsabile (70%)**: spunta obbligatoria dal secondo acquisto personale pagato (lo start kit non conta), salvata con data e ora.
- **Negozio personale online**: pagina pubblica di ogni incaricato dentro l'app (es. `/negozio/GL000123`), curata nella grafica. Gli ordini sono attribuiti all'incaricato con certezza e generano punti ON.
- **Pagamento ordini**: solo carta, PayPal e Klarna tramite Stripe. **Il bonifico non è ammesso per gli ordini.** Mese di competenza = momento in cui Stripe conferma il pagamento. Rimborsi Stripe → rettifiche.
- **Prezzi e punti**: listino IVA inclusa; punti = 0,80 × prezzo pagato IVA esclusa, oppure punti per pezzo scritti a mano dallo staff (prodotto: acquisto personale e online separati; promozione: valore unico; decisione 27); acquisti personali con sconto 40%; provvigione negozio online = 50% dei punti; promozioni senza sconto 40% (intestate all'incaricata: 50% dei punti più qualifica se attiva, dentro il tetto di 250); start kit: 50% dei punti alla sponsor (se attiva) più la differenza; spedizione 6,90 € per ogni ordine, senza punti. Tutti parametri (vedi `docs/piano-compensi.md`).
- **Pagamento provvigioni**: pulsante "Richiedi pagamento" dal 3 al 6 del mese successivo (il mese si chiude il 1°), minimo 50 €; pagamento il 20 (o primo giorno lavorativo successivo) con bonifico all'IBAN del profilo.
- **Licenza annuale (decisione 31)**: rinnovo dell'app a 29,90 € (prodotto "Licenza annuale" nel catalogo), valido 12 mesi dal pagamento dello start kit; nessun punto, tutto all'azienda. Rinnovo da 30 giorni prima (vecchia scadenza + 12 mesi) fino alla fine del mese dopo la scadenza (12 mesi dal pagamento); avvisi 30 e 7 giorni prima. Licenza scaduta: sola visualizzazione (solo rinnovo e richiesta delle provvigioni maturate), negozio chiuso, mesi fermi (non matura nulla). Senza rinnovo: dirette e clienti alla sponsor, lei torna cliente (entra solo per il saldo residuo). Esente solo Giovanna Di Lillo. Dettagli in `docs/piano-compensi.md`, sezione 3a.
- **Leader Fondatori**: per 12 mesi qualifica bloccata al 12% (dentro il piano) + bonus 3% sui punti di gruppo reali, se attive.
- **Figure speciali**: Giovanna Di Lillo (GL000001, fondatrice) Master President 2% dell'incasso aziendale anche se inattiva, bloccata al 20%, esclusa da pool e bonus auto; Margherita Suma (Leader Fondatrice) quota riservata 1% dell'incasso solo se attiva, separata dal pool (3% dei punti aziendali). Dettagli nella sezione 6 di `docs/piano-compensi.md`.
- **Fisco**: ritenuta d'imposta 23% sul 78% su tutti i pagamenti, per tutte le incaricate. IVA (partita IVA sì/no) e INPS (a carico azienda sì/no) come parametri, in attesa del commercialista.
- **Documenti e versamenti (decisione 28)**: per ogni pagamento approvato, ricevuta (senza partita IVA, bollo 2 € tolto sopra 77,47 €) o fattura proforma (partita IVA ordinaria o forfettaria) in PDF per l'incaricata; F24 compilato in automatico (codice tributo 1038, mese di riferimento, scadenza il 16 del mese dopo); file bonifici SEPA XML pain.001.001.03 profilo CBI. F24 e bonifici solo amministrazione e contabilità. Dettagli in `docs/piano-compensi.md`, sezioni 8a–8c.
- **Grafica**: nero e oro, caratteri con grazie eleganti, come il logo in `assets/brand/logo-g-luxe.png`.

## Cartella del progetto

Il progetto vive in `C:\Progetti\gluxe-app`, **fuori da OneDrive** (la sincronizzazione di `node_modules` rallenta e blocca i file). Il backup del codice si fa con Git/GitHub. I materiali del brand restano in `OneDrive\Desktop\G Luxe`.

## Come si lavora sul codice

- Ogni modifica si fa su un **branch** dedicato su GitHub, si prova su un'**anteprima Vercel** e solo dopo si unisce a `main` (che va online).
- Anteprime e computer di sviluppo devono usare un **database di prova** separato (progetto Supabase "gluxe-test"), mai quello di produzione.
- Le modifiche al database (migrazioni) devono essere **reversibili**: per ognuna va previsto come tornare indietro.
- Il database di produzione si modifica solo dopo l'ok del fondatore.
- In `.env.local`: `DATABASE_URL` = database di prova, `DATABASE_URL_PRODUZIONE` = database vero. Gli script (`db:aggiorna`, `db:annulla`, `db:seme-catalogo`, `crea-staff`) usano la prova; con `--produzione` (o `db:aggiorna:produzione`) quello vero.
- Collegamento al database dall'app: **node-postgres (`pg`)**, pooler di Supabase in modalità sessione (porta 5432). Non usare postgres.js dentro Next.js: manda le interrogazioni in due tempi e, con più pagine aperte insieme, alcune connessioni restavano a metà e le pagine si bloccavano su "Caricamento…" (scoperto e risolto il 29/10/2026). Gli script in `scripts/` usano ancora postgres.js (fuori da Next.js va bene).
- Su Vercel: `DATABASE_URL` di Production = database vero, di Preview = database di prova. L'anteprima di un branch ha l'indirizzo fisso `gluxe-app-git-<branch>-g-luxe.vercel.app`.
- Lo strumento Vercel si usa con `npx vercel` (installato nel progetto, account già collegato). Nel terminale PowerShell dell'utente usare `npm.cmd` al posto di `npm` (gli script `.ps1` sono bloccati da Windows).
- Mai mostrare in chat password, chiavi o indirizzi dei database: per passarli all'utente si copiano negli appunti.

## Lavori in corso (aggiornare a ogni passo)

- **Fase 2 online** (catalogo sul sito vero, prodotti senza foto finché non arrivano quelle G LUXE).
- **Fase 3 online dal 29/10/2026** (migrazione 0002 applicata al database vero). Sul sito vero mancano le chiavi Stripe: start kit e nuovi ordini mostrano "Il pagamento online sarà attivo a breve" (`pagamentiAttivi()` in `src/lib/stripe.ts`). Provata su computer e anteprima (start kit, ordini con promo, carta di prova, scadenza pagamento, idempotenza webhook, staff ordini, spedizione, rimborso → reso, riordino 70%, annullamento).
  - Anteprima online pronta (ok del fondatore del 29/10/2026): chiavi Stripe di prova su Vercel (Preview), "Protection Bypass for Automation" attivo (segreto solo in `.env.local`, `VERCEL_BYPASS_ANTEPRIME`), webhook Stripe di prova (uno solo) con il bypass nell'indirizzo, oggi verso `gluxe-app-git-fase-7-negozio-g-luxe.vercel.app/api/stripe/webhook` (spostato dalla Fase 3 il 9/11/2026, ok del fondatore); il suo segreto è `STRIPE_WEBHOOK_SECRET` di Preview. Per provare i pagamenti su un altro branch si sposta l'indirizzo di quel webhook (il segreto non cambia).
  - Per accendere i pagamenti sul sito vero: account Stripe completato (dati aziendali, IBAN), PayPal attivato su Stripe, chiavi vere su Vercel (Production), `npm run stripe:metodi` con la chiave vera, webhook Stripe verso `https://gluxe-app.vercel.app/api/stripe/webhook`. Il database vero è già aggiornato.
  - Sul computer: `npm run stripe:inoltra` (in un secondo terminale) fa arrivare gli eventi di Stripe al server di sviluppo. Credenziali finte per le prove in `.env.local` (`PROVA_…`).
- **Fase 4 online dal 5/11/2026** (ok del fondatore; migrazione 0004 applicata anche al database vero, dove GL000001 è Giovanna Di Lillo con le sue impostazioni): piano **rev. 6** (testo del fondatore del 5/11 con le decisioni 19–25). Motore puro in `src/lib/provvigioni/` (motore, fondatori, pagamenti) con i test T1–T20 + garanzie: tutti verdi. Migrazione 0004: tabelle qualifiche bloccate, Leader Fondatori, quote speciali; Giovanna bloccata 20% + Master President 2% + esclusa da pool e bonus auto; blocco sponsor (solo sede, niente cicli); Row Level Security su tutte le tabelle; parametri rev. 6 (finestra 3–6, limite compensi 70%); prodotti rinominati (Shampoo Botox 33,90 €, Maschera Botox, Spray Botox 10in1). Consensi separati, export e cancellazione dei dati, cifratura di IBAN e codice fiscale: Fase 9 (decisione 25). Pagine: anteprima della sede (`/staff/provvigioni`) e stima del mese dell'incaricata (`/area/provvigioni`). La versione dei parametri rev. 6 contiene ancora la chiave `bloccateContanoComeLinee` per non rompere il codice già online: toglierla in una versione successiva, dopo la pubblicazione.
  - Fatto anche: pagina della sede "Impostazioni del piano" (`/staff/piano`: qualifiche bloccate con revoca, Leader Fondatori con massimo e requisito dei 90 giorni controllato in automatico, quote sull'incasso, esclusioni da pool e bonus auto) e nuova versione dei parametri dall'area sede (`/staff/parametri/nuova`, solo versioni nuove con data di efficacia; il database vieta di riscrivere quelle vecchie). Parametro nuovo `dataLancioPiano` (vuoto finché il fondatore non lo decide). Controllo dei segreti: `npm run controlla:segreti`, prima di ogni commit (`.githooks`, attivato da `npm install`) e prima di ogni build su Vercel.
- **Fase 5 online dal 6/11/2026** (ok del fondatore; nessuna migrazione): pagina Carriera dell'incaricata (qualifica del mese, avanzamento verso la successiva, titolo e linee forti, rete della sola downline in **grafica Unilevel** o in **lista**, telefono ed email solo delle dirette; mese tra gli ultimi 12) e rete per la sede (`/staff/rete`, tutta o da una incaricata, link dalla scheda). Sul telefono: organigramma centrato con due livelli alla volta ("+N" per ripartire da una persona) e lista a schede. Modulo puro `src/lib/rete.ts` con test (anche di privacy). Scheda prodotto: punti sempre in punti, provvigione dal negozio su una riga a parte. Rete finta per le prove: `npm run db:seme-rete-prova` (solo database di prova).
- **Fase 6 online dal 9/11/2026** (ok del fondatore dopo la prova sull'anteprima; migrazione 0006 applicata anche al database vero, `CRON_SECRET` su Vercel Production): chiusura del mese con fotografia dei dati (`/staff/chiusura`, solo amministrazione; il giorno 1 alle 3 un promemoria via email da `/api/cron/chiusura`, protetto da `CRON_SECRET`), registro provvigioni solo in aggiunta (saldo = somma dei movimenti), storni dei resi a scalare, richiesta di pagamento dell'incaricata (3–6, minimo 50 €), contabilità (`/staff/contabilita`: approva o rifiuta, ricevuta o fattura proforma numerata per incaricata e anno, file bonifici SEPA CBI, F24 codice 1038 con scadenza, report mese per mese di IVA, ritenute, INPS e bolli, export CSV per il commercialista, dati dell'azienda). Regime fiscale dell'incaricata nel modulo anagrafica. Moduli puri con test: `documento.ts`, `congelamento.ts`, `src/lib/sepa.ts`, F24 in `pagamenti.ts`. Prove: `npm run prova:garanzie` e `npm run prova:fase6`. Per provare la richiesta fuori dai giorni 3–6: `PROVA_FINESTRA_PAGAMENTI_APERTA=1` (ignorata sul sito vero). Dati di prova: `npm run db:seme-rete-prova -- --mese-scorso` (Alice partita IVA ordinaria, Bruna forfettaria, dati d'azienda finti).
  - Sul sito vero mancano ancora i dati veri dell'azienda (ragione sociale, sede, codice fiscale, partita IVA, IBAN, codice CUC della banca, autorizzazione al bollo virtuale): si inseriscono da "Contabilità → Dati dell'azienda"; senza, l'approvazione delle richieste e il file bonifici si fermano con un avviso. Dal commercialista: ritenuta e bollo per le forfettarie, mese di riferimento dell'F24, regola INPS. Sull'anteprima del branch `fase-6-chiusura` la finestra di richiesta resta aperta (`PROVA_FINESTRA_PAGAMENTI_APERTA` in Preview).
- **Indicatore del margine online dal 9/11/2026** (ok del fondatore; migrazione 0007 anche sul database vero): nella pagina Provvigioni dell'incaricata, "Guadagno stimato dagli acquisti personali" (listino − prezzo scontato, solo informativo; regola in `docs/piano-compensi.md`, sezione 2). Listino fotografato nelle righe d'ordine (`listino_unitario_ivato`; vuoto negli ordini precedenti, dove vale il listino attuale del prodotto).
- **Fase 7 online dal 9/11/2026** (ok del fondatore dopo la prova sull'anteprima; decisione 29; migrazione 0008 applicata anche al database vero; finché mancano le chiavi Stripe vere il negozio mostra "Il pagamento online sarà attivo a breve"): negozio pubblico `/negozio/GL…` (cliente ospite, legame permanente alla prima incaricata, consenso ai contatti facoltativo, chiuso se l'incaricata non è attiva o senza start kit), pagina dell'ordine del cliente con link segreto (`/negozio/ordine/<id>?c=…`), pagina "Negozio" dell'incaricata (link, ordini dei clienti senza indirizzo, clienti con contatti solo se c'è il consenso), sede: "Clienti" (segnalazioni dei clienti fittizi, spostamento con motivo) e "Vendite a clienti finali" (quota ON/PP per incaricata e rete). Impronta del metodo di pagamento dal webhook di Stripe. Moduli puri con test: `clienti-fittizi.ts`, `vendite.ts`, ordini "online" in `calcolo-ordine.ts`. Prove: `npm run prova:garanzie`, `npm run prova:fase7`.
- **Licenza annuale in prova** (branch `licenza-annuale`; decisione 31; migrazione 0009 applicata solo al database di prova): pagina "Licenza" dell'incaricata (`/area/licenza`, link in alto) con rinnovo via Stripe, avviso in cima all'area 30 giorni prima e a licenza scaduta, avvisi email 30 e 7 giorni prima (cron giornaliero `/api/cron/licenze`, `CRON_SECRET`), sola visualizzazione a licenza scaduta (ordini bloccati, negozio chiuso), mesi fermi nel motore (`ferma`, test T27), decadenza con la chiusura del mese (dirette e clienti alla sponsor, stato "cliente" con accesso solo a Provvigioni), scheda Licenza nella pagina dell'incaricata per la sede. Moduli: `src/lib/licenza.ts` (puro, test T28) e `src/lib/licenze.ts`. Prove: `npm run prova:garanzie`, `npm run prova:licenza`. Per le prove della Fase 6 `prove/fase6/azzera.sh` ora usa `npm run db:riapplica` (riapplica una sola migrazione annullata anche se ce ne sono di più recenti).
- **Punti scritti a mano online dal 6/11/2026** (decisione 27, migrazione 0005 anche sul database vero): tutto lo staff vede catalogo e promozioni e può cambiare i punti per pezzo (prodotto: acquisto personale e online; promozione: valore unico); prezzi solo l'amministrazione.
- Da decidere: data di lancio del piano (`dataLancioPiano`, per il limite di ingresso dei Leader Fondatori). Margherita Suma, quando sarà registrata: Leader Fondatrice + quota riservata 1% solo se attiva, da "Impostazioni del piano".
- Database di prova: account staff del fondatore (prestigehcaire@gmail.com), staff "ordini" finto (ordini-prova@gluxe.test), amministratore finto (admin-prova@gluxe.test, credenziali in `.env.local`), incaricate finte GL000001 e GL000002 (prova.incaricata@gluxe.test) per le prove.
- Produzione: account amministratore del fondatore e Giovanna Di Lillo (GL000001). Next.js 16.4.3 (aggiornamento di sicurezza già online).
- Ancora da fare in futuro: dominio aziendale su Resend (email alle incaricate), pagina per creare account staff dall'area sede, pulsante "mostra link password" (proposto, non ancora approvato).

## Piano di sviluppo

| Fase | Contenuto | Stato |
| --- | --- | --- |
| 0 | Fondamenta: progetto, database, hosting di prova, PWA, grafica base | completata |
| 1 | Registrazione con codice sponsor, richieste di contatto, accesso incaricati (codice + password) e admin (email + password + codice), recupero password, anagrafica incaricati, codice automatico, audit log | completata (le email alle incaricate partiranno quando sarà verificato il dominio aziendale su Resend) |
| 2 | Catalogo: prodotti, listino, punti con coefficiente, sconto 40%, start kit, promozioni | completata (online senza foto prodotti) |
| 3 | Ordini con pagamento Stripe (carta, PayPal, Klarna): start kit in registrazione, spedizione 6,90 €, stati, storico, conferma riordino 70%, ruolo staff "ordini" | completata (online dal 29/10/2026; pagamenti da accendere quando l'account Stripe è completo) |
| 4 | Motore provvigioni (rev. 6): prima i test di `docs/piano-compensi.md`, poi il codice; parametri versionati; qualifiche bloccate, Leader Fondatori, figure speciali; anteprima | completata (online dal 5/11/2026) |
| 5 | Carriera e rete: qualifica, avanzamento, albero grafico della rete | completata (online dal 6/11/2026) |
| 6 | Chiusura mese, registro provvigioni, storni, richieste di pagamento (3–6), area contabilità, ritenute, report IVA/INPS, export; ricevuta o fattura proforma per l'incaricata, F24 (codice 1038), file bonifici SEPA CBI | completata (online dal 9/11/2026) |
| 7 | Negozio personale online, clienti legati, controllo clienti fittizi, indicatore vendite a clienti finali | completata (online dal 9/11/2026; ordini dal negozio quando i pagamenti Stripe saranno accesi) |
| 8 | API e webhook per siti esterni | da fare |
| 9 | Collaudo con dati simulati, sicurezza, GDPR, backup, pilota con 5–10 incaricati | da fare |

Aggiorna la colonna "Stato" alla fine di ogni fase.

@AGENTS.md

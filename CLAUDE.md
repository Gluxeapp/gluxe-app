# G LUXE · App incaricati

App per gli incaricati alle vendite di G LUXE (haircare, vendita diretta multilivello), con area amministrazione, area contabilità e negozio personale online di ogni incaricato.

## Come lavorare con il fondatore

- Il fondatore non è un programmatore: spiega ogni scelta in italiano semplice, senza gergo tecnico non spiegato.
- Tutta l'interfaccia dell'app è in italiano.
- Lavora per fasi (vedi sotto). Ogni fase deve finire con qualcosa che il fondatore può provare, e con le istruzioni per provarlo.
- Se una regola del piano compensi è ambigua o in conflitto con un'altra, **fermati e chiedi** prima di scrivere codice. Non inventare regole.
- Fonte ufficiale delle regole di calcolo: [docs/piano-compensi.md](docs/piano-compensi.md). Se il codice e il documento non coincidono, vale il documento; ogni modifica alle regole va prima approvata e scritta lì.

## Stack

- **Next.js** (App Router) in **TypeScript** con `strict: true`. Un solo progetto per interfaccia e logica server.
- **PWA** installabile da smartphone (manifest + service worker). Mobile first.
- **PostgreSQL** su **Supabase**, regione UE (Irlanda, eu-west-1). Accesso al database solo dal server.
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
5. I **parametri** del piano (soglie, percentuali, titoli, quote pool, bonus auto, tetto 300 punti, soglia attività 50 punti, soglia pagamento 50 €, fondo pool 3%, ritenute, date della finestra di richiesta) sono **configurabili dall'amministrazione** e salvati in versioni datate. La struttura dell'algoritmo è nel codice.
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
    - tutta la downline: nome, qualifica, punti e volumi;
    - telefono ed email: **solo dei diretti** (primo livello);
    - mai IBAN, codice fiscale, indirizzi o provvigioni altrui.
16. Dati personali (IBAN, codice fiscale, dati dei clienti del negozio online) visibili solo ad amministrazione e contabilità, secondo necessità.
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
- **Registrazione incaricato**: self-service. Dati: nome, cognome, codice fiscale, data di nascita, indirizzo, telefono, email, IBAN, partita IVA (sì/no + numero), password, **codice sponsor** obbligatorio (l'app mostra nome e iniziale del cognome dello sponsor per conferma). Nessuna approvazione: l'incaricato è attivo subito. **Start kit (59,90 €, 33 punti fissi) obbligatorio** in registrazione: attiva l'account; sconto 40% e negozio online dall'ordine successivo; finché non c'è il pagamento (Fase 3) la registrazione funziona senza; da allora l'attivazione avviene alla conferma di Stripe.
- **Senza codice sponsor**: avviso "Se non hai un codice sponsor chiedilo all'azienda" con un modulo di sola richiesta di contatto (nome, cognome, telefono, email, città). La richiesta arriva all'amministrazione come notifica (area admin + email); l'amministrazione contatta la persona e le comunica un codice sponsor.
- **Pagine incaricato**: Prodotti a listino, Promozioni, Ordini (nuovo ordine + elenco con stato), Carriera (qualifica, requisiti per la successiva, avanzamento in %, rete con **rappresentazione grafica ad albero**), Provvigioni (maturate, disponibili, richieste, pagate, dettaglio voce per voce, pulsante "Richiedi pagamento").
- **Stati ordine**: inserito, pagato, in preparazione, spedito, consegnato, annullato, reso.
- **Negozio personale online**: pagina pubblica di ogni incaricato dentro l'app (es. `/negozio/GL000123`), curata nella grafica. Gli ordini sono attribuiti all'incaricato con certezza e generano punti ON.
- **Pagamento ordini**: solo carta, PayPal e Klarna tramite Stripe. **Il bonifico non è ammesso per gli ordini.** Mese di competenza = momento in cui Stripe conferma il pagamento. Rimborsi Stripe → rettifiche.
- **Prezzi e punti**: listino IVA inclusa; punti = 0,80 × prezzo pagato IVA esclusa; acquisti personali con sconto 40%; provvigione negozio online = 50% dei punti; spedizione 6,90 € per ogni ordine, senza punti. Tutti parametri (vedi `docs/piano-compensi.md`).
- **Pagamento provvigioni**: pulsante "Richiedi pagamento" dal 1° al 4 del mese successivo, minimo 50 €; pagamento il 20 (o primo giorno lavorativo successivo) con bonifico all'IBAN del profilo.
- **Leader Fondatori**: per 12 mesi qualifica bloccata al 16% (dentro il piano) + bonus 3% sui punti di gruppo reali, se attive.
- **Figure speciali**: Giovanna Di Lillo (GL000001, fondatrice) Master President 2% dell'incasso aziendale anche se inattiva, bloccata al 20%, esclusa da pool e bonus auto; Margherita Suma (Leader Fondatrice) quota riservata del pool 1% dell'incasso solo se attiva. Dettagli nella sezione 6 di `docs/piano-compensi.md`.
- **Fisco**: ritenuta d'imposta 23% sul 78% su tutti i pagamenti, per tutte le incaricate. IVA (partita IVA sì/no) e INPS (a carico azienda sì/no) come parametri, in attesa del commercialista.
- **Grafica**: nero e oro, caratteri con grazie eleganti, come il logo in `assets/brand/logo-g-luxe.png`.

## Cartella del progetto

Il progetto vive in `C:\Progetti\gluxe-app`, **fuori da OneDrive** (la sincronizzazione di `node_modules` rallenta e blocca i file). Il backup del codice si fa con Git/GitHub. I materiali del brand restano in `OneDrive\Desktop\G Luxe`.

## Come si lavora sul codice

- Ogni modifica si fa su un **branch** dedicato su GitHub, si prova su un'**anteprima Vercel** e solo dopo si unisce a `main` (che va online).
- Anteprime e computer di sviluppo devono usare un **database di prova** separato (progetto Supabase "gluxe-test"), mai quello di produzione.
- Le modifiche al database (migrazioni) devono essere **reversibili**: per ognuna va previsto come tornare indietro.
- Il database di produzione si modifica solo dopo l'ok del fondatore.

## Piano di sviluppo

| Fase | Contenuto | Stato |
| --- | --- | --- |
| 0 | Fondamenta: progetto, database, hosting di prova, PWA, grafica base | completata |
| 1 | Registrazione con codice sponsor, richieste di contatto, accesso incaricati (codice + password) e admin (email + password + codice), recupero password, anagrafica incaricati, codice automatico, audit log | completata (le email alle incaricate partiranno quando sarà verificato il dominio aziendale su Resend) |
| 2 | Catalogo: prodotti, listino, punti con coefficiente, sconto 40%, start kit, promozioni | da fare |
| 3 | Ordini con pagamento Stripe (carta, PayPal, Klarna): start kit in registrazione, spedizione 6,90 €, stati, storico, conferma riordino 70%, ruolo staff "ordini" | da fare |
| 4 | Motore provvigioni (rev. 5): prima i test di `docs/piano-compensi.md`, poi il codice; parametri versionati; qualifiche bloccate, Leader Fondatori, figure speciali; anteprima | da fare |
| 5 | Carriera e rete: qualifica, avanzamento, albero grafico della rete | da fare |
| 6 | Chiusura mese, registro provvigioni, storni, richieste di pagamento (1–4), area contabilità, ritenute, report IVA/INPS, export | da fare |
| 7 | Negozio personale online, clienti legati, controllo clienti fittizi, indicatore vendite a clienti finali | da fare |
| 8 | API e webhook per siti esterni | da fare |
| 9 | Collaudo con dati simulati, sicurezza, GDPR, backup, pilota con 5–10 incaricati | da fare |

Aggiorna la colonna "Stato" alla fine di ogni fase.

@AGENTS.md

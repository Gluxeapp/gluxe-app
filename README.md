# G LUXE · App incaricati

App per gli incaricati alle vendite G LUXE. Regole del progetto in [CLAUDE.md](CLAUDE.md), regole di calcolo in [docs/piano-compensi.md](docs/piano-compensi.md).

## Comandi

| Comando | A cosa serve |
| --- | --- |
| `npm run dev` | Avvia l'app sul computer, su http://localhost:3000 |
| `npm test` | Esegue i test automatici (calcoli e controlli sui dati) |
| `npm run typecheck` | Controlla gli errori di programmazione |
| `npm run build` | Prepara la versione da pubblicare |
| `npm run db:genera` | Crea la migrazione dopo una modifica a `src/db/schema.ts` |
| `npm run db:aggiorna` | Applica al database le migrazioni nuove |
| `npm run crea-staff -- email "Nome Cognome" amministrazione` | Crea un account staff (`amministrazione` o `contabilita`) e invia il link per la password |

## Configurazione

Copia `.env.example` in `.env.local` e inserisci i valori veri. `.env.local` non va mai condiviso.
Su Vercel le stesse variabili vanno in Settings → Environment Variables.

Controllo di salute: `/api/stato` dice se l'app è accesa e se il database risponde.

## Aree dell'app

- `/` accesso incaricati (codice GL + password), `/registrazione`, `/richiesta-sponsor`, `/recupero-password`
- `/area` area riservata dell'incaricato
- `/staff` amministrazione e contabilità (email + password + codice via email)

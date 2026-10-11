# G LUXE · App incaricati

App per gli incaricati alle vendite G LUXE. Regole del progetto in [CLAUDE.md](CLAUDE.md), regole di calcolo in [docs/piano-compensi.md](docs/piano-compensi.md).

## Comandi

| Comando | A cosa serve |
| --- | --- |
| `npm run dev` | Avvia l'app sul computer, su http://localhost:3000 |
| `npm test` | Esegue i test automatici dei calcoli |
| `npm run typecheck` | Controlla gli errori di programmazione |
| `npm run build` | Prepara la versione da pubblicare |

## Configurazione

Copia `.env.example` in `.env.local` e inserisci i valori veri. `.env.local` non va mai condiviso.

Controllo di salute: `/api/stato` dice se l'app è accesa e se il database risponde.

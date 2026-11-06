# Riporta il database di PROVA a prima della Fase 6 (mesi chiusi, registro, richieste, documenti,
# bonifici e F24 cancellati), poi reimposta regimi e dati d'azienda finti. Mai sul database vero.
set -e
cd "$(dirname "$0")/../.."
npm run -s db:annulla -- 0006_fase6_chiusura_pagamenti >/dev/null
npm run -s db:aggiorna >/dev/null
node --env-file=.env.local prove/fase6/imposta-prova.mjs
echo "Database di prova riportato a prima della chiusura."

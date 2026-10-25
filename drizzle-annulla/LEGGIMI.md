# Annullare una migrazione

Ogni migrazione in `drizzle/` ha qui il file con lo stesso nome che la annulla.

```
npm run db:annulla -- 0001_fase2_catalogo               (database di prova)
npm run db:annulla -- 0001_fase2_catalogo --produzione  (database vero: solo con l'ok del fondatore)
```

Lo script esegue il file e toglie la migrazione dall'elenco di quelle applicate,
così `npm run db:aggiorna` può riapplicarla.

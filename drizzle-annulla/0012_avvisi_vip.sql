-- Annulla la migrazione 0012 (avvisi di scadenza VIP). ATTENZIONE: si perde il ricordo degli avvisi già mandati
-- (riapplicandola, una cliente vicina alla scadenza potrebbe ricevere l'avviso una seconda volta).
DROP TABLE IF EXISTS "app"."avvisi_vip";

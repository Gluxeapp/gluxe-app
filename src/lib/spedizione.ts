import { z } from "zod";

/** Controllo dei dati di spedizione di un ordine (acquisti personali, start kit e negozio online). */
export const testoObbligatorio = (nome: string, max: number) =>
  z.string().trim().min(1, `${nome}: campo obbligatorio`).max(max, `${nome}: testo troppo lungo`);

export const schemaTelefono = z
  .string()
  .trim()
  .regex(/^\+?[\d\s]{8,16}$/, "Numero di telefono non valido");

export const schemaSpedizione = z.object({
  destinatario: testoObbligatorio("Destinatario", 120),
  indirizzo: testoObbligatorio("Indirizzo", 160),
  cap: z.string().trim().regex(/^\d{5}$/, "CAP non valido (5 cifre)"),
  citta: testoObbligatorio("Città", 80),
  provincia: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^[A-Z]{2}$/, "Provincia: 2 lettere (es. MI)"),
  telefono: schemaTelefono,
});

import { connection } from "next/server";
import { database } from "@/db";

/** Controllo di salute: dice se l'app è accesa e se il database risponde. Nessun dato personale. */
export async function GET() {
  await connection();

  const collegamento = database();
  if (!collegamento) {
    return Response.json({ app: "ok", database: "non configurato" });
  }

  try {
    await collegamento.client.query("select 1");
    return Response.json({ app: "ok", database: "collegato" });
  } catch {
    return Response.json({ app: "ok", database: "errore di collegamento" }, { status: 503 });
  }
}

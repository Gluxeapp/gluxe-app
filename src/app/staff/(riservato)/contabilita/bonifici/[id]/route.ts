import { eq } from "drizzle-orm";
import { db } from "@/db";
import { distinteBonifici } from "@/db/schema";
import { richiediStaff } from "@/lib/accesso";
import { registra } from "@/lib/registro";

/** Scarica il file bonifici SEPA (XML CBI) da caricare nell'home banking. Solo amministrazione e contabilità. */
export async function GET(_: Request, { params }: RouteContext<"/staff/contabilita/bonifici/[id]">) {
  const staff = await richiediStaff(["amministrazione", "contabilita"]);
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return new Response("File non trovato", { status: 404 });
  const [d] = await db().select().from(distinteBonifici).where(eq(distinteBonifici.id, id)).limit(1);
  if (!d) return new Response("File non trovato", { status: 404 });
  await registra(db(), { utenteId: staff.utenteId, azione: "pagamenti.file_scaricato", entita: "distinta_bonifici", entitaId: d.id });
  return new Response(d.xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="bonifici-gluxe-${d.dataPagamento}${d.annullataIl ? "-ANNULLATO" : ""}.xml"`,
      "Cache-Control": "no-store",
    },
  });
}

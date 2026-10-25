import { eq } from "drizzle-orm";
import { connection } from "next/server";
import { db } from "@/db";
import { immagini } from "@/db/schema";

/** Foto dei prodotti. Una foto non cambia mai (una nuova foto ha un nuovo indirizzo): si può tenere in memoria a lungo. */
export async function GET(_: Request, { params }: RouteContext<"/api/immagini/[id]">) {
  await connection();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) return new Response("Non trovata", { status: 404 });
  const [immagine] = await db().select().from(immagini).where(eq(immagini.id, id)).limit(1);
  if (!immagine) return new Response("Non trovata", { status: 404 });
  return new Response(Buffer.from(immagine.dati, "base64"), {
    headers: {
      "Content-Type": immagine.tipo,
      "Cache-Control": "public, max-age=31536000, immutable",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

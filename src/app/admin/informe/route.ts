import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { puedeGenerarInforme } from "@/lib/permisos";
import { leerPeriodo, obtenerResumen } from "@/lib/reportes";
import { generarInformePdf } from "@/lib/pdf";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const session = await auth();
  const usuario = session?.user?.id ? await prisma.usuario.findUnique({ where: { id: session.user.id } }) : null;
  if (!usuario || !usuario.activo) return new Response("No autenticado", { status: 401 });
  if (!puedeGenerarInforme(usuario)) return new Response("Solo el administrador puede generar informes", { status: 403 });

  const url = new URL(req.url);
  const periodo = leerPeriodo({ desde: url.searchParams.get("desde"), hasta: url.searchParams.get("hasta") });
  const ahora = new Date();
  const resumen = await obtenerResumen(periodo, ahora);
  const bytes = await generarInformePdf(resumen, periodo, ahora);
  const nombre = `informe-tickets-${ahora.toISOString().slice(0, 10)}.pdf`;

  return new Response(Buffer.from(bytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${nombre}"`,
      "Cache-Control": "no-store",
    },
  });
}

import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requerirUsuario } from "@/lib/sesion";
import { esStaff } from "@/lib/permisos";
import { ETIQUETA_SLA, proximoVencimiento, semaforoSla, tiempoRestanteTexto, type Semaforo } from "@/lib/sla";
import { ETIQUETA_ESTADO, ETIQUETA_PRIORIDAD, ETIQUETA_TIPO, formatearFecha } from "@/lib/etiquetas";
import { ChipSemaforo } from "@/components/Semaforo";

export const dynamic = "force-dynamic";

const ESTADOS = ["ABIERTO", "EN_PROGRESO", "CERRADO"] as const;
const SEMAFOROS = ["ROJO", "AMARILLO", "VERDE"] as const;

export default async function ListaTickets({
  searchParams,
}: {
  searchParams: Promise<{ estado?: string; sla?: string; q?: string }>;
}) {
  const usuario = await requerirUsuario();
  const sp = await searchParams;
  const estado = ESTADOS.find((e) => e === sp.estado);
  const sla = SEMAFOROS.find((s) => s === sp.sla) as Semaforo | undefined;
  const q = sp.q?.trim();

  const where: Prisma.TicketWhereInput = {
    ...(esStaff(usuario) ? {} : { clienteId: usuario.id }),
    ...(estado ? { estado } : {}),
    ...(q
      ? {
          OR: [
            { folio: { contains: q, mode: "insensitive" } },
            { titulo: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };
  const ahora = new Date();
  const tickets = (
    await prisma.ticket.findMany({
      where,
      include: { cliente: true, agente: true },
      orderBy: [{ creadoEn: "desc" }],
      take: 500,
    })
  )
    .map((t) => ({ ...t, semaforo: semaforoSla(t, ahora).general, proximo: proximoVencimiento(t) }))
    .filter((t) => !sla || t.semaforo === sla);

  return (
    <>
      <div className="fila entre">
        <h1>{esStaff(usuario) ? "Todos los tickets" : "Mis tickets"}</h1>
        <Link href="/tickets/nuevo" className="boton primario">Nuevo ticket</Link>
      </div>
      <form className="tarjeta fila" method="get">
        <input name="q" placeholder="Buscar por folio o título" defaultValue={q} />
        <select name="estado" defaultValue={estado ?? ""}>
          <option value="">Todos los estados</option>
          {ESTADOS.map((e) => <option key={e} value={e}>{ETIQUETA_ESTADO[e]}</option>)}
        </select>
        <select name="sla" defaultValue={sla ?? ""}>
          <option value="">Todo SLA</option>
          <option value="ROJO">Rojo: vencido</option>
          <option value="AMARILLO">Amarillo: pronto a vencer</option>
          <option value="VERDE">Verde: a tiempo</option>
        </select>
        <button type="submit">Filtrar</button>
      </form>
      <div className="tarjeta tabla-scroll">
        {tickets.length === 0 ? (
          <p className="muted">No hay tickets que coincidan.</p>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Folio</th><th>Título</th><th>Tipo</th><th>Prioridad</th><th>Estado</th><th>SLA</th>
                {esStaff(usuario) && <th>Cliente</th>}
                <th>Agente</th><th>Creado</th>
              </tr>
            </thead>
            <tbody>
              {tickets.map((t) => (
                <tr key={t.id}>
                  <td><Link className="folio" href={`/tickets/${t.id}`}>{t.folio}</Link></td>
                  <td>{t.titulo}</td>
                  <td>{ETIQUETA_TIPO[t.tipo]}</td>
                  <td>{ETIQUETA_PRIORIDAD[t.prioridad]}</td>
                  <td>{ETIQUETA_ESTADO[t.estado]}</td>
                  <td>
                    <ChipSemaforo
                      valor={t.semaforo}
                      detalle={t.proximo ? `${ETIQUETA_SLA[t.proximo.tipo]}: ${tiempoRestanteTexto(t.proximo.venceEn, ahora)}` : undefined}
                    />
                  </td>
                  {esStaff(usuario) && <td>{t.cliente.nombre}</td>}
                  <td>{t.agente?.nombre ?? <span className="muted">Sin asignar</span>}</td>
                  <td className="pequeno">{formatearFecha(t.creadoEn)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </>
  );
}

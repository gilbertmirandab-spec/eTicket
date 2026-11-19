import type { EstadoTicket, Prioridad } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { semaforoSla, type Semaforo } from "@/lib/sla";

export type FiltroPeriodo = { desde?: Date; hasta?: Date };

/** Interpreta ?desde=AAAA-MM-DD&hasta=AAAA-MM-DD (hasta inclusive). */
export function leerPeriodo(sp: { desde?: string | null; hasta?: string | null }): FiltroPeriodo {
  const fecha = (v?: string | null) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T00:00:00`) : undefined);
  const desde = fecha(sp.desde);
  const hastaBase = fecha(sp.hasta);
  const hasta = hastaBase ? new Date(hastaBase.getTime() + 24 * 3600 * 1000) : undefined;
  return { desde, hasta };
}

export async function obtenerResumen(periodo: FiltroPeriodo = {}, ahora: Date = new Date()) {
  const tickets = await prisma.ticket.findMany({
    where: {
      creadoEn: {
        ...(periodo.desde ? { gte: periodo.desde } : {}),
        ...(periodo.hasta ? { lt: periodo.hasta } : {}),
      },
    },
    include: { cliente: true, agente: true },
    orderBy: { slaVenceEn: "asc" },
  });

  const conSemaforo = tickets.map((t) => ({ ...t, semaforo: semaforoSla(t, ahora) }));
  const porEstado: Record<EstadoTicket, number> = { ABIERTO: 0, EN_PROGRESO: 0, CERRADO: 0 };
  const porSemaforo: Record<Semaforo, number> = { VERDE: 0, AMARILLO: 0, ROJO: 0 };
  const porSemaforoActivos: Record<Semaforo, number> = { VERDE: 0, AMARILLO: 0, ROJO: 0 };
  const porPrioridad: Record<Prioridad, number> = { BAJA: 0, MEDIA: 0, ALTA: 0, CRITICA: 0 };
  let cerradosEnPlazo = 0;

  for (const t of conSemaforo) {
    porEstado[t.estado]++;
    porSemaforo[t.semaforo]++;
    porPrioridad[t.prioridad]++;
    if (t.estado !== "CERRADO") porSemaforoActivos[t.semaforo]++;
    else if (t.semaforo === "VERDE") cerradosEnPlazo++;
  }

  const cerrados = porEstado.CERRADO;
  return {
    total: tickets.length,
    porEstado,
    porSemaforo,
    porSemaforoActivos,
    porPrioridad,
    cumplimientoSla: cerrados ? Math.round((cerradosEnPlazo / cerrados) * 100) : null,
    enRiesgo: conSemaforo.filter((t) => t.estado !== "CERRADO" && t.semaforo !== "VERDE"),
    tickets: conSemaforo,
  };
}

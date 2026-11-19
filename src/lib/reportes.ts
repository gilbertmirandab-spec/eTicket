import type { EstadoTicket, Prioridad } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { proximoVencimiento, semaforoSla, type Semaforo, type TipoSla } from "@/lib/sla";

export type FiltroPeriodo = { desde?: Date; hasta?: Date };

/** Interpreta ?desde=AAAA-MM-DD&hasta=AAAA-MM-DD (hasta inclusive). */
export function leerPeriodo(sp: { desde?: string | null; hasta?: string | null }): FiltroPeriodo {
  const fecha = (v?: string | null) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? new Date(`${v}T00:00:00`) : undefined);
  const desde = fecha(sp.desde);
  const hastaBase = fecha(sp.hasta);
  const hasta = hastaBase ? new Date(hastaBase.getTime() + 24 * 3600 * 1000) : undefined;
  return { desde, hasta };
}

const vacio = (): Record<Semaforo, number> => ({ VERDE: 0, AMARILLO: 0, ROJO: 0 });

export async function obtenerResumen(periodo: FiltroPeriodo = {}, ahora: Date = new Date()) {
  const tickets = await prisma.ticket.findMany({
    where: {
      creadoEn: {
        ...(periodo.desde ? { gte: periodo.desde } : {}),
        ...(periodo.hasta ? { lt: periodo.hasta } : {}),
      },
    },
    include: { cliente: true, agente: true },
    orderBy: { creadoEn: "asc" },
  });

  const conSemaforo = tickets.map((t) => {
    const sla = semaforoSla(t, ahora);
    return { ...t, sla, semaforo: sla.general, proximo: proximoVencimiento(t) };
  });

  const porEstado: Record<EstadoTicket, number> = { ABIERTO: 0, EN_PROGRESO: 0, CERRADO: 0 };
  const porPrioridad: Record<Prioridad, number> = { BAJA: 0, MEDIA: 0, ALTA: 0, CRITICA: 0 };
  const porSemaforoActivos = vacio();
  const porSla: Record<TipoSla, Record<Semaforo, number>> = { primerContacto: vacio(), inicioAtencion: vacio() };
  // Cumplimiento: de los SLA ya resueltos (cumplidos o vencidos), cuántos se cumplieron a tiempo
  const resueltos: Record<TipoSla, { ok: number; total: number }> = {
    primerContacto: { ok: 0, total: 0 },
    inicioAtencion: { ok: 0, total: 0 },
  };

  for (const t of conSemaforo) {
    porEstado[t.estado]++;
    porPrioridad[t.prioridad]++;
    if (t.estado !== "CERRADO") porSemaforoActivos[t.semaforo]++;
    for (const tipo of ["primerContacto", "inicioAtencion"] as const) {
      const s = t.sla[tipo];
      porSla[tipo][s]++;
      const cumplido = tipo === "primerContacto" ? t.primerContactoEn : t.inicioAtencionEn;
      if (cumplido || s === "ROJO") {
        resueltos[tipo].total++;
        if (s === "VERDE") resueltos[tipo].ok++;
      }
    }
  }

  const pct = (r: { ok: number; total: number }) => (r.total ? Math.round((r.ok / r.total) * 100) : null);
  return {
    total: tickets.length,
    porEstado,
    porSemaforoActivos,
    porSla,
    porPrioridad,
    cumplimiento: { primerContacto: pct(resueltos.primerContacto), inicioAtencion: pct(resueltos.inicioAtencion) },
    // Tickets con un SLA aún pendiente que está vencido o por vencer, el más urgente primero
    enRiesgo: conSemaforo
      .filter((t) => t.estado !== "CERRADO" && t.proximo && t.sla[t.proximo.tipo] !== "VERDE")
      .sort((a, b) => a.proximo!.venceEn.getTime() - b.proximo!.venceEn.getTime()),
    tickets: conSemaforo,
  };
}

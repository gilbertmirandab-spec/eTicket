import type { EstadoTicket, Prioridad } from "@prisma/client";

/** Horas de plazo de SLA según prioridad. */
export const HORAS_SLA: Record<Prioridad, number> = {
  CRITICA: 4,
  ALTA: 8,
  MEDIA: 24,
  BAJA: 72,
};

export type Semaforo = "VERDE" | "AMARILLO" | "ROJO";

export const ETIQUETA_SEMAFORO: Record<Semaforo, string> = {
  VERDE: "A tiempo",
  AMARILLO: "Pronto a vencer",
  ROJO: "Vencido",
};

export function calcularVencimientoSla(prioridad: Prioridad, desde: Date = new Date()): Date {
  return new Date(desde.getTime() + HORAS_SLA[prioridad] * 60 * 60 * 1000);
}

function umbralAmarillo(): number {
  const v = Number(process.env.SLA_UMBRAL_AMARILLO_PCT ?? 25);
  return Number.isFinite(v) && v > 0 && v < 100 ? v / 100 : 0.25;
}

/**
 * Semáforo del SLA.
 * - ROJO: el plazo venció (o el ticket se cerró después del plazo).
 * - AMARILLO: ticket abierto al que le queda menos del umbral (25 % por defecto) del plazo total.
 * - VERDE: a tiempo (o cerrado dentro del plazo).
 */
export function semaforoSla(
  t: { estado: EstadoTicket; creadoEn: Date; slaVenceEn: Date; cerradoEn: Date | null },
  ahora: Date = new Date(),
  umbral: number = umbralAmarillo(),
): Semaforo {
  const vence = t.slaVenceEn.getTime();
  if (t.estado === "CERRADO") {
    const cierre = (t.cerradoEn ?? ahora).getTime();
    return cierre > vence ? "ROJO" : "VERDE";
  }
  const restante = vence - ahora.getTime();
  if (restante <= 0) return "ROJO";
  const total = Math.max(vence - t.creadoEn.getTime(), 1);
  return restante / total <= umbral ? "AMARILLO" : "VERDE";
}

/** Texto legible del tiempo restante o excedido, ej. "quedan 3 h 20 min" / "vencido hace 2 h". */
export function tiempoRestanteTexto(slaVenceEn: Date, ahora: Date = new Date()): string {
  const diff = slaVenceEn.getTime() - ahora.getTime();
  const abs = Math.abs(diff);
  const horas = Math.floor(abs / 3_600_000);
  const min = Math.floor((abs % 3_600_000) / 60_000);
  const dias = Math.floor(horas / 24);
  const texto = dias >= 1 ? `${dias} d ${horas % 24} h` : horas >= 1 ? `${horas} h ${min} min` : `${min} min`;
  return diff >= 0 ? `quedan ${texto}` : `vencido hace ${texto}`;
}

/**
 * Reglas de SLA de eTickets (iguales para todas las prioridades):
 *
 * | SLA                  | Horario hábil | Horario inhábil |
 * |----------------------|---------------|-----------------|
 * | Primer contacto      | 30 minutos    | 1 hora          |
 * | Inicio de atención   | 1 hora        | 2 horas         |
 *
 * - Horario hábil: lunes a viernes de 09:00 a 18:00 (America/Santiago), según la hora de creación del ticket.
 * - El tiempo corre de forma continua (24/7) desde la creación.
 * - Semáforo: rojo = vencido, amarillo = faltan 15 minutos o menos, verde = a tiempo.
 */

export const ZONA_HORARIA = process.env.TZ_APP ?? "America/Santiago";
export const HORARIO_HABIL = { desdeHora: 9, hastaHora: 18 } as const;

const MIN = 60_000;
export const PLAZOS_MIN = {
  primerContacto: { habil: 30, inhabil: 60 },
  inicioAtencion: { habil: 60, inhabil: 120 },
} as const;

export type TipoSla = keyof typeof PLAZOS_MIN;
export type Semaforo = "VERDE" | "AMARILLO" | "ROJO";

export const ETIQUETA_SEMAFORO: Record<Semaforo, string> = {
  VERDE: "A tiempo",
  AMARILLO: "Pronto a vencer",
  ROJO: "Vencido",
};
export const ETIQUETA_SLA: Record<TipoSla, string> = {
  primerContacto: "Primer contacto",
  inicioAtencion: "Inicio de atención",
};

export function minutosAmarillo(): number {
  const v = Number(process.env.SLA_MINUTOS_AMARILLO ?? 15);
  return Number.isFinite(v) && v > 0 ? v : 15;
}

const partesFecha = new Intl.DateTimeFormat("en-US", {
  timeZone: ZONA_HORARIA,
  weekday: "short",
  hour: "numeric",
  hourCycle: "h23",
});

/** true si la fecha cae de lunes a viernes entre 09:00 y 17:59:59 en la zona horaria de la aplicación. */
export function esHorarioHabil(fecha: Date): boolean {
  const partes = partesFecha.formatToParts(fecha);
  const dia = partes.find((p) => p.type === "weekday")?.value;
  const hora = Number(partes.find((p) => p.type === "hour")?.value);
  const laboral = dia !== "Sat" && dia !== "Sun";
  return laboral && hora >= HORARIO_HABIL.desdeHora && hora < HORARIO_HABIL.hastaHora;
}

/** Calcula los vencimientos de ambos SLA para un ticket creado en `creadoEn`. */
export function calcularVencimientos(creadoEn: Date) {
  const habil = esHorarioHabil(creadoEn);
  const clave = habil ? "habil" : "inhabil";
  return {
    horarioHabil: habil,
    primerContactoVenceEn: new Date(creadoEn.getTime() + PLAZOS_MIN.primerContacto[clave] * MIN),
    inicioAtencionVenceEn: new Date(creadoEn.getTime() + PLAZOS_MIN.inicioAtencion[clave] * MIN),
  };
}

/**
 * Semáforo de un SLA individual.
 * - Cumplido (`cumplidoEn` con valor): verde si se cumplió dentro del plazo, rojo si fue después.
 * - Pendiente: rojo si ya venció, amarillo si faltan `minutosAviso` o menos, verde en otro caso.
 */
export function semaforo(
  venceEn: Date,
  cumplidoEn: Date | null,
  ahora: Date = new Date(),
  minutosAviso: number = minutosAmarillo(),
): Semaforo {
  if (cumplidoEn) return cumplidoEn.getTime() > venceEn.getTime() ? "ROJO" : "VERDE";
  const restante = venceEn.getTime() - ahora.getTime();
  if (restante <= 0) return "ROJO";
  return restante <= minutosAviso * MIN ? "AMARILLO" : "VERDE";
}

const GRAVEDAD: Record<Semaforo, number> = { VERDE: 0, AMARILLO: 1, ROJO: 2 };
export const peor = (...s: Semaforo[]): Semaforo =>
  s.reduce<Semaforo>((a, b) => (GRAVEDAD[b] > GRAVEDAD[a] ? b : a), "VERDE");

export type TicketSla = {
  primerContactoVenceEn: Date;
  primerContactoEn: Date | null;
  inicioAtencionVenceEn: Date;
  inicioAtencionEn: Date | null;
};

/** Semáforo de cada SLA y el general del ticket (el peor de los dos). */
export function semaforoSla(t: TicketSla, ahora: Date = new Date(), minutosAviso: number = minutosAmarillo()) {
  const primerContacto = semaforo(t.primerContactoVenceEn, t.primerContactoEn, ahora, minutosAviso);
  const inicioAtencion = semaforo(t.inicioAtencionVenceEn, t.inicioAtencionEn, ahora, minutosAviso);
  return { primerContacto, inicioAtencion, general: peor(primerContacto, inicioAtencion) };
}

/** Próximo vencimiento pendiente del ticket (o null si ambos SLA ya se cumplieron). */
export function proximoVencimiento(t: TicketSla): { tipo: TipoSla; venceEn: Date } | null {
  if (!t.primerContactoEn) return { tipo: "primerContacto", venceEn: t.primerContactoVenceEn };
  if (!t.inicioAtencionEn) return { tipo: "inicioAtencion", venceEn: t.inicioAtencionVenceEn };
  return null;
}

/** Texto legible del tiempo restante o excedido, ej. "quedan 20 min" / "vencido hace 1 h 5 min". */
export function tiempoRestanteTexto(venceEn: Date, ahora: Date = new Date()): string {
  const diff = venceEn.getTime() - ahora.getTime();
  const abs = Math.abs(diff);
  const horas = Math.floor(abs / 3_600_000);
  const min = Math.floor((abs % 3_600_000) / MIN);
  const dias = Math.floor(horas / 24);
  const texto = dias >= 1 ? `${dias} d ${horas % 24} h` : horas >= 1 ? `${horas} h ${min} min` : `${min} min`;
  return diff >= 0 ? `quedan ${texto}` : `vencido hace ${texto}`;
}

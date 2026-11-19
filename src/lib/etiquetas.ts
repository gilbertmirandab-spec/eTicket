import type { EstadoTicket, Prioridad, Rol, TipoTicket } from "@prisma/client";

export const ETIQUETA_ESTADO: Record<EstadoTicket, string> = {
  ABIERTO: "Abierto",
  EN_PROGRESO: "En progreso",
  CERRADO: "Cerrado",
};
export const ETIQUETA_PRIORIDAD: Record<Prioridad, string> = {
  BAJA: "Baja",
  MEDIA: "Media",
  ALTA: "Alta",
  CRITICA: "Crítica",
};
export const ETIQUETA_TIPO: Record<TipoTicket, string> = {
  SOPORTE: "Soporte",
  REQUERIMIENTO: "Requerimiento",
};
export const ETIQUETA_ROL: Record<Rol, string> = {
  CLIENTE: "Cliente",
  AGENTE: "Agente de soporte",
  ADMIN: "Administrador",
};

const fmt = new Intl.DateTimeFormat("es-CL", {
  dateStyle: "short",
  timeStyle: "short",
  timeZone: process.env.TZ_APP ?? "America/Santiago",
});
export const formatearFecha = (d: Date) => fmt.format(d);

import type { Rol } from "@prisma/client";

export type UsuarioSesion = { id: string; rol: Rol; nombre: string; email: string };

/** Solo el administrador puede eliminar, ver el dashboard, generar informes PDF y gestionar usuarios. */
export const esAdmin = (u: Pick<UsuarioSesion, "rol">) => u.rol === "ADMIN";

/** Agentes y administradores atienden tickets (cambiar estado, asignar). */
export const esStaff = (u: Pick<UsuarioSesion, "rol">) => u.rol === "AGENTE" || u.rol === "ADMIN";

export function puedeVerTicket(u: Pick<UsuarioSesion, "id" | "rol">, t: { clienteId: string }): boolean {
  return esStaff(u) || t.clienteId === u.id;
}

export const puedeCambiarEstado = esStaff;
export const puedeAsignar = esStaff;
export const puedeEliminar = esAdmin;
export const puedeVerDashboard = esAdmin;
export const puedeGenerarInforme = esAdmin;
export const puedeGestionarUsuarios = esAdmin;

export function puedeComentar(u: Pick<UsuarioSesion, "id" | "rol">, t: { clienteId: string; estado: string }) {
  return puedeVerTicket(u, t) && (t.estado !== "CERRADO" || esStaff(u));
}

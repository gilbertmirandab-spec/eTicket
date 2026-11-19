import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { UsuarioSesion } from "@/lib/permisos";

/** Devuelve el usuario autenticado (verificado contra la base de datos) o redirige al login. */
export async function requerirUsuario(): Promise<UsuarioSesion> {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  const u = await prisma.usuario.findUnique({ where: { id: session.user.id } });
  if (!u || !u.activo) redirect("/login");
  return { id: u.id, rol: u.rol, nombre: u.nombre, email: u.email };
}

export async function requerirAdmin(): Promise<UsuarioSesion> {
  const u = await requerirUsuario();
  if (u.rol !== "ADMIN") redirect("/tickets");
  return u;
}

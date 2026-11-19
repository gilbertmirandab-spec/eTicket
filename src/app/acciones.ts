"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { AuthError } from "next-auth";
import { z } from "zod";
import { signIn, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import { requerirAdmin, requerirUsuario } from "@/lib/sesion";
import { siguienteFolio } from "@/lib/folio";
import { calcularVencimientos } from "@/lib/sla";
import {
  puedeAsignar,
  puedeCambiarEstado,
  esStaff,
  puedeComentar,
  puedeEliminar,
} from "@/lib/permisos";

export type EstadoFormulario = { error?: string } | undefined;

const primerError = (e: z.ZodError) => e.issues[0]?.message ?? "Datos inválidos";

/* ---------- Autenticación ---------- */

export async function iniciarSesion(_: EstadoFormulario, form: FormData): Promise<EstadoFormulario> {
  try {
    await signIn("credentials", {
      email: String(form.get("email") ?? ""),
      password: String(form.get("password") ?? ""),
      redirectTo: "/tickets",
    });
  } catch (e) {
    if (e instanceof AuthError) return { error: "Correo o contraseña incorrectos." };
    throw e;
  }
}

export async function cerrarSesion() {
  await signOut({ redirectTo: "/login" });
}

const esquemaRegistro = z.object({
  nombre: z.string().trim().min(2, "Ingresa tu nombre."),
  email: z.string().trim().toLowerCase().email("Correo inválido."),
  password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
});

/** Registro público: siempre crea usuarios con rol CLIENTE. */
export async function registrarCliente(_: EstadoFormulario, form: FormData): Promise<EstadoFormulario> {
  const parsed = esquemaRegistro.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: primerError(parsed.error) };
  const { nombre, email, password } = parsed.data;
  if (await prisma.usuario.findUnique({ where: { email } })) {
    return { error: "Ya existe una cuenta con ese correo." };
  }
  await prisma.usuario.create({
    data: { nombre, email, passwordHash: await bcrypt.hash(password, 10), rol: "CLIENTE" },
  });
  try {
    await signIn("credentials", { email, password, redirectTo: "/tickets" });
  } catch (e) {
    if (e instanceof AuthError) return { error: "Cuenta creada, pero no se pudo iniciar sesión." };
    throw e;
  }
}

/* ---------- Tickets ---------- */

const esquemaTicket = z.object({
  titulo: z.string().trim().min(5, "El título debe tener al menos 5 caracteres.").max(150),
  descripcion: z.string().trim().min(10, "Describe el problema o requerimiento (mín. 10 caracteres)."),
  tipo: z.enum(["SOPORTE", "REQUERIMIENTO"]),
  prioridad: z.enum(["BAJA", "MEDIA", "ALTA", "CRITICA"]),
});

export async function crearTicket(_: EstadoFormulario, form: FormData): Promise<EstadoFormulario> {
  const usuario = await requerirUsuario();
  const parsed = esquemaTicket.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: primerError(parsed.error) };

  const ahora = new Date();
  const ticket = await prisma.$transaction(async (tx) => {
    const folio = await siguienteFolio(tx, ahora);
    return tx.ticket.create({
      data: {
        ...parsed.data,
        folio,
        clienteId: usuario.id,
        creadoEn: ahora,
        ...calcularVencimientos(ahora),
      },
    });
  });
  revalidatePath("/tickets");
  redirect(`/tickets/${ticket.id}`);
}

const esquemaEstado = z.enum(["ABIERTO", "EN_PROGRESO", "CERRADO"]);

export async function cambiarEstado(ticketId: string, form: FormData) {
  const usuario = await requerirUsuario();
  if (!puedeCambiarEstado(usuario)) throw new Error("No autorizado");
  const estado = esquemaEstado.parse(form.get("estado"));
  const ticket = await prisma.ticket.findUniqueOrThrow({ where: { id: ticketId } });
  const ahora = new Date();
  const atendido = estado !== "ABIERTO";
  await prisma.ticket.update({
    where: { id: ticketId },
    data: {
      estado,
      cerradoEn: estado === "CERRADO" ? (ticket.cerradoEn ?? ahora) : null,
      // Pasar a "En progreso" (o cerrar) marca el inicio de atención y, si no lo hubo, el primer contacto
      inicioAtencionEn: atendido && !ticket.inicioAtencionEn ? ahora : undefined,
      primerContactoEn: atendido && !ticket.primerContactoEn ? ahora : undefined,
      // Al tomar un ticket sin asignar, queda asignado a quien lo toma
      agenteId: atendido && !ticket.agenteId ? usuario.id : undefined,
    },
  });
  revalidatePath(`/tickets/${ticketId}`);
  revalidatePath("/tickets");
}

export async function asignarAgente(ticketId: string, form: FormData) {
  const usuario = await requerirUsuario();
  if (!puedeAsignar(usuario)) throw new Error("No autorizado");
  const agenteId = String(form.get("agenteId") ?? "") || null;
  if (agenteId) {
    const agente = await prisma.usuario.findUnique({ where: { id: agenteId } });
    if (!agente || agente.rol === "CLIENTE") throw new Error("Agente inválido");
  }
  await prisma.ticket.update({ where: { id: ticketId }, data: { agenteId } });
  revalidatePath(`/tickets/${ticketId}`);
  revalidatePath("/tickets");
}

export async function comentar(ticketId: string, form: FormData) {
  const usuario = await requerirUsuario();
  const texto = String(form.get("texto") ?? "").trim();
  if (!texto) return;
  const ticket = await prisma.ticket.findUniqueOrThrow({ where: { id: ticketId } });
  if (!puedeComentar(usuario, ticket)) throw new Error("No autorizado");
  await prisma.comentario.create({ data: { ticketId, autorId: usuario.id, texto } });
  // La primera respuesta de un agente o administrador cumple el SLA de primer contacto
  if (esStaff(usuario) && !ticket.primerContactoEn) {
    await prisma.ticket.update({ where: { id: ticketId }, data: { primerContactoEn: new Date() } });
  }
  revalidatePath(`/tickets/${ticketId}`);
}

export async function eliminarTicket(ticketId: string) {
  const usuario = await requerirUsuario();
  if (!puedeEliminar(usuario)) throw new Error("Solo el administrador puede eliminar tickets.");
  await prisma.ticket.delete({ where: { id: ticketId } });
  revalidatePath("/tickets");
  redirect("/tickets");
}

/* ---------- Administración de usuarios ---------- */

const esquemaUsuario = esquemaRegistro.extend({ rol: z.enum(["CLIENTE", "AGENTE", "ADMIN"]) });

export async function crearUsuario(_: EstadoFormulario, form: FormData): Promise<EstadoFormulario> {
  await requerirAdmin();
  const parsed = esquemaUsuario.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: primerError(parsed.error) };
  const { nombre, email, password, rol } = parsed.data;
  if (await prisma.usuario.findUnique({ where: { email } })) {
    return { error: "Ya existe un usuario con ese correo." };
  }
  await prisma.usuario.create({
    data: { nombre, email, rol, passwordHash: await bcrypt.hash(password, 10) },
  });
  revalidatePath("/admin/usuarios");
  return {};
}

export async function actualizarUsuario(usuarioId: string, form: FormData) {
  const admin = await requerirAdmin();
  const rol = z.enum(["CLIENTE", "AGENTE", "ADMIN"]).parse(form.get("rol"));
  const activo = form.get("activo") === "on";
  if (usuarioId === admin.id && (rol !== "ADMIN" || !activo)) {
    throw new Error("No puedes quitarte el rol de administrador ni desactivarte.");
  }
  await prisma.usuario.update({ where: { id: usuarioId }, data: { rol, activo } });
  revalidatePath("/admin/usuarios");
}


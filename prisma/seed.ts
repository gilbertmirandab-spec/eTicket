import { PrismaClient, type Prioridad, type EstadoTicket } from "@prisma/client";
import bcrypt from "bcryptjs";
import { calcularVencimientoSla } from "../src/lib/sla";
import { siguienteFolio } from "../src/lib/folio";

const prisma = new PrismaClient();

async function main() {
  const pass = await bcrypt.hash("eticket123", 10);
  const crear = (email: string, nombre: string, rol: "ADMIN" | "AGENTE" | "CLIENTE") =>
    prisma.usuario.upsert({ where: { email }, update: {}, create: { email, nombre, rol, passwordHash: pass } });

  await crear("admin@eticket.local", "Administrador", "ADMIN");
  const agente = await crear("agente@eticket.local", "Ana Agente", "AGENTE");
  const cliente = await crear("cliente@eticket.local", "Carlos Cliente", "CLIENTE");

  if ((await prisma.ticket.count()) > 0) return;

  const h = 3_600_000;
  const ahora = Date.now();
  const ejemplos: { titulo: string; prioridad: Prioridad; estado: EstadoTicket; haceHoras: number; cerradoTrasHoras?: number }[] = [
    { titulo: "No puedo ingresar al portal", prioridad: "ALTA", estado: "ABIERTO", haceHoras: 10 },
    { titulo: "Error al exportar facturas", prioridad: "CRITICA", estado: "EN_PROGRESO", haceHoras: 3.5 },
    { titulo: "Solicitud de nuevo usuario", prioridad: "MEDIA", estado: "ABIERTO", haceHoras: 2 },
    { titulo: "Agregar campo RUT en formulario", prioridad: "BAJA", estado: "EN_PROGRESO", haceHoras: 30 },
    { titulo: "Lentitud en reportes", prioridad: "MEDIA", estado: "CERRADO", haceHoras: 48, cerradoTrasHoras: 6 },
    { titulo: "Cambio de correo de contacto", prioridad: "ALTA", estado: "CERRADO", haceHoras: 40, cerradoTrasHoras: 12 },
  ];

  for (const e of ejemplos) {
    const creadoEn = new Date(ahora - e.haceHoras * h);
    await prisma.$transaction(async (tx) =>
      tx.ticket.create({
        data: {
          folio: await siguienteFolio(tx, creadoEn),
          titulo: e.titulo,
          descripcion: `Ticket de ejemplo: ${e.titulo.toLowerCase()}.`,
          tipo: e.titulo.startsWith("Agregar") || e.titulo.startsWith("Solicitud") ? "REQUERIMIENTO" : "SOPORTE",
          prioridad: e.prioridad,
          estado: e.estado,
          clienteId: cliente.id,
          agenteId: e.estado === "ABIERTO" ? null : agente.id,
          creadoEn,
          slaVenceEn: calcularVencimientoSla(e.prioridad, creadoEn),
          cerradoEn: e.cerradoTrasHoras ? new Date(creadoEn.getTime() + e.cerradoTrasHoras * h) : null,
        },
      }),
    );
  }
}

main()
  .then(() => console.log("Datos de ejemplo cargados."))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

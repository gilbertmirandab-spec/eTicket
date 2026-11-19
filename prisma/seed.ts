import { PrismaClient, type Prioridad, type EstadoTicket } from "@prisma/client";
import bcrypt from "bcryptjs";
import { calcularVencimientos } from "../src/lib/sla";
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

  const m = 60_000;
  const ahora = Date.now();
  // Minutos desde la creación y minutos tras la creación en que se cumplió cada SLA (null = pendiente)
  const ejemplos: {
    titulo: string;
    prioridad: Prioridad;
    estado: EstadoTicket;
    haceMin: number;
    contactoMin?: number;
    atencionMin?: number;
    cierreMin?: number;
  }[] = [
    { titulo: "No puedo ingresar al portal", prioridad: "ALTA", estado: "ABIERTO", haceMin: 180 },
    { titulo: "Error al exportar facturas", prioridad: "CRITICA", estado: "ABIERTO", haceMin: 20, contactoMin: 10 },
    { titulo: "Solicitud de nuevo usuario", prioridad: "MEDIA", estado: "ABIERTO", haceMin: 18 },
    { titulo: "Agregar campo RUT en formulario", prioridad: "BAJA", estado: "EN_PROGRESO", haceMin: 600, contactoMin: 20, atencionMin: 45 },
    { titulo: "Lentitud en reportes", prioridad: "MEDIA", estado: "CERRADO", haceMin: 2880, contactoMin: 15, atencionMin: 40, cierreMin: 300 },
    { titulo: "Cambio de correo de contacto", prioridad: "ALTA", estado: "CERRADO", haceMin: 2400, contactoMin: 90, atencionMin: 150, cierreMin: 400 },
  ];

  for (const e of ejemplos) {
    const creadoEn = new Date(ahora - e.haceMin * m);
    const tras = (min?: number) => (min === undefined ? null : new Date(creadoEn.getTime() + min * m));
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
          agenteId: e.contactoMin === undefined ? null : agente.id,
          creadoEn,
          ...calcularVencimientos(creadoEn),
          primerContactoEn: tras(e.contactoMin),
          inicioAtencionEn: tras(e.atencionMin),
          cerradoEn: tras(e.cierreMin),
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

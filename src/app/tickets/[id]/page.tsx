import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requerirUsuario } from "@/lib/sesion";
import {
  esStaff,
  puedeAsignar,
  puedeCambiarEstado,
  puedeComentar,
  puedeEliminar,
  puedeVerTicket,
} from "@/lib/permisos";
import { semaforoSla, tiempoRestanteTexto } from "@/lib/sla";
import {
  ETIQUETA_ESTADO,
  ETIQUETA_PRIORIDAD,
  ETIQUETA_ROL,
  ETIQUETA_TIPO,
  formatearFecha,
} from "@/lib/etiquetas";
import { ChipSemaforo } from "@/components/Semaforo";
import { BotonEliminar } from "@/components/BotonEliminar";
import { asignarAgente, cambiarEstado, comentar, eliminarTicket } from "../../acciones";

export const dynamic = "force-dynamic";

export default async function DetalleTicket({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const usuario = await requerirUsuario();
  const ticket = await prisma.ticket.findUnique({
    where: { id },
    include: {
      cliente: true,
      agente: true,
      comentarios: { include: { autor: true }, orderBy: { creadoEn: "asc" } },
    },
  });
  if (!ticket || !puedeVerTicket(usuario, ticket)) notFound();

  const agentes = puedeAsignar(usuario)
    ? await prisma.usuario.findMany({
        where: { rol: { in: ["AGENTE", "ADMIN"] }, activo: true },
        orderBy: { nombre: "asc" },
      })
    : [];
  const ahora = new Date();
  const semaforo = semaforoSla(ticket, ahora);

  return (
    <>
      <div className="fila entre">
        <div>
          <div className="folio muted">{ticket.folio}</div>
          <h1>{ticket.titulo}</h1>
        </div>
        <ChipSemaforo valor={semaforo} />
      </div>

      <div className="tarjeta">
        <dl className="detalles">
          <dt>Estado</dt><dd>{ETIQUETA_ESTADO[ticket.estado]}</dd>
          <dt>Tipo</dt><dd>{ETIQUETA_TIPO[ticket.tipo]}</dd>
          <dt>Prioridad</dt><dd>{ETIQUETA_PRIORIDAD[ticket.prioridad]}</dd>
          <dt>Cliente</dt><dd>{ticket.cliente.nombre} ({ticket.cliente.email})</dd>
          <dt>Agente</dt><dd>{ticket.agente?.nombre ?? "Sin asignar"}</dd>
          <dt>Creado</dt><dd>{formatearFecha(ticket.creadoEn)}</dd>
          <dt>Vence SLA</dt>
          <dd>
            {formatearFecha(ticket.slaVenceEn)}
            {ticket.estado !== "CERRADO" && <span className="muted"> · {tiempoRestanteTexto(ticket.slaVenceEn, ahora)}</span>}
          </dd>
          {ticket.cerradoEn && (<><dt>Cerrado</dt><dd>{formatearFecha(ticket.cerradoEn)}</dd></>)}
        </dl>
        <h2 style={{ marginTop: 20 }}>Descripción</h2>
        <p className="pre">{ticket.descripcion}</p>
      </div>

      {esStaff(usuario) && (
        <div className="tarjeta fila">
          {puedeCambiarEstado(usuario) && (
            <form action={cambiarEstado.bind(null, ticket.id)} className="fila">
              <label className="check">
                Estado
                <select name="estado" defaultValue={ticket.estado}>
                  <option value="ABIERTO">Abierto</option>
                  <option value="EN_PROGRESO">En progreso</option>
                  <option value="CERRADO">Cerrado</option>
                </select>
              </label>
              <button type="submit">Actualizar estado</button>
            </form>
          )}
          {puedeAsignar(usuario) && (
            <form action={asignarAgente.bind(null, ticket.id)} className="fila">
              <label className="check">
                Agente
                <select name="agenteId" defaultValue={ticket.agenteId ?? ""}>
                  <option value="">Sin asignar</option>
                  {agentes.map((a) => <option key={a.id} value={a.id}>{a.nombre}</option>)}
                </select>
              </label>
              <button type="submit">Asignar</button>
            </form>
          )}
          {puedeEliminar(usuario) && (
            <form action={eliminarTicket.bind(null, ticket.id)} style={{ marginLeft: "auto" }}>
              <BotonEliminar folio={ticket.folio} />
            </form>
          )}
        </div>
      )}

      <div className="tarjeta">
        <h2>Comentarios</h2>
        {ticket.comentarios.length === 0 && <p className="muted">Aún no hay comentarios.</p>}
        {ticket.comentarios.map((c) => (
          <div key={c.id} className="comentario">
            <div className="pequeno muted">
              <strong>{c.autor.nombre}</strong> · {ETIQUETA_ROL[c.autor.rol]} · {formatearFecha(c.creadoEn)}
            </div>
            <div className="pre">{c.texto}</div>
          </div>
        ))}
        {puedeComentar(usuario, ticket) && (
          <form action={comentar.bind(null, ticket.id)} className="apilado" style={{ marginTop: 12 }}>
            <textarea name="texto" required placeholder="Escribe un comentario" style={{ minHeight: 80 }} />
            <div><button type="submit" className="primario">Comentar</button></div>
          </form>
        )}
      </div>
    </>
  );
}

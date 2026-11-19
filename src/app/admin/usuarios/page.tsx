import { prisma } from "@/lib/prisma";
import { requerirAdmin } from "@/lib/sesion";
import { ETIQUETA_ROL, formatearFecha } from "@/lib/etiquetas";
import { FormularioConEstado } from "@/components/FormularioConEstado";
import { actualizarUsuario, crearUsuario } from "../../acciones";

export const dynamic = "force-dynamic";

const ROLES = ["CLIENTE", "AGENTE", "ADMIN"] as const;

export default async function Usuarios() {
  const admin = await requerirAdmin();
  const usuarios = await prisma.usuario.findMany({
    orderBy: [{ rol: "desc" }, { nombre: "asc" }],
    include: { _count: { select: { ticketsCreados: true, ticketsAsignados: true } } },
  });

  return (
    <>
      <h1>Usuarios</h1>
      <div className="tarjeta" style={{ maxWidth: 720 }}>
        <h2>Crear usuario</h2>
        <FormularioConEstado accion={crearUsuario} boton="Crear usuario" exito="Usuario creado.">
          <div className="fila">
            <label style={{ flex: 1 }}>Nombre<input name="nombre" required /></label>
            <label style={{ flex: 1 }}>Correo<input name="email" type="email" required /></label>
          </div>
          <div className="fila">
            <label style={{ flex: 1 }}>Contraseña inicial<input name="password" type="password" required minLength={8} /></label>
            <label style={{ flex: 1 }}>
              Rol
              <select name="rol" defaultValue="AGENTE">
                {ROLES.map((r) => <option key={r} value={r}>{ETIQUETA_ROL[r]}</option>)}
              </select>
            </label>
          </div>
        </FormularioConEstado>
      </div>

      <div className="tarjeta tabla-scroll">
        <table>
          <thead>
            <tr><th>Nombre</th><th>Correo</th><th>Tickets creados / asignados</th><th>Alta</th><th>Rol y estado</th></tr>
          </thead>
          <tbody>
            {usuarios.map((u) => (
              <tr key={u.id}>
                <td>{u.nombre}</td>
                <td>{u.email}</td>
                <td>{u._count.ticketsCreados} / {u._count.ticketsAsignados}</td>
                <td className="pequeno">{formatearFecha(u.creadoEn)}</td>
                <td>
                  <form action={actualizarUsuario.bind(null, u.id)} className="fila">
                    <select name="rol" defaultValue={u.rol} disabled={u.id === admin.id}>
                      {ROLES.map((r) => <option key={r} value={r}>{ETIQUETA_ROL[r]}</option>)}
                    </select>
                    <label className="check"><input type="checkbox" name="activo" defaultChecked={u.activo} disabled={u.id === admin.id} /> Activo</label>
                    {u.id === admin.id ? <span className="muted pequeno">(tú)</span> : <button type="submit">Guardar</button>}
                  </form>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

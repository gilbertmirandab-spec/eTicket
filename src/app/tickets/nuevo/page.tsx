import { crearTicket } from "../../acciones";
import { FormularioConEstado } from "@/components/FormularioConEstado";
import { requerirUsuario } from "@/lib/sesion";
import { HORAS_SLA } from "@/lib/sla";
import { ETIQUETA_PRIORIDAD } from "@/lib/etiquetas";

export default async function NuevoTicket() {
  await requerirUsuario();
  return (
    <div className="tarjeta" style={{ maxWidth: 720 }}>
      <h1>Nuevo ticket</h1>
      <FormularioConEstado accion={crearTicket} boton="Crear ticket">
        <label>Título<input name="titulo" required minLength={5} maxLength={150} /></label>
        <div className="fila">
          <label style={{ flex: 1 }}>
            Tipo
            <select name="tipo" defaultValue="SOPORTE">
              <option value="SOPORTE">Soporte</option>
              <option value="REQUERIMIENTO">Requerimiento</option>
            </select>
          </label>
          <label style={{ flex: 1 }}>
            Prioridad
            <select name="prioridad" defaultValue="MEDIA">
              {(["BAJA", "MEDIA", "ALTA", "CRITICA"] as const).map((p) => (
                <option key={p} value={p}>
                  {ETIQUETA_PRIORIDAD[p]} (SLA {HORAS_SLA[p]} h)
                </option>
              ))}
            </select>
          </label>
        </div>
        <label>Descripción<textarea name="descripcion" required minLength={10} /></label>
      </FormularioConEstado>
    </div>
  );
}

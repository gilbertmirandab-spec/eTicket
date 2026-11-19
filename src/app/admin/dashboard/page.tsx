import Link from "next/link";
import { requerirAdmin } from "@/lib/sesion";
import { leerPeriodo, obtenerResumen } from "@/lib/reportes";
import { ETIQUETA_SLA, minutosAmarillo, tiempoRestanteTexto, type Semaforo } from "@/lib/sla";
import { ETIQUETA_ESTADO, ETIQUETA_PRIORIDAD } from "@/lib/etiquetas";
import { ChipSemaforo } from "@/components/Semaforo";

export const dynamic = "force-dynamic";

const COLOR: Record<Semaforo, string> = { VERDE: "var(--verde)", AMARILLO: "var(--amarillo)", ROJO: "var(--rojo)" };

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ desde?: string; hasta?: string }>;
}) {
  await requerirAdmin();
  const sp = await searchParams;
  const ahora = new Date();
  const r = await obtenerResumen(leerPeriodo(sp), ahora);
  const activos = r.porEstado.ABIERTO + r.porEstado.EN_PROGRESO;
  const qs = new URLSearchParams(Object.entries(sp).filter(([, v]) => v) as [string, string][]).toString();

  return (
    <>
      <div className="fila entre">
        <h1>Dashboard</h1>
        <a className="boton primario" href={`/admin/informe${qs ? `?${qs}` : ""}`}>Descargar informe PDF</a>
      </div>

      <form className="tarjeta fila" method="get">
        <label className="check">Desde <input type="date" name="desde" defaultValue={sp.desde} /></label>
        <label className="check">Hasta <input type="date" name="hasta" defaultValue={sp.hasta} /></label>
        <button type="submit">Aplicar</button>
        {qs && <Link href="/admin/dashboard">Limpiar</Link>}
        <span className="muted pequeno">Filtra por fecha de creación del ticket.</span>
      </form>

      <section className="grilla" style={{ marginBottom: 16 }}>
        <div className="tarjeta kpi"><div className="valor">{r.total}</div><div className="etiqueta">Tickets totales</div></div>
        {(["ABIERTO", "EN_PROGRESO", "CERRADO"] as const).map((e) => (
          <div key={e} className="tarjeta kpi">
            <div className="valor">{r.porEstado[e]}</div>
            <div className="etiqueta">{ETIQUETA_ESTADO[e]}</div>
          </div>
        ))}
        {(["primerContacto", "inicioAtencion"] as const).map((tipo) => (
          <div key={tipo} className="tarjeta kpi">
            <div className="valor">{r.cumplimiento[tipo] === null ? "—" : `${r.cumplimiento[tipo]}%`}</div>
            <div className="etiqueta">Cumplimiento {ETIQUETA_SLA[tipo].toLowerCase()}</div>
          </div>
        ))}
      </section>

      <section className="grilla" style={{ marginBottom: 16 }}>
        <div className="tarjeta">
          <h2>SLA de tickets activos</h2>
          <div className="barra-prog" role="img" aria-label="Distribución del SLA de tickets activos">
            {(["ROJO", "AMARILLO", "VERDE"] as const).map((s) =>
              activos ? <span key={s} style={{ width: `${(r.porSemaforoActivos[s] / activos) * 100}%`, background: COLOR[s] }} /> : null,
            )}
          </div>
          <ul style={{ listStyle: "none", padding: 0, margin: "12px 0 0" }}>
            {(["ROJO", "AMARILLO", "VERDE"] as const).map((s) => (
              <li key={s} className="fila entre">
                <ChipSemaforo valor={s} />
                <Link href={`/tickets?sla=${s}`}><strong>{r.porSemaforoActivos[s]}</strong></Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="tarjeta">
          <h2>Por indicador de SLA</h2>
          <table>
            <thead><tr><th>Indicador</th><th>Rojo</th><th>Amarillo</th><th>Verde</th></tr></thead>
            <tbody>
              {(["primerContacto", "inicioAtencion"] as const).map((tipo) => (
                <tr key={tipo}>
                  <td>{ETIQUETA_SLA[tipo]}</td>
                  <td>{r.porSla[tipo].ROJO}</td>
                  <td>{r.porSla[tipo].AMARILLO}</td>
                  <td>{r.porSla[tipo].VERDE}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="tarjeta">
          <h2>Por prioridad</h2>
          <table>
            <tbody>
              {(["CRITICA", "ALTA", "MEDIA", "BAJA"] as const).map((p) => (
                <tr key={p}><td>{ETIQUETA_PRIORIDAD[p]}</td><td style={{ textAlign: "right" }}>{r.porPrioridad[p]}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <div className="tarjeta tabla-scroll">
        <h2>Tickets en riesgo ({r.enRiesgo.length})</h2>
        {r.enRiesgo.length === 0 ? (
          <p className="muted">Ningún ticket activo está vencido ni pronto a vencer.</p>
        ) : (
          <table>
            <thead><tr><th>Folio</th><th>Título</th><th>Estado</th><th>SLA</th><th>Indicador</th><th>Plazo</th><th>Agente</th></tr></thead>
            <tbody>
              {r.enRiesgo.map((t) => (
                <tr key={t.id}>
                  <td><Link className="folio" href={`/tickets/${t.id}`}>{t.folio}</Link></td>
                  <td>{t.titulo}</td>
                  <td>{ETIQUETA_ESTADO[t.estado]}</td>
                  <td><ChipSemaforo valor={t.sla[t.proximo!.tipo]} /></td>
                  <td>{ETIQUETA_SLA[t.proximo!.tipo]}</td>
                  <td className="pequeno">{tiempoRestanteTexto(t.proximo!.venceEn, ahora)}</td>
                  <td>{t.agente?.nombre ?? <span className="muted">Sin asignar</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="muted pequeno">
        SLA (igual para toda prioridad): primer contacto 30 min e inicio de atención 1 h si el ticket se crea en
        horario hábil (L-V 09:00-18:00); 1 h y 2 h si se crea fuera de horario. El tiempo corre continuo. Semáforo:
        rojo = vencido, amarillo = faltan {minutosAmarillo()} min o menos, verde = a tiempo.
      </p>
    </>
  );
}

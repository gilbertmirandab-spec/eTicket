import Link from "next/link";
import { requerirAdmin } from "@/lib/sesion";
import { leerPeriodo, obtenerResumen } from "@/lib/reportes";
import { tiempoRestanteTexto, type Semaforo } from "@/lib/sla";
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
        <div className="tarjeta kpi">
          <div className="valor">{r.cumplimientoSla === null ? "—" : `${r.cumplimientoSla}%`}</div>
          <div className="etiqueta">Cerrados dentro del SLA</div>
        </div>
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
            <thead><tr><th>Folio</th><th>Título</th><th>Prioridad</th><th>Estado</th><th>SLA</th><th>Plazo</th><th>Agente</th></tr></thead>
            <tbody>
              {r.enRiesgo.map((t) => (
                <tr key={t.id}>
                  <td><Link className="folio" href={`/tickets/${t.id}`}>{t.folio}</Link></td>
                  <td>{t.titulo}</td>
                  <td>{ETIQUETA_PRIORIDAD[t.prioridad]}</td>
                  <td>{ETIQUETA_ESTADO[t.estado]}</td>
                  <td><ChipSemaforo valor={t.semaforo} /></td>
                  <td className="pequeno">{tiempoRestanteTexto(t.slaVenceEn, ahora)}</td>
                  <td>{t.agente?.nombre ?? <span className="muted">Sin asignar</span>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
      <p className="muted pequeno">
        Semáforo: rojo = SLA vencido, amarillo = queda menos del {process.env.SLA_UMBRAL_AMARILLO_PCT ?? 25}% del
        plazo, verde = a tiempo.
      </p>
    </>
  );
}

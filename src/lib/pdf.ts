import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage, type RGB } from "pdf-lib";
import type { obtenerResumen, FiltroPeriodo } from "@/lib/reportes";
import { ETIQUETA_SEMAFORO, ETIQUETA_SLA, type Semaforo } from "@/lib/sla";
import { ETIQUETA_ESTADO, formatearFecha } from "@/lib/etiquetas";

type Resumen = Awaited<ReturnType<typeof obtenerResumen>>;

const COLOR_SEMAFORO: Record<Semaforo, RGB> = {
  VERDE: rgb(0.18, 0.49, 0.2),
  AMARILLO: rgb(0.85, 0.6, 0.05),
  ROJO: rgb(0.78, 0.16, 0.16),
};

/** Las fuentes estándar de PDF solo codifican WinAnsi; reemplaza lo demás por "?". */
function limpio(texto: string, font: PDFFont): string {
  let out = "";
  for (const ch of texto.replace(/\s+/g, " ")) {
    try {
      font.encodeText(ch);
      out += ch;
    } catch {
      out += "?";
    }
  }
  return out;
}

function recortar(texto: string, font: PDFFont, size: number, ancho: number): string {
  let t = limpio(texto, font);
  if (font.widthOfTextAtSize(t, size) <= ancho) return t;
  while (t.length > 1 && font.widthOfTextAtSize(`${t}…`, size) > ancho) t = t.slice(0, -1);
  return `${t}…`;
}

export async function generarInformePdf(r: Resumen, periodo: FiltroPeriodo, ahora: Date): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  pdf.setTitle("Informe de tickets - eTickets");
  pdf.setLanguage("es-CL");
  const normal = await pdf.embedFont(StandardFonts.Helvetica);
  const negrita = await pdf.embedFont(StandardFonts.HelveticaBold);

  const A4: [number, number] = [595.28, 841.89];
  const M = 40;
  let page: PDFPage = pdf.addPage(A4);
  let y = A4[1] - M;

  const texto = (t: string, x: number, size = 10, font = normal, color = rgb(0.1, 0.12, 0.16)) =>
    page.drawText(limpio(t, font), { x, y, size, font, color });
  const nuevaPagina = () => {
    page = pdf.addPage(A4);
    y = A4[1] - M;
  };
  const asegurar = (alto: number) => {
    if (y - alto < M) nuevaPagina();
  };

  // Encabezado
  texto("Informe de tickets", M, 20, negrita);
  y -= 22;
  const rango =
    periodo.desde || periodo.hasta
      ? `Periodo: ${periodo.desde ? formatearFecha(periodo.desde).split(" ")[0] : "inicio"} a ${
          periodo.hasta ? formatearFecha(new Date(periodo.hasta.getTime() - 1)).split(" ")[0] : "hoy"
        }`
      : "Periodo: todos los tickets";
  texto(`${rango}  ·  Generado: ${formatearFecha(ahora)}`, M, 10, normal, rgb(0.35, 0.4, 0.46));
  y -= 28;

  // Resumen
  texto("Resumen", M, 13, negrita);
  y -= 18;
  const filasResumen: [string, string][] = [
    ["Tickets totales", String(r.total)],
    [ETIQUETA_ESTADO.ABIERTO, String(r.porEstado.ABIERTO)],
    [ETIQUETA_ESTADO.EN_PROGRESO, String(r.porEstado.EN_PROGRESO)],
    [ETIQUETA_ESTADO.CERRADO, String(r.porEstado.CERRADO)],
    ...(["primerContacto", "inicioAtencion"] as const).map((tipo): [string, string] => [
      `Cumplimiento ${ETIQUETA_SLA[tipo].toLowerCase()}`,
      r.cumplimiento[tipo] === null ? "-" : `${r.cumplimiento[tipo]}%`,
    ]),
  ];
  for (const [k, v] of filasResumen) {
    texto(k, M, 10);
    texto(v, M + 200, 10, negrita);
    y -= 15;
  }
  y -= 8;

  texto("SLA de tickets activos", M, 13, negrita);
  y -= 18;
  for (const s of ["ROJO", "AMARILLO", "VERDE"] as const) {
    page.drawCircle({ x: M + 5, y: y + 3.5, size: 4.5, color: COLOR_SEMAFORO[s] });
    texto(ETIQUETA_SEMAFORO[s], M + 16, 10);
    texto(String(r.porSemaforoActivos[s]), M + 200, 10, negrita);
    y -= 15;
  }
  y -= 14;

  // Detalle
  const cols = [
    { t: "Folio", w: 88 },
    { t: "Título", w: 130 },
    { t: "Estado", w: 58 },
    { t: "1er contacto", w: 75 },
    { t: "Inicio atención", w: 80 },
    { t: "Creado", w: 84 },
  ];
  const encabezadoTabla = () => {
    let x = M;
    page.drawRectangle({ x: M - 4, y: y - 4, width: A4[0] - 2 * M + 8, height: 16, color: rgb(0.92, 0.94, 0.96) });
    for (const c of cols) {
      texto(c.t, x, 9, negrita);
      x += c.w;
    }
    y -= 18;
  };

  asegurar(60);
  texto(`Detalle de tickets (${r.tickets.length})`, M, 13, negrita);
  y -= 20;
  encabezadoTabla();
  const ordenados = [...r.tickets].sort((a, b) => a.folio.localeCompare(b.folio));
  for (const t of ordenados) {
    if (y - 14 < M) {
      nuevaPagina();
      encabezadoTabla();
    }
    const valores = [
      t.folio,
      t.titulo,
      ETIQUETA_ESTADO[t.estado],
      ETIQUETA_SEMAFORO[t.sla.primerContacto],
      ETIQUETA_SEMAFORO[t.sla.inicioAtencion],
      formatearFecha(t.creadoEn),
    ];
    const colorCol: Record<number, Semaforo> = { 3: t.sla.primerContacto, 4: t.sla.inicioAtencion };
    let x = M;
    valores.forEach((v, i) => {
      const font = i === 0 ? negrita : normal;
      if (colorCol[i]) {
        page.drawCircle({ x: x + 3, y: y + 3, size: 3, color: COLOR_SEMAFORO[colorCol[i]] });
        page.drawText(recortar(v, font, 8.5, cols[i].w - 14), { x: x + 10, y, size: 8.5, font });
      } else {
        page.drawText(recortar(v, font, 8.5, cols[i].w - 6), { x, y, size: 8.5, font });
      }
      x += cols[i].w;
    });
    y -= 14;
  }

  // Pie con numeración
  const paginas = pdf.getPages();
  paginas.forEach((p, i) =>
    p.drawText(`eTickets  ·  Página ${i + 1} de ${paginas.length}`, {
      x: M,
      y: 20,
      size: 8,
      font: normal,
      color: rgb(0.45, 0.5, 0.56),
    }),
  );
  return pdf.save();
}

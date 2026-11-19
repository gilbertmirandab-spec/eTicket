import { ETIQUETA_SEMAFORO, type Semaforo } from "@/lib/sla";

export function ChipSemaforo({ valor, detalle }: { valor: Semaforo; detalle?: string }) {
  return (
    <span className={`chip sla-${valor}`} title={detalle}>
      <span className="punto" aria-hidden />
      {ETIQUETA_SEMAFORO[valor]}
    </span>
  );
}

import type { Prisma } from "@prisma/client";

export const PREFIJO_FOLIO = "TCK";

export function formatearFolio(anio: number, numero: number): string {
  return `${PREFIJO_FOLIO}-${anio}-${String(numero).padStart(6, "0")}`;
}

/**
 * Reserva el siguiente folio correlativo del año dentro de una transacción.
 * El upsert con incremento es atómico en PostgreSQL, por lo que dos tickets
 * creados al mismo tiempo nunca reciben el mismo folio.
 */
export async function siguienteFolio(tx: Prisma.TransactionClient, fecha: Date = new Date()): Promise<string> {
  const anio = fecha.getFullYear();
  const contador = await tx.contadorFolio.upsert({
    where: { anio },
    create: { anio, ultimo: 1 },
    update: { ultimo: { increment: 1 } },
  });
  return formatearFolio(anio, contador.ultimo);
}

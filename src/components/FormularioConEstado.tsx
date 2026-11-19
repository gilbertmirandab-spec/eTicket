"use client";

import { useActionState } from "react";
import type { EstadoFormulario } from "@/app/acciones";

/** Envuelve un formulario con una server action que devuelve { error }. */
export function FormularioConEstado({
  accion,
  children,
  boton,
  exito,
}: {
  accion: (prev: EstadoFormulario, form: FormData) => Promise<EstadoFormulario>;
  children: React.ReactNode;
  boton: string;
  exito?: string;
}) {
  const [estado, enviar, pendiente] = useActionState(accion, undefined);
  return (
    <form action={enviar} className="apilado">
      {children}
      {estado?.error && <p className="error" role="alert">{estado.error}</p>}
      {estado && !estado.error && exito && <p className="muted" role="status">{exito}</p>}
      <div>
        <button type="submit" className="primario" disabled={pendiente}>
          {pendiente ? "Enviando…" : boton}
        </button>
      </div>
    </form>
  );
}

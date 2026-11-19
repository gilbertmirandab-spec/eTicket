"use client";

export function BotonEliminar({ folio }: { folio: string }) {
  return (
    <button
      type="submit"
      className="peligro"
      onClick={(e) => {
        if (!confirm(`¿Eliminar definitivamente el ticket ${folio}? Esta acción no se puede deshacer.`)) {
          e.preventDefault();
        }
      }}
    >
      Eliminar ticket
    </button>
  );
}

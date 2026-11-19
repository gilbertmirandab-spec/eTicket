import Link from "next/link";

export default function NoEncontrado() {
  return (
    <div className="tarjeta centrado">
      <h1>No encontrado</h1>
      <p className="muted">El ticket no existe o no tienes permiso para verlo.</p>
      <Link href="/tickets">Volver a tickets</Link>
    </div>
  );
}

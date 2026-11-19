import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { auth } from "@/auth";
import { cerrarSesion } from "./acciones";
import { ETIQUETA_ROL } from "@/lib/etiquetas";

export const metadata: Metadata = {
  title: "eTickets",
  description: "Gestión de tickets de soporte y requerimientos de clientes",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const user = session?.user;
  return (
    <html lang="es">
      <body>
        {user && (
          <header className="barra">
            <div className="contenedor">
              <Link href="/tickets" className="marca">eTickets</Link>
              <nav>
                <Link href="/tickets">Tickets</Link>
                <Link href="/tickets/nuevo">Nuevo ticket</Link>
                {user.rol === "ADMIN" && (
                  <>
                    <Link href="/admin/dashboard">Dashboard</Link>
                    <Link href="/admin/usuarios">Usuarios</Link>
                  </>
                )}
              </nav>
              <div className="usuario">
                <span>{user.name} · {ETIQUETA_ROL[user.rol]}</span>
                <form action={cerrarSesion}><button type="submit">Salir</button></form>
              </div>
            </div>
          </header>
        )}
        <main className="contenedor">{children}</main>
      </body>
    </html>
  );
}

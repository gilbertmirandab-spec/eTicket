import type { Rol } from "@prisma/client";
import type { NextAuthConfig } from "next-auth";

/** Configuración compatible con el middleware (sin acceso a la base de datos). */
export const authConfig = {
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  providers: [],
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const logueado = !!auth?.user;
      const publica = nextUrl.pathname === "/login" || nextUrl.pathname === "/registro";
      if (publica) {
        if (logueado) return Response.redirect(new URL("/tickets", nextUrl));
        return true;
      }
      if (!logueado) return false;
      if (nextUrl.pathname.startsWith("/admin") && auth.user.rol !== "ADMIN") {
        return Response.redirect(new URL("/tickets", nextUrl));
      }
      return true;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id as string;
        token.rol = user.rol;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.id as string;
      session.user.rol = token.rol as Rol;
      return session;
    },
  },
} satisfies NextAuthConfig;

import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { authConfig } from "./auth.config";
import { prisma } from "@/lib/prisma";

const credenciales = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(raw) {
        const parsed = credenciales.safeParse(raw);
        if (!parsed.success) return null;
        const usuario = await prisma.usuario.findUnique({
          where: { email: parsed.data.email.toLowerCase() },
        });
        if (!usuario || !usuario.activo) return null;
        const ok = await bcrypt.compare(parsed.data.password, usuario.passwordHash);
        if (!ok) return null;
        return { id: usuario.id, name: usuario.nombre, email: usuario.email, rol: usuario.rol };
      },
    }),
  ],
});

import type { Rol } from "@prisma/client";
import type { DefaultSession } from "next-auth";

declare module "next-auth" {
  interface User {
    rol: Rol;
  }
  interface Session {
    user: { id: string; rol: Rol } & DefaultSession["user"];
  }
}

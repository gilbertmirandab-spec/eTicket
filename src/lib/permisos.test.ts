import { describe, expect, it } from "vitest";
import * as p from "./permisos";

const cliente = { id: "c1", rol: "CLIENTE" as const };
const otroCliente = { id: "c2", rol: "CLIENTE" as const };
const agente = { id: "a1", rol: "AGENTE" as const };
const admin = { id: "x1", rol: "ADMIN" as const };
const ticket = { clienteId: "c1", estado: "ABIERTO" };

describe("permisos", () => {
  it("solo el administrador elimina, ve el dashboard, genera PDF y gestiona usuarios", () => {
    for (const fn of [p.puedeEliminar, p.puedeVerDashboard, p.puedeGenerarInforme, p.puedeGestionarUsuarios]) {
      expect(fn(admin)).toBe(true);
      expect(fn(agente)).toBe(false);
      expect(fn(cliente)).toBe(false);
    }
  });
  it("el cliente solo ve sus propios tickets", () => {
    expect(p.puedeVerTicket(cliente, ticket)).toBe(true);
    expect(p.puedeVerTicket(otroCliente, ticket)).toBe(false);
    expect(p.puedeVerTicket(agente, ticket)).toBe(true);
  });
  it("agentes y admin cambian estado; clientes no", () => {
    expect(p.puedeCambiarEstado(agente)).toBe(true);
    expect(p.puedeCambiarEstado(admin)).toBe(true);
    expect(p.puedeCambiarEstado(cliente)).toBe(false);
  });
  it("el cliente no comenta tickets cerrados", () => {
    expect(p.puedeComentar(cliente, { ...ticket, estado: "CERRADO" })).toBe(false);
    expect(p.puedeComentar(agente, { ...ticket, estado: "CERRADO" })).toBe(true);
  });
});

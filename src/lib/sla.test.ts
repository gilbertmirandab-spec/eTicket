import { describe, expect, it } from "vitest";
import { calcularVencimientoSla, semaforoSla, tiempoRestanteTexto } from "./sla";

const H = 3_600_000;
const base = new Date("2026-01-01T10:00:00Z");
const ticket = (estado: "ABIERTO" | "EN_PROGRESO" | "CERRADO", horas = 24, cerradoEn: Date | null = null) => ({
  estado,
  creadoEn: base,
  slaVenceEn: new Date(base.getTime() + horas * H),
  cerradoEn,
});
const en = (horas: number) => new Date(base.getTime() + horas * H);

describe("calcularVencimientoSla", () => {
  it("suma las horas según prioridad", () => {
    expect(calcularVencimientoSla("CRITICA", base)).toEqual(en(4));
    expect(calcularVencimientoSla("ALTA", base)).toEqual(en(8));
    expect(calcularVencimientoSla("MEDIA", base)).toEqual(en(24));
    expect(calcularVencimientoSla("BAJA", base)).toEqual(en(72));
  });
});

describe("semaforoSla (umbral 25 %)", () => {
  it("verde cuando queda más del 25 % del plazo", () => {
    expect(semaforoSla(ticket("ABIERTO"), en(1), 0.25)).toBe("VERDE");
    expect(semaforoSla(ticket("EN_PROGRESO"), en(17), 0.25)).toBe("VERDE");
  });
  it("amarillo cuando queda 25 % o menos", () => {
    expect(semaforoSla(ticket("ABIERTO"), en(18), 0.25)).toBe("AMARILLO");
    expect(semaforoSla(ticket("EN_PROGRESO"), en(23.9), 0.25)).toBe("AMARILLO");
  });
  it("rojo cuando el plazo venció", () => {
    expect(semaforoSla(ticket("ABIERTO"), en(24), 0.25)).toBe("ROJO");
    expect(semaforoSla(ticket("EN_PROGRESO"), en(100), 0.25)).toBe("ROJO");
  });
  it("cerrado dentro del plazo es verde aunque hoy esté pasado el plazo", () => {
    expect(semaforoSla(ticket("CERRADO", 24, en(5)), en(100), 0.25)).toBe("VERDE");
  });
  it("cerrado fuera de plazo es rojo", () => {
    expect(semaforoSla(ticket("CERRADO", 24, en(30)), en(100), 0.25)).toBe("ROJO");
  });
});

describe("tiempoRestanteTexto", () => {
  it("formatea tiempo restante y vencido", () => {
    expect(tiempoRestanteTexto(en(3.5), base)).toBe("quedan 3 h 30 min");
    expect(tiempoRestanteTexto(en(50), base)).toBe("quedan 2 d 2 h");
    expect(tiempoRestanteTexto(base, en(0.25))).toBe("vencido hace 15 min");
  });
});

import { describe, expect, it } from "vitest";
import {
  calcularVencimientos,
  esHorarioHabil,
  peor,
  proximoVencimiento,
  semaforo,
  semaforoSla,
  tiempoRestanteTexto,
} from "./sla";

const MIN = 60_000;
// Noviembre en Santiago es UTC-3 (horario de verano).
const santiago = (iso: string) => new Date(`${iso}-03:00`);

describe("esHorarioHabil (L-V 09:00-18:00, America/Santiago)", () => {
  it("dentro del horario en día laboral", () => {
    expect(esHorarioHabil(santiago("2026-11-19T09:00:00"))).toBe(true); // jueves
    expect(esHorarioHabil(santiago("2026-11-20T17:59:00"))).toBe(true); // viernes
  });
  it("fuera del horario", () => {
    expect(esHorarioHabil(santiago("2026-11-19T08:59:00"))).toBe(false);
    expect(esHorarioHabil(santiago("2026-11-19T18:00:00"))).toBe(false);
    expect(esHorarioHabil(santiago("2026-11-21T11:00:00"))).toBe(false); // sábado
    expect(esHorarioHabil(santiago("2026-11-22T11:00:00"))).toBe(false); // domingo
  });
  it("usa la hora de Santiago, no la del servidor", () => {
    // 13:00 UTC = 10:00 en Santiago (hábil); 23:00 UTC = 20:00 en Santiago (inhábil)
    expect(esHorarioHabil(new Date("2026-11-19T13:00:00Z"))).toBe(true);
    expect(esHorarioHabil(new Date("2026-11-19T23:00:00Z"))).toBe(false);
  });
});

describe("calcularVencimientos", () => {
  it("horario hábil: primer contacto 30 min, inicio de atención 1 h", () => {
    const c = santiago("2026-11-19T10:00:00");
    const v = calcularVencimientos(c);
    expect(v.horarioHabil).toBe(true);
    expect(v.primerContactoVenceEn.getTime() - c.getTime()).toBe(30 * MIN);
    expect(v.inicioAtencionVenceEn.getTime() - c.getTime()).toBe(60 * MIN);
  });
  it("horario inhábil: primer contacto 1 h, inicio de atención 2 h (tiempo continuo)", () => {
    const c = santiago("2026-11-19T23:30:00");
    const v = calcularVencimientos(c);
    expect(v.horarioHabil).toBe(false);
    expect(v.primerContactoVenceEn.getTime() - c.getTime()).toBe(60 * MIN);
    expect(v.inicioAtencionVenceEn.getTime() - c.getTime()).toBe(120 * MIN);
  });
});

describe("semaforo (aviso 15 min)", () => {
  const vence = santiago("2026-11-19T10:30:00");
  const en = (min: number) => new Date(vence.getTime() + min * MIN);
  it("verde cuando faltan más de 15 minutos", () => {
    expect(semaforo(vence, null, en(-16), 15)).toBe("VERDE");
  });
  it("amarillo cuando faltan 15 minutos o menos", () => {
    expect(semaforo(vence, null, en(-15), 15)).toBe("AMARILLO");
    expect(semaforo(vence, null, en(-1), 15)).toBe("AMARILLO");
  });
  it("rojo al vencer", () => {
    expect(semaforo(vence, null, en(0), 15)).toBe("ROJO");
    expect(semaforo(vence, null, en(60), 15)).toBe("ROJO");
  });
  it("cumplido a tiempo queda verde; cumplido tarde queda rojo", () => {
    expect(semaforo(vence, en(-5), en(500), 15)).toBe("VERDE");
    expect(semaforo(vence, en(5), en(500), 15)).toBe("ROJO");
  });
});

describe("semaforoSla", () => {
  const c = santiago("2026-11-19T10:00:00");
  const base = { ...calcularVencimientos(c), primerContactoEn: null, inicioAtencionEn: null };
  it("el general es el peor de los dos SLA", () => {
    const r = semaforoSla(base, new Date(c.getTime() + 20 * MIN), 15);
    expect(r).toEqual({ primerContacto: "AMARILLO", inicioAtencion: "VERDE", general: "AMARILLO" });
    const r2 = semaforoSla({ ...base, primerContactoEn: new Date(c.getTime() + 10 * MIN) }, new Date(c.getTime() + 20 * MIN), 15);
    expect(r2.general).toBe("VERDE");
  });
  it("próximo vencimiento pendiente", () => {
    expect(proximoVencimiento(base)?.tipo).toBe("primerContacto");
    expect(proximoVencimiento({ ...base, primerContactoEn: c })?.tipo).toBe("inicioAtencion");
    expect(proximoVencimiento({ ...base, primerContactoEn: c, inicioAtencionEn: c })).toBeNull();
  });
  it("peor()", () => {
    expect(peor("VERDE", "ROJO", "AMARILLO")).toBe("ROJO");
  });
});

describe("tiempoRestanteTexto", () => {
  const base = new Date("2026-01-01T10:00:00Z");
  it("formatea tiempo restante y vencido", () => {
    expect(tiempoRestanteTexto(new Date(base.getTime() + 90 * MIN), base)).toBe("quedan 1 h 30 min");
    expect(tiempoRestanteTexto(base, new Date(base.getTime() + 15 * MIN))).toBe("vencido hace 15 min");
  });
});

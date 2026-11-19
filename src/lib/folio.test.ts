import { describe, expect, it } from "vitest";
import { formatearFolio } from "./folio";

describe("formatearFolio", () => {
  it("usa prefijo, año y correlativo de 6 dígitos", () => {
    expect(formatearFolio(2026, 1)).toBe("TCK-2026-000001");
    expect(formatearFolio(2026, 4521)).toBe("TCK-2026-004521");
  });
});

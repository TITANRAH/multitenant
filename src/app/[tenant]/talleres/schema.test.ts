import { describe, expect, it } from "vitest";
import { crearTallerSchema } from "@/app/[tenant]/talleres/schema";

const valido = {
  slug: "tccars",
  host: "tccars.localhost:3000",
  nombre: "TCcars",
  paquete: "basico",
  adminName: "Ana Pérez",
  adminEmail: "ana@tccars.cl",
  correlativoInicial: 1,
};

describe("crearTallerSchema", () => {
  it("acepta datos válidos", () => {
    expect(crearTallerSchema.safeParse(valido).success).toBe(true);
  });

  it("rechaza un slug con mayúsculas o espacios", () => {
    const result = crearTallerSchema.safeParse({ ...valido, slug: "TC Cars" });
    expect(result.success).toBe(false);
  });

  it("rechaza un paquete que no existe", () => {
    const result = crearTallerSchema.safeParse({ ...valido, paquete: "premium" });
    expect(result.success).toBe(false);
  });

  it("rechaza un correo de admin inválido", () => {
    const result = crearTallerSchema.safeParse({ ...valido, adminEmail: "no-es-correo" });
    expect(result.success).toBe(false);
  });

  it("rechaza campos vacíos", () => {
    const result = crearTallerSchema.safeParse({ ...valido, nombre: "" });
    expect(result.success).toBe(false);
  });

  it("acepta un correlativo inicial mayor a 1 (taller con historial previo)", () => {
    const result = crearTallerSchema.safeParse({ ...valido, correlativoInicial: 1247 });
    expect(result.success).toBe(true);
    expect(result.data?.correlativoInicial).toBe(1247);
  });

  it("coacciona el string de un <input type=number> a number", () => {
    const result = crearTallerSchema.safeParse({ ...valido, correlativoInicial: "1247" });
    expect(result.success).toBe(true);
    expect(result.data?.correlativoInicial).toBe(1247);
  });

  it("rechaza un correlativo inicial menor a 1", () => {
    const result = crearTallerSchema.safeParse({ ...valido, correlativoInicial: 0 });
    expect(result.success).toBe(false);
  });

  it("rechaza un correlativo inicial no entero", () => {
    const result = crearTallerSchema.safeParse({ ...valido, correlativoInicial: 1.5 });
    expect(result.success).toBe(false);
  });
});

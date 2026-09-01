import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";

describe("hashPassword", () => {
  it("nunca guarda la contraseña en texto plano", async () => {
    const hash = await hashPassword("miClaveSegura123");
    expect(hash).not.toContain("miClaveSegura123");
  });

  it("genera un hash distinto cada vez para la misma contraseña (salt aleatorio)", async () => {
    const hashA = await hashPassword("miClaveSegura123");
    const hashB = await hashPassword("miClaveSegura123");
    expect(hashA).not.toBe(hashB);
  });
});

describe("verifyPassword", () => {
  it("acepta la contraseña correcta", async () => {
    const hash = await hashPassword("miClaveSegura123");
    await expect(verifyPassword("miClaveSegura123", hash)).resolves.toBe(true);
  });

  it("rechaza una contraseña incorrecta", async () => {
    const hash = await hashPassword("miClaveSegura123");
    await expect(verifyPassword("otraClave", hash)).resolves.toBe(false);
  });

  it("rechaza un hash con formato inválido en vez de lanzar (sin ':' separador)", async () => {
    await expect(verifyPassword("cualquiera", "sin-dos-puntos")).resolves.toBe(false);
  });
});

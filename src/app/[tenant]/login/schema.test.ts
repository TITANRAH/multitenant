import { describe, expect, it } from "vitest";
import { loginSchema } from "@/app/[tenant]/login/schema";

describe("loginSchema", () => {
  it("acepta correo y contraseña válidos", () => {
    expect(loginSchema.safeParse({ email: "ana@tccars.cl", password: "secreta" }).success).toBe(
      true,
    );
  });

  it("rechaza un correo inválido", () => {
    const result = loginSchema.safeParse({ email: "no-es-correo", password: "secreta" });
    expect(result.success).toBe(false);
  });

  it("rechaza contraseña vacía", () => {
    const result = loginSchema.safeParse({ email: "ana@tccars.cl", password: "" });
    expect(result.success).toBe(false);
  });
});

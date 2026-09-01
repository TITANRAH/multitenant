import { describe, expect, it } from "vitest";
import { aceptarInvitacionSchema } from "@/app/[tenant]/invitacion/[token]/schema";

describe("aceptarInvitacionSchema", () => {
  it("acepta cuando ambas contraseñas coinciden y cumplen el largo mínimo", () => {
    const result = aceptarInvitacionSchema.safeParse({
      password: "clave1234",
      confirmPassword: "clave1234",
    });
    expect(result.success).toBe(true);
  });

  it("rechaza cuando las contraseñas no coinciden", () => {
    const result = aceptarInvitacionSchema.safeParse({
      password: "clave1234",
      confirmPassword: "otraclave",
    });
    expect(result.success).toBe(false);
  });

  it("rechaza una contraseña menor a 8 caracteres", () => {
    const result = aceptarInvitacionSchema.safeParse({
      password: "corta",
      confirmPassword: "corta",
    });
    expect(result.success).toBe(false);
  });
});

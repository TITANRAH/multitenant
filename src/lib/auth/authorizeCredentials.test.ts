import { beforeEach, describe, expect, it, vi } from "vitest";

const findUnique = vi.fn();
const forTenant = vi.fn((_tenantId: string) => ({ user: { findUnique } }));
const verifyPassword = vi.fn();

vi.mock("@/lib/db", () => ({ forTenant: (tenantId: string) => forTenant(tenantId) }));
vi.mock("@/lib/auth/password", () => ({
  verifyPassword: (plain: string, hash: string) => verifyPassword(plain, hash),
  hashPassword: vi.fn(),
}));

const { authorizeCredentials } = await import("@/lib/auth/authorizeCredentials");

beforeEach(() => {
  findUnique.mockReset();
  forTenant.mockClear();
  verifyPassword.mockReset();
});

describe("authorizeCredentials", () => {
  it("devuelve null si falta algún campo de credenciales", async () => {
    await expect(authorizeCredentials({ email: "a@tccars.cl" })).resolves.toBeNull();
    expect(forTenant).not.toHaveBeenCalled();
  });

  it("busca el usuario scoped al tenant recibido (no busca por email global)", async () => {
    findUnique.mockResolvedValue(null);

    await authorizeCredentials({
      tenantId: "tccars-id",
      email: "a@tccars.cl",
      password: "clave",
    });

    expect(forTenant).toHaveBeenCalledWith("tccars-id");
    expect(findUnique).toHaveBeenCalledWith({
      where: { tenantId_email: { tenantId: "tccars-id", email: "a@tccars.cl" } },
    });
  });

  it("devuelve null si el usuario no existe", async () => {
    findUnique.mockResolvedValue(null);

    await expect(
      authorizeCredentials({ tenantId: "tccars-id", email: "no@tccars.cl", password: "x" }),
    ).resolves.toBeNull();
  });

  it("devuelve null si el usuario todavía no aceptó su invitación (sin passwordHash)", async () => {
    findUnique.mockResolvedValue({ id: "u1", passwordHash: null });

    await expect(
      authorizeCredentials({ tenantId: "tccars-id", email: "a@tccars.cl", password: "x" }),
    ).resolves.toBeNull();
    expect(verifyPassword).not.toHaveBeenCalled();
  });

  it("devuelve null si la contraseña no coincide", async () => {
    findUnique.mockResolvedValue({ id: "u1", passwordHash: "salt:hash" });
    verifyPassword.mockResolvedValue(false);

    await expect(
      authorizeCredentials({
        tenantId: "tccars-id",
        email: "a@tccars.cl",
        password: "mala",
      }),
    ).resolves.toBeNull();
  });

  it("devuelve el usuario (sin passwordHash) cuando todo es correcto", async () => {
    findUnique.mockResolvedValue({
      id: "u1",
      tenantId: "tccars-id",
      email: "a@tccars.cl",
      name: "Ana",
      role: "ADMIN",
      platformRole: null,
      passwordHash: "salt:hash",
    });
    verifyPassword.mockResolvedValue(true);

    const result = await authorizeCredentials({
      tenantId: "tccars-id",
      email: "a@tccars.cl",
      password: "correcta",
    });

    expect(result).toEqual({
      id: "u1",
      tenantId: "tccars-id",
      email: "a@tccars.cl",
      name: "Ana",
      role: "ADMIN",
      platformRole: null,
    });
  });
});

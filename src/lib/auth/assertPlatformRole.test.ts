import { beforeEach, describe, expect, it, vi } from "vitest";

const notFound = vi.fn(() => {
  throw new Error("NEXT_NOT_FOUND");
});
vi.mock("next/navigation", () => ({ notFound: () => notFound() }));

const {
  isSuperAdmin,
  assertPlatformRole,
  assertPlatformRoleOrNotFound,
  NotPlatformAdminError,
} = await import("@/lib/auth/assertPlatformRole");

beforeEach(() => {
  notFound.mockClear();
});

describe("isSuperAdmin", () => {
  it("es true solo con platformRole SUPERADMIN", () => {
    expect(isSuperAdmin("SUPERADMIN")).toBe(true);
  });

  it("es false para un usuario de taller normal (platformRole null)", () => {
    expect(isSuperAdmin(null)).toBe(false);
  });
});

describe("assertPlatformRole", () => {
  it("no lanza para un SUPERADMIN", () => {
    expect(() => assertPlatformRole("SUPERADMIN")).not.toThrow();
  });

  it("lanza NotPlatformAdminError para cualquier otra cuenta", () => {
    expect(() => assertPlatformRole(null)).toThrow(NotPlatformAdminError);
  });
});

describe("assertPlatformRoleOrNotFound", () => {
  it("no corta la ejecución para un SUPERADMIN", () => {
    expect(() => assertPlatformRoleOrNotFound("SUPERADMIN")).not.toThrow();
    expect(notFound).not.toHaveBeenCalled();
  });

  it("llama a notFound() para cualquier otra cuenta (el panel no existe para ellos)", () => {
    expect(() => assertPlatformRoleOrNotFound(null)).toThrow("NEXT_NOT_FOUND");
    expect(notFound).toHaveBeenCalledOnce();
  });
});

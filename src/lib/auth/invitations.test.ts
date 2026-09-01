import { beforeEach, describe, expect, it, vi } from "vitest";

const upsert = vi.fn();
const invitationCreate = vi.fn();
const invitationFindUnique = vi.fn();
const invitationUpdate = vi.fn();
const userUpdate = vi.fn();
const forTenant = vi.fn((tenantId: string) => {
  void tenantId;
  return {
    user: { upsert, update: userUpdate },
    invitation: {
      create: invitationCreate,
      findUnique: invitationFindUnique,
      update: invitationUpdate,
    },
  };
});
const hashPassword = vi.fn();
const sendInvitationEmail = vi.fn();

vi.mock("@/lib/db", () => ({ forTenant: (tenantId: string) => forTenant(tenantId) }));
vi.mock("@/lib/auth/password", () => ({
  hashPassword: (plain: string) => hashPassword(plain),
  verifyPassword: vi.fn(),
}));
vi.mock("@/lib/email/sendInvitationEmail", () => ({
  sendInvitationEmail: (to: string, link: string) => sendInvitationEmail(to, link),
}));

const {
  createInvitation,
  acceptInvitation,
  getInvitationByToken,
  InvitationNotFoundError,
  InvitationExpiredError,
  InvitationAlreadyAcceptedError,
} = await import("@/lib/auth/invitations");

beforeEach(() => {
  upsert.mockReset();
  invitationCreate.mockReset();
  invitationFindUnique.mockReset();
  invitationUpdate.mockReset();
  userUpdate.mockReset();
  hashPassword.mockReset();
  sendInvitationEmail.mockReset();
});

describe("createInvitation", () => {
  it("crea el User en estado pendiente (passwordHash null)", async () => {
    upsert.mockResolvedValue({ id: "u1", email: "ana@tccars.cl" });
    invitationCreate.mockResolvedValue({ id: "inv1", token: "tok" });

    await createInvitation({
      tenantId: "tccars-id",
      tenantHost: "tccars.localhost:3000",
      invitedById: "owner-id",
      email: "ana@tccars.cl",
      name: "Ana",
      role: "RECEPCION",
    });

    expect(upsert).toHaveBeenCalledWith({
      where: { tenantId_email: { tenantId: "tccars-id", email: "ana@tccars.cl" } },
      update: { name: "Ana", role: "RECEPCION" },
      create: {
        tenantId: "tccars-id",
        email: "ana@tccars.cl",
        name: "Ana",
        role: "RECEPCION",
        passwordHash: null,
      },
    });
  });

  it("guarda la invitación con token y vencimiento a futuro", async () => {
    upsert.mockResolvedValue({ id: "u1" });
    invitationCreate.mockResolvedValue({ id: "inv1", token: "tok" });

    await createInvitation({
      tenantId: "tccars-id",
      tenantHost: "tccars.localhost:3000",
      invitedById: "owner-id",
      email: "ana@tccars.cl",
      name: "Ana",
      role: "RECEPCION",
    });

    const callArgs = invitationCreate.mock.calls[0][0];
    expect(callArgs.data.tenantId).toBe("tccars-id");
    expect(callArgs.data.invitedById).toBe("owner-id");
    expect(typeof callArgs.data.token).toBe("string");
    expect(callArgs.data.token.length).toBeGreaterThan(20);
    expect(callArgs.data.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it("manda el link de invitación por el canal de email (mockeado hasta tener dominio)", async () => {
    upsert.mockResolvedValue({ id: "u1" });
    invitationCreate.mockResolvedValue({ id: "inv1" });

    await createInvitation({
      tenantId: "tccars-id",
      tenantHost: "tccars.localhost:3000",
      invitedById: "owner-id",
      email: "ana@tccars.cl",
      name: "Ana",
      role: "RECEPCION",
    });

    // el token del link es el mismo que se guardó en la invitación, no
    // algo que invente el mock de create().
    const savedToken = invitationCreate.mock.calls[0][0].data.token;
    expect(sendInvitationEmail).toHaveBeenCalledWith(
      "ana@tccars.cl",
      `http://tccars.localhost:3000/invitacion/${savedToken}`,
    );
  });
});

describe("getInvitationByToken", () => {
  it("busca la invitación acotada al tenant", async () => {
    invitationFindUnique.mockResolvedValue({ id: "inv1", token: "tok" });

    const result = await getInvitationByToken("tccars-id", "tok");

    expect(forTenant).toHaveBeenCalledWith("tccars-id");
    expect(invitationFindUnique).toHaveBeenCalledWith({ where: { token: "tok" } });
    expect(result).toEqual({ id: "inv1", token: "tok" });
  });

  it("devuelve null si el token no existe", async () => {
    invitationFindUnique.mockResolvedValue(null);

    expect(await getInvitationByToken("tccars-id", "no-existe")).toBeNull();
  });
});

describe("acceptInvitation", () => {
  it("lanza InvitationNotFoundError si el token no existe", async () => {
    invitationFindUnique.mockResolvedValue(null);

    await expect(
      acceptInvitation({ tenantId: "tccars-id", token: "no-existe", password: "clave123" }),
    ).rejects.toBeInstanceOf(InvitationNotFoundError);
  });

  it("lanza InvitationAlreadyAcceptedError si ya se aceptó", async () => {
    invitationFindUnique.mockResolvedValue({
      id: "inv1",
      email: "ana@tccars.cl",
      acceptedAt: new Date(),
      expiresAt: new Date(Date.now() + 10_000),
    });

    await expect(
      acceptInvitation({ tenantId: "tccars-id", token: "tok", password: "clave123" }),
    ).rejects.toBeInstanceOf(InvitationAlreadyAcceptedError);
  });

  it("lanza InvitationExpiredError si venció", async () => {
    invitationFindUnique.mockResolvedValue({
      id: "inv1",
      email: "ana@tccars.cl",
      acceptedAt: null,
      expiresAt: new Date(Date.now() - 10_000),
    });

    await expect(
      acceptInvitation({ tenantId: "tccars-id", token: "tok", password: "clave123" }),
    ).rejects.toBeInstanceOf(InvitationExpiredError);
  });

  it("define el passwordHash del usuario y marca la invitación como aceptada", async () => {
    invitationFindUnique.mockResolvedValue({
      id: "inv1",
      email: "ana@tccars.cl",
      acceptedAt: null,
      expiresAt: new Date(Date.now() + 10_000),
    });
    hashPassword.mockResolvedValue("salt:hasheada");

    await acceptInvitation({ tenantId: "tccars-id", token: "tok", password: "clave123" });

    expect(hashPassword).toHaveBeenCalledWith("clave123");
    expect(userUpdate).toHaveBeenCalledWith({
      where: { tenantId_email: { tenantId: "tccars-id", email: "ana@tccars.cl" } },
      data: { passwordHash: "salt:hasheada" },
    });
    expect(invitationUpdate).toHaveBeenCalledWith({
      where: { id: "inv1" },
      data: { acceptedAt: expect.any(Date) },
    });
  });
});

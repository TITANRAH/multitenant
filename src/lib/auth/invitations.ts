import { randomBytes } from "node:crypto";
import { forTenant, type StaffRole } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";
import { sendInvitationEmail } from "@/lib/email/sendInvitationEmail";

const INVITATION_TTL_DAYS = 7;

export class InvitationNotFoundError extends Error {
  constructor() {
    super("La invitación no existe o el link es inválido.");
    this.name = "InvitationNotFoundError";
  }
}

export class InvitationExpiredError extends Error {
  constructor() {
    super("La invitación venció.");
    this.name = "InvitationExpiredError";
  }
}

export class InvitationAlreadyAcceptedError extends Error {
  constructor() {
    super("Esta invitación ya fue aceptada.");
    this.name = "InvitationAlreadyAcceptedError";
  }
}

type CreateInvitationInput = {
  tenantId: string;
  tenantHost: string; // para armar el link, ej. "tccars.localhost:3000"
  invitedById: string;
  email: string;
  name: string;
  role: StaffRole;
};

/**
 * Crea (o actualiza) el User en estado "pendiente" (passwordHash: null),
 * registra la invitación con su token, y dispara el correo.
 *
 * Sin gate de rol adentro a propósito: el panel de plataforma invita al
 * primer OWNER de un taller nuevo (donde todavía no existe ningún ADMIN
 * que lo autorice), y un ADMIN existente invita a un compañero de su
 * propio taller — son dos llamadores distintos, con distinto gate cada
 * uno (assertRole / assertPlatformRole). El gate va en la server action
 * que llama a esto, no acá (regla #3 de CLAUDE.md).
 */
export async function createInvitation(input: CreateInvitationInput) {
  const db = forTenant(input.tenantId);

  const user = await db.user.upsert({
    where: { tenantId_email: { tenantId: input.tenantId, email: input.email } },
    update: { name: input.name, role: input.role },
    create: {
      tenantId: input.tenantId,
      email: input.email,
      name: input.name,
      role: input.role,
      passwordHash: null,
    },
  });

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000);

  const invitation = await db.invitation.create({
    data: {
      tenantId: input.tenantId,
      email: input.email,
      role: input.role,
      token,
      invitedById: input.invitedById,
      expiresAt,
    },
  });

  const link = `http://${input.tenantHost}/invitacion/${token}`;
  await sendInvitationEmail(input.email, link);

  return { user, invitation };
}

/**
 * Estado de una invitación para decidir qué mostrar en la pantalla de
 * aceptación antes de que el usuario escriba nada: link roto, ya usada,
 * vencida o lista para fijar contraseña.
 */
export async function getInvitationByToken(tenantId: string, token: string) {
  const db = forTenant(tenantId);
  return db.invitation.findUnique({ where: { token } });
}

type AcceptInvitationInput = {
  tenantId: string;
  token: string;
  password: string;
};

/**
 * Valida el token y define la contraseña del usuario invitado. A partir
 * de acá, ese usuario puede loguearse (authorizeCredentials exige
 * passwordHash no nulo).
 */
export async function acceptInvitation(input: AcceptInvitationInput) {
  const db = forTenant(input.tenantId);

  const invitation = await db.invitation.findUnique({
    where: { token: input.token },
  });

  if (!invitation) throw new InvitationNotFoundError();
  if (invitation.acceptedAt) throw new InvitationAlreadyAcceptedError();
  if (invitation.expiresAt.getTime() < Date.now()) throw new InvitationExpiredError();

  const passwordHash = await hashPassword(input.password);

  await db.user.update({
    where: { tenantId_email: { tenantId: input.tenantId, email: invitation.email } },
    data: { passwordHash },
  });

  await db.invitation.update({
    where: { id: invitation.id },
    data: { acceptedAt: new Date() },
  });
}

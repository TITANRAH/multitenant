"use server";

import { redirect } from "next/navigation";
import {
  acceptInvitation,
  InvitationAlreadyAcceptedError,
  InvitationExpiredError,
  InvitationNotFoundError,
} from "@/lib/auth/invitations";
import {
  aceptarInvitacionSchema,
  type AceptarInvitacionInput,
} from "@/app/[tenant]/invitacion/[token]/schema";

export type AceptarInvitacionState = { error: string } | null;

/**
 * Sin assertRole/assertFeature (regla #3 de CLAUDE.md): quien llama todavía
 * no tiene sesión — el token de la invitación ES la autorización.
 */
export async function aceptarInvitacionAction(
  tenantId: string,
  token: string,
  input: AceptarInvitacionInput,
): Promise<AceptarInvitacionState> {
  const parsed = aceptarInvitacionSchema.safeParse(input);
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  }

  try {
    await acceptInvitation({ tenantId, token, password: parsed.data.password });
  } catch (error) {
    if (
      error instanceof InvitationNotFoundError ||
      error instanceof InvitationExpiredError ||
      error instanceof InvitationAlreadyAcceptedError
    ) {
      return { error: error.message };
    }
    throw error;
  }

  redirect("/login");
}

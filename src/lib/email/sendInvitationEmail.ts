/**
 * BLOQUEADO por falta de dominio propio (ver docs/plan.md, "Estado actual"):
 * Resend exige un dominio verificado para enviar cualquier correo, y
 * todavía no se compró uno. Mientras tanto, el link de invitación se
 * loguea en consola en vez de mandarse por email.
 *
 * Cuando haya dominio: reemplazar el cuerpo de esta función por la
 * llamada real a Resend (`resend.emails.send(...)`). Nadie más en el
 * código necesita cambiar — es el único punto de contacto con el envío.
 */
export async function sendInvitationEmail(to: string, link: string): Promise<void> {
  console.log(`[invitación pendiente de envío real] para ${to}: ${link}`);
}

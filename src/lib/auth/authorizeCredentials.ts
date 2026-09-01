import { forTenant } from "@/lib/db";
import { verifyPassword } from "@/lib/auth/password";

/**
 * Lógica real del login por email+password, separada de la configuración
 * de next-auth (auth.ts) para poder testearla sin cargar todo next-auth.
 *
 * tenantId viaja junto a email/password: el mismo email puede existir en
 * dos talleres distintos (User es único por [tenantId, email]), así que
 * sin tenantId no hay forma de saber a qué User se refiere el login.
 */
export async function authorizeCredentials(
  credentials: Partial<Record<"tenantId" | "email" | "password", unknown>>,
) {
  const { tenantId, email, password } = credentials;

  if (
    typeof tenantId !== "string" ||
    typeof email !== "string" ||
    typeof password !== "string"
  ) {
    return null;
  }

  const db = forTenant(tenantId);
  const user = await db.user.findUnique({
    where: { tenantId_email: { tenantId, email } },
  });

  if (!user || !user.passwordHash) return null;

  const passwordOk = await verifyPassword(password, user.passwordHash);
  if (!passwordOk) return null;

  return {
    id: user.id,
    tenantId: user.tenantId,
    email: user.email,
    name: user.name,
    role: user.role,
    platformRole: user.platformRole,
  };
}

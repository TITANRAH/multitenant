import "dotenv/config";
import { forTenant, seedTenant } from "@/lib/db";
import { hashPassword } from "@/lib/auth/password";

/**
 * Siembra el tenant especial "plataforma" (donde vive el panel para dar de
 * alta talleres) y tu cuenta SUPERADMIN. Es la única cuenta que se crea
 * sin invitación — no hay nadie más arriba que te invite a ti mismo.
 * Idempotente: correrlo de nuevo actualiza en vez de duplicar.
 */
async function main() {
  const email = process.env.PLATFORM_ADMIN_EMAIL;
  const name = process.env.PLATFORM_ADMIN_NAME;
  const password = process.env.PLATFORM_ADMIN_PASSWORD;

  if (!email || !name || !password) {
    throw new Error(
      "Faltan PLATFORM_ADMIN_EMAIL, PLATFORM_ADMIN_NAME o PLATFORM_ADMIN_PASSWORD en .env",
    );
  }

  const tenant = await seedTenant({
    slug: "plataforma",
    host: "plataforma.localhost:3000",
    nombre: "Plataforma",
    features: [],
  });

  const passwordHash = await hashPassword(password);
  const db = forTenant(tenant.id);

  const admin = await db.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email } },
    update: { name, passwordHash, role: "OWNER", platformRole: "SUPERADMIN" },
    create: {
      tenantId: tenant.id,
      email,
      name,
      passwordHash,
      role: "OWNER",
      platformRole: "SUPERADMIN",
    },
  });

  console.log("Plataforma lista:", {
    tenant: { id: tenant.id, slug: tenant.slug, host: tenant.host },
    admin: { id: admin.id, email: admin.email },
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => {
    process.exit();
  });

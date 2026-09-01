import NextAuth, { type Session } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authorizeCredentials } from "@/lib/auth/authorizeCredentials";

// Sesión con lo mínimo que assertFeature/assertRole necesitan: tenantId
// para forTenant(), role para assertRole, platformRole para el panel de
// plataforma. Nunca se guarda passwordHash en el token.
type SessionRole = "OWNER" | "ADMIN" | "RECEPCION" | "MECANICO";
type SessionPlatformRole = "SUPERADMIN" | null;

declare module "next-auth" {
  interface User {
    tenantId: string;
    role: SessionRole;
    platformRole: SessionPlatformRole;
  }

  interface Session {
    user: {
      id: string;
      tenantId: string;
      email: string;
      name: string;
      role: SessionRole;
      platformRole: SessionPlatformRole;
    };
  }
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  providers: [
    Credentials({
      credentials: {
        tenantId: {},
        email: {},
        password: {},
      },
      authorize: authorizeCredentials,
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.tenantId = user.tenantId;
        token.role = user.role;
        token.platformRole = user.platformRole;
      }
      return token;
    },
    async session({ session, token }) {
      session.user.id = token.sub!;
      session.user.tenantId = token.tenantId as string;
      session.user.role = token.role as Session["user"]["role"];
      session.user.platformRole = token.platformRole as Session["user"]["platformRole"];
      return session;
    },
  },
});

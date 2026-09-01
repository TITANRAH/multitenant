import { PrismaClient } from "@/generated/prisma/client";
import { PrismaNeon } from "@prisma/adapter-neon";
import { neonConfig } from "@neondatabase/serverless";
import ws from "ws";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

// Las transacciones interactivas de Prisma ($transaction, usada por
// seedTenant) necesitan WebSocket. El runtime edge (proxy.ts) y el
// navegador ya lo traen; Node.js plano (scripts corridos con tsx, como
// prisma/seedPlatform.ts) en esta versión de Node no — ahí usamos el
// paquete "ws" como implementación.
if (typeof WebSocket === "undefined") {
  neonConfig.webSocketConstructor = ws;
}

const adapter = new PrismaNeon({
  connectionString: process.env.DATABASE_URL!,
});

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

import "dotenv/config";
import { seedTenant } from "@/lib/db";

async function main() {
  const tccars = await seedTenant({
    slug: "tccars",
    host: "tccars.localhost:3000",
    nombre: "TCcars",
    features: ["ordenes", "agenda", "recordatorios", "portal", "contabilidad"],
  });

  const demo = await seedTenant({
    slug: "demo",
    host: "demo.localhost:3000",
    nombre: "Taller Demo",
    features: ["ordenes", "mostrario"],
  });

  console.log("Talleres semilla listos:", {
    tccars: { id: tccars.id, slug: tccars.slug },
    demo: { id: demo.id, slug: demo.slug },
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

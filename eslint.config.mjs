import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const NO_RAW_PRISMA_MESSAGE =
  "Prohibido importar el cliente Prisma fuera de src/lib/db (CLAUDE.md, regla #2). Usa forTenant(tenantId) desde '@/lib/db'.";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    rules: {
      "no-restricted-imports": [
        "error",
        {
          paths: [
            { name: "@prisma/client", message: NO_RAW_PRISMA_MESSAGE },
            { name: "@prisma/adapter-neon", message: NO_RAW_PRISMA_MESSAGE },
          ],
          patterns: [
            {
              group: ["@/generated/prisma", "@/generated/prisma/*"],
              message: NO_RAW_PRISMA_MESSAGE,
            },
          ],
        },
      ],
    },
  },
  {
    files: ["src/lib/db/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": "off",
    },
  },
]);

export default eslintConfig;

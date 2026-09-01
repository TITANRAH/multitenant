// Paquetes comerciales: plantillas de alta, no una jerarquía en la base
// (ver docs/plan.md sección 2.3). Al crear un taller se elige un paquete y
// sus features se copian una a una a TenantFeature; después cada taller
// puede activar o desactivar features sueltas sin romper nada.

import type { FeatureKey } from "@/features/registry";

export const PACKAGES = {
  basico: {
    label: "Básico",
    features: ["ordenes", "agenda"],
  },
  operativo: {
    label: "Operativo",
    features: ["ordenes", "agenda", "recordatorios", "portal", "contabilidad"],
  },
  completo: {
    label: "Completo",
    features: [
      "ordenes",
      "agenda",
      "recordatorios",
      "portal",
      "contabilidad",
      "mostrario",
      "videos",
      "chatbox",
    ],
  },
} as const satisfies Record<string, { label: string; features: readonly FeatureKey[] }>;

export type PackageKey = keyof typeof PACKAGES;

export function isPackageKey(value: string): value is PackageKey {
  return value in PACKAGES;
}

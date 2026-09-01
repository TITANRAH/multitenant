import { describe, expect, it } from "vitest";
import { FEATURES, isFeatureKey } from "@/features/registry";
import { PACKAGES, isPackageKey } from "@/features/packages";

describe("PACKAGES", () => {
  it("solo lista features que existen en el catálogo FEATURES", () => {
    for (const [key, pkg] of Object.entries(PACKAGES)) {
      for (const feature of pkg.features) {
        expect(
          isFeatureKey(feature),
          `el paquete "${key}" incluye "${feature}", que no está en FEATURES`,
        ).toBe(true);
      }
    }
  });

  it("cada paquete trae todas las dependencias (requires) de sus propias features", () => {
    for (const [key, pkg] of Object.entries(PACKAGES)) {
      for (const feature of pkg.features) {
        for (const required of FEATURES[feature].requires) {
          expect(
            (pkg.features as readonly string[]).includes(required),
            `el paquete "${key}" incluye "${feature}" pero no "${required}", que requiere`,
          ).toBe(true);
        }
      }
    }
  });

  it("los paquetes son acumulativos: Operativo contiene a Básico, Completo contiene a Operativo", () => {
    const basico = PACKAGES.basico.features as readonly string[];
    const operativo = PACKAGES.operativo.features as readonly string[];
    const completo = PACKAGES.completo.features as readonly string[];

    for (const feature of basico) expect(operativo).toContain(feature);
    for (const feature of operativo) expect(completo).toContain(feature);
  });
});

describe("isPackageKey", () => {
  it("reconoce un nombre de paquete real", () => {
    expect(isPackageKey("basico")).toBe(true);
  });

  it("rechaza un nombre que no está en el catálogo", () => {
    expect(isPackageKey("premium")).toBe(false);
  });
});

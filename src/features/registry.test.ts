import { describe, expect, it } from "vitest";
import { FEATURES, isFeatureKey } from "@/features/registry";

describe("FEATURES", () => {
  it("declara requires solo con nombres que existen en el propio catálogo", () => {
    const keys = Object.keys(FEATURES);

    for (const [key, feature] of Object.entries(FEATURES)) {
      for (const required of feature.requires) {
        expect(
          keys.includes(required),
          `"${key}" requiere "${required}", que no existe en FEATURES`,
        ).toBe(true);
      }
    }
  });
});

describe("isFeatureKey", () => {
  it("reconoce un nombre de feature real", () => {
    expect(isFeatureKey("agenda")).toBe(true);
  });

  it("rechaza un nombre que no está en el catálogo", () => {
    expect(isFeatureKey("agenad")).toBe(false);
  });

  it("rechaza string vacío", () => {
    expect(isFeatureKey("")).toBe(false);
  });
});

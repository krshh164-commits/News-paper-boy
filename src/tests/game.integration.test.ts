import { describe, expect, it } from "vitest";
import { createGameConfigBase } from "../config/phaserConfig";

describe("game configuration", () => {
  it("uses a portrait 720 by 1280 canvas without physics", () => {
    const parent = document.createElement("div");
    const config = createGameConfigBase(parent);
    expect(config.width).toBe(720);
    expect(config.height).toBe(1280);
    expect(config.parent).toBe(parent);
    expect("physics" in config).toBe(false);
  });
});

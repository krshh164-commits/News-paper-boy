import { describe, expect, it } from "vitest";
import { DELIVERY_PASS_DEPTH, popupTriggerDepth, selectUpcomingHouse } from "../systems/DeliveryWindow";

describe("house-bound delivery window", () => {
  it("opens a consistent short reaction window before the house passes", () => {
    expect(DELIVERY_PASS_DEPTH).toBe(.1);
    expect(popupTriggerDepth(.16)).toBeCloseTo(.388);
    expect(popupTriggerDepth(.32)).toBeCloseTo(.676);
    expect((popupTriggerDepth(.32) - DELIVERY_PASS_DEPTH) / .32).toBeCloseTo(1.8);
  });

  it("stages the nearest future house with a readable door, never a passed house", () => {
    const houses = [
      { id: "too-near", depth: .3, hasDoor: true },
      { id: "no-door", depth: .65, hasDoor: false },
      { id: "upcoming", depth: .7, hasDoor: true },
      { id: "farther", depth: .9, hasDoor: true },
    ];

    expect(selectUpcomingHouse(houses, .65)?.id).toBe("upcoming");
    expect(selectUpcomingHouse(houses, .95)).toBeNull();
  });
});

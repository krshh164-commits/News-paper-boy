import { describe, expect, it } from "vitest";
import { DELIVERY_PASS_DEPTH, isRequestReady, popupTriggerDepth, selectUpcomingHouse } from "../systems/DeliveryWindow";

describe("house-bound delivery window", () => {
  it("opens a consistent short reaction window before the house passes", () => {
    expect(DELIVERY_PASS_DEPTH).toBe(.1);
    expect(popupTriggerDepth(.14, 2.65)).toBeCloseTo(.471);
    expect(popupTriggerDepth(.33, 1.5)).toBeCloseTo(.595);
    expect((popupTriggerDepth(.14, 2.65) - DELIVERY_PASS_DEPTH) / .14).toBeCloseTo(2.65);
    expect((popupTriggerDepth(.33, 1.5) - DELIVERY_PASS_DEPTH) / .33).toBeCloseTo(1.5);
    expect(popupTriggerDepth(.33, 1.5)).toBeGreaterThan(.5);
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

  it("activates the label only after the selected house reaches its trigger depth", () => {
    expect(isRequestReady(.5, .471)).toBe(false);
    expect(isRequestReady(.471, .471)).toBe(true);
    expect(isRequestReady(.2, .471)).toBe(true);
  });
});

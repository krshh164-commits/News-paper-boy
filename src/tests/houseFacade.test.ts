import { describe, expect, it } from "vitest";
import { HOUSE_TEMPLATES, type HouseFacadeData } from "../systems/RoadsideSystem";
import { createHouseFacadePlan } from "../objects/HouseFacade";

describe("house facade plans", () => {
  it("keeps street-facing doors inside every facade and suppresses tiny details", () => {
    for (const template of HOUSE_TEMPLATES) {
      const data: HouseFacadeData = {
        template: template.id,
        widthVariant: -1,
        heightVariant: -1,
        roofVariant: 0,
        doorVariant: 2,
        windowVariant: 0,
        balconyVariant: 0,
        decorationVariant: 0,
        setback: 12,
        lineWeight: 1,
        doorVisible: true,
        decorations: template.decorations,
      };
      const near = createHouseFacadePlan(data, "left", 0.4);
      const farther = createHouseFacadePlan(data, "left", 0.2);
      expect(near.door).not.toBeNull();
      expect(near.door!.width).toBeGreaterThanOrEqual(6);
      expect(near.door!.height).toBeGreaterThanOrEqual(6);
      expect(near.door!.x).toBeGreaterThanOrEqual(-near.width);
      expect(near.door!.x + near.door!.width).toBeLessThanOrEqual(0);
      expect(createHouseFacadePlan(data, "left", 0.02).door).toBeNull();
      expect(createHouseFacadePlan(data, "left", 0.02).windows).toHaveLength(0);
      expect(near.width / farther.width).toBeCloseTo(2);
      expect(near.height / farther.height).toBeCloseTo(2);
    }
  });

  it("mirrors the facade orientation without moving the door off the street side", () => {
    const template = HOUSE_TEMPLATES[1];
    const data: HouseFacadeData = {
      template: template.id, widthVariant: 0, heightVariant: 0, roofVariant: 0,
      doorVariant: 0, windowVariant: 0, balconyVariant: 0, decorationVariant: 0,
      setback: 10, lineWeight: 1, doorVisible: true, decorations: template.decorations,
    };
    const left = createHouseFacadePlan(data, "left", 0.6);
    const right = createHouseFacadePlan(data, "right", 0.6);
    expect(left.door!.x + left.door!.width).toBe(0);
    expect(right.door!.x).toBe(0);
  });
});

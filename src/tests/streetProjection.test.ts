import { describe, expect, it } from "vitest";
import { facadeScale, requestBubbleLayout, roadEdge, streetGround, streetScale } from "../systems/StreetProjection";

describe("shared street projection", () => {
  it("converges both road edges at the same horizon and widens monotonically", () => {
    expect(roadEdge("left", 0)).toBe(360);
    expect(roadEdge("right", 0)).toBe(360);
    expect(roadEdge("left", 1)).toBe(180);
    expect(roadEdge("right", 1)).toBe(540);
    expect(roadEdge("left", .5)).toBeGreaterThan(roadEdge("left", 1));
    expect(roadEdge("right", .5)).toBeLessThan(roadEdge("right", 1));
  });

  it("uses the same horizon-to-screen-bottom projection for roadside anchors", () => {
    expect(streetGround(0)).toBe(600);
    expect(streetGround(1)).toBe(1280);
    expect(streetScale(1)).toBeCloseTo(.05);
    expect(facadeScale(.98)).toBeGreaterThan(1.5);
    expect(facadeScale(.98) / .98).toBeGreaterThan(1.55);
    expect(facadeScale(.2) / .2).toBeLessThan(1.13);
  });

  it("turns equal world-depth steps into progressively faster screen movement", () => {
    const screenY = (depth: number) => streetGround(streetScale(depth));
    const farMovement = screenY(.8) - screenY(.9);
    const middleMovement = screenY(.4) - screenY(.5);
    const nearMovement = screenY(0) - screenY(.1);

    expect(farMovement).toBeGreaterThan(0);
    expect(middleMovement).toBeGreaterThan(farMovement * 1.5);
    expect(nearMovement).toBeGreaterThan(middleMovement * 2);
  });

  it("sweeps buildings rapidly beyond the rider toward their screen edge", () => {
    const riderScale = streetScale(0);
    const passedScale = streetScale(-.1);

    expect(roadEdge("left", riderScale) - roadEdge("left", passedScale)).toBeGreaterThan(80);
    expect(roadEdge("right", passedScale) - roadEdge("right", riderScale)).toBeGreaterThan(80);
    expect(facadeScale(passedScale)).toBeGreaterThan(facadeScale(riderScale) * 1.25);
  });

  it("keeps request labels above their doors and legible at far depth", () => {
    const far = requestBubbleLayout("left", 220, 800, .05);
    const near = requestBubbleLayout("right", 500, 1120, .98);
    expect(far.scale).toBeGreaterThanOrEqual(.82);
    expect(far.scale).toBeLessThan(near.scale);
    expect(near.scale).toBeGreaterThan(1.15);
    expect(far.y).toBeLessThan(800);
    expect(near.y).toBeLessThan(1120);
    expect(far.x).toBeLessThan(220);
    expect(near.x).toBeGreaterThan(500);
    expect(requestBubbleLayout("left", 360, 90, .05).y).toBeGreaterThanOrEqual(116);
  });
});

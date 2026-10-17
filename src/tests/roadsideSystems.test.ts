import { describe, expect, it } from "vitest";
import { RoadSystem } from "../systems/RoadSystem";
import { HOUSE_TEMPLATES, RoadsideSystem } from "../systems/RoadsideSystem";

describe("procedural roadside layouts", () => {
  it("provides ten structurally distinct facade silhouettes", () => {
    expect(HOUSE_TEMPLATES).toHaveLength(10);
    expect(new Set(HOUSE_TEMPLATES.map(({ silhouette }) => silhouette)).size).toBe(10);
  });

  it("keeps a balanced, readable, non-mirrored street on both sides", () => {
    const road = new RoadSystem(10);
    const roadside = new RoadsideSystem(road.sections);
    const visible = [...road.sections].sort((a, b) => b.depth - a.depth);
    const left = visible.map((segment) => roadside.get(segment, "left"));
    const right = visible.map((segment) => roadside.get(segment, "right"));

    for (const side of [left, right]) {
      expect(side.filter((slot) => slot.type === "HOUSE")).toHaveLength(6);
      expect(new Set(side.map((slot) => slot.depthOffset)).size).toBeGreaterThanOrEqual(4);
      expect(side.every((slot) => slot.type !== "HOUSE" || (slot.house.doorVisible && slot.house.decorations.length <= 3))).toBe(true);
      expect(side.some((slot) => slot.type === "POLE")).toBe(true);
      const facades = side.flatMap((slot) => slot.type === "HOUSE" ? [slot.house] : []);
      for (let index = 1; index < facades.length; index++) {
        expect(facades[index].template).not.toBe(facades[index - 1].template);
      }
      expect(facades.every((house) => house.widthVariant >= -1 && house.widthVariant <= 1 && house.heightVariant >= -1 && house.heightVariant <= 1)).toBe(true);
      expect(facades.every((house) => house.roofVariant >= 0 && house.roofVariant <= 2 && house.doorVariant >= 0 && house.doorVariant <= 2)).toBe(true);
      expect(facades.every((house) => house.setback >= 8 && house.setback <= 22 && house.lineWeight >= .8 && house.lineWeight <= 1.52)).toBe(true);
      for (let index = 1; index < side.length; index++) {
        const previous = side[index - 1];
        const current = side[index];
        if (previous.type === "HOUSE" && current.type === "HOUSE") {
          expect(current.house.template).not.toBe(previous.house.template);
        }
        if (previous.type === "EMPTY_LOT" && current.type === "EMPTY_LOT") {
          throw new Error("empty lots must be separated by roadside scenery");
        }
      }
    }
    expect(left.map((slot) => slot.type).join(",")).not.toBe(right.map((slot) => slot.type).join(","));
    expect(left.filter((slot, index) => slot.type === "HOUSE" && right[index].type === "HOUSE").length).toBeLessThan(6);

    for (let index = 0; index < visible.length; index++) {
      const l = left[index];
      const r = right[index];
      expect(l.type === r.type && l.type !== "HOUSE").toBe(false);
      if (l.type === "HOUSE" && r.type === "HOUSE") expect(l.house.template).not.toBe(r.house.template);
    }
  });

  it("mixes short, medium, and long house gaps without repeating a fixed pattern", () => {
    const road = new RoadSystem(10);
    const roadside = new RoadsideSystem(road.sections);
    const signatures = new Set<string>();
    const gaps = new Set<number>();
    for (let cycle = 0; cycle < 8; cycle++) {
      for (const side of ["left", "right"] as const) {
        const houses = road.sections
          .map((segment, index) => ({ index, slot: roadside.get(segment, side) }))
          .filter(({ slot }) => slot.type === "HOUSE")
          .map(({ index }) => index);
        signatures.add(`${side}:${houses.join("-")}`);
        for (let index = 1; index < houses.length; index++) gaps.add(houses[index] - houses[index - 1]);
      }
      road.sections.forEach((segment, index) => segment.recycle(1 - index / 10));
    }
    expect(signatures.size).toBeGreaterThanOrEqual(10);
    expect(gaps.has(1)).toBe(true);
    expect(gaps.has(2)).toBe(true);
    expect(gaps.has(3)).toBe(true);
  });

  it("varies roadside objects as pooled sections recycle", () => {
    const road = new RoadSystem(10);
    const roadside = new RoadsideSystem(road.sections);
    const seen = new Set<string>();
    for (let cycle = 0; cycle < 5; cycle++) {
      road.update(10_000, 0.2);
      const types = road.sections.flatMap((segment) => [roadside.get(segment, "left").type, roadside.get(segment, "right").type]);
      types.forEach((type) => seen.add(type));
      expect(types.filter((type) => type === "HOUSE").length / types.length).toBeGreaterThanOrEqual(.55);
      expect(types.filter((type) => type === "HOUSE").length / types.length).toBeLessThanOrEqual(.65);
    }
    expect(seen).toEqual(new Set(["HOUSE", "EMPTY_LOT", "POLE", "TREE", "WALL", "PARKED_VEHICLE"]));
  });

  it("assigns every pooled house one of the six supplied artwork variants", () => {
    const road = new RoadSystem(10);
    const roadside = new RoadsideSystem(road.sections);
    const seen = new Set<string>();
    for (let cycle = 0; cycle < 6; cycle++) {
      for (const segment of road.sections) {
        for (const side of ["left", "right"] as const) {
          const slot = roadside.get(segment, side);
          if (slot.type === "HOUSE") {
            const artwork = (slot.house as unknown as { artwork?: string }).artwork;
            expect(artwork).toBeTruthy();
            seen.add(artwork!);
          }
        }
      }
      road.sections.forEach((segment, index) => segment.recycle(1 - index / 10));
    }
    expect(seen).toEqual(new Set(["courtyard", "hut", "kirana", "modern", "paan", "stall"]));
  });

  it("keeps twelve of twenty visible slots as houses during staggered recycling", () => {
    const road = new RoadSystem(10);
    const roadside = new RoadsideSystem(road.sections);
    for (let step = 0; step < 30; step++) {
      road.update(420, .2);
      const slots = road.sections.flatMap((segment) => [roadside.get(segment, "left"), roadside.get(segment, "right")]);
      expect(slots.filter((slot) => slot.type === "HOUSE")).toHaveLength(12);
      for (const segment of road.sections) {
        const left = roadside.get(segment, "left");
        const right = roadside.get(segment, "right");
        expect(left.type === right.type && left.type !== "HOUSE").toBe(false);
      }
    }
  });

  it("reuses a road segment while changing and resetting its facade assignment", () => {
    const road = new RoadSystem(10);
    const roadside = new RoadsideSystem(road.sections);
    const segment = road.sections[9];
    const initial = roadside.get(segment, "left");

    segment.recycle(1);
    const recycled = roadside.get(segment, "left");
    expect(recycled).not.toBe(initial);
    expect(recycled.type).toBe("HOUSE");
    if (initial.type === "HOUSE" && recycled.type === "HOUSE") {
      expect(recycled.house.template).not.toBe(initial.house.template);
    }

    segment.reset(.1);
    expect(roadside.get(segment, "left")).toEqual(initial);
  });
});

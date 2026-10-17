import { describe, expect, it } from "vitest";
import { PerspectiveProjector } from "../systems/PerspectiveProjector";
import { RoadSystem } from "../systems/RoadSystem";
import { NewspaperPool, paperFlightTarget } from "../objects/NewspaperPool";

describe("world systems", () => {
  it("projects distant objects near the horizon and near objects lower and larger", () => {
    const p = new PerspectiveProjector(720, 1280, 360);
    const far = p.project(1, 1);
    const near = p.project(1, 0.1);
    expect(far).toEqual({ x: 400, y: 452, scale: 0.1 });
    expect(near.x).toBe(760);
    expect(near.y).toBe(1280);
    expect(near.scale).toBe(1);
    expect(Object.values(near).every(Number.isFinite)).toBe(true);
  });

  it("recycles a fixed ten-section road without gaps", () => {
    const road = new RoadSystem(10);
    const identities = [...road.sections];
    road.update(10_000, 0.2);
    expect(road.sections).toHaveLength(10);
    expect(road.sections.every((s) => identities.includes(s))).toBe(true);
    expect(road.sections.every((s) => s.depth > -.18 && s.depth <= 1)).toBe(true);
    road.reset();
    expect(road.sections.map((s) => Number(s.depth.toFixed(3)))).toEqual([
      1, .882, .764, .646, .528, .41, .292, .174, .056, -.062,
    ]);
  });

  it("keeps a section alive past the rider and recycles only after its exit depth", () => {
    const road = new RoadSystem(1);
    const section = road.sections[0];

    road.update(5_500, .2);
    expect(section.depth).toBeCloseTo(-.1);
    expect(section.cycleCount).toBe(0);

    road.update(500, .2);
    expect(section.depth).toBeCloseTo(.98);
    expect(section.cycleCount).toBe(1);
  });

  it("moves by elapsed frame time rather than frame count", () => {
    const singleFrame = new RoadSystem(1);
    const splitFrames = new RoadSystem(1);

    singleFrame.update(1_000, .2);
    for (let frame = 0; frame < 10; frame++) splitFrames.update(100, .2);

    expect(splitFrames.sections[0].depth).toBeCloseTo(singleFrame.sections[0].depth, 8);
  });

  it("changes a street variant only when that section wraps", () => {
    const road = new RoadSystem(10);
    const far = road.sections[0];
    const near = road.sections[9];
    road.update(100, 0.2);
    expect(far.variant).toBe(0);
    expect(near.variant).toBe(0);
    road.update(700, 0.2);
    expect(far.variant).toBe(0);
    expect(near.variant).toBe(1);
  });

  it("reuses a fixed pool of four newspapers", () => {
    const pool = new NewspaperPool(4);
    const first = pool.throw("left", { x: 0, y: 0 });
    first.complete();
    expect(pool.throw("right", { x: 1, y: 1 })).toBe(first);
    pool.reset();
    expect(pool.activeCount).toBe(0);
  });

  it("flies pooled newspapers along a curved path and returns them", () => {
    const pool = new NewspaperPool(4);
    const paper = pool.throw("left", { x: 120, y: 500 });
    pool.update(240);
    expect(paper.x).toBeLessThan(360);
    expect(paper.y).toBeLessThan(910);
    expect(paper.rotation).toBeLessThan(0);
    pool.update(240);
    expect(paper.active).toBe(false);
  });

  it("aims successful papers at the door and missed papers beyond the swiped side", () => {
    const door = { x: 140, y: 520 };
    expect(paperFlightTarget("left", door, "success")).toEqual(door);
    expect(paperFlightTarget("left", door, "wrong-side")).toEqual({ x: -110, y: 690 });
    expect(paperFlightTarget("right", door, "unnecessary")).toEqual({ x: 830, y: 690 });
  });
});

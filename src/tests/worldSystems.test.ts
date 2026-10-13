import { describe, expect, it } from "vitest";
import { PerspectiveProjector } from "../systems/PerspectiveProjector";
import { RoadSystem } from "../systems/RoadSystem";
import { NewspaperPool } from "../objects/NewspaperPool";

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
    expect(road.sections.every((s) => s.depth > 0 && s.depth <= 1)).toBe(true);
    road.reset();
    expect(road.sections.map((s) => s.depth)).toEqual([1, .9, .8, .7, .6, .5, .4, .3, .2, .1]);
  });

  it("changes a street variant only when that section wraps", () => {
    const road = new RoadSystem(10);
    const far = road.sections[0];
    const near = road.sections[9];
    road.update(100, 0.2);
    expect(far.variant).toBe(0);
    expect(near.variant).toBe(0);
    road.update(500, 0.2);
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
});

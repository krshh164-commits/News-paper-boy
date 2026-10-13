import { afterEach, describe, expect, it, vi } from "vitest";
import { MORPH_TARGETS } from "./artwork";

const { timeline, timelineFactory } = vi.hoisted(() => {
  const timeline = {
    to: vi.fn().mockReturnThis(),
  };
  return {
    timeline,
    timelineFactory: vi.fn(() => timeline),
  };
});

vi.mock("gsap", () => ({
  gsap: {
    registerPlugin: vi.fn(),
    timeline: timelineFactory,
  },
}));

vi.mock("gsap/MorphSVGPlugin", () => ({
  MorphSVGPlugin: {},
}));

import { createMorphAnimation } from "./render/RiderView";

function makeSvg(): SVGSVGElement {
  const paths = Array.from({ length: 81 }, () => "<path d='M0 0' />").join("");
  return new DOMParser().parseFromString(
    `<svg xmlns="http://www.w3.org/2000/svg">${paths}</svg>`,
    "image/svg+xml",
  ).documentElement as unknown as SVGSVGElement;
}

describe("createMorphAnimation", () => {
  afterEach(() => {
    timeline.to.mockClear();
    timelineFactory.mockClear();
  });

  it("leaves the initial artwork static when reduced motion is requested", () => {
    expect(createMorphAnimation(makeSvg(), true)).toBeNull();
    expect(timelineFactory).not.toHaveBeenCalled();
  });

  it("coordinates a continuous pedal morph with a centered riding sway", () => {
    const svg = makeSvg();
    const result = createMorphAnimation(svg, false);

    expect(result).toBe(timeline);
    expect(timelineFactory).toHaveBeenCalledWith({
      repeat: -1,
      yoyo: true,
    });
    expect(timeline.to).toHaveBeenCalledTimes(MORPH_TARGETS.length + 2);

    MORPH_TARGETS.forEach(({ index, d }, callIndex) => {
      const [path, vars, position] = timeline.to.mock.calls[callIndex];
      expect(path).toBe(svg.querySelectorAll("path")[index]);
      expect(vars).toEqual({
        duration: 0.7,
        ease: "power2.inOut",
        morphSVG: { shape: d, type: "linear" },
      });
      expect(position).toBe(0);
    });

    expect(timeline.to.mock.calls[MORPH_TARGETS.length]).toEqual([
      svg,
      {
        duration: 0.35,
        ease: "power2.inOut",
        rotation: -0.6,
        transformOrigin: "50% 82%",
        x: -0.65,
        y: -1.5,
      },
      0,
    ]);
    expect(timeline.to.mock.calls[MORPH_TARGETS.length + 1]).toEqual([
      svg,
      {
        duration: 0.35,
        ease: "power2.inOut",
        rotation: 0.6,
        x: 0.65,
        y: 0,
      },
      0.35,
    ]);
  });
});

import { describe, expect, it } from "vitest";
import { INITIAL_SVG, MORPH_TARGETS } from "./artwork";
import { createMorphAnimation } from "./render/RiderView";

function parseSvg(markup: string): SVGSVGElement {
  return new DOMParser().parseFromString(markup, "image/svg+xml")
    .documentElement as unknown as SVGSVGElement;
}

describe("MorphSVG endpoint", () => {
  it("lands every changed path on the exact target geometry without changing fills", () => {
    const svg = parseSvg(INITIAL_SVG);
    const paths = svg.querySelectorAll("path");
    const initialFills = Array.from(paths, (path) => path.getAttribute("fill"));
    const timeline = createMorphAnimation(svg, false);

    expect(timeline).not.toBeNull();
    timeline?.seek(0.7, false);

    MORPH_TARGETS.forEach(({ index, d }) => {
      expect(paths[index].getAttribute("d")).toBe(d);
    });
    expect(Array.from(paths, (path) => path.getAttribute("fill"))).toEqual(
      initialFills,
    );
    expect(svg.style.transform).toBe(
      "translate(0.65px, 0px) rotate(0.6deg)",
    );

    timeline?.kill();
  });
});

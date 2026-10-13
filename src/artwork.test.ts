import { describe, expect, it } from "vitest";
import {
  CHANGED_PATH_INDICES,
  INITIAL_SVG,
  MORPH_TARGETS,
} from "./artwork";

function parseSvg(markup: string): SVGSVGElement {
  return new DOMParser().parseFromString(markup, "image/svg+xml")
    .documentElement as unknown as SVGSVGElement;
}

describe("artwork mapping", () => {
  it("uses the replacement 82 by 175 artwork as the source pose", () => {
    const svg = parseSvg(INITIAL_SVG);

    expect(svg.getAttribute("viewBox")).toBe("0 0 82 175");
    expect(svg.getAttribute("width")).toBe("82");
    expect(svg.querySelectorAll("path")).toHaveLength(81);
    expect(svg.querySelector("path")?.getAttribute("d")).toMatch(
      /^M32\.3814 3\.25442/,
    );
  });

  it("maps every replacement path to its matching target path", () => {
    expect(CHANGED_PATH_INDICES).toEqual(Array.from({ length: 81 }, (_, i) => i));
    expect(new Set(CHANGED_PATH_INDICES).size).toBe(81);
    expect(MORPH_TARGETS).toHaveLength(81);
    expect(MORPH_TARGETS.every(({ d }) => d.length > 0)).toBe(true);
  });
});

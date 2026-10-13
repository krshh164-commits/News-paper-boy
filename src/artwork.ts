import initialSvg from "./assets/group-42.svg?raw";
import targetSvg from "./assets/group-41.svg?raw";

export interface MorphTarget {
  readonly index: number;
  readonly d: string;
}

function readPaths(markup: string): string[] {
  const document = new DOMParser().parseFromString(markup, "image/svg+xml");
  return Array.from(document.querySelectorAll("path"), (path) =>
    path.getAttribute("d") ?? "",
  );
}

const initialPaths = readPaths(initialSvg);
const targetPaths = readPaths(targetSvg);

if (initialPaths.length !== targetPaths.length) {
  throw new Error(
    `SVG path count mismatch: ${initialPaths.length} !== ${targetPaths.length}`,
  );
}

export const INITIAL_SVG = initialSvg;

export const MORPH_TARGETS: readonly MorphTarget[] = initialPaths.flatMap(
  (d, index) => (d === targetPaths[index] ? [] : [{ index, d: targetPaths[index] }]),
);

export const CHANGED_PATH_INDICES = MORPH_TARGETS.map(({ index }) => index);

import type { StreetSegment } from "../objects/StreetSegment";

export type RoadsideSlotType = "HOUSE" | "EMPTY_LOT" | "POLE" | "TREE" | "WALL" | "PARKED_VEHICLE";
export type HouseArtworkId = "courtyard" | "hut" | "kirana" | "modern" | "paan" | "stall";
export type HouseTemplateId =
  | "awning-cottage" | "narrow-townhouse" | "family-balcony" | "tank-parapet" | "garden-gable"
  | "garage-house" | "corner-home" | "old-pipe-house" | "modern-geometric" | "shop-house";

export interface HouseTemplate {
  id: HouseTemplateId;
  silhouette: string;
  floors: 1 | 2;
  width: number;
  roof: "flat" | "parapet" | "gable" | "stepped";
  windows: 1 | 2 | 3;
  feature: "awning" | "balcony" | "water-tank" | "garden" | "garage" | "side-wall" | "pipes" | "geometric-balcony" | "storefront" | "steps";
  decorations: readonly string[];
}

export const HOUSE_TEMPLATES: readonly HouseTemplate[] = [
  { id: "awning-cottage", silhouette: "single-floor gable with deep awning and stoop", floors: 1, width: 132, roof: "gable", windows: 1, feature: "awning", decorations: ["steps", "awning"] },
  { id: "narrow-townhouse", silhouette: "tall narrow two-floor parapet", floors: 2, width: 104, roof: "parapet", windows: 1, feature: "pipes", decorations: ["antenna"] },
  { id: "family-balcony", silhouette: "wide two-floor house with projecting balcony", floors: 2, width: 174, roof: "flat", windows: 3, feature: "balcony", decorations: ["balcony", "planter"] },
  { id: "tank-parapet", silhouette: "two-floor flat roof with raised tank", floors: 2, width: 146, roof: "parapet", windows: 2, feature: "water-tank", decorations: ["water-tank", "pipe"] },
  { id: "garden-gable", silhouette: "single-floor pitched roof and planted setback", floors: 1, width: 152, roof: "gable", windows: 2, feature: "garden", decorations: ["tree", "low-wall"] },
  { id: "garage-house", silhouette: "wide single-floor roof over garage shutter", floors: 1, width: 184, roof: "flat", windows: 2, feature: "garage", decorations: ["shutter", "steps"] },
  { id: "corner-home", silhouette: "two-floor home with exposed side wall", floors: 2, width: 156, roof: "stepped", windows: 2, feature: "side-wall", decorations: ["side-wall", "pipe"] },
  { id: "old-pipe-house", silhouette: "uneven stepped roofline with drain pipes", floors: 2, width: 138, roof: "stepped", windows: 2, feature: "pipes", decorations: ["pipes", "antenna"] },
  { id: "modern-geometric", silhouette: "wide modern home with angular balcony", floors: 2, width: 178, roof: "flat", windows: 3, feature: "geometric-balcony", decorations: ["geometric-balcony", "large-glass"] },
  { id: "shop-house", silhouette: "two-floor residence above closed storefront", floors: 2, width: 168, roof: "parapet", windows: 2, feature: "storefront", decorations: ["storefront", "sign"] },
];

export interface HouseFacadeData {
  template: HouseTemplateId;
  artwork?: HouseArtworkId;
  widthVariant: number;
  heightVariant: number;
  roofVariant: number;
  doorVariant: number;
  windowVariant: number;
  balconyVariant: number;
  decorationVariant: number;
  setback: number;
  lineWeight: number;
  doorVisible: true;
  decorations: readonly string[];
}

export type RoadsideSlot =
  | { type: "HOUSE"; house: HouseFacadeData; setback: number; lineWeight: number; depthOffset: number }
  | { type: Exclude<RoadsideSlotType, "HOUSE">; decorationVariant: number; setback: number; lineWeight: number; depthOffset: number };

interface Assignment { cycle: number; left: RoadsideSlot; right: RoadsideSlot }

const NON_HOUSE_VARIANTS: readonly Exclude<RoadsideSlotType, "HOUSE">[] = ["TREE", "WALL", "PARKED_VEHICLE"];
export const HOUSE_ARTWORK_IDS: readonly HouseArtworkId[] = ["courtyard", "hut", "kirana", "modern", "paan", "stall"];
const DOUBLE_HOUSE_INDICES = new Set([1, 6, 9]);
const OPEN_BOTH_INDEX = 4;

function mix(value: number): number {
  let result = value | 0;
  result = Math.imul(result ^ result >>> 16, 0x45d9f3b);
  result = Math.imul(result ^ result >>> 16, 0x45d9f3b);
  return (result ^ result >>> 16) >>> 0;
}

function rankedIndices(count: number, cycle: number, sideIndex: number): number[] {
  return Array.from({ length: count }, (_, index) => index).sort((left, right) =>
    mix((left + 1) * 977 + (cycle + 1) * 619 + sideIndex * 1543) -
    mix((right + 1) * 977 + (cycle + 1) * 619 + sideIndex * 1543));
}

function isHouseSlotAt(index: number, cycleCount: number, sideIndex: number, segmentCount: number): boolean {
  if (segmentCount !== 10) {
    return rankedIndices(segmentCount, cycleCount, sideIndex)
      .slice(0, Math.round(segmentCount * .6)).includes(index);
  }
  if (DOUBLE_HOUSE_INDICES.has(index)) return true;
  if (index === OPEN_BOTH_INDEX) return false;
  const singles = Array.from({ length: segmentCount }, (_, index) => index)
    .filter((index) => !DOUBLE_HOUSE_INDICES.has(index) && index !== OPEN_BOTH_INDEX)
    .sort((left, right) => mix((left + 1) * 977 + (cycleCount + 1) * 619) - mix((right + 1) * 977 + (cycleCount + 1) * 619));
  const leftHouses = singles.slice(0, singles.length / 2);
  return sideIndex === 0 ? leftHouses.includes(index) : !leftHouses.includes(index);
}

function makeSlot(segment: StreetSegment, sideIndex: number, segmentCount: number): RoadsideSlot {
  const seed = mix((segment.index + 1) * 97 + (segment.cycleCount + 1) * 193 + sideIndex * 389);
  const setback = 8 + seed % 15;
  const lineWeight = 0.8 + (seed % 5) * 0.18;
  const jitterStep = (segment.index * 5 + segment.cycleCount * 3 + sideIndex * 2) % 9 - 4;
  const depthOffset = Number((jitterStep * .007).toFixed(3));
  if (!isHouseSlotAt(segment.index, segment.cycleCount, sideIndex, segmentCount)) {
    if (segmentCount === 10 && segment.index === OPEN_BOTH_INDEX) {
      const type = sideIndex === 0 ? "EMPTY_LOT" : "WALL";
      return { type, decorationVariant: seed % 4, setback, lineWeight, depthOffset };
    }
    const nonHouseSingles = Array.from({ length: segmentCount }, (_, index) => index)
      .filter((index) => index !== OPEN_BOTH_INDEX)
      .filter((index) => !isHouseSlotAt(index, segment.cycleCount, sideIndex, segmentCount));
    const position = nonHouseSingles.indexOf(segment.index);
    const type = position === 0 ? "EMPTY_LOT" : position === 1 ? "POLE"
      : NON_HOUSE_VARIANTS[(segment.cycleCount * 2 + sideIndex + position) % NON_HOUSE_VARIANTS.length];
    return { type, decorationVariant: seed % 4, setback, lineWeight, depthOffset };
  }
  const templateIndex = (segment.index * 3 + segment.cycleCount * 7 + sideIndex * 5) % HOUSE_TEMPLATES.length;
  const definition = HOUSE_TEMPLATES[templateIndex];
  return {
    type: "HOUSE",
    setback,
    lineWeight,
    depthOffset,
    house: {
      template: definition.id,
      artwork: HOUSE_ARTWORK_IDS[templateIndex % HOUSE_ARTWORK_IDS.length],
      widthVariant: seed % 3 - 1,
      heightVariant: Math.floor(seed / 3) % 3 - 1,
      roofVariant: Math.floor(seed / 7) % 3,
      doorVariant: Math.floor(seed / 11) % 3,
      windowVariant: Math.floor(seed / 13) % 3,
      balconyVariant: Math.floor(seed / 17) % 3,
      decorationVariant: Math.floor(seed / 19) % 4,
      setback,
      lineWeight,
      doorVisible: true,
      decorations: definition.decorations.slice(0, 1 + (seed % 2)),
    },
  };
}

export class RoadsideSystem {
  private readonly assignments = new WeakMap<StreetSegment, Assignment>();
  constructor(private readonly segments: readonly StreetSegment[]) {}
  get(segment: StreetSegment, side: "left" | "right"): RoadsideSlot {
    let assigned = this.assignments.get(segment);
    if (!assigned || assigned.cycle !== segment.cycleCount) {
      const left = makeSlot(segment, 0, this.segments.length);
      const right = makeSlot(segment, 1, this.segments.length);
      assigned = { cycle: segment.cycleCount, left, right };
      this.assignments.set(segment, assigned);
    }
    return assigned[side];
  }
  reset(): void {
    for (const segment of this.segments) this.assignments.delete(segment);
  }
}

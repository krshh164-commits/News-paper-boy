import type { StreetSegment } from "../objects/StreetSegment";

export type RoadsideSlotType = "HOUSE" | "EMPTY_LOT" | "POLE" | "TREE" | "WALL" | "PARKED_VEHICLE";
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
  | { type: "HOUSE"; house: HouseFacadeData; setback: number; lineWeight: number }
  | { type: Exclude<RoadsideSlotType, "HOUSE">; decorationVariant: number; setback: number; lineWeight: number };

interface Assignment { cycle: number; left: RoadsideSlot; right: RoadsideSlot }

const SLOT_PATTERN: readonly RoadsideSlotType[] = ["HOUSE", "HOUSE", "EMPTY_LOT", "HOUSE", "POLE", "HOUSE", "POLE", "HOUSE", "EMPTY_LOT", "HOUSE"];

function makeSlot(segment: StreetSegment, sideIndex: number): RoadsideSlot {
  const templateIndex = (segment.index + segment.cycleCount * 2 + sideIndex * 5) % HOUSE_TEMPLATES.length;
  const baseType = SLOT_PATTERN[templateIndex];
  const seed = (segment.index + 1) * 97 + (segment.cycleCount + 1) * 193 + sideIndex * 389;
  const setback = 8 + seed % 15;
  const lineWeight = 0.8 + (seed % 5) * 0.18;
  if (baseType !== "HOUSE") {
    const type = templateIndex === 6
      ? segment.cycleCount === 0 ? "POLE" : (["POLE", "TREE", "WALL", "PARKED_VEHICLE"] as const)[(segment.index + segment.cycleCount) % 4]
      : baseType;
    return { type, decorationVariant: (segment.index + segment.cycleCount + sideIndex) % 4, setback, lineWeight };
  }
  const definition = HOUSE_TEMPLATES[templateIndex];
  return {
    type: "HOUSE",
    setback,
    lineWeight,
    house: {
      template: definition.id,
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
      assigned = { cycle: segment.cycleCount, left: makeSlot(segment, 0), right: makeSlot(segment, 1) };
      this.assignments.set(segment, assigned);
    }
    return assigned[side];
  }
  reset(): void {
    for (const segment of this.segments) this.assignments.set(segment, { cycle: segment.cycleCount, left: makeSlot(segment, 0), right: makeSlot(segment, 1) });
  }
}

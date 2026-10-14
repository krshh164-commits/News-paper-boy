export const DELIVERY_PASS_DEPTH = .1;
export const POPUP_REACTION_SECONDS = 1.8;

export interface UpcomingHouse {
  depth: number;
  hasDoor: boolean;
}

export function popupTriggerDepth(speed: number, reactionSeconds = POPUP_REACTION_SECONDS): number {
  return DELIVERY_PASS_DEPTH + Math.max(0, speed) * Math.max(0, reactionSeconds);
}

export function selectUpcomingHouse<T extends UpcomingHouse>(houses: readonly T[], triggerDepth: number): T | null {
  return houses
    .filter((house) => house.hasDoor && house.depth > triggerDepth)
    .reduce<T | null>((closest, house) => closest === null || house.depth < closest.depth ? house : closest, null);
}

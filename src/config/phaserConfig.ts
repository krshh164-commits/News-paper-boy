import { GAME } from "./gameConfig";
export function createGameConfigBase(parent: HTMLElement) {
  return { width: GAME.width, height: GAME.height, parent, backgroundColor: "#f7f5ef" } as const;
}

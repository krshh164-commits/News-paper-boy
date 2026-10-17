import type Phaser from "phaser";
import courtyardUrl from "../../homes/h4.png?url";
import hutUrl from "../../homes/h2-0.png?url";
import kiranaUrl from "../../homes/h10.png?url";
import modernUrl from "../../homes/Removed Background-0 (1).png?url";
import paanUrl from "../../homes/Removed Background-0.png?url";
import stallUrl from "../../homes/Removed Background-0 (2).png?url";
import { HOUSE_TEMPLATES, type HouseArtworkId, type HouseFacadeData, type HouseTemplate } from "../systems/RoadsideSystem";

export interface FacadeRect { x: number; y: number; width: number; height: number }
export interface FacadePoint { x: number; y: number }
export interface HouseFacadePlan {
  width: number;
  height: number;
  body: FacadePoint[];
  door: FacadeRect | null;
  windows: FacadeRect[];
  feature: HouseTemplate["feature"];
  roof: HouseTemplate["roof"];
  lineWeight: number;
  windowVariant: number;
  balconyVariant: number;
}

export interface HouseArtworkDefinition {
  id: HouseArtworkId;
  textureKey: string;
  url: string;
  naturalWidth: number;
  naturalHeight: number;
  worldWidth: number;
  baseY: number;
  doorCenterX: number;
  doorTop: number;
  doorBottom: number;
  doorWidth: number;
}

export interface HouseArtworkPlan {
  textureKey: string;
  url: string;
  x: number;
  width: number;
  height: number;
  originX: 0 | 1;
  originY: number;
  flipX: boolean;
  door: FacadeRect;
}

export const HOUSE_ARTWORKS: readonly HouseArtworkDefinition[] = [
  { id: "courtyard", textureKey: "house-courtyard", url: courtyardUrl, naturalWidth: 470, naturalHeight: 519, worldWidth: 184, baseY: .98, doorCenterX: .684, doorTop: .664, doorBottom: .893, doorWidth: .14 },
  { id: "hut", textureKey: "house-hut", url: hutUrl, naturalWidth: 432, naturalHeight: 401, worldWidth: 178, baseY: .955, doorCenterX: .525, doorTop: .54, doorBottom: .94, doorWidth: .19 },
  { id: "kirana", textureKey: "house-kirana", url: kiranaUrl, naturalWidth: 538, naturalHeight: 508, worldWidth: 188, baseY: .98, doorCenterX: .303, doorTop: .681, doorBottom: .976, doorWidth: .14 },
  { id: "modern", textureKey: "house-modern", url: modernUrl, naturalWidth: 1024, naturalHeight: 1024, worldWidth: 198, baseY: .905, doorCenterX: .49, doorTop: .58, doorBottom: .77, doorWidth: .12 },
  { id: "paan", textureKey: "house-paan", url: paanUrl, naturalWidth: 517, naturalHeight: 429, worldWidth: 186, baseY: .984, doorCenterX: .563, doorTop: .604, doorBottom: .876, doorWidth: .12 },
  { id: "stall", textureKey: "house-stall", url: stallUrl, naturalWidth: 626, naturalHeight: 352, worldWidth: 180, baseY: .94, doorCenterX: .48, doorTop: .33, doorBottom: .85, doorWidth: .42 },
];

export function createHouseArtworkPlan(artwork: HouseArtworkId, side: "left" | "right", scale: number, widthVariant: number): HouseArtworkPlan {
  const definition = HOUSE_ARTWORKS.find(({ id }) => id === artwork) ?? HOUSE_ARTWORKS[0];
  const width = Math.max(0, (definition.worldWidth + widthVariant * 12) * scale);
  const height = width * definition.naturalHeight / definition.naturalWidth;
  const naturalDoorAtStreet = side === "left" ? definition.doorCenterX >= .5 : definition.doorCenterX <= .5;
  const flipX = !naturalDoorAtStreet;
  const doorCenter = flipX ? 1 - definition.doorCenterX : definition.doorCenterX;
  const x = side === "left" ? -width : 0;
  return {
    textureKey: definition.textureKey,
    url: definition.url,
    x,
    width,
    height,
    originX: side === "left" ? 1 : 0,
    originY: definition.baseY,
    flipX,
    door: {
      x: x + (doorCenter - definition.doorWidth / 2) * width,
      y: (definition.doorTop - definition.baseY) * height,
      width: definition.doorWidth * width,
      height: (definition.doorBottom - definition.doorTop) * height,
    },
  };
}

export function createHouseFacadePlan(data: HouseFacadeData, side: "left" | "right", scale: number): HouseFacadePlan {
  const template = HOUSE_TEMPLATES.find((item) => item.id === data.template)!;
  const width = Math.max(0, (template.width + data.widthVariant * 12) * scale);
  const floorHeight = (126 + data.heightVariant * 9) * scale;
  const height = floorHeight * template.floors;
  const sign = side === "left" ? -1 : 1;
  const x = (value: number) => sign * width * value;
  const roofLift = (data.roofVariant - 1) * floorHeight * .025;
  const body = (() => {
    switch (template.roof) {
      case "gable": return [
        { x: x(1), y: 0 }, { x: x(1), y: -height * .77 },
        { x: x(.5), y: -height - roofLift }, { x: 0, y: -height * .77 }, { x: 0, y: 0 },
      ];
      case "parapet": return [
        { x: x(1), y: 0 }, { x: x(1), y: -height * .9 },
        { x: x(.84), y: -height * .9 }, { x: x(.84), y: -height - roofLift },
        { x: 0, y: -height - roofLift }, { x: 0, y: 0 },
      ];
      case "stepped": return [
        { x: x(1), y: 0 }, { x: x(1), y: -height * .77 },
        { x: x(.73), y: -height * .77 }, { x: x(.73), y: -height * .92 },
        { x: x(.3), y: -height * .92 }, { x: x(.3), y: -height - roofLift },
        { x: 0, y: -height - roofLift }, { x: 0, y: 0 },
      ];
      default: return [
        { x: x(1), y: 0 }, { x: x(1), y: -height },
        { x: 0, y: -height }, { x: 0, y: 0 },
      ];
    }
  })();
  const doorWidth = width * .18;
  const doorHeight = Math.min(height * .43, floorHeight * .64);
  const doorInset = Math.min(width - doorWidth, width * (data.doorVariant % 3) * .035);
  const door = data.doorVisible && doorWidth >= 6 && doorHeight >= 6
    ? { x: side === "left" ? -doorInset - doorWidth : doorInset, y: -doorHeight, width: doorWidth, height: doorHeight }
    : null;
  const windows: FacadeRect[] = [];
  const windowWidth = width * (data.windowVariant === 2 ? .21 : .17);
  const windowHeight = floorHeight * .25;
  if (windowWidth >= 6 && windowHeight >= 6) {
    for (let floor = 0; floor < template.floors; floor++) {
      for (let column = 0; column < template.windows; column++) {
        const fraction = (column + 1) / (template.windows + 1);
        const windowX = x(fraction);
        windows.push({
          x: side === "left" ? windowX - windowWidth : windowX,
          y: -(floor + .67) * floorHeight - windowHeight / 2,
          width: windowWidth,
          height: windowHeight,
        });
      }
    }
  }
  return {
    width, height, body, door, windows, feature: template.feature, roof: template.roof,
    lineWeight: data.lineWeight, windowVariant: data.windowVariant, balconyVariant: data.balconyVariant,
  };
}

export class HouseFacade {
  constructor(readonly data: HouseFacadeData) {}

  draw(graphics: Phaser.GameObjects.Graphics, anchor: FacadePoint, scale: number, side: "left" | "right"): void {
    const plan = createHouseFacadePlan(this.data, side, scale);
    if (plan.width < 3 || plan.height < 3) return;
    const distant = scale < .28;
    const ink = distant ? 0x777777 : 0x171717;
    const alpha = distant ? .75 : 1;
    const stroke = Math.max(.7, plan.lineWeight * (.5 + scale * 1.2));
    const points = plan.body.map((point) => ({ x: anchor.x + point.x, y: anchor.y + point.y }));

    const facadeTones = [0xf8f7f2, 0xe8e9e6, 0xf2f0eb, 0xe1e3e1, 0xf5f4ef, 0xeaebe8];
    const templateIndex = Math.max(0, HOUSE_TEMPLATES.findIndex((item) => item.id === this.data.template));
    graphics.fillStyle(facadeTones[templateIndex % facadeTones.length], distant ? .82 : 1);
    graphics.beginPath();
    graphics.moveTo(points[0].x, points[0].y);
    for (const point of points.slice(1)) graphics.lineTo(point.x, point.y);
    graphics.closePath();
    graphics.fillPath();
    graphics.lineStyle(stroke, ink, alpha);
    graphics.beginPath();
    graphics.moveTo(points[0].x, points[0].y);
    for (const point of points.slice(1)) graphics.lineTo(point.x, point.y);
    graphics.strokePath();

    const rect = (shape: FacadeRect, fill = false) => {
      const px = anchor.x + shape.x;
      const py = anchor.y + shape.y;
      if (fill) graphics.fillStyle(0xfaf9f4, 1).fillRect(px, py, shape.width, shape.height);
      graphics.lineStyle(stroke, ink, alpha).strokeRect(px, py, shape.width, shape.height);
    };
    if (plan.door) {
      const doorX = anchor.x + plan.door.x;
      const doorY = anchor.y + plan.door.y;
      graphics.fillStyle(ink, 1).fillRect(doorX, doorY, plan.door.width, plan.door.height);
      if (plan.door.width > 4 && plan.door.height > 4) {
        graphics.lineStyle(Math.max(.6, stroke * .65), 0xfaf9f4, 1)
          .strokeRect(doorX + 1.5, doorY + 1.5, plan.door.width - 3, plan.door.height - 3);
      }
      const knobX = side === "left" ? anchor.x + plan.door.x + plan.door.width * .82 : anchor.x + plan.door.x + plan.door.width * .18;
      graphics.fillStyle(0xfaf9f4, 1).fillCircle(knobX, anchor.y - plan.door.height * .45, Math.max(.8, scale * 2));
    }
    for (const window of plan.windows) {
      rect(window, true);
      if (window.width < 12 || window.height < 12) continue;
      graphics.lineStyle(Math.max(.6, stroke * .7), ink, alpha).beginPath();
      if (plan.windowVariant === 1) {
        graphics.moveTo(anchor.x + window.x + window.width * .25, anchor.y + window.y);
        graphics.lineTo(anchor.x + window.x + window.width * .25, anchor.y + window.y + window.height);
        graphics.moveTo(anchor.x + window.x + window.width * .75, anchor.y + window.y);
        graphics.lineTo(anchor.x + window.x + window.width * .75, anchor.y + window.y + window.height);
      } else if (plan.windowVariant === 2) {
        graphics.moveTo(anchor.x + window.x + window.width * .18, anchor.y + window.y + window.height * .72);
        graphics.lineTo(anchor.x + window.x + window.width * .82, anchor.y + window.y + window.height * .28);
      } else {
        graphics.moveTo(anchor.x + window.x + window.width / 2, anchor.y + window.y);
        graphics.lineTo(anchor.x + window.x + window.width / 2, anchor.y + window.y + window.height);
        graphics.moveTo(anchor.x + window.x, anchor.y + window.y + window.height / 2);
        graphics.lineTo(anchor.x + window.x + window.width, anchor.y + window.y + window.height / 2);
      }
      graphics.strokePath();
    }
    this.drawRoofDetails(graphics, anchor, plan, side, ink, alpha, stroke);
    this.drawFeature(graphics, anchor, plan, side, ink, alpha, stroke, scale);
  }

  private drawRoofDetails(g: Phaser.GameObjects.Graphics, anchor: FacadePoint, plan: HouseFacadePlan, side: "left" | "right", ink: number, alpha: number, stroke: number): void {
    const left = side === "left" ? anchor.x - plan.width : anchor.x;
    const top = anchor.y - plan.height;
    if (plan.roof === "gable") {
      g.lineStyle(stroke, ink, alpha).beginPath();
      g.moveTo(left, anchor.y - plan.height * .77); g.lineTo((left + anchor.x) / 2, top); g.lineTo(anchor.x, anchor.y - plan.height * .77); g.strokePath();
    } else if (plan.roof === "parapet") {
      const outward = side === "left" ? -1 : 1;
      g.lineStyle(stroke, ink, alpha).beginPath();
      g.moveTo(anchor.x + outward * plan.width * .16, anchor.y - plan.height * .9);
      g.lineTo(anchor.x + outward * plan.width * .16, top);
      g.lineTo(anchor.x, top); g.strokePath();
    } else if (plan.roof === "stepped") {
      const outward = side === "left" ? -1 : 1;
      g.lineStyle(stroke, ink, alpha).beginPath();
      g.moveTo(anchor.x + outward * plan.width * .27, anchor.y - plan.height * .77);
      g.lineTo(anchor.x + outward * plan.width * .27, anchor.y - plan.height * .92);
      g.lineTo(anchor.x + outward * plan.width * .7, anchor.y - plan.height * .92); g.strokePath();
    }
  }

  private drawFeature(g: Phaser.GameObjects.Graphics, anchor: FacadePoint, plan: HouseFacadePlan, side: "left" | "right", ink: number, alpha: number, stroke: number, scale: number): void {
    const outer = side === "left" ? anchor.x - plan.width : anchor.x + plan.width;
    const sign = side === "left" ? -1 : 1;
    const top = anchor.y - plan.height;
    const detail = (width: number, height: number) => width >= 6 && height >= 6;
    const poly = (points: FacadePoint[], fill = false) => {
      g.beginPath(); g.moveTo(points[0].x, points[0].y);
      for (const point of points.slice(1)) g.lineTo(point.x, point.y);
      g.closePath(); if (fill) g.fillStyle(0xfaf9f4, 1).fillPath();
      g.lineStyle(stroke, ink, alpha).strokePath();
    };
    const awning = () => {
      const width = plan.width * .42;
      const x0 = side === "left" ? anchor.x - width : anchor.x;
      const y = anchor.y - (plan.door?.height ?? plan.height * .35) - 4 * scale;
      if (detail(width, 8 * scale)) poly([{ x: x0, y }, { x: x0 + width, y }, { x: x0 + width - 4 * scale, y: y + 10 * scale }, { x: x0 - 4 * scale, y: y + 10 * scale }], true);
    };
    switch (plan.feature) {
      case "awning": awning(); this.drawSteps(g, anchor, plan, side, ink, alpha, stroke, scale); break;
      case "balcony": this.drawBalcony(g, anchor, plan, side, ink, alpha, stroke, scale, false); break;
      case "geometric-balcony": this.drawBalcony(g, anchor, plan, side, ink, alpha, stroke, scale, true); break;
      case "water-tank":
        if (detail(26 * scale, 23 * scale)) {
          const x = side === "left" ? anchor.x - plan.width * .7 : anchor.x + plan.width * .45;
          g.fillStyle(0xfaf9f4, 1).fillRect(x, top - 24 * scale, 26 * scale, 22 * scale);
          g.lineStyle(stroke, ink, alpha).strokeRect(x, top - 24 * scale, 26 * scale, 22 * scale);
          g.lineStyle(stroke, ink, alpha).beginPath().moveTo(x - 2 * scale, top - 24 * scale).lineTo(x + 28 * scale, top - 24 * scale).strokePath();
        }
        break;
      case "garden":
        if (detail(20 * scale, 24 * scale)) {
          const x = outer + sign * 14 * scale;
          g.lineStyle(stroke, ink, alpha).beginPath().moveTo(x, anchor.y).lineTo(x, anchor.y - 22 * scale).strokePath();
          g.lineStyle(stroke, ink, alpha).strokeCircle(x, anchor.y - 27 * scale, 9 * scale);
          g.lineStyle(stroke, ink, alpha).beginPath().moveTo(outer, anchor.y + 2 * scale).lineTo(outer + sign * 28 * scale, anchor.y + 2 * scale).strokePath();
        }
        break;
      case "garage":
        if (detail(plan.width * .43, plan.height * .42)) {
          const x = side === "left" ? anchor.x - plan.width * .76 : anchor.x + plan.width * .32;
          const y = anchor.y - plan.height * .42;
          g.fillStyle(0xfaf9f4, 1).fillRect(x, y, plan.width * .42, plan.height * .4);
          g.lineStyle(stroke, ink, alpha).strokeRect(x, y, plan.width * .42, plan.height * .4);
          for (let row = 1; row < 4; row++) {
            g.lineStyle(Math.max(.6, stroke * .7), ink, alpha).beginPath().moveTo(x, y + row * plan.height * .1).lineTo(x + plan.width * .42, y + row * plan.height * .1).strokePath();
          }
        }
        break;
      case "side-wall": {
        const wallW = 14 * scale;
        if (detail(wallW, plan.height * .8)) {
          const x = side === "left" ? outer - wallW : outer;
          poly([{ x, y: anchor.y }, { x: x + sign * wallW, y: anchor.y - 9 * scale }, { x: x + sign * wallW, y: top + 10 * scale }, { x, y: top }], true);
        }
        break;
      }
      case "pipes":
        if (plan.height * .7 >= 6) {
          const x = outer + sign * 7 * scale;
          const pipeWidth = Math.max(.8, 2 * scale);
          g.lineStyle(Math.max(pipeWidth, stroke * .8), ink, alpha).beginPath().moveTo(x, top).lineTo(x, anchor.y).lineTo(x + sign * 5 * scale, anchor.y).strokePath();
          if (this.data.decorations.includes("antenna") && 22 * scale >= 6) {
            g.lineStyle(stroke, ink, alpha).beginPath().moveTo(x, top).lineTo(x, top - 22 * scale).moveTo(x - 7 * scale, top - 14 * scale).lineTo(x + 7 * scale, top - 14 * scale).strokePath();
          }
        }
        break;
      case "storefront": {
        const width = plan.width * .46; const height = plan.height * .28;
        const x = side === "left" ? anchor.x - plan.width * .7 : anchor.x + plan.width * .24;
        const y = anchor.y - height;
        if (detail(width, height)) {
          g.fillStyle(0xfaf9f4, 1).fillRect(x, y, width, height);
          g.lineStyle(stroke, ink, alpha).strokeRect(x, y, width, height);
          for (let index = 1; index < 5; index++) g.lineStyle(Math.max(.6, stroke * .75), ink, alpha).beginPath().moveTo(x, y + index * height / 5).lineTo(x + width, y + index * height / 5).strokePath();
          g.lineStyle(stroke, ink, alpha).strokeRect(x, y - 11 * scale, width, 8 * scale);
        }
        break;
      }
    }
    if (this.data.decorations.includes("planter") && detail(18 * scale, 6 * scale)) {
      const x = side === "left" ? anchor.x - plan.width * .55 : anchor.x + plan.width * .4;
      g.lineStyle(stroke, ink, alpha).strokeRect(x, top + plan.height * .53, 18 * scale, 6 * scale);
    }
  }

  private drawBalcony(g: Phaser.GameObjects.Graphics, anchor: FacadePoint, plan: HouseFacadePlan, side: "left" | "right", ink: number, alpha: number, stroke: number, scale: number, geometric: boolean): void {
    const width = plan.width * (plan.balconyVariant % 2 ? .58 : .68); const height = (plan.balconyVariant % 3 ? 22 : 18) * scale;
    if (width < 6 || height < 6) return;
    const x = side === "left" ? anchor.x - plan.width * .83 : anchor.x + plan.width * .15;
    const y = anchor.y - plan.height * .55;
    g.lineStyle(stroke, ink, alpha).beginPath();
    if (geometric) {
      g.moveTo(x, y); g.lineTo(x + width * .16, y + height); g.lineTo(x + width, y + height * .78); g.lineTo(x + width * .85, y - 2 * scale); g.strokePath();
    } else {
      g.moveTo(x, y + height).lineTo(x + width, y + height).moveTo(x, y).lineTo(x + width, y).strokePath();
    }
    for (let index = 1; index < 5; index++) {
      const bx = x + index * width / 5;
      g.lineStyle(Math.max(.65, stroke * .7), ink, alpha).beginPath().moveTo(bx, y).lineTo(bx, y + height).strokePath();
    }
  }

  private drawSteps(g: Phaser.GameObjects.Graphics, anchor: FacadePoint, plan: HouseFacadePlan, side: "left" | "right", ink: number, alpha: number, stroke: number, scale: number): void {
    const width = 22 * scale;
    if (width < 6 || !plan.door) return;
    const x = side === "left" ? anchor.x + plan.door.x - 3 * scale : anchor.x + plan.door.x + plan.door.width - width + 3 * scale;
    for (let step = 1; step <= 2; step++) {
      const offset = step * 5 * scale;
      g.lineStyle(stroke, ink, alpha).beginPath().moveTo(x - (side === "left" ? -offset : offset), anchor.y + offset).lineTo(x + width - (side === "left" ? -offset : offset), anchor.y + offset).strokePath();
    }
  }
}

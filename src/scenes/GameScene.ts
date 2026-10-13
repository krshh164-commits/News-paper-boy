import Phaser from "phaser";
import { GAME } from "../config/gameConfig";
import { GameSession } from "../core/GameSession";
import { SwipeInput } from "../systems/SwipeInput";
import { RoadSystem } from "../systems/RoadSystem";
import { difficultyAt } from "../systems/DifficultySystem";
import { createGameConfigBase } from "../config/phaserConfig";
import { NewspaperPool } from "../objects/NewspaperPool";
import { HouseFacade, createHouseFacadePlan } from "../objects/HouseFacade";
import type { HouseFacadeData, RoadsideSlot } from "../systems/RoadsideSystem";
import { RoadsideSystem } from "../systems/RoadsideSystem";
import { facadeScale, roadEdge, requestBubbleLayout, streetGround, streetScale } from "../systems/StreetProjection";
import { DELIVERY_PASS_DEPTH, popupTriggerDepth, selectUpcomingHouse } from "../systems/DeliveryWindow";
import type { StreetSegment } from "../objects/StreetSegment";

export function createGameConfig(parent: HTMLElement): Phaser.Types.Core.GameConfig {
  return {
    ...createGameConfigBase(parent),
    type: Phaser.AUTO,
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: [GameScene],
    render: { antialias: true, pixelArt: false },
  };
}

export class GameScene extends Phaser.Scene {
  private ink!: Phaser.GameObjects.Graphics;
  private requestBubble!: Phaser.GameObjects.Graphics;
  private requestBubbleText!: Phaser.GameObjects.Text;
  private readonly road = new RoadSystem(10);
  private readonly roadside = new RoadsideSystem(this.road.sections);
  private readonly session = new GameSession(localStorage);
  private readonly swipe = new SwipeInput(GAME.swipeThreshold);
  private readonly newspapers = new NewspaperPool(4);
  private readonly houseViews = new WeakMap<HouseFacadeData, HouseFacade>();
  private deliverySegment: StreetSegment | null = null;
  private deliveryCycle: number | null = null;
  private paperSprites: Phaser.GameObjects.Rectangle[] = [];
  private elapsed = 0;
  private requestDelay = 1000;
  private nextSide: "left" | "right" = "left";
  private failureReason = "";

  constructor() { super("game"); }
  create(): void {
    this.ink = this.add.graphics();
    this.requestBubble = this.add.graphics().setDepth(30).setVisible(false);
    this.requestBubbleText = this.add.text(0, 0, "paper", {
      fontFamily: "Arial, sans-serif", fontSize: "22px", fontStyle: "bold", color: "#ffffff",
    }).setOrigin(.5).setDepth(31).setVisible(false);
    this.paperSprites = this.newspapers.items.map(() => this.add.rectangle(360, 910, 42, 28, 0xffffff).setStrokeStyle(4, 0x171717).setDepth(20).setVisible(false));
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      if (this.session.state === "READY") this.startRun();
      this.swipe.begin(p.id, p.x, p.y);
    });
    this.input.on("pointerup", (p: Phaser.Input.Pointer) => {
      const side = this.swipe.end(p.id, p.x, p.y);
      if (!side || this.session.state !== "PLAYING") return;
      const outcome = this.session.throw(side);
      this.deliverySegment = null;
      this.deliveryCycle = null;
      if (outcome === "success") {
        this.throwPaper(side);
        window.dispatchEvent(new CustomEvent("paper-route-feedback", { detail: { kind: "success", points: 10 } }));
      }
      window.dispatchEvent(new CustomEvent("paper-route-rider", { detail: outcome === "success" ? `throw-${side}` : "fail" }));
      if (outcome === "success") this.requestDelay = difficultyAt(this.elapsed).requestGapMs;
      this.emitState(outcome);
    });
    this.emitState();
  }
  update(_time: number, delta: number): void {
    if (this.session.state === "PLAYING") {
      this.elapsed += delta;
      const difficulty = difficultyAt(this.elapsed);
      this.session.update(delta);
      this.newspapers.update(delta);
      if (!this.session.delivery.active) this.requestDelay = Math.max(0, this.requestDelay - delta);
      this.road.update(delta, difficulty.speed);

      if (this.deliverySegment && this.deliveryCycle !== this.deliverySegment.cycleCount) {
        if (this.session.delivery.active) this.session.setTargetDepth(DELIVERY_PASS_DEPTH);
        this.deliverySegment = null;
        this.deliveryCycle = null;
      } else if (this.session.delivery.active && this.deliverySegment) {
        this.session.setTargetDepth(this.deliverySegment.depth);
      }

      if (this.session.snapshot().state === "GAME_OVER") {
        this.deliverySegment = null;
        this.deliveryCycle = null;
        this.failureReason = "missed";
        window.dispatchEvent(new CustomEvent("paper-route-rider", { detail: "fail" }));
      } else if (!this.session.delivery.active && this.requestDelay <= 0) {
        const triggerDepth = popupTriggerDepth(difficulty.speed);
        if (!this.deliverySegment) this.stageDeliveryHouse(this.nextSide, triggerDepth);
        if (this.deliverySegment && this.deliverySegment.depth <= triggerDepth) {
          this.session.schedule(this.nextSide, this.deliverySegment.depth, DELIVERY_PASS_DEPTH);
          this.nextSide = this.nextSide === "left" ? "right" : "left";
        }
      }
      this.emitState();
    }
    this.syncPapers();
    this.drawWorld();
  }
  restart(): void {
    this.tweens.killAll();
    this.session.restart(); this.road.reset(); this.roadside.reset(); this.newspapers.reset(); this.paperSprites.forEach((paper) => paper.setVisible(false));
    this.deliverySegment = null; this.deliveryCycle = null;
    this.swipe.reset(); this.elapsed = 0; this.requestDelay = 900; this.nextSide = "left"; this.failureReason = "";
    window.dispatchEvent(new CustomEvent("paper-route-rider-reset")); this.emitState();
  }
  startRun(): void { this.session.start(); this.emitState(); }
  private emitState(reason?: string): void {
    if (reason && this.session.state === "GAME_OVER") this.failureReason = reason;
    window.dispatchEvent(new CustomEvent("paper-route-state", { detail: { ...this.session.snapshot(), best: this.session.bestScore, reason: this.failureReason } }));
  }
  private drawWorld(): void {
    const g = this.ink; g.clear();
    g.fillStyle(0xf7f5ef, 1); g.fillRect(0, 0, 720, 1280);
    this.drawPerspectiveRoad(g);
    this.drawContinuousSidewalks(g);

    const ordered = [...this.road.sections].sort((a, b) => b.depth - a.depth);
    const poles = this.findPoles(ordered);
    this.drawUtilityWires(g, poles);
    for (const section of ordered) {
      const scale = streetScale(section.depth);
      const y = streetGround(scale);
      for (const side of ["left", "right"] as const) {
        const edge = roadEdge(side, scale);
        const slot = this.roadside.get(section, side);
        this.drawRoadsideSlot(g, slot, side, edge, y, scale);
      }
    }
    this.syncRequestBubble();
  }

  private drawPerspectiveRoad(g: Phaser.GameObjects.Graphics): void {
    const steps = 32;
    for (const side of ["left", "right"] as const) {
      for (let index = 1; index <= steps; index++) {
        const far = (index - 1) / steps;
        const near = index / steps;
        const weight = near < .35 ? 1.2 : near < .65 ? 2 : 3.5;
        const ink = near < .35 ? 0x777777 : 0x171717;
        const alpha = near < .35 ? .68 : 1;
        g.lineStyle(weight, ink, alpha).beginPath()
          .moveTo(roadEdge(side, far), streetGround(far))
          .lineTo(roadEdge(side, near), streetGround(near)).strokePath();
      }
    }
    for (let index = 1; index <= steps; index++) {
      const far = (index - 1) / steps;
      const near = index / steps;
      g.lineStyle(near < .4 ? 1.1 : 1.7, near < .4 ? 0x777777 : 0x555555, near < .4 ? .38 : .52)
        .beginPath().moveTo(360, streetGround(far)).lineTo(360, streetGround(near)).strokePath();
    }
  }

  private drawContinuousSidewalks(g: Phaser.GameObjects.Graphics): void {
    for (const side of ["left", "right"] as const) {
      const direction = side === "left" ? -1 : 1;
      for (let index = 1; index <= 32; index++) {
        const far = (index - 1) / 32;
        const near = index / 32;
        const projected = (scale: number) => ({
          inner: roadEdge(side, scale) + direction * (3 + 18 * scale),
          outer: roadEdge(side, scale) + direction * (22 + 42 * scale),
          y: streetGround(scale),
        });
        const start = projected(far);
        const end = projected(near);
        g.lineStyle(near < .38 ? 1 : 1.8, near < .38 ? 0x888888 : 0x777777, .58).beginPath()
          .moveTo(start.inner, start.y).lineTo(end.inner, end.y)
          .moveTo(start.outer, start.y).lineTo(end.outer, end.y).strokePath();
      }
    }
  }

  private findPoles(ordered: StreetSegment[]): Array<{ side: "left" | "right"; x: number; top: number; scale: number }> {
    const result: Array<{ side: "left" | "right"; x: number; top: number; scale: number }> = [];
    for (const segment of ordered) {
      const scale = streetScale(segment.depth);
      for (const side of ["left", "right"] as const) {
        if (this.roadside.get(segment, side).type !== "POLE") continue;
        const direction = side === "left" ? -1 : 1;
        const y = streetGround(scale);
        result.push({ side, x: roadEdge(side, scale) + direction * 66 * scale, top: y - 190 * scale, scale });
      }
    }
    return result;
  }

  private drawUtilityWires(g: Phaser.GameObjects.Graphics, poles: Array<{ side: "left" | "right"; x: number; top: number; scale: number }>): void {
    for (const side of ["left", "right"] as const) {
      const sameSide = poles.filter((pole) => pole.side === side).sort((a, b) => a.top - b.top);
      for (let index = 1; index < sameSide.length; index++) {
        const far = sameSide[index - 1]; const near = sameSide[index];
        if (near.top - far.top > 260) continue;
        const midpointX = (far.x + near.x) / 2;
        const midpointY = (far.top + near.top) / 2 + 12 * Math.min(far.scale, near.scale);
        g.lineStyle(Math.max(.65, .95 * Math.sqrt(Math.min(far.scale, near.scale))), 0x666666, .72)
          .beginPath().moveTo(far.x, far.top + 18 * far.scale).lineTo(midpointX, midpointY).lineTo(near.x, near.top + 18 * near.scale).strokePath();
      }
    }
    for (const pole of poles) {
      const direction = pole.side === "left" ? -1 : 1;
      const y = streetGround(pole.scale);
      g.lineStyle(Math.max(.8, 2 * Math.sqrt(pole.scale)), pole.scale < .28 ? 0x777777 : 0x171717, 1)
        .beginPath().moveTo(pole.x, y).lineTo(pole.x, pole.top);
      if (pole.scale * 28 >= 6) {
        g.moveTo(pole.x - direction * 14 * pole.scale, pole.top + 18 * pole.scale)
          .lineTo(pole.x + direction * 14 * pole.scale, pole.top + 18 * pole.scale);
      }
      g.strokePath();
    }
  }

  private drawRoadsideSlot(g: Phaser.GameObjects.Graphics, slot: RoadsideSlot, side: "left" | "right", edge: number, y: number, scale: number): void {
    const direction = side === "left" ? -1 : 1;
    const anchor = edge + direction * (18 + slot.setback) * scale;
    const ink = scale < .28 ? 0x777777 : 0x171717;
    const line = Math.max(.7, slot.lineWeight * Math.sqrt(scale));
    if (slot.type === "HOUSE") {
      let house = this.houseViews.get(slot.house);
      if (!house) { house = new HouseFacade(slot.house); this.houseViews.set(slot.house, house); }
      house.draw(g, { x: anchor, y }, facadeScale(scale), side);
      return;
    }
    if (slot.type === "EMPTY_LOT") {
      if (slot.decorationVariant === 0) return;
      if (slot.decorationVariant === 1 && scale * 18 >= 6) {
        g.lineStyle(line, ink, .8).beginPath().moveTo(anchor + direction * 12 * scale, y).lineTo(anchor + direction * 32 * scale, y - 10 * scale).lineTo(anchor + direction * 48 * scale, y).strokePath();
      } else if (slot.decorationVariant === 2 && scale * 24 >= 6) {
        g.lineStyle(line, ink, .8).strokeRect(anchor + direction * 18 * scale, y - 22 * scale, 18 * scale, 22 * scale);
      } else if (scale * 32 >= 6) {
        g.lineStyle(line, ink, .7).beginPath().moveTo(anchor + direction * 8 * scale, y - 4 * scale).lineTo(anchor + direction * 34 * scale, y - 15 * scale).lineTo(anchor + direction * 58 * scale, y - 3 * scale).strokePath();
      }
      return;
    }
    if (slot.type === "POLE") return;
    if (slot.type === "TREE") {
      const x = anchor + direction * 24 * scale;
      if (scale * 34 < 6) return;
      g.lineStyle(line, ink, .85).beginPath().moveTo(x, y).lineTo(x, y - 30 * scale).strokePath();
      g.lineStyle(line, ink, .85).strokeCircle(x, y - 36 * scale, 12 * scale);
      return;
    }
    if (slot.type === "WALL") {
      const x = anchor + direction * 8 * scale;
      const length = 64 * scale;
      if (length < 6) return;
      g.lineStyle(line, ink, .85).beginPath().moveTo(x, y).lineTo(x + direction * length, y).lineTo(x + direction * length, y - 18 * scale).lineTo(x, y - 18 * scale).strokePath();
      if (slot.decorationVariant % 2 && scale * 20 >= 6) g.lineStyle(line, ink, .85).beginPath().moveTo(x + direction * 20 * scale, y).lineTo(x + direction * 20 * scale, y - 28 * scale).moveTo(x + direction * 46 * scale, y).lineTo(x + direction * 46 * scale, y - 28 * scale).strokePath();
      return;
    }
    const width = 72 * scale; const height = 28 * scale;
    if (width < 6 || height < 6) return;
    const x = anchor + direction * 70 * scale;
    const left = side === "left" ? x - width : x;
    g.fillStyle(0xfaf9f4, 1).fillRect(left, y - height, width, height);
    g.lineStyle(line, ink, .9).beginPath().moveTo(left, y - height * .7).lineTo(left + width * .2, y - height * 1.3).lineTo(left + width * .78, y - height * 1.3).lineTo(left + width, y - height * .7).lineTo(left + width, y - height * .2).moveTo(left, y - height * .7).lineTo(left, y - height * .2).lineTo(left + width, y - height * .2).strokePath();
    if (scale * 10 >= 6) {
      g.lineStyle(line, ink, .9).strokeCircle(left + width * .25, y - 3 * scale, 5 * scale);
      g.lineStyle(line, ink, .9).strokeCircle(left + width * .75, y - 3 * scale, 5 * scale);
    }
  }

  private stageDeliveryHouse(side: "left" | "right", triggerDepth: number): void {
    const activationScale = facadeScale(streetScale(triggerDepth));
    const candidates = this.road.sections.map((segment) => {
      const slot = this.roadside.get(segment, side);
      return {
        segment,
        depth: segment.depth,
        hasDoor: slot.type === "HOUSE" && createHouseFacadePlan(slot.house, side, activationScale).door !== null,
      };
    });
    const selected = selectUpcomingHouse(candidates, triggerDepth);
    this.deliverySegment = selected?.segment ?? null;
    this.deliveryCycle = this.deliverySegment?.cycleCount ?? null;
  }

  private throwPaper(side: "left" | "right"): void {
    const { x, y } = this.targetScreenPosition(side);
    const target = { x, y };
    this.newspapers.throw(side, target, { x: 360, y: 910 });
  }
  private targetScreenPosition(side: "left" | "right"): { x: number; y: number; scale: number } {
    const segment = this.deliverySegment;
    if (!segment) return { x: side === "left" ? 180 : 540, y: 500, scale: .2 };
    const slot = this.roadside.get(segment, side);
    if (slot.type !== "HOUSE") return { x: side === "left" ? 180 : 540, y: 500, scale: .2 };
    const scale = streetScale(segment.depth);
    const edge = roadEdge(side, scale);
    const direction = side === "left" ? -1 : 1;
    const anchor = { x: edge + direction * (18 + slot.setback) * scale, y: streetGround(scale) };
    const plan = createHouseFacadePlan(slot.house, side, facadeScale(scale));
    const door = plan.door;
    if (!door) return { x: anchor.x, y: anchor.y - plan.height * .45, scale };
    return {
      x: anchor.x + door.x + door.width / 2,
      y: anchor.y + door.y + door.height / 2,
      scale,
    };
  }

  private syncRequestBubble(): void {
    const side = this.session.delivery.active ? this.session.delivery.targetSide : null;
    const segment = this.deliverySegment;
    if (!side || !segment) {
      this.requestBubble.setVisible(false);
      this.requestBubbleText.setVisible(false);
      return;
    }
    const slot = this.roadside.get(segment, side);
    if (slot.type !== "HOUSE") {
      this.requestBubble.setVisible(false);
      this.requestBubbleText.setVisible(false);
      return;
    }

    const perspective = streetScale(segment.depth);
    const edge = roadEdge(side, perspective);
    const direction = side === "left" ? -1 : 1;
    const anchor = {
      x: edge + direction * (18 + slot.setback) * perspective,
      y: streetGround(perspective),
    };
    const plan = createHouseFacadePlan(slot.house, side, facadeScale(perspective));
    if (!plan.door) {
      this.requestBubble.setVisible(false);
      this.requestBubbleText.setVisible(false);
      return;
    }

    const doorX = anchor.x + plan.door.x + plan.door.width / 2;
    const doorTop = anchor.y + plan.door.y;
    const layout = requestBubbleLayout(side, doorX, doorTop, perspective);
    this.requestBubble.clear();
    this.requestBubble.fillStyle(0x171717, 1).fillRoundedRect(-64, -26, 128, 52, 26);
    if (side === "left") {
      this.requestBubble.fillTriangle(22, 14, 43, 14, 61, 38);
    } else {
      this.requestBubble.fillTriangle(-22, 14, -43, 14, -61, 38);
    }
    this.requestBubble.setPosition(layout.x, layout.y).setScale(layout.scale).setVisible(true);
    this.requestBubbleText.setPosition(layout.x, layout.y - 1).setScale(layout.scale).setVisible(true);
  }

  private syncPapers(): void {
    this.newspapers.items.forEach((model, index) => {
      const sprite = this.paperSprites[index];
      sprite.setVisible(model.active);
      if (model.active) sprite.setPosition(model.x, model.y).setRotation(model.rotation).setScale(1 - model.progress * .55);
    });
  }
}

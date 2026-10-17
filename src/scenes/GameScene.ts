import Phaser from "phaser";
import { GAME } from "../config/gameConfig";
import { GameSession } from "../core/GameSession";
import { SwipeInput } from "../systems/SwipeInput";
import { RoadSystem } from "../systems/RoadSystem";
import { difficultyAt, requestSideFor } from "../systems/DifficultySystem";
import { createGameConfigBase } from "../config/phaserConfig";
import { NewspaperPool, paperFlightTarget } from "../objects/NewspaperPool";
import { HOUSE_ARTWORKS, createHouseArtworkPlan } from "../objects/HouseFacade";
import type { RoadsideSlot } from "../systems/RoadsideSystem";
import { RoadsideSystem } from "../systems/RoadsideSystem";
import { facadeScale, roadEdge, requestBubbleLayout, streetGround, streetScale } from "../systems/StreetProjection";
import { DELIVERY_PASS_DEPTH, isRequestReady, popupTriggerDepth, selectUpcomingHouse } from "../systems/DeliveryWindow";
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
  private houseSprites: Phaser.GameObjects.Image[] = [];
  private deliverySegment: StreetSegment | null = null;
  private deliveryCycle: number | null = null;
  private paperSprites: Phaser.GameObjects.Rectangle[] = [];
  private elapsed = 0;
  private requestDelay = 700;
  private nextSide: "left" | "right" = "left";
  private successfulDeliveries = 0;
  private failureReason = "";
  private requestWasVisible = false;
  private bubblePulseStartedAt = 0;

  constructor() { super("game"); }
  preload(): void {
    for (const artwork of HOUSE_ARTWORKS) this.load.image(artwork.textureKey, artwork.url);
  }
  create(): void {
    this.ink = this.add.graphics();
    this.houseSprites = Array.from({ length: this.road.sections.length * 2 }, () =>
      this.add.image(0, 0, HOUSE_ARTWORKS[0].textureKey).setVisible(false));
    this.requestBubble = this.add.graphics().setDepth(30).setVisible(false);
    this.requestBubbleText = this.add.text(0, 0, "PAPER", {
      fontFamily: "Arial, sans-serif", fontSize: "22px", fontStyle: "bold", color: "#171717",
    }).setOrigin(.5).setDepth(31).setVisible(false);
    this.paperSprites = this.newspapers.items.map(() => this.add.rectangle(360, 910, 42, 28, 0xffffff).setStrokeStyle(4, 0x171717).setDepth(20).setVisible(false));
    this.input.on("pointerdown", (p: Phaser.Input.Pointer) => {
      if (this.session.state === "READY") this.startRun();
      this.swipe.begin(p.id, p.x, p.y);
    });
    this.input.on("pointerup", (p: Phaser.Input.Pointer) => {
      const side = this.swipe.end(p.id, p.x, p.y);
      if (!side || this.session.state !== "PLAYING") return;
      const hadActiveRequest = this.session.delivery.active;
      const doorTarget = this.targetScreenPosition(side);
      const outcome = this.session.throw(side);
      const flightTarget = paperFlightTarget(side, doorTarget, outcome);
      this.newspapers.throw(side, flightTarget, { x: 360, y: 1040 });
      window.dispatchEvent(new CustomEvent("paper-route-rider", { detail: `throw-${side}` }));
      if (outcome === "success") {
        this.successfulDeliveries += 1;
        window.dispatchEvent(new CustomEvent("paper-route-feedback", { detail: { kind: "success", points: 10 } }));
      } else {
        window.dispatchEvent(new CustomEvent("paper-route-feedback", { detail: { kind: "wrong" } }));
      }
      if (hadActiveRequest && outcome === "success") {
        this.deliverySegment = null;
        this.deliveryCycle = null;
        this.requestDelay = difficultyAt(this.elapsed, this.successfulDeliveries).requestGapMs;
      }
      this.emitState(outcome);
    });
    this.emitState();
  }
  update(_time: number, delta: number): void {
    if (this.session.state === "PLAYING") {
      this.elapsed += delta;
      const difficulty = difficultyAt(this.elapsed, this.successfulDeliveries);
      this.session.update(delta);
      this.newspapers.update(delta);
      if (!this.session.delivery.active) this.requestDelay = Math.max(0, this.requestDelay - delta);
      this.road.update(delta, difficulty.speed);

      if (this.deliverySegment && this.deliveryCycle !== this.deliverySegment.cycleCount) {
        if (this.session.delivery.active) {
          const events = this.session.setTargetDepth(DELIVERY_PASS_DEPTH);
          if (events.includes("missed")) window.dispatchEvent(new CustomEvent("paper-route-feedback", { detail: { kind: "missed" } }));
        }
        this.deliverySegment = null;
        this.deliveryCycle = null;
      } else if (this.session.delivery.active && this.deliverySegment) {
        const events = this.session.setTargetDepth(this.deliveryDepth(this.deliverySegment, this.session.delivery.targetSide!));
        if (events.includes("missed")) {
          this.deliverySegment = null;
          this.deliveryCycle = null;
          this.requestDelay = difficulty.requestGapMs;
          window.dispatchEvent(new CustomEvent("paper-route-feedback", { detail: { kind: "missed" } }));
        }
      }

      if (this.session.snapshot().state === "GAME_OVER") {
        this.deliverySegment = null;
        this.deliveryCycle = null;
        this.failureReason = "missed";
        window.dispatchEvent(new CustomEvent("paper-route-rider", { detail: "fail" }));
      } else if (!this.session.delivery.active && this.requestDelay <= 0) {
        const triggerDepth = popupTriggerDepth(difficulty.speed, difficulty.reactionSeconds);
        if (!this.deliverySegment) this.stageDeliveryHouse(this.nextSide, triggerDepth);
        if (this.deliverySegment && isRequestReady(this.deliveryDepth(this.deliverySegment, this.nextSide), triggerDepth)) {
          this.session.schedule(this.nextSide, this.deliveryDepth(this.deliverySegment, this.nextSide), DELIVERY_PASS_DEPTH);
          window.dispatchEvent(new CustomEvent("news-paper-boy-request"));
          this.nextSide = requestSideFor(this.successfulDeliveries + 1);
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
    this.deliverySegment = null; this.deliveryCycle = null; this.requestWasVisible = false;
    this.swipe.reset(); this.elapsed = 0; this.requestDelay = 700; this.nextSide = requestSideFor(0); this.successfulDeliveries = 0; this.failureReason = "";
    window.dispatchEvent(new CustomEvent("paper-route-rider-reset"));
    window.dispatchEvent(new CustomEvent("paper-route-rider", { detail: "ride" }));
    window.dispatchEvent(new CustomEvent("paper-route-run", { detail: "start" }));
    this.emitState();
  }
  startRun(): void {
    if (this.session.state !== "READY") return;
    this.session.start();
    window.dispatchEvent(new CustomEvent("paper-route-rider", { detail: "ride" }));
    window.dispatchEvent(new CustomEvent("paper-route-run", { detail: "start" }));
    this.emitState();
  }
  private emitState(reason?: string): void {
    if (reason && this.session.state === "GAME_OVER") this.failureReason = reason;
    window.dispatchEvent(new CustomEvent("paper-route-state", { detail: { ...this.session.snapshot(), best: this.session.bestScore, reason: this.failureReason } }));
  }
  private drawWorld(): void {
    const g = this.ink; g.clear();
    this.houseSprites.forEach((sprite) => sprite.setVisible(false));
    g.fillStyle(0xf4f3ef, 1); g.fillRect(0, 0, 720, 600);
    g.fillStyle(0xf7f1e5, 1); g.fillRect(0, 600, 720, 680);
    g.fillStyle(0x78838d, 1).beginPath()
      .moveTo(360, 600).lineTo(180, 1280).lineTo(540, 1280).closePath().fillPath();
    this.drawPerspectiveRoad(g);
    this.drawContinuousSidewalks(g);
    this.drawMovingRoadDetails(g);

    const ordered = this.road.sections.flatMap((segment) => (["left", "right"] as const).map((side) => {
      const slot = this.roadside.get(segment, side);
      return { segment, side, slot, depth: this.deliveryDepth(segment, side) };
    })).sort((a, b) => b.depth - a.depth);
    const poles = this.findPoles(ordered);
    this.drawUtilityWires(g, poles);
    for (const item of ordered) {
      const scale = streetScale(item.depth);
      const y = streetGround(scale);
      const edge = roadEdge(item.side, scale);
      this.drawRoadsideSlot(g, item.segment.index, item.slot, item.side, edge, y, scale);
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

  private drawMovingRoadDetails(g: Phaser.GameObjects.Graphics): void {
    const sections = [...this.road.sections].sort((a, b) => b.depth - a.depth);
    for (const section of sections) {
      const scale = streetScale(section.depth);
      const y = streetGround(scale);
      if (y < 598 || y > 1450) continue;
      const weight = Math.max(.7, Math.min(5, 1.1 + scale * 1.8));
      const ink = scale < .28 ? 0x888888 : 0x3d3d3d;
      const alpha = scale < .28 ? .42 : .68;

      for (const side of ["left", "right"] as const) {
        const direction = side === "left" ? -1 : 1;
        const inner = roadEdge(side, scale) + direction * (3 + 18 * scale);
        const outer = roadEdge(side, scale) + direction * (22 + 42 * scale);
        g.lineStyle(weight, ink, alpha).beginPath().moveTo(inner, y).lineTo(outer, y).strokePath();
      }

      const dashLength = Math.max(2, 34 * scale);
      g.lineStyle(Math.max(.7, Math.min(4, scale * 2.2)), ink, alpha * .72)
        .beginPath().moveTo(360, y - dashLength).lineTo(360, y).strokePath();
    }
  }

  private findPoles(ordered: Array<{ side: "left" | "right"; slot: RoadsideSlot; depth: number }>): Array<{ side: "left" | "right"; x: number; top: number; scale: number }> {
    const result: Array<{ side: "left" | "right"; x: number; top: number; scale: number }> = [];
    for (const item of ordered) {
        if (item.slot.type !== "POLE") continue;
        const scale = streetScale(item.depth);
        const direction = item.side === "left" ? -1 : 1;
        const y = streetGround(scale);
        result.push({ side: item.side, x: roadEdge(item.side, scale) + direction * 66 * scale, top: y - 190 * scale, scale });
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

  private drawRoadsideSlot(g: Phaser.GameObjects.Graphics, segmentIndex: number, slot: RoadsideSlot, side: "left" | "right", edge: number, y: number, scale: number): void {
    const direction = side === "left" ? -1 : 1;
    const anchor = edge + direction * (18 + slot.setback) * scale;
    const ink = scale < .28 ? 0x777777 : 0x171717;
    const line = Math.max(.7, slot.lineWeight * Math.sqrt(scale));
    if (slot.type === "HOUSE") {
      const plan = createHouseArtworkPlan(slot.house.artwork ?? "courtyard", side, facadeScale(scale), slot.house.widthVariant);
      const spriteIndex = segmentIndex * 2 + (side === "right" ? 1 : 0);
      this.houseSprites[spriteIndex]
        .setTexture(plan.textureKey)
        .setPosition(anchor, y)
        .setOrigin(plan.originX, plan.originY)
        .setDisplaySize(plan.width, plan.height)
        .setFlipX(plan.flipX)
        .setAlpha(scale < .2 ? .72 : scale < .32 ? .86 : 1)
        .setDepth(2 + scale * 12)
        .setVisible(plan.width >= 3 && plan.height >= 3);
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
      const depth = this.deliveryDepth(segment, side);
      return {
        segment,
        depth,
        hasDoor: slot.type === "HOUSE" && createHouseArtworkPlan(slot.house.artwork ?? "courtyard", side, activationScale, slot.house.widthVariant).door.width >= 6,
      };
    });
    const selected = selectUpcomingHouse(candidates, triggerDepth);
    this.deliverySegment = selected?.segment ?? null;
    this.deliveryCycle = this.deliverySegment?.cycleCount ?? null;
  }

  private targetScreenPosition(side: "left" | "right"): { x: number; y: number; scale: number } {
    const segment = this.deliverySegment;
    if (!segment) return { x: side === "left" ? 180 : 540, y: 500, scale: .2 };
    const slot = this.roadside.get(segment, side);
    if (slot.type !== "HOUSE") return { x: side === "left" ? 180 : 540, y: 500, scale: .2 };
    const scale = streetScale(this.deliveryDepth(segment, side));
    const edge = roadEdge(side, scale);
    const direction = side === "left" ? -1 : 1;
    const anchor = { x: edge + direction * (18 + slot.setback) * scale, y: streetGround(scale) };
    const plan = createHouseArtworkPlan(slot.house.artwork ?? "courtyard", side, facadeScale(scale), slot.house.widthVariant);
    const door = plan.door;
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
      this.requestWasVisible = false;
      this.requestBubble.setVisible(false);
      this.requestBubbleText.setVisible(false);
      return;
    }
    const slot = this.roadside.get(segment, side);
    if (slot.type !== "HOUSE") {
      this.requestWasVisible = false;
      this.requestBubble.setVisible(false);
      this.requestBubbleText.setVisible(false);
      return;
    }

    const perspective = streetScale(this.deliveryDepth(segment, side));
    const edge = roadEdge(side, perspective);
    const direction = side === "left" ? -1 : 1;
    const anchor = {
      x: edge + direction * (18 + slot.setback) * perspective,
      y: streetGround(perspective),
    };
    const plan = createHouseArtworkPlan(slot.house.artwork ?? "courtyard", side, facadeScale(perspective), slot.house.widthVariant);

    const doorX = anchor.x + plan.door.x + plan.door.width / 2;
    const doorTop = anchor.y + plan.door.y;
    const layout = requestBubbleLayout(side, doorX, doorTop, perspective);
    if (!this.requestWasVisible) {
      this.requestWasVisible = true;
      this.bubblePulseStartedAt = this.time.now;
    }
    const pulseAge = this.time.now - this.bubblePulseStartedAt;
    const pulse = pulseAge < 520 ? 1 + Math.sin(pulseAge / 520 * Math.PI * 3) * .055 * (1 - pulseAge / 520) : 1;
    this.requestBubble.clear();
    this.requestBubble.lineStyle(3, 0x171717, 1);
    this.requestBubble.fillStyle(0xffd95a, 1).fillRoundedRect(-64, -26, 128, 52, 26).strokeRoundedRect(-64, -26, 128, 52, 26);
    if (side === "left") {
      this.requestBubble.fillTriangle(22, 14, 43, 14, 61, 38).strokeTriangle(22, 14, 43, 14, 61, 38);
    } else {
      this.requestBubble.fillTriangle(-22, 14, -43, 14, -61, 38).strokeTriangle(-22, 14, -43, 14, -61, 38);
    }
    this.requestBubble.setPosition(layout.x, layout.y).setScale(layout.scale * pulse).setVisible(true);
    this.requestBubbleText.setPosition(layout.x, layout.y - 1).setScale(layout.scale * pulse).setVisible(true);
  }

  private syncPapers(): void {
    this.newspapers.items.forEach((model, index) => {
      const sprite = this.paperSprites[index];
      sprite.setVisible(model.active);
      if (model.active) sprite.setPosition(model.x, model.y).setRotation(model.rotation).setScale(1 - model.progress * .55);
    });
  }

  private deliveryDepth(segment: StreetSegment, side: "left" | "right"): number {
    const slot = this.roadside.get(segment, side);
    return Math.min(1, segment.depth + slot.depthOffset);
  }
}

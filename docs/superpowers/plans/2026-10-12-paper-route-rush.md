# Paper Route Rush Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and deploy a playable portrait newspaper-delivery runner that uses the existing SVG/GSAP rider animation.

**Architecture:** Phaser renders the pooled pseudo-3D street and gameplay. Pure TypeScript modules own all rules and are tested without rendering. A pointer-transparent DOM `RiderView` mounts the existing SVG above the canvas and reacts to game events.

**Tech Stack:** Phaser 4.2.1, TypeScript, Vite, Vitest, GSAP MorphSVG, WebGL with Canvas fallback.

**Spec:** `docs/superpowers/specs/2026-10-12-paper-route-rush-design.md`

## Global Constraints

- Logical resolution is 720 × 1280 in portrait with responsive letterboxing and safe areas.
- One request may be active; success is exactly +10; every invalid throw or miss ends the run.
- Reuse the current 81-path Group 42 → Group 41 rider morph.
- Pool gameplay objects; use no physics engine or active-play object churn.
- Native packaging and deferred features remain out of scope.
- Reduced motion removes sway and shake while preserving state feedback.

## Review Focus

- A mostly vertical or tiny drag is ignored and cannot end a run (Task 1).
- Releasing one pointer more than once cannot create multiple throws (Task 1).
- Delivery-window boundaries classify early, valid, and late deterministically (Task 2).
- Restart clears active requests, elapsed score, difficulty, and pooled effects but preserves best score (Task 2).
- Very small screens remain playable without page scrolling or unsafe-area overlap (Task 5).

---

### Task 1: Foundation and Pure Run Rules

**Files:**
- Modify: `package.json`, `src/main.ts`, `src/style.css`
- Create: `src/config/gameConfig.ts`, `src/core/types.ts`, `src/systems/SwipeInput.ts`, `src/systems/ScoreSystem.ts`, `src/systems/DifficultySystem.ts`, `src/utils/storage.ts`
- Test: `src/tests/runRules.test.ts`

**Interfaces:**
- Produces: `class SwipeInput { begin(id,x,y): void; end(id,x,y): ThrowSide | null; reset(): void }`
- Produces: `class ScoreSystem { update(deltaMs): void; addDelivery(): void; reset(): void; readonly score: number }`
- Produces: `difficultyAt(elapsedMs): { speed:number; requestGapMs:number; windowDepth:number }`
- Produces: `BestScoreStore` with `load(): number` and `save(score:number): void`.

- [ ] Write tests for left/right, tiny, vertical, wrong pointer ID, duplicate release, +10, continuous score, capped difficulty, malformed storage, and best-score persistence.
- [ ] Run `npm test -- --run src/tests/runRules.test.ts`; expect failures because the modules do not exist.
- [ ] Install `phaser@4.2.1`, add the typed configuration and minimal implementations.
- [ ] Re-run the focused test; expect all cases to pass.

### Task 2: Delivery State and Complete Reset

**Files:**
- Create: `src/core/GameSession.ts`, `src/systems/DeliverySystem.ts`
- Test: `src/tests/gameSession.test.ts`

**Interfaces:**
- Consumes: `ThrowSide`, `ScoreSystem`, `difficultyAt`, `BestScoreStore` from Task 1.
- Produces: `DeliverySystem.update(depth): DeliveryEvent[]`, `throw(side): DeliveryOutcome`, `schedule(side,startDepth): void`, `reset(): void`.
- Produces: `GameSession.start()`, `update(deltaMs)`, `throw(side)`, `fail(reason)`, and `reset()` with `state: "READY" | "PLAYING" | "GAME_OVER"`.

- [ ] Write tests for valid +10 delivery; wrong-side, early, late, unnecessary, and missed failures; single active target; fair rescheduling; and full reset with preserved best score.
- [ ] Run the focused test; expect missing-module failures.
- [ ] Implement the minimal state machines and typed events, keeping rendering out.
- [ ] Re-run the focused test; expect all cases to pass.

### Task 3: Perspective Street and Object Pools

**Files:**
- Create: `src/systems/PerspectiveProjector.ts`, `src/systems/RoadSystem.ts`, `src/objects/StreetSegment.ts`, `src/objects/NewspaperPool.ts`
- Test: `src/tests/worldSystems.test.ts`

**Interfaces:**
- Produces: `project(worldX:number, depth:number): { x:number; y:number; scale:number }`.
- Produces: `RoadSystem.update(deltaMs,speed)` and `reset()` over a fixed ten-segment pool.
- Produces: `NewspaperPool.throw(side,target)` and `reset()` over a fixed four-item pool.

- [ ] Write tests for horizon/near projection, finite outputs, ten-section reuse, seam-free recycling, four-newspaper reuse, and reset.
- [ ] Run the focused test; expect missing-module failures.
- [ ] Implement projection and reusable data objects without Phaser dependencies.
- [ ] Re-run the focused test; expect all cases to pass.

### Task 4: Phaser Scene and Existing Rider

**Files:**
- Create: `src/scenes/GameScene.ts`, `src/render/StreetRenderer.ts`, `src/render/RiderView.ts`, `src/render/NewspaperRenderer.ts`
- Modify: `src/artwork.ts`, `src/main.ts`, `src/style.css`
- Test: `src/tests/rider.integration.test.ts`, `src/tests/game.integration.test.ts`

**Interfaces:**
- Consumes: Tasks 1–3.
- Produces: `RiderView.setState("ride" | "throw-left" | "throw-right" | "fail")`, `reset()`, and `destroy()`.
- Produces: `mountGame(root:HTMLElement): { destroy(): void }`.

- [ ] Write integration tests proving the real 81-path SVG mounts above the canvas, morphs to the exact endpoint, ignores pointer events, and receives throw/fail state; prove Phaser config uses 720 × 1280, WebGL/Canvas fallback, and no physics.
- [ ] Run both integration tests; expect failures because the scene and rider adapter do not exist.
- [ ] Implement the game bootstrap, hand-drawn street renderer, request indicator, newspaper arc, pointer routing, and rider event adapter.
- [ ] Re-run both integration tests; expect all cases to pass.

### Task 5: UI, Feedback, Responsive Verification, and Deployment

**Files:**
- Create: `src/ui/GameHUD.ts`, `src/ui/StartOverlay.ts`, `src/ui/GameOverOverlay.ts`, `src/systems/FeedbackSystem.ts`
- Modify: `src/scenes/GameScene.ts`, `src/style.css`, `README.md`, `.gitignore`, `.gitattributes`
- Test: `src/tests/gameFlow.integration.test.ts`

**Interfaces:**
- Consumes: `GameSession` and `mountGame`.
- Produces: complete Ready → Playing → Game Over → Restart flow.

- [ ] Write a game-flow test for start, scoring, success feedback, each failure reason, restart without reload, best-score retention, saved sound/vibration settings, and repeated restart without duplicate listeners.
- [ ] Run the focused test; expect failures because UI flow is incomplete.
- [ ] Implement overlays, HUD, yellow/green/red feedback, reduced motion, safe areas, vibration/audio hooks with saved toggles, and documentation.
- [ ] Re-run the focused test; expect all cases to pass.
- [ ] Run `npm test -- --run` and `npm run build`; expect zero failures and a successful production bundle.
- [ ] Verify at 720 × 1280 and a narrow phone viewport: no scrolling, centered rider, readable controls, mouse swipe, restart, and no console errors.
- [ ] Sync the verified source to the linked deployment folder and update `https://deploy-preview-fawn.vercel.app/`.

## Execution

Use native execution in this session to minimize token use. Review once after all five tasks rather than dispatching per-task agents. This workspace is not currently a Git repository, so commit steps are omitted; the result remains GitHub-ready.

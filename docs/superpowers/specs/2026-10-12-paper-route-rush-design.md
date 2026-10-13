# Paper Route Rush Browser Prototype

## Goal

Replace the current standalone morph demo with a portrait, mobile-first endless newspaper-delivery game. Reuse the existing inline SVG/GSAP rider as the real player character. The first release proves the delivery loop in a browser and updates the existing Vercel URL.

## Scope

- Phaser 4, strict TypeScript, Vite, Vitest, GSAP MorphSVG.
- Logical play area: 720 × 1280, responsively letterboxed with safe-area support.
- Mouse-drag and touch swipes; horizontal intentional gestures only.
- Ready, Playing, and Game Over states.
- Endless pseudo-3D street with pooled/recycled illustrated segments.
- One left-or-right delivery request at a time.
- Correct throw in the open window: +10. Wrong, early, late, unnecessary, or missed throw: game over.
- Survival score, increasing capped difficulty, persistent best score, immediate restart.
- Yellow requests, green success, red failure, optional vibration and audio hooks.

Deferred: native packaging, backend, accounts, ads, analytics, obstacles, lanes, upgrades, and currencies.

## Visual Design

The supplied neighborhood drawing defines the composition: black architectural outlines, white/light-grey surfaces, strong central vanishing point, houses and sidewalks on both sides, overhead wires, plants, and occasional parked vehicles. Environment art is procedural Phaser Graphics isolated behind object interfaces so finished assets can replace it.

The road moves toward the viewer while the rider stays near the lower center. Accent colors communicate gameplay only.

## Rider Integration

The existing 81-path inline SVG and GSAP MorphSVG loop remain unchanged as the riding presentation. It is mounted in a pointer-transparent DOM layer above the Phaser canvas and positioned from the same responsive game shell.

The game communicates with the rider through `ride`, `throw-left`, `throw-right`, and `fail` presentation events. Throw events add a short lean; failure pauses the ride and adds a reaction. Rider presentation never owns scoring, input, delivery timing, or game state.

## Architecture

- `GameScene`: coordinates systems and rendering without owning their rules.
- `GameState`: Ready/Playing/Game Over transitions and complete run reset.
- `SwipeInput`: classifies one gesture as left, right, or ignored.
- `PerspectiveProjector`: converts depth and lateral position to screen position and scale.
- `RoadSystem`: maintains and recycles a fixed street-section pool.
- `DeliverySystem`: owns target state, timing windows, fair scheduling, and outcomes.
- `NewspaperPool`: reuses newspaper visuals and runs curved rotating throws.
- `ScoreSystem`: survival points, +10 deliveries, final score, and best-score persistence.
- `DifficultySystem`: capped speed, spacing, and timing-window progression.
- `RiderView`: mounts the existing SVG and reacts to presentation events.
- UI overlays: start instructions, HUD, failure reason, final/best score, restart.

Configuration and tuning values live in one module. Systems exchange small typed events and expose explicit reset methods.

## Gameplay Flow

The player starts from a tap. During play, road depth advances, score and difficulty update, and one fair request may approach. A qualifying swipe asks `DeliverySystem` for an outcome. Success launches a newspaper, shows feedback, awards 10, and schedules the next request. Any invalid outcome enters Game Over. Passing an unresolved target also enters Game Over.

Restart resets every runtime system and pooled object without reloading the page. Best score and settings remain stored.

## Performance and Accessibility

- Fixed pools for street sections, newspapers, indicators, and effects.
- No physics engine and no active-play object churn.
- Lightweight graphics and transform/opacity animation.
- Pointer input prevents page scrolling during play.
- Reduced motion removes sway, shake, and large feedback movement while retaining state colors.
- Audio/vibration failures are ignored safely.

## Verification

Vitest covers projection, swipe classification, score math, delivery outcomes, difficulty caps, storage, and complete restart. Integration checks mount the game shell with the real rider SVG. Final verification includes the full test suite, production build, browser console check, portrait visual check, mouse swipe check, and touch-oriented responsive check.

## Assumptions

- The current deployed URL may be overwritten with the game.
- The current Group 42 → Group 41 morph is the idle riding loop.
- Placeholder procedural environment art is acceptable for the first playable version.
- Audio files are not required for the first verified browser build; hooks and settings are included.

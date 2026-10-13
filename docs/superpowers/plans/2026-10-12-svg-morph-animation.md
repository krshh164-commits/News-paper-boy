# SVG Morph Animation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and play a clean, endlessly reversing browser morph between the two supplied SVG illustrations.

**Architecture:** A minimal Vite/TypeScript page renders `Group 42.svg` inline. A typed artwork module provides the nine target path geometries from `Group 41.svg`; GSAP MorphSVG animates those corresponding paths together and leaves the other 72 paths static.

**Tech Stack:** Vite, TypeScript, GSAP, MorphSVGPlugin, Vitest

**Spec:** `docs/superpowers/specs/2026-10-12-svg-morph-animation-design.md`

## Global Constraints

- Use the shared `0 0 83 175` viewBox and preserve the source artwork's path order and fills.
- Morph only the nine differing paths.
- Use a 1.4-second `power2.inOut` morph, a short endpoint hold, `repeat: -1`, and `yoyo: true`.
- Show no controls, labels, panels, or decorative interface.
- Keep the artwork static when `prefers-reduced-motion: reduce` matches.

## Review Focus

- A source path-count mismatch must fail the mapping test instead of silently shifting targets.
- The changed-path index list must exactly match the nine geometric differences.
- The final state must reproduce every target `d` value without changing fills.
- Reduced-motion mode must skip timeline creation and remain on the initial artwork.
- The responsive SVG must preserve its aspect ratio without viewport overflow.

---

### Task 1: Project scaffold and verified artwork mapping

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `index.html`
- Create: `src/artwork.ts`
- Create: `src/artwork.test.ts`

**Interfaces:**
- Consumes: the two SVG files supplied in `C:\Users\anasw\Downloads`.
- Produces: `INITIAL_SVG: string`, `MORPH_TARGETS: ReadonlyArray<{ index: number; d: string }>`, and `CHANGED_PATH_INDICES: readonly number[]`.

- [ ] **Step 1: Write failing artwork tests**

Assert that the inline SVG has viewBox `0 0 83 175`, contains 81 paths, exposes exactly nine unique changed indices, uses the expected index list `[0, 1, 5, 6, 7, 8, 9, 18, 19]`, and supplies a non-empty target `d` for each.

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npm test -- --run src/artwork.test.ts`

Expected: FAIL because `src/artwork.ts` does not exist.

- [ ] **Step 3: Implement the project scaffold and artwork constants**

Create the minimal Vite/TypeScript configuration and copy the initial inline SVG plus the nine corresponding target geometries into `src/artwork.ts` without altering path order, fills, or viewBox.

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `npm test -- --run src/artwork.test.ts`

Expected: PASS.

### Task 2: Animation, presentation, and browser verification

**Files:**
- Create: `src/main.ts`
- Create: `src/style.css`
- Create: `src/main.test.ts`

**Interfaces:**
- Consumes: `INITIAL_SVG` and `MORPH_TARGETS` from Task 1.
- Produces: `createMorphAnimation(svg: SVGSVGElement, reducedMotion: boolean): gsap.core.Timeline | null` and the running Vite page.

- [ ] **Step 1: Write failing animation tests**

Assert that reduced motion returns `null`, normal mode creates one repeating/yoyo timeline, exactly nine paths receive MorphSVG targets, and each target geometry matches `MORPH_TARGETS`.

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npm test -- --run src/main.test.ts`

Expected: FAIL because `createMorphAnimation` does not exist.

- [ ] **Step 3: Implement the page and animation**

Render the inline SVG into a centered decorative container, register MorphSVGPlugin, and implement `createMorphAnimation` with duration `1.4`, ease `power2.inOut`, a short repeat delay, `repeat: -1`, and `yoyo: true`. Skip timeline creation when reduced motion is requested.

- [ ] **Step 4: Add the clean responsive presentation**

Use a neutral full-viewport canvas and constrain the SVG by viewport width and height while preserving its aspect ratio. Include the reduced-motion styling required by the spec.

- [ ] **Step 5: Run tests and production build**

Run: `npm test -- --run`

Expected: all tests PASS.

Run: `npm run build`

Expected: Vite production build succeeds without TypeScript errors.

- [ ] **Step 6: Start and inspect the browser demo**

Run the Vite development server on a fixed local port, open its URL, compare both animation endpoints with the supplied SVGs, and confirm that the transition reverses smoothly without path inversion or fill changes.

## Repository note

This directory is not a Git repository, so commit steps are intentionally omitted.

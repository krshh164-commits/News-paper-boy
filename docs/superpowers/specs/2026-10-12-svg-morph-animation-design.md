# SVG Morph Animation Design

## Goal

Create a clean, continuously looping morph between `Group 42.svg` and `Group 41.svg`. The result is a small standalone web demo with no controls, labels, or decorative interface.

## Source artwork

- Both source files use the same `0 0 83 175` viewBox.
- Each file contains 81 paths in the same order.
- Nine corresponding paths have different geometry; the remaining 72 paths are identical.
- The SVG is embedded inline so it stays sharp at every display size and its paths are directly addressable.

## Technical approach

- Use Vite with TypeScript and no UI framework.
- Use GSAP with MorphSVGPlugin.
- Render `Group 42.svg` as the initial inline SVG.
- Store the matching `d` values from `Group 41.svg` as morph targets for only the nine changed paths.
- Leave the 72 identical paths untouched to prevent unnecessary interpolation and visual wobble.
- Register MorphSVGPlugin explicitly before creating the animation.

## Motion

- Animate the nine changed paths together so the illustration behaves as one coherent object.
- Morph duration: 1.4 seconds.
- Easing: `power2.inOut`, appropriate for a visible on-screen transformation.
- Hold briefly at each completed state.
- Repeat indefinitely with `repeat: -1` and `yoyo: true`.
- Begin only after the document and inline SVG are ready, preventing an unstyled or partially initialized frame.

## Presentation

- Center one responsive SVG on a quiet, neutral full-page background.
- Preserve the original aspect ratio.
- Avoid controls, copy, panels, and other interface elements.
- Size the illustration responsively without exceeding the viewport.

## Accessibility

- Mark the artwork as decorative unless meaningful alternative text is added later.
- When `prefers-reduced-motion: reduce` is active, do not start the looping morph; show the initial artwork as a static image.

## File structure

- `index.html` — Vite entry page.
- `src/main.ts` — inline artwork setup, plugin registration, and timeline.
- `src/style.css` — centered responsive presentation and reduced-motion-safe styling.
- `package.json`, `tsconfig.json` — minimal project configuration.

## Verification

- Confirm the production build succeeds.
- Confirm all 81 paths render and only the nine differing paths are targeted.
- Check both endpoints visually against the original SVG files.
- Check the forward and reverse transitions for jumps, path inversion, or fill changes.
- Confirm reduced-motion mode remains static.

# NEWS PAPER BOY

Portrait browser prototype built with Phaser 4, TypeScript, Vite, Vitest, and the supplied inline SVG/GSAP rider animation.

Run `npm install`, then use `npm run dev`, `npm test -- --run`, or `npm run build`.

## GitHub Pages

The repository is configured to publish at https://krshh164-commits.github.io/News-paper-boy/.
Push the project to the `main` branch, then set the repository's Pages source to **GitHub Actions** under **Settings → Pages**. The workflow runs the tests, builds the game, and deploys `dist` automatically.

Swipe or mouse-drag toward the yellow requesting house while its marker is visible. Correct deliveries add exactly 10 points. Wrong throws earn no points and the run continues; an undelivered requesting house ends the run after it passes the rider.

Pure TypeScript systems own input, projection, score, difficulty, delivery rules, pooling, storage, and reset behavior. Phaser renders the street and feedback. `RiderView` mounts the existing 81-path SVG above the canvas and owns only presentation.

To replace the rider, replace `src/assets/group-42.svg` and `src/assets/group-41.svg` with matching ordered-path SVG poses. Gameplay code does not change.

Procedural line art and silent audio hooks are used in this first browser prototype. Native Capacitor packaging is deferred until browser gameplay is tuned.

Licenses: Phaser 4 is MIT. GSAP usage follows the installed package terms.

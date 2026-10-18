# Scene 1 — Cafe Arrival

Scene 1 keeps the existing Ghibli-inspired watercolor artwork and uses a dedicated renderer.

- `scene1.config.js`: canvas size, timing, camera movement, and visual palette.
- `scene1-renderer.js`: renders the complete source image with a soft atmospheric fill behind it, gentle camera movement, and subtle ambient dust.
- `../../components/cafe-arrival.jsx`: React lifecycle, image loading, and canvas ownership.

## Important motion boundary

The current source is one flattened image. This scene preserves the full composition and adds restrained camera/atmosphere motion; it does **not** claim that the character's body is independently animated. Natural character movement needs separated, matching watercolor layers (background, body, head/hair, arms/hands, and held papers), then a scene-specific rig. That is the next Scene 1 task before moving to Scene 2.

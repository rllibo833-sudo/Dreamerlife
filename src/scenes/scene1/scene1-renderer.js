import { SCENE1 } from "./scene1.config.js";

const easeInOut = (value) => (1 - Math.cos(Math.PI * 2 * value)) / 2;

/**
 * Scene 1 renderer.
 * The original watercolor frame is always drawn in full using "contain".
 * A softened, enlarged copy fills the side bars without cutting off the art.
 */
export function drawScene1Frame(ctx, image, elapsedMs) {
  const { width, height, camera, palette } = SCENE1;
  ctx.clearRect(0, 0, width, height);
  ctx.save();

  // Atmospheric fill behind the complete illustration; no source pixels are cropped.
  const coverScale = Math.max(width / image.width, height / image.height);
  const coverWidth = image.width * coverScale;
  const coverHeight = image.height * coverScale;
  ctx.save();
  ctx.filter = "blur(24px) brightness(0.72) saturate(0.72)";
  ctx.globalAlpha = 0.55;
  ctx.drawImage(image, (width - coverWidth) / 2, (height - coverHeight) / 2, coverWidth, coverHeight);
  ctx.restore();
  ctx.fillStyle = palette.backdrop;
  ctx.globalAlpha = 0.16;
  ctx.fillRect(0, 0, width, height);
  ctx.globalAlpha = 1;

  const containScale = Math.min(width / image.width, height / image.height);
  const zoom = camera.zoomStart + (camera.zoomEnd - camera.zoomStart) * easeInOut(
    (elapsedMs % camera.cycleMs) / camera.cycleMs
  );
  const drawWidth = image.width * containScale * zoom;
  const drawHeight = image.height * containScale * zoom;
  const phase = elapsedMs / 1000;
  const x = (width - drawWidth) / 2 + Math.sin(phase * 0.22) * camera.driftX;
  const y = (height - drawHeight) / 2 + Math.cos(phase * 0.18) * camera.driftY;

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, x, y, drawWidth, drawHeight);

  // Very restrained floating dust, atmospheric rather than pretending the
  // character itself is moving. Character rigging requires separate art layers.
  if (SCENE1.motion.ambientDust) {
    ctx.save();
    ctx.globalAlpha = 0.14;
    ctx.fillStyle = "#fff5dc";
    for (let i = 0; i < 9; i += 1) {
      const px = (i * 83 + phase * (5 + (i % 3) * 2)) % width;
      const py = (height - ((i * 137 + phase * (8 + (i % 4) * 2)) % height));
      const radius = 0.8 + (i % 3) * 0.45;
      ctx.beginPath();
      ctx.arc(px, py, radius, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
  ctx.restore();
}

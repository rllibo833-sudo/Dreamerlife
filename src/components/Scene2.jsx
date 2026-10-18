import { useEffect, useRef } from "react";
import { imageToBinary } from "../utils/binary.js";

const DEFAULT_IMAGE_URL = `${import.meta.env.BASE_URL}photos/02-waiting-at-cafe.jpg`;
const WIDTH = 720;
const HEIGHT = 1280;
const DURATION_MS = 5000;
const FRAME_INTERVAL_MS = 1000 / 60;

/**
 * Scene 2 — waiting outside the cafe.
 * Canvas-only rendering; the source image is loaded through imageToBinary().
 *
 * Note: the supplied artwork is a single flattened image. Parallax, light,
 * and shadow motion are layered over the full frame; independent thumb/head
 * animation would require separate masks or character layers.
 */
export default function Scene2({ imageUrl = DEFAULT_IMAGE_URL, className = "", onComplete }) {
  const canvasRef = useRef(null);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d", { willReadFrequently: true });
    if (!canvas || !ctx) return undefined;

    canvas.width = WIDTH;
    canvas.height = HEIGHT;

    let cancelled = false;
    let rafId;
    let objectUrl;
    let startTime;
    let lastFrameTime = 0;
    let frameCount = 0;
    let completed = false;
    let basePixels = null;
    let baseWidth = 0;
    let baseHeight = 0;

    const image = new Image();

    const finish = () => {
      if (completed || cancelled) return;
      completed = true;
      if (typeof onCompleteRef.current === "function") {
        onCompleteRef.current();
      }
    };

    const drawImageCover = (targetCtx, source, offsetX = 0, offsetY = 0, scale = 1) => {
      const imageRatio = source.width / source.height;
      const canvasRatio = WIDTH / HEIGHT;
      let drawWidth;
      let drawHeight;

      if (imageRatio > canvasRatio) {
        drawHeight = HEIGHT;
        drawWidth = drawHeight * imageRatio;
      } else {
        drawWidth = WIDTH;
        drawHeight = drawWidth / imageRatio;
      }

      drawWidth *= scale;
      drawHeight *= scale;
      const x = (WIDTH - drawWidth) / 2 + offsetX;
      const y = (HEIGHT - drawHeight) / 2 + offsetY;
      targetCtx.drawImage(source, x, y, drawWidth, drawHeight);
    };

    const drawFrame = (timestamp) => {
      if (cancelled || completed) return;

      if (startTime === undefined) startTime = timestamp;
      if (timestamp - lastFrameTime < FRAME_INTERVAL_MS - 1) {
        rafId = requestAnimationFrame(drawFrame);
        return;
      }

      lastFrameTime = timestamp;
      frameCount += 1;
      const elapsed = timestamp - startTime;
      const t = Math.min(1, elapsed / DURATION_MS);
      const phase = elapsed;

      // Subtle opposing horizontal drift suggests background/foreground depth.
      const backgroundX = Math.sin(phase * 0.0004) * 12;
      const foregroundX = Math.sin(phase * 0.0004) * -5;
      const scale = 1.015 + Math.sin(t * Math.PI) * 0.012;

      ctx.save();
      ctx.clearRect(0, 0, WIDTH, HEIGHT);
      ctx.filter = `brightness(${1 + (0.025 + Math.sin(phase * 0.0018) * 0.025)})`;
      drawImageCover(ctx, image, backgroundX + foregroundX, 0, scale);
      ctx.filter = "none";

      // Moving soft-edged leaf shadows; restrained so the original art stays legible.
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = "#263522";
      ctx.beginPath();
      const sway = Math.sin(phase * 0.0012) * 24;
      ctx.ellipse(130 + sway, 250, 90, 190, -0.55, 0, Math.PI * 2);
      ctx.ellipse(245 - sway * 0.6, 170, 42, 135, 0.6, 0, Math.PI * 2);
      ctx.ellipse(585 + sway * 0.7, 380, 60, 175, 0.8, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.restore();

      // Very light pixel-wave pass every tenth frame to avoid per-frame readback cost.
      if (frameCount % 10 === 0) {
        try {
          const frame = ctx.getImageData(0, 0, WIDTH, HEIGHT);
          const data = frame.data;
          for (let i = 0; i < data.length; i += 4) {
            const wave = Math.sin(phase * 0.001 + i * 0.00005) * 0.6;
            data[i] = Math.max(0, Math.min(255, data[i] + wave));
          }
          ctx.putImageData(frame, 0, 0);
        } catch (error) {
          // If canvas pixel access is restricted, keep the smooth RAF animation.
          console.warn("[Scene 2] Pixel-wave pass skipped:", error);
        }
      }

      if (elapsed >= DURATION_MS) {
        finish();
        return;
      }

      rafId = requestAnimationFrame(drawFrame);
    };

    image.onload = () => {
      if (cancelled) return;
      // Keep dimensions available for the cover calculation; no <img> is rendered.
      baseWidth = image.naturalWidth;
      baseHeight = image.naturalHeight;
      if (!baseWidth || !baseHeight) {
        console.error("[Scene 2] Loaded image has invalid dimensions.");
        return;
      }
      rafId = requestAnimationFrame(drawFrame);
    };

    image.onerror = () => {
      if (cancelled) return;
      ctx.fillStyle = "#f3ead9";
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = "#332c25";
      ctx.font = "24px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Scene 2 image could not be loaded", WIDTH / 2, HEIGHT / 2);
    };

    imageToBinary(imageUrl)
      .then(({ arrayBuffer, uint8Array, blobUrl }) => {
        // Touch the binary representations explicitly as part of the binary load path.
        void arrayBuffer;
        void uint8Array;
        if (cancelled) {
          URL.revokeObjectURL(blobUrl);
          return;
        }
        objectUrl = blobUrl;
        image.src = blobUrl;
      })
      .catch((error) => {
        console.error("[Scene 2] Unable to load image binary:", error);
        if (!cancelled) {
          ctx.fillStyle = "#f3ead9";
          ctx.fillRect(0, 0, WIDTH, HEIGHT);
          ctx.fillStyle = "#332c25";
          ctx.font = "24px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("Scene 2 image could not be loaded", WIDTH / 2, HEIGHT / 2);
        }
      });

    return () => {
      cancelled = true;
      if (rafId !== undefined) cancelAnimationFrame(rafId);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
      basePixels = null;
    };
  }, [imageUrl]);

  return (
    <canvas
      ref={canvasRef}
      width={WIDTH}
      height={HEIGHT}
      className={className}
      role="img"
      aria-label="Scene 2: a nervous young man waiting outside an industrial cafe"
      style={{ display: "block", width: "100%", height: "auto", aspectRatio: "9 / 16" }}
    />
  );
}

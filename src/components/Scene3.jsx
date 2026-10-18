import { useEffect, useRef } from "react";
import { imageToBinary } from "../utils/binary.js";

const WIDTH = 720;
const HEIGHT = 1280;
const DURATION_MS = 6000;
const FRAME_INTERVAL_MS = 1000 / 60;
const DEFAULT_IMAGE_URL = `${import.meta.env.BASE_URL}photos/03-woman-arrives.jpg`;

export default function Scene3({
  imageUrl = DEFAULT_IMAGE_URL,
  className = "",
  onComplete,
}) {
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

    const image = new Image();

    const coverRect = (source, scale = 1, offsetX = 0, offsetY = 0) => {
      const sourceRatio = source.naturalWidth / source.naturalHeight;
      const canvasRatio = WIDTH / HEIGHT;
      let drawWidth;
      let drawHeight;

      if (sourceRatio > canvasRatio) {
        drawHeight = HEIGHT;
        drawWidth = HEIGHT * sourceRatio;
      } else {
        drawWidth = WIDTH;
        drawHeight = WIDTH / sourceRatio;
      }

      drawWidth *= scale;
      drawHeight *= scale;

      return {
        x: (WIDTH - drawWidth) / 2 + offsetX,
        y: (HEIGHT - drawHeight) / 2 + offsetY,
        width: drawWidth,
        height: drawHeight,
      };
    };

    const drawCover = (source, scale, x, y) => {
      const rect = coverRect(source, scale, x, y);
      ctx.drawImage(source, rect.x, rect.y, rect.width, rect.height);
      return rect;
    };

    const complete = () => {
      if (completed || cancelled) return;
      completed = true;
      onCompleteRef.current?.();
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
      const progress = Math.min(1, elapsed / DURATION_MS);
      const ease = progress * progress * (3 - 2 * progress);
      const phase = elapsed;

      const backgroundX = Math.sin(phase * 0.00042) * -6;
      const foregroundX = Math.sin(phase * 0.00042) * 8;
      const heatScale = 1 + (0.01 + (Math.sin(phase * 0.0013) + 1) * 0.005);
      const hairX = Math.sin(phase * 0.0015) * 15;
      const handY = -10 * (0.5 - 0.5 * Math.cos(progress * Math.PI));
      const breathing = 1 + (0.0075 + Math.sin(phase * 0.002) * 0.0075);
      const folderTilt = Math.sin(phase * 0.0011) * 0.012;
      const brightness = 1 + (0.04 + Math.sin(phase * 0.0014) * 0.04);

      ctx.clearRect(0, 0, WIDTH, HEIGHT);
      ctx.save();

      // Base image with subtle background drift and warm morning brightness.
      ctx.filter = `brightness(${brightness})`;
      drawCover(image, 1.015, backgroundX, 0);
      ctx.filter = "none";

      // Heat shimmer over the parked vehicle area (the original image remains intact).
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 250, WIDTH * 0.49, HEIGHT * 0.48);
      ctx.clip();
      ctx.globalAlpha = 0.16;
      ctx.filter = `blur(${0.4 + (Math.sin(phase * 0.0017) + 1) * 0.45}px)`;
      drawCover(image, heatScale, backgroundX + Math.sin(phase * 0.002) * 1.5, 0);
      ctx.restore();

      // Hair-region breeze approximation. The source is flattened, so the
      // clipped redraw is intentionally subtle to reduce visible edge artifacts.
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(390, 270, 88, 155, -0.08, 0, Math.PI * 2);
      ctx.clip();
      ctx.globalAlpha = 0.22;
      drawCover(image, 1.015, foregroundX + hairX, 0);
      ctx.restore();

      // Inviting hand/arm gesture, eased gently upward.
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(425, 410, 75, 75, 0.1, 0, Math.PI * 2);
      ctx.clip();
      ctx.globalAlpha = 0.14;
      drawCover(image, 1.015, foregroundX, handY);
      ctx.restore();

      // Subtle chest breathing over the man’s approximate torso region.
      ctx.save();
      ctx.beginPath();
      ctx.ellipse(585, 720, 105, 215, 0, 0, Math.PI * 2);
      ctx.clip();
      ctx.globalAlpha = 0.12;
      drawCover(image, breathing, foregroundX, 0);
      ctx.restore();

      // A soft golden lens-flare glow that drifts near the upper sunlit area.
      const flareX = 105 + Math.sin(phase * 0.0007) * 28;
      const flareY = 145 + Math.cos(phase * 0.0006) * 12;
      const flareRadius = 45 + (Math.sin(phase * 0.0015) + 1) * 12;
      const gradient = ctx.createRadialGradient(
        flareX, flareY, 0, flareX, flareY, flareRadius
      );
      gradient.addColorStop(0, "rgba(255, 226, 150, 0.22)");
      gradient.addColorStop(1, "rgba(255, 226, 150, 0)");
      ctx.fillStyle = gradient;
      ctx.fillRect(
        flareX - flareRadius,
        flareY - flareRadius,
        flareRadius * 2,
        flareRadius * 2
      );

      ctx.restore();

      // Binary-inspired wave pass on lower half every 8 frames only.
      if (frameCount % 8 === 0) {
        try {
          const top = Math.floor(HEIGHT * 0.5);
          const pixels = ctx.getImageData(0, top, WIDTH, HEIGHT - top);
          const data = pixels.data;

          for (let i = 0; i < data.length; i += 4) {
            const wave = Math.sin(phase * 0.001 + i * 0.00005) * 0.6;
            data[i] = Math.max(0, Math.min(255, data[i] + wave));
          }

          ctx.putImageData(pixels, 0, top);
        } catch (error) {
          console.warn("[Scene 3] Pixel-wave pass skipped:", error);
        }
      }

      if (elapsed >= DURATION_MS) {
        complete();
        return;
      }

      rafId = requestAnimationFrame(drawFrame);
    };

    image.onload = () => {
      if (cancelled) return;
      if (!image.naturalWidth || !image.naturalHeight) {
        console.error("[Scene 3] Loaded image has invalid dimensions.");
        return;
      }
      rafId = requestAnimationFrame(drawFrame);
    };

    image.onerror = () => {
      if (cancelled) return;
      ctx.fillStyle = "#f5ead2";
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = "#332c25";
      ctx.font = "24px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Scene 3 image could not be loaded", WIDTH / 2, HEIGHT / 2);
    };

    imageToBinary(imageUrl)
      .then(({ arrayBuffer, uint8Array, blobUrl }) => {
        // Keep both binary representations available to the scene pipeline.
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
        console.error("[Scene 3] Unable to load image binary:", error);
        if (!cancelled) {
          ctx.fillStyle = "#f5ead2";
          ctx.fillRect(0, 0, WIDTH, HEIGHT);
          ctx.fillStyle = "#332c25";
          ctx.font = "24px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("Scene 3 image could not be loaded", WIDTH / 2, HEIGHT / 2);
        }
      });

    return () => {
      cancelled = true;
      if (rafId !== undefined) cancelAnimationFrame(rafId);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [imageUrl]);

  return (
    <canvas
      ref={canvasRef}
      width={WIDTH}
      height={HEIGHT}
      className={className}
      role="img"
      aria-label="Scene 3: a woman arrives beside a matcha-green Honda HR-V and greets the waiting man"
      style={{
        display: "block",
        width: "100%",
        height: "auto",
        aspectRatio: "9 / 16",
      }}
    />
  );
}

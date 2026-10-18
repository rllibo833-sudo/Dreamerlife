import { useEffect, useRef } from "react";
import { imageToBinary } from "../utils/binary.js";

const WIDTH = 720;
const HEIGHT = 1280;
const DURATION_MS = 4000;
const FRAME_INTERVAL_MS = 1000 / 60;
const DEFAULT_IMAGE_URL = "./05-night-phone.jpg";

export default function Scene5({
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
    let seed = 20261019;
    const image = new Image();
    const grainCanvas = document.createElement("canvas");
    grainCanvas.width = WIDTH;
    grainCanvas.height = HEIGHT;
    const grainCtx = grainCanvas.getContext("2d");

    const random = () => {
      seed = (seed * 1664525 + 1013904223) >>> 0;
      return seed / 4294967296;
    };

    const drawCover = (target, source, scale = 1, offsetX = 0, offsetY = 0) => {
      const ratio = source.naturalWidth / source.naturalHeight;
      const canvasRatio = WIDTH / HEIGHT;
      let w;
      let h;

      if (ratio > canvasRatio) {
        h = HEIGHT;
        w = HEIGHT * ratio;
      } else {
        w = WIDTH;
        h = WIDTH / ratio;
      }

      w *= scale;
      h *= scale;
      target.drawImage(
        source,
        (WIDTH - w) / 2 + offsetX,
        (HEIGHT - h) / 2 + offsetY,
        w,
        h
      );
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
      const time = timestamp - startTime;
      const progress = Math.min(1, time / DURATION_MS);
      const curtainX = Math.sin(time * 0.0006) * 8;
      const flicker = 0.9 + ((Math.floor(time / 300) % 2) * 0.3);
      const thumbY = -((time / 90) % 3);
      const breathing = 1 + Math.sin(time * 0.0015) * 0.006;

      // Main binary image layer with restrained camera breathing.
      ctx.clearRect(0, 0, WIDTH, HEIGHT);
      ctx.save();
      ctx.translate(WIDTH / 2, HEIGHT / 2);
      ctx.scale(breathing, breathing);
      ctx.translate(-WIDTH / 2, -HEIGHT / 2);
      drawCover(ctx, image, 1.015, curtainX * 0.2, 0);
      ctx.restore();

      // Cool phone glow and changing screen brightness.
      const phoneGlow = ctx.createRadialGradient(365, 735, 5, 365, 735, 330);
      phoneGlow.addColorStop(0, `rgba(80,160,255,${0.18 * flicker})`);
      phoneGlow.addColorStop(0.48, `rgba(80,145,255,${0.08 * flicker})`);
      phoneGlow.addColorStop(1, "rgba(80,145,255,0)");
      ctx.fillStyle = phoneGlow;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      // Screen reflection gently shifts across the face area.
      const faceGlow = ctx.createRadialGradient(
        365 + Math.sin(time * 0.001) * 8,
        520 + Math.cos(time * 0.0014) * 5,
        2,
        365,
        520,
        190
      );
      faceGlow.addColorStop(0, `rgba(80,160,255,${0.16 * flicker})`);
      faceGlow.addColorStop(1, "rgba(80,160,255,0)");
      ctx.fillStyle = faceGlow;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      // Thumb-scroll cue and small moving eye reflection.
      ctx.save();
      ctx.globalAlpha = 0.18 + flicker * 0.08;
      ctx.fillStyle = "#b7dcff";
      ctx.beginPath();
      ctx.ellipse(366, 740 + thumbY, 4, 7, 0.15, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#e0f2ff";
      ctx.beginPath();
      ctx.arc(355 + Math.sin(time * 0.002) * 4, 500, 2.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      // Curtain movement is represented as a subtle moving translucent fold.
      ctx.save();
      ctx.globalAlpha = 0.08;
      ctx.strokeStyle = "#b9c9df";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(90 + curtainX, 150);
      ctx.bezierCurveTo(105 + curtainX, 340, 80 - curtainX, 520, 100 + curtainX, 730);
      ctx.stroke();
      ctx.restore();

      // Deterministic twinkling city bokeh near the window.
      for (let i = 0; i < 18; i += 1) {
        const x = 40 + ((i * 47) % 210);
        const y = 210 + ((i * 61) % 410);
        const twinkle = 0.5 + 0.5 * Math.sin(time * (0.002 + (i % 4) * 0.0007) + i * 1.7);
        ctx.globalAlpha = 0.5 + twinkle * 0.5;
        ctx.fillStyle = i % 3 === 0 ? "#ffd58a" : "#9ccfff";
        ctx.beginPath();
        ctx.arc(x, y, 1.2 + (i % 3) * 0.45, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Soft glow pulses around the poster lettering.
      const posterPulse = 0.035 + (Math.sin(time * 0.002) + 1) * 0.025;
      const posterGlow = ctx.createRadialGradient(350, 210, 4, 350, 210, 155);
      posterGlow.addColorStop(0, `rgba(255,222,165,${posterPulse})`);
      posterGlow.addColorStop(1, "rgba(255,222,165,0)");
      ctx.fillStyle = posterGlow;
      ctx.fillRect(190, 60, 320, 300);

      // Vignette keeps the phone-lit center surrounded by darkness.
      const vignette = ctx.createRadialGradient(
        WIDTH / 2,
        HEIGHT * 0.48,
        220,
        WIDTH / 2,
        HEIGHT * 0.48,
        780
      );
      vignette.addColorStop(0, "rgba(0,0,8,0)");
      vignette.addColorStop(1, "rgba(0,0,8,0.68)");
      ctx.fillStyle = vignette;
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      // Refresh a small grain overlay every 12 frames for performance.
      if (frameCount % 12 === 0 && grainCtx) {
        const grain = grainCtx.createImageData(WIDTH, HEIGHT);
        for (let i = 0; i < grain.data.length; i += 4) {
          const value = Math.floor(random() * 255);
          grain.data[i] = value;
          grain.data[i + 1] = value;
          grain.data[i + 2] = value;
          grain.data[i + 3] = random() > 0.5 ? 14 : 0;
        }
        grainCtx.putImageData(grain, 0, 0);
      }
      if (grainCanvas) {
        ctx.globalAlpha = 0.13;
        ctx.drawImage(grainCanvas, 0, 0);
        ctx.globalAlpha = 1;
      }

      if (time >= DURATION_MS) {
        complete();
        return;
      }

      rafId = requestAnimationFrame(drawFrame);
    };

    image.onload = () => {
      if (!cancelled) rafId = requestAnimationFrame(drawFrame);
    };

    image.onerror = () => {
      if (cancelled) return;
      ctx.fillStyle = "#080d18";
      ctx.fillRect(0, 0, WIDTH, HEIGHT);
      ctx.fillStyle = "#dce8ff";
      ctx.font = "24px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Scene 5 image could not be loaded", WIDTH / 2, HEIGHT / 2);
    };

    imageToBinary(imageUrl)
      .then(({ arrayBuffer, uint8Array, blobUrl }) => {
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
        console.error("[Scene 5] Unable to load image binary:", error);
        if (!cancelled) {
          ctx.fillStyle = "#080d18";
          ctx.fillRect(0, 0, WIDTH, HEIGHT);
          ctx.fillStyle = "#dce8ff";
          ctx.font = "24px sans-serif";
          ctx.textAlign = "center";
          ctx.fillText("Scene 5 image could not be loaded", WIDTH / 2, HEIGHT / 2);
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
      className={className}
      width={WIDTH}
      height={HEIGHT}
      role="img"
      aria-label="Scene 5: lonely night bedroom illuminated by a phone screen"
      style={{ display: "block", width: "100%", aspectRatio: "9 / 16", background: "#080d18" }}
    />
  );
}

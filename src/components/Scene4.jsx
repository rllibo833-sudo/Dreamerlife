import { useEffect, useRef } from "react";
import { imageToBinary } from "../utils/binary.js";

const WIDTH = 720;
const HEIGHT = 1280;
const DURATION_MS = 6000;
const FRAME_INTERVAL_MS = 1000 / 60;
const DEFAULT_IMAGE_URL = "./04-cafe-interview.jpg";

export default function Scene4({
  imageUrl = DEFAULT_IMAGE_URL,
  className = "",
  onComplete,
}) {
  const imageCanvasRef = useRef(null);
  const effectCanvasRef = useRef(null);
  const onCompleteRef = useRef(onComplete);

  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  useEffect(() => {
    const baseCanvas = imageCanvasRef.current;
    const effectCanvas = effectCanvasRef.current;
    const base = baseCanvas?.getContext("2d");
    const effect = effectCanvas?.getContext("2d", { willReadFrequently: true });
    if (!baseCanvas || !effectCanvas || !base || !effect) return undefined;

    baseCanvas.width = effectCanvas.width = WIDTH;
    baseCanvas.height = effectCanvas.height = HEIGHT;

    const swirlCanvas = document.createElement("canvas");
    swirlCanvas.width = WIDTH;
    swirlCanvas.height = HEIGHT;
    const swirl = swirlCanvas.getContext("2d", { willReadFrequently: true });
    if (!swirl) return undefined;

    let cancelled = false;
    let rafId;
    let objectUrl;
    let startTime;
    let lastFrameTime = 0;
    let frameCount = 0;
    let completed = false;
    const image = new Image();

    const coverRect = (source, scale = 1) => {
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
      return { x: (WIDTH - w) / 2, y: (HEIGHT - h) / 2, w, h };
    };

    const drawCover = (target, source, scale = 1) => {
      const r = coverRect(source, scale);
      target.drawImage(source, r.x, r.y, r.w, r.h);
    };

    const drawGear = (target, x, y, radius, rotation, alpha) => {
      target.save();
      target.translate(x, y);
      target.rotate(rotation);
      target.globalAlpha = alpha;
      target.strokeStyle = "#ffe5a0";
      target.lineWidth = 2;
      target.beginPath();
      target.arc(0, 0, radius * 0.68, 0, Math.PI * 2);
      target.stroke();
      target.beginPath();
      for (let i = 0; i < 12; i += 1) {
        const a = (i / 12) * Math.PI * 2;
        const inner = radius * 0.68;
        const outer = i % 3 === 0 ? radius : radius * 0.88;
        target.moveTo(Math.cos(a) * inner, Math.sin(a) * inner);
        target.lineTo(Math.cos(a) * outer, Math.sin(a) * outer);
      }
      target.stroke();
      target.beginPath();
      target.arc(0, 0, radius * 0.2, 0, Math.PI * 2);
      target.stroke();
      target.restore();
    };

    const drawClock = (target, x, y, radius, rotation, alpha) => {
      target.save();
      target.translate(x, y);
      target.rotate(rotation);
      target.globalAlpha = alpha;
      target.strokeStyle = "#fff0c5";
      target.lineWidth = 2;
      target.beginPath();
      target.arc(0, 0, radius, 0, Math.PI * 2);
      target.stroke();
      for (let i = 0; i < 12; i += 1) {
        const a = (i / 12) * Math.PI * 2;
        target.beginPath();
        target.moveTo(Math.cos(a) * radius * 0.78, Math.sin(a) * radius * 0.78);
        target.lineTo(Math.cos(a) * radius * 0.88, Math.sin(a) * radius * 0.88);
        target.stroke();
      }
      target.beginPath();
      target.moveTo(0, 0);
      target.lineTo(0, -radius * 0.55);
      target.moveTo(0, 0);
      target.lineTo(radius * 0.4, radius * 0.16);
      target.stroke();
      target.restore();
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
      const fadeInOut = Math.sin(progress * Math.PI);
      const orbit = Math.sin(progress * Math.PI * 2) * (Math.PI / 60);
      const scale = 1 + 0.03 + (Math.sin(progress * Math.PI) * 0.03);
      const time = elapsed;

      // Bottom layer: image decoded from the binary ArrayBuffer blob URL.
      base.save();
      base.clearRect(0, 0, WIDTH, HEIGHT);
      base.translate(WIDTH / 2, HEIGHT / 2);
      base.rotate(orbit);
      base.scale(scale, scale);
      base.translate(-WIDTH / 2, -HEIGHT / 2);
      drawCover(base, image, 1);
      base.restore();

      // Build the swirl in an offscreen canvas so pixel effects never stall the image layer.
      swirl.clearRect(0, 0, WIDTH, HEIGHT);
      swirl.save();
      swirl.translate(WIDTH * 0.5, HEIGHT * 0.48);
      swirl.rotate(time * 0.00105);
      swirl.globalAlpha = 0.18 + fadeInOut * 0.48;
      swirl.globalCompositeOperation = "screen";

      for (let ring = 0; ring < 4; ring += 1) {
        const radius = 115 + ring * 58;
        swirl.save();
        swirl.rotate(ring * 0.6);
        const gradient = swirl.createLinearGradient(-radius, -radius, radius, radius);
        gradient.addColorStop(0, "rgba(255,215,135,0)");
        gradient.addColorStop(0.48, "rgba(255,222,151,0.95)");
        gradient.addColorStop(1, "rgba(255,244,208,0)");
        swirl.strokeStyle = gradient;
        swirl.lineWidth = 2.5 - ring * 0.3;
        swirl.beginPath();
        swirl.ellipse(0, 0, radius * 1.15, radius * 0.64, ring * 0.35, -0.45, Math.PI * 1.55);
        swirl.stroke();
        swirl.restore();
      }
      swirl.restore();

      // Faint clock and gear motifs rotate against the swirl direction.
      const iconAlpha = 0.12 + fadeInOut * 0.2;
      drawClock(swirl, 120, 375, 34, -time * 0.00065, iconAlpha);
      drawGear(swirl, 575, 515, 31, -time * 0.0008, iconAlpha * 0.9);
      drawGear(swirl, 180, 775, 22, time * 0.00055, iconAlpha * 0.65);
      drawClock(swirl, 565, 850, 26, time * 0.0006, iconAlpha * 0.8);

      // Paper tremble, sweat glint, eye blink and breathing are localized overlays.
      // Coordinates are approximate because the supplied artwork is a single flattened image.
      const paperX = Math.sin(time * 0.005) * 2;
      swirl.save();
      swirl.globalAlpha = 0.42;
      swirl.strokeStyle = "#fff0c6";
      swirl.lineWidth = 1.5;
      swirl.beginPath();
      swirl.moveTo(202 + paperX, 650);
      swirl.lineTo(215 + paperX, 640);
      swirl.lineTo(224 + paperX, 656);
      swirl.stroke();
      const sweatX = 252 + Math.sin(time * 0.003) * 1.5;
      const sweatY = 425 + Math.cos(time * 0.004) * 2;
      const sweatGlow = 0.25 + (Math.sin(time * 0.012) + 1) * 0.25;
      swirl.fillStyle = `rgba(255,255,238,${sweatGlow})`;
      swirl.beginPath();
      swirl.ellipse(sweatX, sweatY, 3, 5, 0.2, 0, Math.PI * 2);
      swirl.fill();
      swirl.restore();

      const blinkCycle = (time % 2200) / 2200;
      const blink = blinkCycle > 0.91 && blinkCycle < 0.96
        ? 1 - (blinkCycle - 0.91) / 0.05 * 0.9
        : 1;
      swirl.save();
      swirl.globalAlpha = 0.12;
      swirl.fillStyle = "#493b32";
      swirl.translate(475, 385);
      swirl.scale(1, blink);
      swirl.fillRect(-16, -2, 32, 4);
      swirl.restore();

      // Pendant-light swing glows and rising coffee steam.
      for (let i = 0; i < 3; i += 1) {
        const x = 155 + i * 205;
        const swing = Math.sin(time * 0.0018 + i * 1.4) * 5;
        const glow = swirl.createRadialGradient(x + swing, 155, 1, x + swing, 155, 52);
        glow.addColorStop(0, `rgba(255,226,154,${0.14 + fadeInOut * 0.08})`);
        glow.addColorStop(1, "rgba(255,226,154,0)");
        swirl.fillStyle = glow;
        swirl.fillRect(x + swing - 52, 103, 104, 104);
      }
      for (let i = 0; i < 5; i += 1) {
        const steamPhase = (time * 0.035 + i * 23) % 100;
        const sx = 360 + Math.sin(time * 0.0015 + i) * (5 + i);
        const sy = 755 - steamPhase;
        swirl.globalAlpha = (1 - steamPhase / 100) * 0.22;
        swirl.strokeStyle = "#fff4d8";
        swirl.lineWidth = 2;
        swirl.beginPath();
        swirl.moveTo(sx, sy + 16);
        swirl.bezierCurveTo(sx - 9, sy + 7, sx + 9, sy - 2, sx, sy - 14);
        swirl.stroke();
      }

      // Binary-inspired pixel wave is limited to the offscreen swirl layer.
      if (frameCount % 8 === 0) {
        try {
          const top = Math.floor(HEIGHT * 0.28);
          const pixels = swirl.getImageData(0, top, WIDTH, HEIGHT - top);
          const data = pixels.data;
          for (let i = 0; i < data.length; i += 4) {
            const wave = Math.sin(time * 0.003 + i * 0.00012) * 2;
            data[i] = Math.max(0, Math.min(255, data[i] + wave));
            data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + wave * 0.55));
          }
          swirl.putImageData(pixels, 0, top);
        } catch (error) {
          console.warn("[Scene 4] Swirl pixel-wave skipped:", error);
        }
      }

      effect.clearRect(0, 0, WIDTH, HEIGHT);
      effect.save();
      effect.globalCompositeOperation = "screen";
      effect.globalAlpha = Math.min(0.7, fadeInOut * 0.7);
      effect.drawImage(swirlCanvas, 0, 0);
      effect.restore();

      if (elapsed >= DURATION_MS) {
        complete();
        return;
      }
      rafId = requestAnimationFrame(drawFrame);
    };

    image.onload = () => {
      if (cancelled) return;
      if (!image.naturalWidth || !image.naturalHeight) {
        console.error("[Scene 4] Loaded image has invalid dimensions.");
        return;
      }
      rafId = requestAnimationFrame(drawFrame);
    };

    image.onerror = () => {
      if (cancelled) return;
      for (const context of [base, effect]) {
        context.fillStyle = "#f5ead2";
        context.fillRect(0, 0, WIDTH, HEIGHT);
        context.fillStyle = "#332c25";
        context.font = "24px sans-serif";
        context.textAlign = "center";
        context.fillText("Scene 4 image could not be loaded", WIDTH / 2, HEIGHT / 2);
      }
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
        console.error("[Scene 4] Unable to load image binary:", error);
        if (!cancelled) {
          base.fillStyle = "#f5ead2";
          base.fillRect(0, 0, WIDTH, HEIGHT);
          base.fillStyle = "#332c25";
          base.font = "24px sans-serif";
          base.textAlign = "center";
          base.fillText("Scene 4 image could not be loaded", WIDTH / 2, HEIGHT / 2);
        }
      });

    return () => {
      cancelled = true;
      if (rafId !== undefined) cancelAnimationFrame(rafId);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [imageUrl]);

  return (
    <div
      className={className}
      role="img"
      aria-label="Scene 4: a nervous cafe interview as golden time swirls show time passing quickly"
      style={{
        position: "relative",
        width: "100%",
        aspectRatio: "9 / 16",
        overflow: "hidden",
        background: "#f5ead2",
      }}
    >
      <canvas
        ref={imageCanvasRef}
        width={WIDTH}
        height={HEIGHT}
        style={{ display: "block", width: "100%", height: "100%" }}
      />
      <canvas
        ref={effectCanvasRef}
        width={WIDTH}
        height={HEIGHT}
        aria-hidden="true"
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          pointerEvents: "none",
        }}
      />
    </div>
  );
}

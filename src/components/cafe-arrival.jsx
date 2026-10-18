import { useEffect, useRef } from "react";
import { imageToBinary } from "../utils/binary.js";

const DEFAULT_IMAGE_URL = "./01-cafe-arrival.jpg";

/**
 * Scene 1: a nervous job applicant arrives at an empty industrial cafe.
 * A restrained Ken Burns movement keeps the original watercolor artwork intact.
 */
export default function CafeArrival({ imageUrl = DEFAULT_IMAGE_URL, className = "" }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const context = canvas?.getContext("2d");
    if (!canvas || !context) return undefined;

    let frameId;
    let cancelled = false;
    let objectUrl;
    let startTime;

    canvas.width = 720;
    canvas.height = 1280;

    const image = new Image();
    image.onload = () => {
      if (cancelled) return;

      const drawFrame = (timestamp) => {
        if (cancelled) return;
        if (startTime === undefined) startTime = timestamp;

        const elapsed = (timestamp - startTime) / 1000;
        const progress = (1 - Math.cos((elapsed / 12) * Math.PI * 2)) / 2;
        const scale = 1.015 + progress * 0.035;
        const imageRatio = image.width / image.height;
        const canvasRatio = canvas.width / canvas.height;

        let baseWidth;
        let baseHeight;
        if (imageRatio > canvasRatio) {
          baseHeight = canvas.height;
          baseWidth = baseHeight * imageRatio;
        } else {
          baseWidth = canvas.width;
          baseHeight = baseWidth / imageRatio;
        }

        const drawWidth = baseWidth * scale;
        const drawHeight = baseHeight * scale;
        const driftX = Math.sin(elapsed * 0.22) * 5;
        const driftY = Math.cos(elapsed * 0.18) * 4;
        const x = (canvas.width - drawWidth) / 2 + driftX;
        const y = (canvas.height - drawHeight) / 2 + driftY;

        context.clearRect(0, 0, canvas.width, canvas.height);
        context.drawImage(image, x, y, drawWidth, drawHeight);
        frameId = requestAnimationFrame(drawFrame);
      };

      frameId = requestAnimationFrame(drawFrame);
    };
    image.onerror = () => {
      if (!cancelled) {
        context.fillStyle = "#242424";
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.fillStyle = "#ffffff";
        context.font = "24px sans-serif";
        context.textAlign = "center";
        context.fillText("Scene 1 image could not be loaded", canvas.width / 2, canvas.height / 2);
      }
    };

    imageToBinary(imageUrl)
      .then(({ blobUrl }) => {
        if (cancelled) {
          URL.revokeObjectURL(blobUrl);
          return;
        }
        objectUrl = blobUrl;
        image.src = blobUrl;
      })
      .catch((error) => {
        console.error("[Scene 1] Unable to prepare cafe arrival image:", error);
        image.src = imageUrl;
      });

    return () => {
      cancelled = true;
      if (frameId !== undefined) cancelAnimationFrame(frameId);
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [imageUrl]);

  return (
    <canvas
      ref={canvasRef}
      width={720}
      height={1280}
      className={className}
      role="img"
      aria-label="Scene 1: a nervous young man holding job application papers inside an empty industrial cafe"
      style={{ display: "block", width: "100%", height: "auto", aspectRatio: "9 / 16" }}
    />
  );
}

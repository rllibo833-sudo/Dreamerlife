import { useEffect, useRef } from "react";
import { imageToBinary } from "../utils/binary.js";
import { SCENE1 } from "../scenes/scene1/scene1.config.js";
import { drawScene1Frame } from "../scenes/scene1/scene1-renderer.js";

const DEFAULT_IMAGE_URL = `${import.meta.env.BASE_URL}photos/01-cafe-arrival.jpg`;

/**
 * Scene 1: the original watercolor cafe-arrival illustration.
 * Rendering is delegated to src/scenes/scene1 so composition and motion
 * can be refined without mixing animation math into the React lifecycle.
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

    canvas.width = SCENE1.width;
    canvas.height = SCENE1.height;

    const image = new Image();
    image.onload = () => {
      if (cancelled) return;

      const drawFrame = (timestamp) => {
        if (cancelled) return;
        if (startTime === undefined) startTime = timestamp;
        drawScene1Frame(context, image, timestamp - startTime);
        frameId = requestAnimationFrame(drawFrame);
      };

      frameId = requestAnimationFrame(drawFrame);
    };

    image.onerror = () => {
      if (cancelled) return;
      context.fillStyle = "#242424";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.fillStyle = "#ffffff";
      context.font = "24px sans-serif";
      context.textAlign = "center";
      context.fillText("Scene 1 image could not be loaded", canvas.width / 2, canvas.height / 2);
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
        if (!cancelled) image.src = imageUrl;
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
      width={SCENE1.width}
      height={SCENE1.height}
      className={className}
      role="img"
      aria-label="Scene 1: a nervous young man holding job application papers inside an empty industrial cafe"
      style={{ display: "block", width: "100%", height: "auto", aspectRatio: "9 / 16" }}
    />
  );
}

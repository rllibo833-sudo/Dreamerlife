import { useCallback, useEffect, useRef, useState } from "react";
import CafeArrival from "./cafe-arrival.jsx";
import Scene2 from "./Scene2.jsx";
import Scene3 from "./Scene3.jsx";
import Scene4 from "./Scene4.jsx";
import Scene5 from "./Scene5.jsx";

const WIDTH = 720;
const HEIGHT = 1280;
const SCENES = [
  { id: 1, duration: 4000, image: `${import.meta.env.BASE_URL}photos/01-cafe-arrival.jpg` },
  { id: 2, duration: 5000, image: `${import.meta.env.BASE_URL}photos/02-waiting-at-cafe.jpg` },
  { id: 3, duration: 6000, image: `${import.meta.env.BASE_URL}photos/03-woman-arrives.jpg` },
  { id: 4, duration: 6000, image: `${import.meta.env.BASE_URL}photos/04-cafe-interview.jpg` },
  { id: 5, duration: 4000, image: `${import.meta.env.BASE_URL}photos/05-night-phone.jpg` },
];

const wait = (ms) => new Promise((resolve) => window.setTimeout(resolve, ms));

function SceneRenderer({ scene }) {
  const props = { key: scene, imageUrl: SCENES[scene - 1].image };
  switch (scene) {
    case 1:
      return <CafeArrival {...props} />;
    case 2:
      return <Scene2 {...props} />;
    case 3:
      return <Scene3 {...props} />;
    case 4:
      return <Scene4 {...props} />;
    default:
      return <Scene5 {...props} />;
  }
}

export default function VideoExporter({ className = "" }) {
  const [exporting, setExporting] = useState(false);
  const [status, setStatus] = useState("Ready to export 25-second video");
  const [activeScene, setActiveScene] = useState(1);
  const stageRef = useRef(null);
  const cancelledRef = useRef(false);

  useEffect(() => () => {
    cancelledRef.current = true;
  }, []);

  const exportFullVideo = useCallback(async () => {
    if (exporting) return;

    const master = document.createElement("canvas");
    master.width = WIDTH;
    master.height = HEIGHT;
    const ctx = master.getContext("2d");
    if (!ctx) {
      setStatus("Canvas recording is not available in this browser.");
      return;
    }

    if (!("MediaRecorder" in window) || !master.captureStream) {
      setStatus("Video export needs a browser that supports MediaRecorder and canvas capture.");
      return;
    }

    cancelledRef.current = false;
    setExporting(true);
    setStatus("Preparing video…");

    let audioContext;
    let audioElement;
    let audioObjectUrl;
    let recorder;
    let animationId;
    let stream;

    try {
      const videoStream = master.captureStream(30);
      stream = videoStream;

      // Optional soundtrack: attempt both conventional public paths.
      try {
        let response = await fetch(`${import.meta.env.BASE_URL}music/baila.mp3`);
        if (!response.ok) response = await fetch(`${import.meta.env.BASE_URL}baila.mp3`);
        if (response.ok) {
          const audioBlob = await response.blob();
          audioObjectUrl = URL.createObjectURL(audioBlob);
          audioElement = new Audio();
          audioElement.src = audioObjectUrl;
          audioElement.loop = false;
          audioElement.crossOrigin = "anonymous";
          audioContext = new AudioContext();
          const source = audioContext.createMediaElementSource(audioElement);
          const destination = audioContext.createMediaStreamDestination();
          source.connect(destination);
          source.connect(audioContext.destination);
          destination.stream.getAudioTracks().forEach((track) => {
            videoStream.addTrack(track);
          });
          await audioContext.resume();
        } else {
          setStatus("Music file not found; exporting video without audio…");
        }
      } catch (audioError) {
        console.warn("[VideoExporter] Audio unavailable; continuing silently.", audioError);
        setStatus("Audio unavailable; exporting video without audio…");
      }

      const mimeType = [
        "video/webm;codecs=vp9,opus",
        "video/webm;codecs=vp8,opus",
        "video/webm",
      ].find((type) => MediaRecorder.isTypeSupported(type));

      if (!mimeType) {
        throw new Error("This browser does not offer a supported WebM recording format.");
      }

      const chunks = [];
      recorder = new MediaRecorder(videoStream, {
        mimeType,
        videoBitsPerSecond: 5_000_000,
      });

      const finished = new Promise((resolve, reject) => {
        recorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) chunks.push(event.data);
        };
        recorder.onerror = () => reject(new Error("The browser failed while recording."));
        recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
      });

      // Continuously copy the currently rendered scene canvas into the master.
      let drawFrame = () => {
        if (cancelledRef.current) return;
        const canvases = stageRef.current?.querySelectorAll("canvas");
        if (canvases?.length) {
          ctx.clearRect(0, 0, WIDTH, HEIGHT);
          ctx.fillStyle = "#080d18";
          ctx.fillRect(0, 0, WIDTH, HEIGHT);
          canvases.forEach((canvas) => {
            if (canvas.width && canvas.height) {
              ctx.drawImage(canvas, 0, 0, WIDTH, HEIGHT);
            }
          });
        }
        animationId = requestAnimationFrame(drawFrame);
      };

      setActiveScene(1);
      await wait(500);
      if (cancelledRef.current) throw new Error("Export cancelled.");
      recorder.start(250);
      animationId = requestAnimationFrame(drawFrame);
      if (audioElement) {
        try {
          await audioElement.play();
        } catch (error) {
          console.warn("[VideoExporter] Audio playback was blocked.", error);
        }
      }

      let elapsedTotal = 0;
      for (const scene of SCENES) {
        if (cancelledRef.current) throw new Error("Export cancelled.");
        setActiveScene(scene.id);
        setStatus(`Recording scene ${scene.id}/5… (${elapsedTotal / 1000}s / 25s)`);
        // Let React mount the scene and its binary image before the segment begins.
        await wait(450);
        const segmentStarted = performance.now();
        while (performance.now() - segmentStarted < scene.duration) {
          if (cancelledRef.current) throw new Error("Export cancelled.");
          await wait(50);
        }
        elapsedTotal += scene.duration;
      }

      setStatus("Finalizing WebM…");
      if (animationId !== undefined) cancelAnimationFrame(animationId);
      if (recorder.state !== "inactive") recorder.stop();
      const blob = await finished;

      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "dreamerlife-final-25s.webm";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);

      setStatus(`Export complete: ${(blob.size / (1024 * 1024)).toFixed(1)} MB WebM`);
    } catch (error) {
      console.error("[VideoExporter]", error);
      if (recorder && recorder.state !== "inactive") {
        try { recorder.stop(); } catch {}
      }
      setStatus(error instanceof Error ? error.message : "Video export failed.");
    } finally {
      if (animationId !== undefined) cancelAnimationFrame(animationId);
      stream?.getTracks().forEach((track) => track.stop());
      if (audioElement) audioElement.pause();
      if (audioContext && audioContext.state !== "closed") {
        await audioContext.close().catch(() => {});
      }
      if (audioObjectUrl) URL.revokeObjectURL(audioObjectUrl);
      setExporting(false);
    }
  }, [exporting]);

  return (
    <section className={className} style={{ display: "grid", gap: 12 }}>
      <button
        type="button"
        onClick={exportFullVideo}
        disabled={exporting}
        style={{
          padding: "12px 18px",
          border: 0,
          borderRadius: 10,
          background: exporting ? "#667085" : "#164e9a",
          color: "#fff",
          fontWeight: 700,
          cursor: exporting ? "wait" : "pointer",
        }}
      >
        {exporting ? "Exporting 25s video…" : "Export final video (25s)"}
      </button>
      <p role="status" aria-live="polite" style={{ margin: 0, fontSize: 14 }}>
        {status}
      </p>
      <div
        ref={stageRef}
        aria-hidden="true"
        style={{
          position: "fixed",
          left: -10000,
          top: 0,
          width: WIDTH,
          height: HEIGHT,
          overflow: "hidden",
          pointerEvents: "none",
        }}
      >
        <SceneRenderer scene={activeScene} />
      </div>
    </section>
  );
}

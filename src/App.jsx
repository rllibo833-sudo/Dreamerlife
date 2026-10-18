import { useEffect, useState } from "react";
import CafeArrival from "./components/cafe-arrival.jsx";
import Scene2 from "./components/Scene2.jsx";

/**
 * Minimal sequence host: Scene 1 plays first, then Scene 2.
 * Each scene is presented for five seconds.
 */
export default function App() {
  const [scene, setScene] = useState(1);

  useEffect(() => {
    if (scene !== 1) return undefined;
    const timeoutId = window.setTimeout(() => setScene(2), 5000);
    return () => window.clearTimeout(timeoutId);
  }, [scene]);

  return (
    <main style={{ width: "100%", maxWidth: 720, margin: "0 auto", background: "#111" }}>
      {scene === 1 ? (
        <CafeArrival imageUrl="./01-cafe-arrival.jpg" />
      ) : (
        <Scene2 imageUrl="./02-waiting-at-cafe.jpg" />
      )}
    </main>
  );
}

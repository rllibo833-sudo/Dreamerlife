import { useEffect, useState } from "react";
import CafeArrival from "./components/cafe-arrival.jsx";
import Scene2 from "./components/Scene2.jsx";
import Scene3 from "./components/Scene3.jsx";
import Scene4 from "./components/Scene4.jsx";

const SCENE_DURATIONS = {
  1: 5000,
  2: 5000,
  3: 6000,
  4: 6000,
};

export default function App() {
  const [scene, setScene] = useState(1);

  useEffect(() => {
    if (scene >= 4) return undefined;

    const timeoutId = window.setTimeout(
      () => setScene((current) => Math.min(4, current + 1)),
      SCENE_DURATIONS[scene]
    );

    return () => window.clearTimeout(timeoutId);
  }, [scene]);

  return (
    <main
      style={{
        width: "100%",
        maxWidth: 720,
        margin: "0 auto",
        background: "#111",
      }}
    >
      {scene === 1 && <CafeArrival imageUrl="./01-cafe-arrival.jpg" />}
      {scene === 2 && <Scene2 imageUrl="./02-waiting-at-cafe.jpg" />}
      {scene === 3 && <Scene3 imageUrl="./03-woman-arrives.jpg" />}
      {scene === 4 && <Scene4 imageUrl="./04-cafe-interview.jpg" />}
    </main>
  );
}

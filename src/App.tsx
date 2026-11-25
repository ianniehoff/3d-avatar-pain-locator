import { DisclaimerBanner } from "./components/DisclaimerBanner";
import { lazy, Suspense } from "react";
import { InfoPanel } from "./components/InfoPanel";
import { RegionListFallback } from "./components/RegionListFallback";

// The 3D viewer (three.js + react-three-fiber) is the bulk of the JavaScript, so
// it loads in its own chunk while the rest of the page renders immediately.
const Viewer3D = lazy(() => import("./components/Viewer3D").then((m) => ({ default: m.Viewer3D })));

function App() {
  return (
    <div className="app">
      <header className="app__header">
        <h1>Where does it hurt?</h1>
        <p className="app__subtitle">
          Rotate, zoom, and click on the model to pinpoint the area.
        </p>
      </header>

      <DisclaimerBanner />

      <main className="app__main">
        <Suspense fallback={<div className="viewer3d viewer3d--placeholder">Loading 3D viewer…</div>}>
          <Viewer3D />
        </Suspense>
        <aside className="app__side">
          <InfoPanel />
          <RegionListFallback />
        </aside>
      </main>

      <footer className="app__footer">
        3D model &ldquo;Human Models Set &ndash; Male/Female (Rigged)&rdquo; by{" "}
        <a href="https://sketchfab.com/lzyassoul" target="_blank" rel="noreferrer">
          lzyassoul
        </a>
        , licensed{" "}
        <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noreferrer">
          CC BY 4.0
        </a>
        .
      </footer>
    </div>
  );
}

export default App;

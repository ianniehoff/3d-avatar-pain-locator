import { lazy, Suspense, useState } from "react";
import { DisclaimerBanner } from "./components/DisclaimerBanner";
import { InfoPanel } from "./components/InfoPanel";
import { RegionListFallback } from "./components/RegionListFallback";
import { PhoneSheet } from "./components/PhoneSheet";
import { Attribution } from "./components/Attribution";
import { useIsPhone } from "./hooks/useDevice";

// The 3D viewer (three.js + react-three-fiber) is the bulk of the JavaScript, so
// it loads in its own chunk while the rest of the page renders immediately.
const Viewer3D = lazy(() => import("./components/Viewer3D").then((m) => ({ default: m.Viewer3D })));

function Viewer() {
  return (
    <Suspense fallback={<div className="viewer3d viewer3d--placeholder">Loading 3D viewer…</div>}>
      <Viewer3D />
    </Suspense>
  );
}

/** Phones: compact header, full-screen model, details in a bottom sheet. */
function PhoneApp() {
  const [showDisclaimer, setShowDisclaimer] = useState(false);
  return (
    <div className="app app--phone">
      <header className="app__header">
        <h1>Where does it hurt?</h1>
        <button
          type="button"
          className="app__disclaimer-toggle"
          aria-expanded={showDisclaimer}
          onClick={() => setShowDisclaimer((v) => !v)}
        >
          Not a diagnosis ⓘ
        </button>
      </header>
      {showDisclaimer && <DisclaimerBanner />}
      <main className="app__main">
        <Viewer />
      </main>
      <PhoneSheet />
    </div>
  );
}

/** Tablets and desktops: model and info side by side. */
function WideApp() {
  return (
    <div className="app">
      <header className="app__header">
        <h1>Where does it hurt?</h1>
        <p className="app__subtitle">Rotate, zoom, and select a spot on the model to pinpoint the area.</p>
      </header>

      <DisclaimerBanner />

      <main className="app__main">
        <Viewer />
        <aside className="app__side">
          <InfoPanel />
          <RegionListFallback />
        </aside>
      </main>

      <footer className="app__footer">
        <Attribution />
      </footer>
    </div>
  );
}

function App() {
  return useIsPhone() ? <PhoneApp /> : <WideApp />;
}

export default App;

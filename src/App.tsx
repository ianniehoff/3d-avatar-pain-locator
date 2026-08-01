import { DisclaimerBanner } from "./components/DisclaimerBanner";
import { Viewer3D } from "./components/Viewer3D";
import { InfoPanel } from "./components/InfoPanel";
import { RegionListFallback } from "./components/RegionListFallback";

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
        <Viewer3D />
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

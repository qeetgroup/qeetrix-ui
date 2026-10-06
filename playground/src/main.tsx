import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

/**
 * One entry, two documents: the playground shell, or — for `#/frame/…` — a bare preview frame
 * (see src/lib/frame.ts). Each loads only its own half.
 */
const container = document.getElementById("root");
if (!container) throw new Error("The playground needs a #root element.");
const root = createRoot(container);

if (window.location.hash.startsWith("#/frame/")) {
  void import("./frame/frame-app").then(({ FrameApp }) =>
    root.render(
      <StrictMode>
        <FrameApp />
      </StrictMode>,
    ),
  );
} else {
  void import("./shell/app").then(({ App }) =>
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    ),
  );
}

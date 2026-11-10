import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./index.css";
import { captureLeadAttribution } from "./utils/leadAttribution";
import { restoreSharedSession } from "./utils/sharedLogin";

captureLeadAttribution();

// Signed in on Virtual Office? Pick up that session before the first render
// (capped at 2.5s so a slow API never blocks the site).
restoreSharedSession().finally(() => {
  ReactDOM.createRoot(document.getElementById("root")).render(
    <BrowserRouter>
      <App />
    </BrowserRouter>
  );
});

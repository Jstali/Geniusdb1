import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.jsx";

// Limit console.log output to two messages in development
if (import.meta.env.MODE === "development") {
  const originalLog = console.log;
  let __logCount = 0;
  const MAX_LOGS = Number(import.meta.env.VITE_MAX_LOGS || 2);
  console.log = (...args) => {
    if (__logCount < MAX_LOGS) {
      originalLog(...args);
      __logCount++;
    }
  };
}

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>
);

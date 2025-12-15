// Utility to resolve the Google Maps JavaScript API key in any runtime.
// Checks runtime-injected config (window._env_) first so Docker/Nginx builds
// can override the value, then falls back to Vite build-time env vars for dev.

const resolveFromRuntime = () => {
  if (typeof window !== "undefined" && window._env_) {
    const key = window._env_.VITE_GOOGLE_MAPS_API_KEY;
    if (typeof key === "string" && key.trim().length > 0) {
      return key.trim();
    }
  }
  return null;
};

const resolveFromBuild = () => {
  if (typeof import.meta !== "undefined" && import.meta.env) {
    const key = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;
    if (typeof key === "string" && key.trim().length > 0) {
      return key.trim();
    }
  }
  return null;
};

export const getGoogleMapsApiKey = () => {
  return resolveFromRuntime() || resolveFromBuild() || "";
};

export default {
  getGoogleMapsApiKey,
};


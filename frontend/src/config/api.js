/**
 * API Configuration
 * This file provides the API base URL that works across all domains
 * It uses relative paths by default for production
 */

// Get API base from runtime config (injected by Docker), environment variable, or default to relative path
const getApiBase = () => {
  // Check if runtime config is available (from env-config.js)
  if (typeof window !== 'undefined' && window._env_ && window._env_.API_BASE !== undefined) {
    return window._env_.API_BASE;
  }
  
  // Check build-time environment variable (for development)
  if (import.meta.env.VITE_API_BASE) {
    return import.meta.env.VITE_API_BASE;
  }
  
  // Default to empty string (relative URLs) for production
  // This allows the app to work on any domain
  return '';
};

export const API_BASE = getApiBase();

// Helper function to construct full API URLs
export const getApiUrl = (endpoint) => {
  // If endpoint already starts with http, return as is
  if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    return endpoint;
  }
  
  // Remove leading slash from endpoint if present
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  
  // If API_BASE is empty or just '/', return endpoint with leading slash
  if (!API_BASE || API_BASE === '/') {
    return `/${cleanEndpoint}`;
  }
  
  // Otherwise concatenate API_BASE with endpoint
  const base = API_BASE.endsWith('/') ? API_BASE.slice(0, -1) : API_BASE;
  return `${base}/${cleanEndpoint}`;
};

export default { API_BASE, getApiUrl };


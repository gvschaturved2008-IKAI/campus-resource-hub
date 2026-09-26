/**
 * Base URL for all API and Socket.IO requests.
 * In production (when served by Railway Express server), it defaults to '' (same origin).
 * In development, it defaults to 'http://localhost:5000' or the VITE_API_URL environment variable.
 */
export const API_BASE_URL =
  import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '' : 'http://localhost:5000');

export default API_BASE_URL;

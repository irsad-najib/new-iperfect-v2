/**
 * Constants index
 * Re-exports all constants for easy importing
 */

// Re-export new modular constants
export * from "./app";
export * from "./styles";

// Legacy constants (kept for backward compatibility)
export const APP_NAME = "iPerfect";
export const APP_VERSION = "2.0.0";

export const API_TIMEOUT = 30000; // 30 seconds

export const SIDEBAR_WIDTH = {
  EXPANDED: 300,
  COLLAPSED: 80,
} as const;

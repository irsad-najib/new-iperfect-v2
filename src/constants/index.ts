// Constants for the application

export const APP_NAME = "iPerfect";
export const APP_VERSION = "2.0.0";

// API Configuration
export const API_TIMEOUT = 30000; // 30 seconds

// Cookie/Storage Keys
export const STORAGE_KEYS = {
  API_KEY: "api_key",
  ACCESS_TOKEN: "access",
  TOKEN: "token",
  SELECTED_DATE: "selectedDate",
} as const;

// Route Paths
export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  DAILY_ROUTINES: "/daily-routines",
  PROCESSES: "/processes",
  NPK: "/npk",
  BB: "/bb",
  REPORT: "/report",
  GLOBAL_CONFIG: "/global-config",
} as const;

// UI Constants
export const SIDEBAR_WIDTH = {
  EXPANDED: 300,
  COLLAPSED: 80,
} as const;

// Date Formats
export const DATE_FORMATS = {
  API: "YYYY-MM-DD",
  DISPLAY: "DD MMM YYYY",
  FULL: "DD MMMM YYYY",
} as const;

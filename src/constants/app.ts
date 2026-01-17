/**
 * Application Constants
 * Central location for all app-wide constants
 */

/**
 * API endpoints base paths
 */
export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: "/login",
    LOGOUT: "/logout",
    CURRENT_USER: "/current_user",
  },
  CLEANSING: {
    BASE: "/daily_amur/cleansing",
    STATUS: "/daily_amur/cleansing/all-status",
    RUN: "/daily_amur/cleansing/run",
    STOP: "/daily_amur/cleansing/stop",
  },
  UTILS: {
    FACTORIES: "/daily_amur/utils/factories",
    PARTS: "/daily_amur/utils/parts",
    LAB: "/daily_amur/utils/lab",
    SYNC: "/daily_amur/utils/sync-adpro-dcs/start",
  },
} as const;

/**
 * Local storage keys
 */
export const STORAGE_KEYS = {
  API_KEY: "api_key",
  ACCESS_TOKEN: "access",
  SELECTED_DATE: "selectedDate",
  SELECTED_ITEM: "selectedItem",
  REMEMBER_ME: "rememberMe",
} as const;

/**
 * Cookie names
 */
export const COOKIE_NAMES = {
  API_KEY: "api_key",
} as const;

/**
 * Route paths
 */
export const ROUTES = {
  HOME: "/",
  DAILY_ROUTINES: "/daily-routines",
  PROCESSES: {
    BASE: "/processes",
    INPUT_DATA: "/processes/input-data",
    CLEANSING: "/processes/cleansing",
    TIE_IN: "/processes/tie-in",
    COMPARE: "/processes/compare",
  },
  GLOBAL_CONFIG: "/global-config",
} as const;

/**
 * Process status types
 */
export const PROCESS_STATUS = {
  DONE: "Done",
  IN_PROGRESS: "In Progress",
  UNAVAILABLE: "Unavailable",
} as const;

/**
 * Job status types
 */
export const JOB_STATUS = {
  COMPLETED: "completed",
  FAILED: "failed",
  RUNNING: "running",
} as const;

/**
 * Date formats
 */
export const DATE_FORMATS = {
  API: "YYYY-MM-DD",
  DISPLAY: "DD MMM YYYY",
  DISPLAY_FULL: "DD MMMM YYYY",
  TIME: "HH:mm:ss",
  DATETIME: "YYYY-MM-DD HH:mm:ss",
} as const;

/**
 * Pagination defaults
 */
export const PAGINATION = {
  DEFAULT_PAGE_SIZE: 25,
  PAGE_SIZE_OPTIONS: [25, 50, 100],
} as const;

/**
 * Table scroll configuration
 */
export const TABLE_SCROLL = {
  X: 1500,
  Y: "calc(100vh - 400px)",
} as const;

/**
 * Delay times (in milliseconds)
 */
export const DELAYS = {
  DEBOUNCE: 300,
  LOADING: 500,
  NAVIGATION: 500,
  TOAST: 2000,
} as const;

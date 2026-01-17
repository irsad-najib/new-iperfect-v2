/**
 * Tailwind CSS Constants
 * Centralized styling constants for consistent UI across the app
 */

/**
 * Table styling classes for Ant Design tables
 * Provides consistent styling for table headers, cells, and interactive elements
 */
export const TABLE_CLASSES = {
  // Base table classes
  base: "w-full",

  // Header row styling
  header: [
    "[&_.ant-table-thead>tr>th]:bg-neutral-250!",
    "[&_.ant-table-thead>tr>th]:text-neutral-900!",
    "[&_.ant-table-thead>tr>th]:font-semibold!",
    "[&_.ant-table-thead>tr>th]:text-center!",
    "[&_.ant-table-thead>tr>th]:p-3!",
  ].join(" "),

  // Body row styling
  body: [
    "[&_.ant-table-tbody>tr>td]:text-center!",
    "[&_.ant-table-tbody>tr>td]:bg-[#f1f2f3]!",
    "[&_.ant-table-tbody>tr>td]:p-3!",
  ].join(" "),

  // Fixed columns
  fixed: [
    "[&_.ant-table-thead>tr>th.ant-table-cell-fix-left]:bg-neutral-250!",
    "[&_.ant-table-thead>tr>th.ant-table-cell-fix-left]:font-semibold!",
    "[&_.ant-table-tbody>tr>td.ant-table-cell-fix-left]:bg-neutral-250!",
    "[&_.ant-table-tbody>tr>td.ant-table-cell-fix-left]:font-semibold!",
  ].join(" "),

  // Hover effects
  hover: [
    "[&_.ant-table-tbody>tr:hover>td]:bg-[#f1f2f3]!",
    "[&_.ant-table-tbody>tr:last-child:hover>td]:bg-neutral-250!",
  ].join(" "),
} as const;

/**
 * Color palette constants
 * Maps to CSS variables defined in globals.css
 */
export const COLORS = {
  primary: {
    300: "var(--color-primary-300)",
    500: "var(--color-primary-500)",
  },
  secondary: {
    300: "var(--color-secondary-300)",
    500: "var(--color-secondary-500)",
  },
  neutral: {
    100: "var(--color-neutral-100)",
    200: "var(--color-neutral-200)",
    250: "var(--color-neutral-250)",
    300: "var(--color-neutral-300)",
    500: "var(--color-neutral-500)",
    900: "var(--color-neutral-900)",
  },
  white: "var(--color-white)",

  // Status colors
  status: {
    success: "#00AD17",
    warning: "#F47920",
    error: "#FF4D4F",
    info: "#1890FF",
  },
} as const;

/**
 * Spacing constants
 */
export const SPACING = {
  xs: "0.25rem", // 4px
  sm: "0.5rem", // 8px
  md: "1rem", // 16px
  lg: "1.5rem", // 24px
  xl: "2rem", // 32px
  "2xl": "3rem", // 48px
} as const;

/**
 * Font sizes (in px, matching Tailwind custom config)
 */
export const FONT_SIZES = {
  "12": "12px",
  "14": "14px",
  "16": "16px",
  "18": "18px",
  "20": "20.16px",
  "24": "24px",
  "32": "32px",
} as const;

/**
 * Common class combinations for buttons
 */
export const BUTTON_CLASSES = {
  primary: "bg-primary-300 text-white hover:bg-primary-500",
  secondary: "bg-secondary-300 text-white hover:bg-secondary-500",
  outline: "border border-neutral-300 text-neutral-900 hover:bg-neutral-100",
  ghost: "text-primary-300 hover:bg-primary-100",
} as const;

/**
 * Breadcrumb styling
 */
export const BREADCRUMB_CLASSES = {
  container: "customBreadcrumb separatorSpacing flex items-center h-11",
  item: "text-neutral-900 font-medium",
  lastItem: "lastBreadcrumbItem text-primary-300 font-semibold",
} as const;

/**
 * Loading spinner container
 */
export const LOADING_CLASSES = {
  fullScreen: "flex justify-center items-center h-screen flex-col gap-4",
  centered: "flex justify-center items-center flex-col gap-4",
  overlay:
    "fixed inset-0 bg-white/80 flex justify-center items-center z-50 flex-col gap-4",
} as const;

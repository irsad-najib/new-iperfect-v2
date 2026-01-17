/**
 * String utility functions
 */

/**
 * Convert string to snake_case
 * @param str - Input string
 * @returns Snake case string
 */
export function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, "_$1")
    .toLowerCase()
    .replace(/^_/, "")
    .replace(/\s+/g, "_");
}

/**
 * Convert string to camelCase
 * @param str - Input string
 * @returns Camel case string
 */
export function toCamelCase(str: string): string {
  return str
    .replace(/_([a-z])/g, (_, letter) => letter.toUpperCase())
    .replace(/^([A-Z])/, (letter) => letter.toLowerCase());
}

/**
 * Convert string to PascalCase
 * @param str - Input string
 * @returns Pascal case string
 */
export function toPascalCase(str: string): string {
  return str.replace(/(^\w|_\w)/g, (match) =>
    match.replace("_", "").toUpperCase()
  );
}

/**
 * Convert string to kebab-case
 * @param str - Input string
 * @returns Kebab case string
 */
export function toKebabCase(str: string): string {
  return str
    .replace(/([A-Z])/g, "-$1")
    .toLowerCase()
    .replace(/^-/, "")
    .replace(/\s+/g, "-");
}

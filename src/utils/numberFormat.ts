/**
 * Number formatting utilities
 */

/**
 * Format number with customizable options
 */
export const formatNumber = (
  value: number,
  options?: {
    decimals?: number;
    locale?: string;
    style?: "decimal" | "currency" | "percent";
    currency?: string;
  },
): string => {
  const {
    decimals = 2,
    locale = "id-ID",
    style = "decimal",
    currency = "IDR",
  } = options || {};

  return new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
    style,
    currency,
  }).format(value);
};

/**
 * Legacy support - @deprecated Use formatNumber instead
 */
export const formatNumberWithoutRounding = (
  value: number,
  maxDecimals: number = 2,
): string => {
  return formatNumber(value, { decimals: maxDecimals });
};

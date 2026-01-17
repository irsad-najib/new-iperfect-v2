/**
 * useDebounce Hook
 * Debounces a value to prevent excessive re-renders or API calls
 */

import { useEffect, useState } from "react";
import { DELAYS } from "@/constants";

export function useDebounce<T>(value: T, delay: number = DELAYS.DEBOUNCE): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

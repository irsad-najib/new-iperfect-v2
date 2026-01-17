/**
 * useAsync Hook
 * Generic hook for managing async operations with loading, error, and data states
 */

import { useState, useCallback } from "react";

interface AsyncState<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
}

export function useAsync<T, Args extends unknown[] = []>(
  asyncFunction: (...args: Args) => Promise<T>
) {
  const [state, setState] = useState<AsyncState<T>>({
    data: null,
    loading: false,
    error: null,
  });

  const execute = useCallback(
    async (...args: Args) => {
      setState({ data: null, loading: true, error: null });

      try {
        const data = await asyncFunction(...args);
        setState({ data, loading: false, error: null });
        return data;
      } catch (error) {
        setState({
          data: null,
          loading: false,
          error: error instanceof Error ? error : new Error(String(error)),
        });
        throw error;
      }
    },
    [asyncFunction]
  );

  return {
    ...state,
    execute,
    reset: () => setState({ data: null, loading: false, error: null }),
  };
}

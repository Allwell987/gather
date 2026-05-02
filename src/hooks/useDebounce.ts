import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Hook to debounce a value - useful for search inputs to avoid excessive API calls
 * @param value The value to debounce
 * @param delay Delay in milliseconds (default: 500ms)
 */
export const useDebounce = <T>(value: T, delay: number = 500): T => {
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
};

/**
 * Hook for debounced callback - useful for search handlers
 * @param callback The callback to debounce
 * @param delay Delay in milliseconds (default: 500ms)
 */
export const useDebouncedCallback = <T extends (...args: unknown[]) => unknown>(
  callback: T,
  delay: number = 500
): T => {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const debouncedCallback = useCallback(
    (...args: Parameters<T>) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  ) as T;

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
};
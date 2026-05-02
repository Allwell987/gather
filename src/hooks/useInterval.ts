import { useEffect, useRef } from 'react';

/**
 * Hook to set up an interval that runs a callback function
 * @param callback The callback function to run
 * @param delay Delay in milliseconds (null to pause)
 * @param immediate Whether to run immediately on mount
 */
export const useInterval = (
  callback: () => void,
  delay: number | null,
  immediate: boolean = false
): void => {
  const savedCallback = useRef(callback);
  const intervalId = useRef<ReturnType<typeof setInterval> | null>(null);

  // Remember the latest callback
  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  // Set up the interval
  useEffect(() => {
    if (immediate) {
      savedCallback.current();
    }

    if (delay === null) {
      return;
    }

    intervalId.current = setInterval(() => {
      savedCallback.current();
    }, delay);

    return () => {
      if (intervalId.current) {
        clearInterval(intervalId.current);
      }
    };
  }, [delay, immediate]);
};

/**
 * Hook to set up a timeout
 * @param callback The callback function to run
 * @param delay Delay in milliseconds
 */
export const useTimeout = (
  callback: () => void,
  delay: number | null
): void => {
  const savedCallback = useRef(callback);

  useEffect(() => {
    savedCallback.current = callback;
  }, [callback]);

  useEffect(() => {
    if (delay === null) {
      return;
    }

    const timeoutId = setTimeout(() => {
      savedCallback.current();
    }, delay);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [delay]);
};
import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * Hook to track previous value
 */
export const usePrevious = <T>(value: T): T | undefined => {
  const ref = useRef<T>();

  useEffect(() => {
    ref.current = value;
  }, [value]);

  return ref.current;
};

/**
 * Hook to force re-render
 */
export const useForceUpdate = () => {
  const [, setTick] = useState(0);

  const forceUpdate = useCallback(() => {
    setTick((tick) => tick + 1);
  }, []);

  return forceUpdate;
};

/**
 * Hook to get current timestamp that updates periodically
 */
export const useNow = (interval: number = 1000) => {
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const intervalId = setInterval(() => {
      setNow(new Date());
    }, interval);

    return () => clearInterval(intervalId);
  }, [interval]);

  return now;
};

/**
 * Hook to memoize a value with a custom comparison
 */
export const useMemoWithCompare = <T>(
  factory: () => T,
  deps: unknown[],
  compare: (prevDeps: unknown[], newDeps: unknown[]) => boolean
): T => {
  const depsRef = useRef(deps);
  const valueRef = useRef<T>();

  if (!compare(depsRef.current, deps)) {
    depsRef.current = deps;
    valueRef.current = factory();
  }

  return valueRef.current!;
};
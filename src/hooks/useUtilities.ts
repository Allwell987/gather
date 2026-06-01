import { useCallback, useEffect, useState } from 'react';

/**
 * Hook to track previous value
 */
export const usePrevious = <T>(value: T): T | undefined => {
  const [state, setState] = useState({ current: value, previous: undefined as T | undefined });

  if (value !== state.current) {
    setState({ current: value, previous: state.current });
  }

  return state.previous;
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
  const [state, setState] = useState(() => ({
    deps,
    value: factory(),
  }));

  let value = state.value;
  if (!compare(state.deps, deps)) {
    value = factory();
    setState({ deps, value });
  }

  return value;
};

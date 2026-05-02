import { useCallback, useState } from 'react';

/**
 * Hook to toggle a boolean value - useful for modals, dropdowns, etc.
 * @param initialValue Initial boolean value (default: false)
 */
export const useToggle = (initialValue: boolean = false): [
  boolean,
  () => void,
  (value: boolean) => void
] => {
  const [value, setValue] = useState(initialValue);

  const toggle = () => {
    setValue((prev) => !prev);
  };

  return [value, toggle, setValue];
};

/**
 * Hook for controlled toggle with explicit setTrue/setFalse
 */
export const useControlledToggle = (
  value: boolean,
  onToggle: (value: boolean) => void
): [
  () => void,
  () => void,
  () => void
] => {
  const toggle = useCallback(() => {
    onToggle(!value);
  }, [value, onToggle]);

  const setTrue = useCallback(() => {
    onToggle(true);
  }, [onToggle]);

  const setFalse = useCallback(() => {
    onToggle(false);
  }, [onToggle]);

  return [toggle, setTrue, setFalse];
};
import { renderHook, act } from '@testing-library/react-native';
import { useToggle } from '../useToggle';

describe('useToggle', () => {
  it('should initialize with default value (false)', () => {
    const { result } = renderHook(() => useToggle());
    const [value] = result.current;
    expect(value).toBe(false);
  });

  it('should initialize with provided value', () => {
    const { result } = renderHook(() => useToggle(true));
    const [value] = result.current;
    expect(value).toBe(true);
  });

  it('should toggle the value', () => {
    const { result } = renderHook(() => useToggle(false));

    act(() => {
      const [, toggle] = result.current;
      toggle();
    });

    expect(result.current[0]).toBe(true);

    act(() => {
      const [, toggle] = result.current;
      toggle();
    });

    expect(result.current[0]).toBe(false);
  });

  it('should set value explicitly', () => {
    const { result } = renderHook(() => useToggle(false));

    act(() => {
      const [, , setValue] = result.current;
      setValue(true);
    });

    expect(result.current[0]).toBe(true);

    act(() => {
      const [, , setValue] = result.current;
      setValue(false);
    });

    expect(result.current[0]).toBe(false);
  });
});

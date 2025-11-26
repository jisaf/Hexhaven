
import { useRef, useEffect } from 'react';

// Custom hook to track the previous value of a prop or state.
export const usePrevious = <T extends unknown>(value: T): T | undefined => {
  const ref = useRef<T>();
  useEffect(() => {
    ref.current = value;
  });
  return ref.current;
};

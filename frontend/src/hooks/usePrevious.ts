
import { useRef, useEffect } from 'react';

// Custom hook to track the previous value of a prop or state.
// Note: The `useRef` hook requires an initial value. We provide `undefined` here,
// which is valid as the hook is designed to return the *previous* value.
export const usePrevious = <T>(value: T): T | undefined => {
  const ref = useRef<T | undefined>(undefined);
  useEffect(() => {
    ref.current = value;
  });
  // eslint-disable-next-line react-hooks/refs
  return ref.current;
};

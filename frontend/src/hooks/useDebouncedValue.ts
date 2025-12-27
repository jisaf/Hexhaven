/**
 * useDebouncedValue Hook (Issue #337)
 *
 * Returns a debounced version of the provided value.
 * The debounced value only updates after the specified delay
 * has passed without the value changing.
 *
 * Used for search input debouncing in ShopFilters.
 */

import { useState, useEffect } from 'react';

export function useDebouncedValue<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    // Set up timer to update debounced value after delay
    const timer = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Clean up timer if value changes before delay completes
    return () => {
      clearTimeout(timer);
    };
  }, [value, delay]);

  return debouncedValue;
}

export default useDebouncedValue;

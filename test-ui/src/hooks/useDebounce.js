import { useState, useEffect } from 'react';

/**
 * useDebounce - Hook for debouncing values with configurable delay
 * 
 * Professional debouncing implementation that delays value updates until after
 * the specified delay period has passed without the value changing.
 * 
 * Common use cases:
 * - Search input debouncing to reduce API calls
 * - Resize event handling to improve performance
 * - Form validation to reduce unnecessary checks
 * - Auto-save functionality with user input delays
 * 
 * Features:
 * - Automatic cleanup of pending timeouts
 * - Optimized re-renders with proper dependency tracking
 * - Memory leak prevention through effect cleanup
 * - Configurable delay timing
 * 
 * @param {*} value - The value to debounce (any type)
 * @param {number} delay - Delay in milliseconds before value updates
 * @returns {*} The debounced value that updates after delay period
 * 
 * @example
 * // Search input debouncing
 * const [searchTerm, setSearchTerm] = useState('');
 * const debouncedSearchTerm = useDebounce(searchTerm, 300);
 * 
 * useEffect(() => {
 *   if (debouncedSearchTerm) {
 *     performSearch(debouncedSearchTerm);
 *   }
 * }, [debouncedSearchTerm]);
 */
const useDebounce = (value, delay) => {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    // Cleanup timeout if value changes before delay completes
    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
};

export { useDebounce };
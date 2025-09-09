import { useState, useEffect, useRef, useCallback } from 'react';

/**
 * Smart toolbar layout hook with measurement-based overflow management
 * 
 * This hook implements responsive toolbar behavior similar to Radarr's approach:
 * - Measures actual DOM element dimensions
 * - Calculates available space dynamically
 * - Manages button visibility based on priority and space constraints
 * - Provides overflow menu integration
 * - Handles window resize events efficiently
 * 
 * Features:
 * - Real-time space measurement via ResizeObserver
 * - Priority-based button hiding (4=lowest, 1=highest)
 * - Debounced resize handling for performance
 * - Overflow menu state management
 * - Accessible button focus management
 * 
 * @param {Array} buttons - Array of button configurations with id, priority, and measurements
 * @param {Object} options - Configuration options
 * @param {number} options.reservedSpace - Space to reserve for overflow button (default: 50px)
 * @param {number} options.resizeDebounce - Debounce delay for resize events (default: 100ms)
 * @param {boolean} options.enableMeasurement - Enable/disable measurement system (default: true)
 */
export const useSmartToolbarLayout = (
  buttons = [],
  options = {}
) => {
  const {
    reservedSpace = 50,
    resizeDebounce = 100,
    enableMeasurement = true
  } = options;

  // DOM references
  const toolbarRef = useRef(null);
  const buttonContainerRef = useRef(null);
  const resizeObserverRef = useRef(null);
  const resizeTimeoutRef = useRef(null);

  // State management
  const [availableWidth, setAvailableWidth] = useState(0);
  const [buttonWidths, setButtonWidths] = useState(new Map());
  const [visibleButtons, setVisibleButtons] = useState(buttons);
  const [overflowButtons, setOverflowButtons] = useState([]);
  const [showOverflowMenu, setShowOverflowMenu] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);

  /**
   * Measure the width of a DOM element
   * @param {Element} element - DOM element to measure
   * @returns {number} Element width including margins
   */
  const measureElementWidth = useCallback((element) => {
    if (!element) return 0;
    
    const rect = element.getBoundingClientRect();
    const styles = window.getComputedStyle(element);
    const marginLeft = parseFloat(styles.marginLeft) || 0;
    const marginRight = parseFloat(styles.marginRight) || 0;
    
    return rect.width + marginLeft + marginRight;
  }, []);

  /**
   * Measure all button widths and store in state
   */
  const measureButtonWidths = useCallback(() => {
    if (!buttonContainerRef.current || !enableMeasurement) return;

    const newWidths = new Map();
    const buttonElements = buttonContainerRef.current.querySelectorAll('[data-priority]');
    
    buttonElements.forEach((element) => {
      const buttonId = element.id;
      if (buttonId) {
        const width = measureElementWidth(element);
        newWidths.set(buttonId, width);
      }
    });

    setButtonWidths(newWidths);
  }, [measureElementWidth, enableMeasurement]);

  /**
   * Calculate which buttons should be visible based on available space
   */
  const calculateVisibleButtons = useCallback(() => {
    if (!enableMeasurement || buttonWidths.size === 0) {
      setVisibleButtons(buttons);
      setOverflowButtons([]);
      return;
    }

    // Sort buttons by priority (1 = highest priority)
    const sortedButtons = [...buttons].sort((a, b) => a.priority - b.priority);
    
    let usedWidth = 0;
    const visible = [];
    const overflow = [];
    
    // Account for reserved space (overflow button, margins, etc.)
    const effectiveWidth = availableWidth - reservedSpace;

    for (const button of sortedButtons) {
      const buttonWidth = buttonWidths.get(button.id) || 0;
      
      if (usedWidth + buttonWidth <= effectiveWidth) {
        visible.push(button);
        usedWidth += buttonWidth;
      } else {
        overflow.push(button);
      }
    }

    // Sort visible buttons back to original order
    const visibleSorted = buttons.filter(button => 
      visible.some(v => v.id === button.id)
    );
    
    const overflowSorted = buttons.filter(button =>
      overflow.some(o => o.id === button.id)
    );

    setVisibleButtons(visibleSorted);
    setOverflowButtons(overflowSorted);
  }, [buttons, buttonWidths, availableWidth, reservedSpace, enableMeasurement]);

  /**
   * Handle container resize with debouncing
   */
  const handleResize = useCallback((entries) => {
    if (!entries || entries.length === 0) return;

    clearTimeout(resizeTimeoutRef.current);
    
    resizeTimeoutRef.current = setTimeout(() => {
      const entry = entries[0];
      const newWidth = entry.contentRect.width;
      
      setAvailableWidth(newWidth);
      
      // Re-measure buttons after resize
      if (enableMeasurement) {
        // Use requestAnimationFrame to ensure layout is complete
        requestAnimationFrame(() => {
          measureButtonWidths();
        });
      }
    }, resizeDebounce);
  }, [measureButtonWidths, resizeDebounce, enableMeasurement]);

  /**
   * Initialize ResizeObserver
   */
  const initializeObserver = useCallback(() => {
    if (!toolbarRef.current || !window.ResizeObserver) return;

    resizeObserverRef.current = new ResizeObserver(handleResize);
    resizeObserverRef.current.observe(toolbarRef.current);
  }, [handleResize]);

  /**
   * Toggle overflow menu visibility
   */
  const toggleOverflowMenu = useCallback(() => {
    setShowOverflowMenu(prev => !prev);
  }, []);

  /**
   * Close overflow menu
   */
  const closeOverflowMenu = useCallback(() => {
    setShowOverflowMenu(false);
  }, []);

  /**
   * Handle button click with overflow menu management
   */
  const handleButtonClick = useCallback((buttonId, originalOnClick) => {
    return (event) => {
      // Close overflow menu if open
      if (showOverflowMenu) {
        closeOverflowMenu();
      }
      
      // Execute original click handler
      if (originalOnClick) {
        originalOnClick(event);
      }
    };
  }, [showOverflowMenu, closeOverflowMenu]);

  // Initialize measurement system
  useEffect(() => {
    if (!enableMeasurement) {
      setIsInitialized(true);
      return;
    }

    const toolbar = toolbarRef.current;
    if (!toolbar) return;

    // Initial measurement
    const initialWidth = measureElementWidth(toolbar);
    setAvailableWidth(initialWidth);

    // Set up ResizeObserver
    initializeObserver();

    // Initial button measurement after DOM is ready
    const measureTimeout = setTimeout(() => {
      measureButtonWidths();
      setIsInitialized(true);
    }, 50);

    return () => {
      clearTimeout(measureTimeout);
      clearTimeout(resizeTimeoutRef.current);
      if (resizeObserverRef.current) {
        resizeObserverRef.current.disconnect();
      }
    };
  }, [enableMeasurement, measureElementWidth, initializeObserver, measureButtonWidths]);

  // Recalculate visibility when dependencies change
  useEffect(() => {
    if (isInitialized) {
      calculateVisibleButtons();
    }
  }, [calculateVisibleButtons, isInitialized]);

  return {
    // Refs for DOM elements
    toolbarRef,
    buttonContainerRef,
    
    // State
    visibleButtons,
    overflowButtons,
    showOverflowMenu,
    availableWidth,
    isInitialized,
    
    // Actions
    toggleOverflowMenu,
    closeOverflowMenu,
    handleButtonClick,
    measureButtonWidths,
    
    // Computed properties
    hasOverflowButtons: overflowButtons.length > 0,
    totalButtons: buttons.length,
    visibleCount: visibleButtons.length,
    overflowCount: overflowButtons.length
  };
};
import { useState, useRef, useCallback } from 'react';

/**
 * Comprehensive popover state management hook
 *
 * Provides complete state management for popover components with optimized
 * performance through useCallback memoization. Designed to work with the
 * Popover component for consistent behavior across the application.
 *
 * Features:
 * - Controlled visibility state with show/hide/toggle operations
 * - Memoized handlers to prevent unnecessary re-renders
 * - Trigger element ref for positioning and accessibility
 * - Flexible initial state configuration
 * - No external dependencies beyond React primitives
 *
 * Performance considerations:
 * - All handlers are memoized with useCallback and empty dependency arrays
 * - No side effects or external state dependencies
 * - Minimal re-render impact on consuming components
 *
 * @param {boolean} [initialState=false] - Initial visibility state
 * @returns {Object} Popover state management interface
 * @returns {boolean} returns.show - Current visibility state
 * @returns {Function} returns.open - Memoized function to show popover
 * @returns {Function} returns.close - Memoized function to hide popover
 * @returns {Function} returns.toggle - Memoized function to toggle visibility
 * @returns {React.RefObject} returns.triggerRef - Ref for trigger element positioning
 *
 * @example
 * // Basic popover usage
 * function MyComponent() {
 *   const popover = usePopover();
 *
 *   return (
 *     <>
 *       <button ref={popover.triggerRef} onClick={popover.toggle}>
 *         Toggle Popover
 *       </button>
 *       <Popover
 *         show={popover.show}
 *         onClose={popover.close}
 *         triggerRef={popover.triggerRef}
 *       >
 *         Popover content
 *       </Popover>
 *     </>
 *   );
 * }
 *
 * @example
 * // Popover with initial open state
 * function WelcomeTooltip() {
 *   const popover = usePopover(true); // Start visible
 *
 *   return (
 *     <Popover show={popover.show} onClose={popover.close}>
 *       Welcome to DAPS!
 *     </Popover>
 *   );
 * }
 *
 * @example
 * // Programmatic control
 * function ContextualHelp() {
 *   const help = usePopover();
 *
 *   // Show help on specific conditions
 *   useEffect(() => {
 *     if (showHelpCondition) {
 *       help.open();
 *     }
 *   }, [showHelpCondition, help.open]); // help.open is stable due to useCallback
 *
 *   return <Popover show={help.show} onClose={help.close}>...</Popover>;
 * }
 */
const usePopover = (initialState = false) => {
    // Core visibility state - drives all popover behavior
    const [show, setShow] = useState(initialState);

    // Ref for trigger element - used by Popover component for positioning
    // and accessibility features (focus management, click outside detection)
    const triggerRef = useRef(null);

    // Memoized handler to show popover
    // Empty dependency array ensures stable reference across re-renders
    const open = useCallback(() => {
        setShow(true);
    }, []); // Stable - no dependencies

    // Memoized handler to hide popover
    // Empty dependency array ensures stable reference across re-renders
    const close = useCallback(() => {
        setShow(false);
    }, []); // Stable - no dependencies

    // Memoized toggle handler using functional state update
    // Functional update prevents stale closure issues with current state
    const toggle = useCallback(() => {
        setShow(prev => !prev); // Functional update for current state
    }, []); // Stable - no dependencies

    // Return stable interface - all functions are memoized
    // This prevents unnecessary re-renders in consuming components
    return {
        show, // Current visibility state
        open, // Stable show handler
        close, // Stable hide handler
        toggle, // Stable toggle handler
        triggerRef, // Element ref for positioning
    };
};

export default usePopover;

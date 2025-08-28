import { useState, useRef, useCallback } from 'react';

/**
 * Simple popover management hook following the useModal pattern
 *
 * Provides clean API for popover state management without schema complexity.
 * Modeled after useModal for consistency with DAPS architecture patterns.
 *
 * @param {boolean} [initialState=false] - Initial visibility state
 * @returns {Object} Popover management interface
 * @returns {boolean} returns.show - Whether popover is visible
 * @returns {Function} returns.open - Open the popover
 * @returns {Function} returns.close - Close the popover
 * @returns {Function} returns.toggle - Toggle popover visibility
 * @returns {Object} returns.triggerRef - Ref for popover trigger element
 *
 * @example
 * // Simple popover usage
 * function MyComponent() {
 *   const helpPopover = usePopover();
 *   const actionsPopover = usePopover();
 *
 *   return (
 *     <>
 *       <button ref={helpPopover.triggerRef} onClick={helpPopover.toggle}>
 *         Help
 *       </button>
 *       <PopoverFactory
 *         variant="help"
 *         show={helpPopover.show}
 *         onClose={helpPopover.close}
 *         triggerRef={helpPopover.triggerRef}
 *         title="Help Information"
 *         content="This is help content"
 *       />
 *
 *       <button ref={actionsPopover.triggerRef} onClick={actionsPopover.toggle}>
 *         Actions
 *       </button>
 *       <PopoverFactory
 *         variant="actions"
 *         show={actionsPopover.show}
 *         onClose={actionsPopover.close}
 *         triggerRef={actionsPopover.triggerRef}
 *         options={[
 *           { key: 'edit', label: 'Edit' },
 *           { key: 'delete', label: 'Delete' }
 *         ]}
 *         onSelect={handleActionSelect}
 *       />
 *     </>
 *   );
 * }
 */
const usePopover = (initialState = false) => {
    const [show, setShow] = useState(initialState);
    const triggerRef = useRef(null);

    const open = useCallback(() => {
        setShow(true);
    }, []);

    const close = useCallback(() => {
        setShow(false);
    }, []);

    const toggle = useCallback(() => {
        setShow(prev => !prev);
    }, []);

    return {
        show,
        open,
        close,
        toggle,
        triggerRef,
    };
};

export default usePopover;

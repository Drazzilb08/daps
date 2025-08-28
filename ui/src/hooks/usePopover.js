import { useState, useRef, useCallback, useMemo } from 'react';
import { validatePopoverSchema, processPopoverSchema } from '../utils/popoverSchema';

/**
 * Schema-driven popover management hook
 *
 * Manages multiple popovers through a single schema configuration, providing
 * centralized state management and consistent behavior across all popover instances.
 *
 * @param {Object} schema - Popover configuration schema defining all popovers and their behavior
 * @param {Object} stateRefs - Map of state values and setters from component
 * @returns {Object} Popover management interface
 * @returns {Object} returns.popovers - Map of popover controls keyed by schema ID
 * @returns {Function} returns.closeAll - Function to close all open popovers
 * @returns {boolean} returns.isValid - Whether the schema is valid
 * @returns {Array} returns.validationErrors - Array of validation errors if invalid
 *
 * @example
 * // Schema-driven popover usage
 * function MyComponent() {
 *   const schema = {
 *     popovers: {
 *       help: {
 *         variant: 'help',
 *         content: { type: 'simple', text: 'This is help content' }
 *       },
 *       actions: {
 *         variant: 'actions',
 *         content: { type: 'list', options: ['Edit', 'Delete', 'Share'] }
 *       }
 *     }
 *   };
 *
 *   const { popovers } = usePopover(schema);
 *
 *   return (
 *     <>
 *       <button ref={popovers.help.triggerRef} onClick={popovers.help.toggle}>
 *         Help
 *       </button>
 *       <Popover show={popovers.help.show} onClose={popovers.help.close}>
 *         {popovers.help.content}
 *       </Popover>
 *     </>
 *   );
 * }
 */
const usePopover = (schema, stateRefs = {}) => {
    // Validate schema once
    const validation = useMemo(() => {
        return validatePopoverSchema(schema);
    }, [schema]);

    // Process schema if valid
    const processedSchema = useMemo(() => {
        if (!validation.isValid) return null;
        return processPopoverSchema(schema, stateRefs);
    }, [schema, stateRefs, validation.isValid]);

    // Simple popover visibility states - just a map of boolean values
    const [popoverStates, setPopoverStates] = useState({});

    // Create stable refs for each popover key - use simple object with refs
    const triggerRefsMap = useRef({});

    // Ensure refs exist for all popover keys
    if (processedSchema) {
        Object.keys(processedSchema.popovers).forEach(key => {
            if (!triggerRefsMap.current[key]) {
                triggerRefsMap.current[key] = { current: null };
            }
        });
    }

    // Simple toggle functions
    const openPopover = useCallback(key => {
        setPopoverStates(prev => ({ ...prev, [key]: true }));
    }, []);

    const closePopover = useCallback(key => {
        setPopoverStates(prev => ({ ...prev, [key]: false }));
    }, []);

    const togglePopover = useCallback(key => {
        setPopoverStates(prev => ({
            ...prev,
            [key]: !prev[key],
        }));
    }, []);

    const closeAll = useCallback(() => {
        setPopoverStates({});
    }, []);

    // Build popover controls
    const popovers = useMemo(() => {
        if (!processedSchema || !validation.isValid) {
            return {};
        }

        const controls = {};

        Object.entries(processedSchema.popovers).forEach(([key, popoverDef]) => {
            const triggerRef = triggerRefsMap.current[key];
            const show = Boolean(popoverStates[key]);

            controls[key] = {
                // State
                show,

                // Control functions - use arrow functions to maintain 'this' context
                open: () => openPopover(key),
                close: () => closePopover(key),
                toggle: () => togglePopover(key),

                // Trigger ref
                triggerRef,

                // Popover props
                variant: popoverDef.variant || 'default',
                className: popoverDef.className || '',
                position: popoverDef.position || 'auto',
                offset: popoverDef.offset || 8,
                trapFocus: popoverDef.trapFocus || false,
                closeOnClickOutside: popoverDef.closeOnClickOutside !== false,
                closeOnEscape: popoverDef.closeOnEscape !== false,
                preventBodyScroll: popoverDef.preventBodyScroll || false,
                ariaLabel: popoverDef.ariaLabel,
                ariaDescribedBy: popoverDef.ariaDescribedBy,

                // Content
                content: popoverDef.content || null,
            };
        });

        return controls;
    }, [
        processedSchema,
        validation.isValid,
        popoverStates,
        openPopover,
        closePopover,
        togglePopover,
    ]);

    return {
        popovers,
        closeAll,
        isValid: validation.isValid,
        validationErrors: validation.errors,
        processedSchema:
            typeof window !== 'undefined' && window.location?.hostname === 'localhost'
                ? processedSchema
                : undefined,
    };
};

export default usePopover;

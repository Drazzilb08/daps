import { useCallback, useMemo } from 'react';

/**
 * usePopoverVariants - Business logic hook for popover variant functionality
 *
 * Extracts reusable business logic from PopoverFactory including:
 * - Icon mapping system with fallback behavior
 * - Selection handler factory with auto-close behavior
 * - CSS class generation for selection states
 * - Danger state styling utilities
 *
 * This hook separates business logic from rendering, enabling clean component composition
 * and reusable patterns across different popover implementations.
 *
 * @returns {Object} Object containing popover business logic utilities
 * @returns {Function} returns.renderIcon - Icon mapping function with fallback
 * @returns {Function} returns.createSelectionHandler - Selection + auto-close handler factory
 * @returns {Function} returns.getSelectionClasses - CSS class generation utility
 * @returns {Function} returns.getDangerStyles - Danger state styling utility
 *
 * @example
 * ```javascript
 * const { renderIcon, createSelectionHandler, getSelectionClasses } = usePopoverVariants();
 *
 * const handleSelect = createSelectionHandler(onSelect, onClose);
 * const classes = getSelectionClasses(selectedValue, option.key);
 * const iconElement = renderIcon(option.icon);
 * ```
 */
export const usePopoverVariants = () => {
    /**
     * Icon mapping configuration with fallback behavior
     * Maps icon identifiers to emoji representations for consistent icon rendering
     */
    const iconMap = useMemo(
        () => ({
            // Material Icons format (mi:*)
            'mi:star': '⭐',
            'mi:favorite': '❤️',
            'mi:bookmark': '🔖',
            'mi:edit': '✏️',
            'mi:content_copy': '📋',
            'mi:delete': '🗑️',
            'mi:visibility': '👁️',
            'mi:visibility_off': '🙈',
            'mi:check': '✓',
            'mi:close': '✕',
            'mi:add': '➕',
            'mi:remove': '➖',
            'mi:arrow_upward': '↑',
            'mi:arrow_downward': '↓',

            // Simple format (legacy compatibility)
            star: '⭐',
            favorite: '❤️',
            bookmark: '🔖',
            edit: '✏️',
            copy: '📋',
            delete: '🗑️',
            info: 'ℹ️',
            help: '❓',
            settings: '⚙️',
            close: '✕',
        }),
        []
    );

    /**
     * Render icon based on icon identifier with fallback behavior
     *
     * @param {string} icon - Icon identifier (e.g., 'mi:star', 'edit', '⭐')
     * @returns {string} Rendered icon (mapped emoji or original string as fallback)
     *
     * @example
     * ```javascript
     * renderIcon('mi:star')    // Returns '⭐'
     * renderIcon('edit')       // Returns '✏️'
     * renderIcon('custom')     // Returns 'custom' (fallback)
     * renderIcon('🎯')         // Returns '🎯' (passthrough)
     * ```
     */
    const renderIcon = useCallback(
        icon => {
            if (!icon) return '';
            return iconMap[icon] || icon;
        },
        [iconMap]
    );

    /**
     * Create selection handler with auto-close behavior
     * Factory function that combines selection callback with popover auto-close
     *
     * @param {Function} onSelect - Selection callback function
     * @param {Function} onClose - Close callback function
     * @returns {Function} Combined handler function
     *
     * @example
     * ```javascript
     * const handleSelect = createSelectionHandler(
     *     (key, option) => setSelected(key),
     *     () => setShow(false)
     * );
     *
     * // Usage in onClick handler
     * onClick={() => handleSelect(option.key, option)}
     * ```
     */
    const createSelectionHandler = useCallback((onSelect, onClose) => {
        return (key, option) => {
            if (onSelect) {
                onSelect(key, option);
            }
            if (onClose) {
                onClose();
            }
        };
    }, []);

    /**
     * Generate CSS classes for selection state
     *
     * @param {string} selectedValue - Currently selected value
     * @param {string} optionKey - Option key to compare against
     * @param {string} [baseClass='popover__list-item'] - Base CSS class
     * @returns {string} Generated CSS classes
     *
     * @example
     * ```javascript
     * getSelectionClasses('option1', 'option1')
     * // Returns 'popover__list-item popover__list-item--selected'
     *
     * getSelectionClasses('option1', 'option2')
     * // Returns 'popover__list-item'
     * ```
     */
    const getSelectionClasses = useCallback(
        (selectedValue, optionKey, baseClass = 'popover__list-item') => {
            const isSelected = selectedValue === optionKey;
            return isSelected ? `${baseClass} ${baseClass}--selected` : baseClass;
        },
        []
    );

    /**
     * Generate inline styles for danger state
     *
     * @param {boolean} isDanger - Whether element is in danger state
     * @returns {Object} Style object for danger state
     *
     * @example
     * ```javascript
     * const styles = getDangerStyles(true);   // { color: 'var(--error)' }
     * const styles = getDangerStyles(false);  // {}
     * ```
     */
    const getDangerStyles = useCallback(isDanger => {
        return isDanger ? { color: 'var(--error)' } : {};
    }, []);

    /**
     * Get CSS classes for danger state
     *
     * @param {boolean} isDanger - Whether element is in danger state
     * @param {string} [baseClass='popover__list-item'] - Base CSS class
     * @returns {string} CSS classes including danger state
     *
     * @example
     * ```javascript
     * getDangerClasses(true)   // 'popover__list-item danger'
     * getDangerClasses(false)  // 'popover__list-item'
     * ```
     */
    const getDangerClasses = useCallback((isDanger, baseClass = 'popover__list-item') => {
        return isDanger ? `${baseClass} danger` : baseClass;
    }, []);

    return {
        renderIcon,
        createSelectionHandler,
        getSelectionClasses,
        getDangerStyles,
        getDangerClasses,
    };
};

export default usePopoverVariants;

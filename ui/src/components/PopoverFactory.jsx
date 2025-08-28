import React from 'react';
import Popover from './Popover';

/**
 * PopoverFactory - Factory component for creating popovers with different variants
 *
 * Provides a simple, props-based interface for all popover types without schema complexity.
 * Modeled after ModalFactory to maintain architectural consistency in DAPS.
 *
 * @param {Object} props - Component props
 * @param {'help'|'selector'|'actions'|'default'} [props.variant='default'] - Popover variant
 * @param {boolean} props.show - Whether popover is visible
 * @param {Function} props.onClose - Close handler function
 * @param {Object} props.triggerRef - Ref to trigger element for positioning
 * @param {'auto'|'top'|'bottom'|'left'|'right'} [props.position='bottom'] - Popover position
 * @param {string} [props.className=''] - Additional CSS classes
 * @param {string} [props.ariaLabel] - Accessibility label
 * @param {boolean} [props.trapFocus=false] - Whether to trap focus within popover
 * @param {number} [props.offset=8] - Offset from trigger element in pixels
 *
 * // Variant-specific props
 * @param {string} [props.title] - Popover title (for help, selector variants)
 * @param {Array} [props.options] - Options array for selector/actions variants
 * @param {string} [props.selectedValue] - Currently selected value for selector variant
 * @param {Function} [props.onSelect] - Selection handler for selector/actions variants
 * @param {string} [props.content] - Simple text content for default/help variants
 * @param {React.ReactNode} [props.children] - Custom content (overrides other content props)
 *
 * @returns {JSX.Element|null} Rendered popover or null if not visible
 *
 * @example
 * // Help popover
 * <PopoverFactory
 *   variant="help"
 *   show={show}
 *   onClose={handleClose}
 *   triggerRef={triggerRef}
 *   title="Search Help"
 *   content="Use quotes for exact matches, * for wildcards"
 * />
 *
 * @example
 * // Selector popover
 * <PopoverFactory
 *   variant="selector"
 *   show={show}
 *   onClose={handleClose}
 *   triggerRef={triggerRef}
 *   title="Select Source"
 *   options={[
 *     { key: 'option1', label: 'First Option', icon: 'star' },
 *     { key: 'option2', label: 'Second Option' }
 *   ]}
 *   selectedValue={selectedValue}
 *   onSelect={handleSelect}
 * />
 *
 * @example
 * // Actions popover
 * <PopoverFactory
 *   variant="actions"
 *   show={show}
 *   onClose={handleClose}
 *   triggerRef={triggerRef}
 *   options={[
 *     { key: 'edit', label: 'Edit', icon: 'edit' },
 *     { key: 'delete', label: 'Delete', icon: 'delete', danger: true }
 *   ]}
 *   onSelect={handleActionSelect}
 * />
 *
 * @example
 * // Custom content popover
 * <PopoverFactory
 *   variant="default"
 *   show={show}
 *   onClose={handleClose}
 *   triggerRef={triggerRef}
 *   className="popover--wide"
 * >
 *   <div className="custom-form">
 *     <input type="text" placeholder="Custom content" />
 *     <button>Submit</button>
 *   </div>
 * </PopoverFactory>
 */
export default function PopoverFactory({
    variant = 'default',
    show,
    onClose,
    triggerRef,
    position = 'bottom',
    className = '',
    ariaLabel,
    trapFocus = false,
    offset = 8,

    // Content props
    title,
    options = [],
    selectedValue,
    onSelect,
    content,
    children,
}) {
    // Don't render if not visible
    if (!show) {
        return null;
    }

    /**
     * Render content based on variant type and provided props
     * @returns {JSX.Element} Rendered popover content
     */
    function renderContent() {
        // Custom children override all other content
        if (children) {
            return children;
        }

        switch (variant) {
            case 'help':
                return renderHelpContent();
            case 'selector':
                return renderSelectorContent();
            case 'actions':
                return renderActionsContent();
            case 'default':
            default:
                return renderDefaultContent();
        }
    }

    /**
     * Render help variant content
     * @returns {JSX.Element} Help popover content
     */
    function renderHelpContent() {
        return (
            <>
                {title && <div className="popover__title">{title}</div>}
                <div className="popover__content">{content || 'Help information'}</div>
            </>
        );
    }

    /**
     * Render selector variant content with options list
     * @returns {JSX.Element} Selector popover content
     */
    function renderSelectorContent() {
        return (
            <>
                {title && <div className="popover__title">{title}</div>}
                <ul className="popover__list">
                    {options.map(option => (
                        <li key={option.key}>
                            <button
                                className={`popover__list-item${
                                    selectedValue === option.key
                                        ? ' popover__list-item--selected'
                                        : ''
                                }`}
                                onClick={() => {
                                    if (onSelect) {
                                        onSelect(option.key, option);
                                    }
                                    if (onClose) {
                                        onClose();
                                    }
                                }}
                            >
                                {option.icon && (
                                    <span
                                        className="popover__list-icon"
                                        style={{ marginRight: '0.5rem' }}
                                    >
                                        {renderIcon(option.icon)}
                                    </span>
                                )}
                                {option.label}
                            </button>
                        </li>
                    ))}
                </ul>
            </>
        );
    }

    /**
     * Render actions variant content with action buttons
     * @returns {JSX.Element} Actions popover content
     */
    function renderActionsContent() {
        return (
            <ul className="popover__list">
                {options.map(action => (
                    <li key={action.key}>
                        <button
                            className={`popover__list-item${action.danger ? ' danger' : ''}`}
                            onClick={() => {
                                if (onSelect) {
                                    onSelect(action.key, action);
                                }
                                if (onClose) {
                                    onClose();
                                }
                            }}
                            style={action.danger ? { color: 'var(--error)' } : {}}
                        >
                            {action.icon && (
                                <span
                                    className="popover__list-icon"
                                    style={{ marginRight: '0.5rem' }}
                                >
                                    {renderIcon(action.icon)}
                                </span>
                            )}
                            {action.label}
                        </button>
                    </li>
                ))}
            </ul>
        );
    }

    /**
     * Render default variant content
     * @returns {JSX.Element} Default popover content
     */
    function renderDefaultContent() {
        return (
            <>
                {title && <div className="popover__title">{title}</div>}
                <div className="popover__content">{content || 'Default popover content'}</div>
            </>
        );
    }

    /**
     * Render icon based on icon identifier
     * Simple icon rendering for common icons used in popovers
     * @param {string} icon - Icon identifier
     * @returns {string} Rendered icon (emoji or symbol)
     */
    function renderIcon(icon) {
        const iconMap = {
            'mi:star': '⭐',
            'mi:favorite': '❤️',
            'mi:bookmark': '🔖',
            'mi:edit': '✏️',
            'mi:content_copy': '📋',
            'mi:delete': '🗑️',
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
        };

        return iconMap[icon] || icon;
    }

    return (
        <Popover
            triggerRef={triggerRef}
            show={show}
            onClose={onClose}
            variant={variant}
            position={position}
            className={className}
            ariaLabel={ariaLabel}
            trapFocus={trapFocus}
            offset={offset}
        >
            {renderContent()}
        </Popover>
    );
}

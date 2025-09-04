import React from 'react';
import Popover from './Popover';
import {
    PopoverHelp,
    PopoverSelector,
    PopoverActionsList,
    PopoverDefault,
} from './popover/PopoverVariants';

/**
 * PopoverFactory - Factory component for creating popovers with different variants
 *
 * Provides a simple, props-based interface for all popover types without schema complexity.
 * Modeled after ModalFactory to maintain architectural consistency in DAPS.
 *
 * Refactored to pure orchestration with business logic extracted to usePopoverVariants hook
 * and rendering logic moved to dedicated PopoverVariants components.
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
     * Render content based on variant type
     * Custom children override variant rendering for maximum flexibility
     * @returns {JSX.Element} Rendered popover content
     */
    function renderContent() {
        // Custom children override all variant rendering (critical for SearchControls.jsx)
        if (children) {
            return children;
        }

        // Route to appropriate variant component
        switch (variant) {
            case 'help':
                return <PopoverHelp title={title} content={content} />;

            case 'selector':
                return (
                    <PopoverSelector
                        title={title}
                        options={options}
                        selectedValue={selectedValue}
                        onSelect={onSelect}
                        onClose={onClose}
                    />
                );

            case 'actions':
                return (
                    <PopoverActionsList actions={options} onSelect={onSelect} onClose={onClose} />
                );

            case 'default':
            default:
                return <PopoverDefault title={title} content={content} />;
        }
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

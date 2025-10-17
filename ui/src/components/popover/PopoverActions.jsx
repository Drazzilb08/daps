import React from 'react';

/**
 * PopoverActions - Generic popover footer with cancel and primary action buttons
 *
 * Provides the common pattern of Cancel (secondary) + Primary action buttons.
 * Used across multiple popovers, modals, and forms throughout DAPS.
 *
 * @param {Object} props - Component props
 * @param {Function} props.onCancel - Cancel button click handler
 * @param {Function} props.onPrimary - Primary action button click handler
 * @param {string} [props.cancelText='Cancel'] - Cancel button text
 * @param {string} [props.primaryText='Submit'] - Primary button text
 * @param {boolean} [props.primaryDisabled=false] - Whether primary button is disabled
 * @param {string} [props.primaryClassName='btn btn-primary'] - Primary button CSS classes
 * @param {string} [props.cancelClassName='btn btn-secondary'] - Cancel button CSS classes
 * @param {string} [props.className] - Additional CSS classes for container
 * @param {React.ReactNode} [props.children] - Custom action content (overrides default buttons)
 * @returns {JSX.Element} Popover actions component
 *
 * @example
 * // Standard cancel/submit pattern
 * <PopoverActions
 *   onCancel={handleCancel}
 *   onPrimary={handleSubmit}
 *   primaryText="Refresh Selected"
 *   primaryDisabled={!hasSelections}
 * />
 *
 * @example
 * // Custom styling
 * <PopoverActions
 *   onCancel={handleCancel}
 *   onPrimary={handleDelete}
 *   primaryText="Delete"
 *   primaryClassName="btn btn-danger"
 * />
 *
 * @example
 * // Custom action content
 * <PopoverActions>
 *   <button onClick={handleReset}>Reset</button>
 *   <button onClick={handleSave}>Save</button>
 *   <button onClick={handleCancel}>Cancel</button>
 * </PopoverActions>
 */
function PopoverActions({
    onCancel,
    onPrimary,
    cancelText = 'Cancel',
    primaryText = 'Submit',
    primaryDisabled = false,
    primaryClassName = 'btn btn-primary',
    cancelClassName = 'btn btn-secondary',
    className = '',
    children,
}) {
    return (
        <>
            {/* Divider line above actions */}
            <div className="popover__divider" style={{ margin: 'var(--space-4) 0' }}></div>

            <div
                className={`popover-actions ${className}`}
                style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: 'var(--space-3)',
                }}
            >
                {children ? (
                    children
                ) : (
                    <>
                        <button type="button" className={cancelClassName} onClick={onCancel}>
                            {cancelText}
                        </button>
                        <button
                            type="button"
                            className={primaryClassName}
                            onClick={onPrimary}
                            disabled={primaryDisabled}
                        >
                            {primaryText}
                        </button>
                    </>
                )}
            </div>
        </>
    );
}

export default PopoverActions;

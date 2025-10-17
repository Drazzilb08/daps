import React from 'react';

/**
 * PopoverHeader - Generic popover header with title and action buttons
 *
 * Provides the common pattern of title on left + action buttons on right.
 * Used across multiple popovers in RefreshControls, SearchControls, and modals.
 *
 * @param {Object} props - Component props
 * @param {string} props.title - Header title text
 * @param {Array} [props.actions] - Array of action button configurations
 * @param {string} [props.className] - Additional CSS classes
 * @param {React.ReactNode} [props.children] - Custom action content (overrides actions array)
 * @returns {JSX.Element} Popover header component
 *
 * @example
 * // Simple title with action buttons
 * <PopoverHeader
 *   title="Refresh Database"
 *   actions={[
 *     { key: 'selectAll', icon: 'mi:select_all', onClick: handleSelectAll, title: 'Select all' },
 *     { key: 'clear', icon: 'mi:clear', onClick: handleClear, title: 'Clear all' }
 *   ]}
 * />
 *
 * @example
 * // Title with custom action content
 * <PopoverHeader title="Custom Actions">
 *   <button onClick={customAction}>Custom Button</button>
 * </PopoverHeader>
 */
function PopoverHeader({ title, actions = [], className = '', children }) {
    return (
        <div
            className={`popover-header ${className}`}
            style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 'var(--space-4)',
            }}
        >
            <div className="popover__title">{title}</div>

            {children ? (
                <div className="popover-header-actions">{children}</div>
            ) : actions.length > 0 ? (
                <div
                    className="popover-header-actions"
                    style={{ display: 'flex', gap: 'var(--space-2)' }}
                >
                    {actions.map(action => (
                        <button
                            key={action.key}
                            type="button"
                            className={`select-icon-btn ${action.className || ''}`}
                            onClick={action.onClick}
                            title={action.title}
                            disabled={action.disabled}
                        >
                            {action.icon}
                        </button>
                    ))}
                </div>
            ) : null}
        </div>
    );
}

export default PopoverHeader;

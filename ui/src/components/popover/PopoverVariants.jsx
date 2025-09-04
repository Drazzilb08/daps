import React from 'react';
import { usePopoverVariants } from '../../hooks/popover/usePopoverVariants';

/**
 * PopoverHelp - Help variant component for simple title/content structure
 *
 * Renders a simple help popover with optional title and content.
 * Used for displaying help information, tooltips, and informational content.
 *
 * @param {Object} props - Component props
 * @param {string} [props.title] - Optional popover title
 * @param {string} [props.content] - Help content text
 * @returns {JSX.Element} Help popover content
 *
 * @example
 * ```javascript
 * <PopoverHelp
 *   title="Search Help"
 *   content="Use quotes for exact matches, * for wildcards"
 * />
 * ```
 */
export const PopoverHelp = React.memo(({ title, content }) => {
    return (
        <>
            {title && <div className="popover__title">{title}</div>}
            <div className="popover__content">{content || 'Help information'}</div>
        </>
    );
});

PopoverHelp.displayName = 'PopoverHelp';

/**
 * PopoverSelector - Selector variant component for selection lists
 *
 * Renders a list of selectable options with icons, selection state, and auto-close behavior.
 * Integrates with usePopoverVariants hook for consistent business logic.
 *
 * @param {Object} props - Component props
 * @param {string} [props.title] - Optional popover title
 * @param {Array} props.options - Array of selectable options
 * @param {string} props.options[].key - Unique option identifier
 * @param {string} props.options[].label - Display label for option
 * @param {string} [props.options[].icon] - Optional icon identifier
 * @param {string} [props.selectedValue] - Currently selected value
 * @param {Function} [props.onSelect] - Selection callback function
 * @param {Function} [props.onClose] - Close callback function
 * @returns {JSX.Element} Selector popover content
 *
 * @example
 * ```javascript
 * <PopoverSelector
 *   title="Select Source"
 *   options={[
 *     { key: 'option1', label: 'First Option', icon: 'star' },
 *     { key: 'option2', label: 'Second Option' }
 *   ]}
 *   selectedValue={selectedValue}
 *   onSelect={handleSelect}
 *   onClose={handleClose}
 * />
 * ```
 */
export const PopoverSelector = React.memo(
    ({ title, options = [], selectedValue, onSelect, onClose }) => {
        const { renderIcon, createSelectionHandler, getSelectionClasses } = usePopoverVariants();

        const handleSelect = createSelectionHandler(onSelect, onClose);

        return (
            <>
                {title && <div className="popover__title">{title}</div>}
                <ul className="popover__list">
                    {options.map(option => (
                        <li key={option.key}>
                            <button
                                className={getSelectionClasses(selectedValue, option.key)}
                                onClick={() => handleSelect(option.key, option)}
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
);

PopoverSelector.displayName = 'PopoverSelector';

/**
 * PopoverActionsList - Actions variant component for action lists with danger support
 *
 * Renders a list of actionable items with icons, danger state styling, and auto-close behavior.
 * Supports danger state for destructive actions (delete, remove, etc.).
 *
 * @param {Object} props - Component props
 * @param {Array} props.actions - Array of action items
 * @param {string} props.actions[].key - Unique action identifier
 * @param {string} props.actions[].label - Display label for action
 * @param {string} [props.actions[].icon] - Optional icon identifier
 * @param {boolean} [props.actions[].danger] - Whether action is dangerous/destructive
 * @param {Function} [props.onSelect] - Action selection callback function
 * @param {Function} [props.onClose] - Close callback function
 * @returns {JSX.Element} Actions popover content
 *
 * @example
 * ```javascript
 * <PopoverActionsList
 *   actions={[
 *     { key: 'edit', label: 'Edit', icon: 'edit' },
 *     { key: 'delete', label: 'Delete', icon: 'delete', danger: true }
 *   ]}
 *   onSelect={handleActionSelect}
 *   onClose={handleClose}
 * />
 * ```
 */
export const PopoverActionsList = React.memo(({ actions = [], onSelect, onClose }) => {
    const { renderIcon, createSelectionHandler, getDangerClasses, getDangerStyles } =
        usePopoverVariants();

    const handleSelect = createSelectionHandler(onSelect, onClose);

    return (
        <ul className="popover__list">
            {actions.map(action => (
                <li key={action.key}>
                    <button
                        className={getDangerClasses(action.danger)}
                        onClick={() => handleSelect(action.key, action)}
                        style={getDangerStyles(action.danger)}
                    >
                        {action.icon && (
                            <span className="popover__list-icon" style={{ marginRight: '0.5rem' }}>
                                {renderIcon(action.icon)}
                            </span>
                        )}
                        {action.label}
                    </button>
                </li>
            ))}
        </ul>
    );
});

PopoverActionsList.displayName = 'PopoverActionsList';

/**
 * PopoverDefault - Default variant component for simple content
 *
 * Renders a simple popover with optional title and content.
 * Used as fallback variant and for basic text content display.
 *
 * @param {Object} props - Component props
 * @param {string} [props.title] - Optional popover title
 * @param {string} [props.content] - Main content text
 * @returns {JSX.Element} Default popover content
 *
 * @example
 * ```javascript
 * <PopoverDefault
 *   title="Information"
 *   content="This is some default content"
 * />
 * ```
 */
export const PopoverDefault = React.memo(({ title, content }) => {
    return (
        <>
            {title && <div className="popover__title">{title}</div>}
            <div className="popover__content">{content || 'Default popover content'}</div>
        </>
    );
});

PopoverDefault.displayName = 'PopoverDefault';

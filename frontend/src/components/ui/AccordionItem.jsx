import { useState, useContext, createContext } from 'react';

/**
 * Context for sharing accordion state between AccordionItem and subcomponents
 * @typedef {Object} AccordionItemContextValue
 * @property {boolean} isExpanded - Current expanded state
 * @property {Function} handleToggle - Toggle handler function
 */
const AccordionItemContext = createContext(null);

/**
 * AccordionItem - Manages accordion state and animation
 *
 * Supports both controlled and uncontrolled modes:
 * - Uncontrolled: Use `defaultExpanded` prop, component manages state internally
 * - Controlled: Use `isExpanded` and `onToggle` props, parent manages state
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Must contain Header and Body subcomponents
 * @param {boolean} [props.defaultExpanded=false] - Initial expanded state (uncontrolled mode)
 * @param {boolean} [props.isExpanded] - Controlled expanded state
 * @param {Function} [props.onToggle] - Callback when toggled: (isExpanded: boolean) => void
 * @param {string} [props.className] - Additional CSS classes for item container
 * @returns {JSX.Element} AccordionItem component
 */
export const AccordionItem = ({
    children,
    defaultExpanded = false,
    isExpanded: controlledExpanded,
    onToggle,
    className = '',
}) => {
    // State management: controlled vs uncontrolled
    const [internalExpanded, setInternalExpanded] = useState(defaultExpanded);
    const isControlled = controlledExpanded !== undefined;
    const isExpanded = isControlled ? controlledExpanded : internalExpanded;

    const handleToggle = () => {
        const newExpanded = !isExpanded;

        if (!isControlled) {
            setInternalExpanded(newExpanded);
        }

        onToggle?.(newExpanded);
    };

    return (
        <AccordionItemContext.Provider value={{ isExpanded, handleToggle }}>
            <details
                className={`accordion-item border border-border-subtle rounded-lg overflow-hidden ${className}`}
                open={isExpanded}
            >
                {children}
            </details>
        </AccordionItemContext.Provider>
    );
};

/**
 * AccordionItem.Header - Renders header content with click handling
 *
 * Supports both direct children and render prop patterns:
 * - Direct: `<Header>Content</Header>`
 * - Render prop: `<Header>{({ isExpanded }) => <div>...</div>}</Header>`
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode|Function} props.children - Header content or render function
 * @param {string} [props.className] - Additional CSS classes for header
 * @returns {JSX.Element} Header component
 */
const AccordionHeader = ({ children, className = '' }) => {
    const context = useContext(AccordionItemContext);

    if (!context) {
        throw new Error('AccordionItem.Header must be used within AccordionItem');
    }

    const { isExpanded, handleToggle } = context;

    const handleClick = event => {
        event.preventDefault(); // Prevent native details toggle
        handleToggle();
    };

    const content = typeof children === 'function' ? children({ isExpanded }) : children;

    return (
        <summary
            className={`accordion-header ${className}`}
            onClick={handleClick}
            role="button"
            tabIndex={0}
            aria-expanded={isExpanded}
            onKeyDown={e => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleToggle();
                }
            }}
        >
            {content}
        </summary>
    );
};

AccordionHeader.displayName = 'AccordionItem.Header';
AccordionItem.Header = AccordionHeader;

/**
 * AccordionItem.Body - Renders expanded content with animation
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Body content
 * @param {string} [props.className] - Additional CSS classes for body
 * @returns {JSX.Element} Body component
 */
const AccordionBody = ({ children, className = '' }) => {
    const context = useContext(AccordionItemContext);

    if (!context) {
        throw new Error('AccordionItem.Body must be used within AccordionItem');
    }

    const { isExpanded } = context;

    return (
        <div
            className={`accordion-body ${isExpanded ? 'accordion-body--expanded' : 'accordion-body--collapsed'} ${className}`}
            aria-hidden={!isExpanded}
        >
            {children}
        </div>
    );
};

AccordionBody.displayName = 'AccordionItem.Body';
AccordionItem.Body = AccordionBody;

AccordionItem.displayName = 'AccordionItem';

export default AccordionItem;

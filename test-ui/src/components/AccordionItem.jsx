/**
 * AccordionItem Component - Native HTML accordion implementation
 * Uses native <details> and <summary> elements for built-in accessibility
 * and smooth animations without JavaScript overhead.
 *
 * @param {Object} props - Component props
 * @param {string} props.title - The title displayed in the accordion header
 * @param {React.ReactNode} props.children - Content to show when expanded
 * @param {boolean} props.isExpanded - Whether the accordion is currently expanded
 * @param {Function} props.onToggle - Function to call when the accordion is toggled
 * @returns {JSX.Element} AccordionItem component
 */
export const AccordionItem = ({ title, children, isExpanded, onToggle }) => {
    const handleToggle = (event) => {
        // Prevent the native details toggle behavior
        event.preventDefault();
        onToggle();
    };

    return (
        <details
            className="accordion-item border border-border-subtle rounded-lg overflow-hidden"
            open={isExpanded}
        >
            <summary
                className="accordion-header list-none cursor-pointer"
                onClick={handleToggle}
            >
                <div className="w-full px-4 py-4 md:px-6 bg-surface hover:bg-surface-hover flex items-center justify-between min-h-[44px] touch-manipulation">
                    <span className="font-medium text-sm md:text-base text-text-primary pr-2">{title}</span>
                    <span
                        className="material-symbols-outlined transition-transform duration-200 text-xl text-text-secondary flex-shrink-0"
                        style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}
                    >
                        chevron_right
                    </span>
                </div>
            </summary>
            <div className="accordion-content bg-surface-elevated border-t border-border-subtle">
                <div className="px-4 py-4 md:px-6">
                    {children}
                </div>
            </div>
        </details>
    );
};

export default AccordionItem;
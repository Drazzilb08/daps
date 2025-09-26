/**
 * AccordionItem Component - Individual expandable accordion item
 * @param {Object} props - Component props
 * @param {string} props.title - The title displayed in the accordion header
 * @param {React.ReactNode} props.children - Content to show when expanded
 * @param {boolean} props.isExpanded - Whether the accordion is currently expanded
 * @param {Function} props.onToggle - Function to call when the accordion is toggled
 * @returns {JSX.Element} AccordionItem component
 */
export const AccordionItem = ({ title, children, isExpanded, onToggle }) => (
  <div className="border border-border-subtle rounded-lg">
    <button
      onClick={onToggle}
      className="w-full px-6 py-4 text-left bg-surface hover:bg-surface-hover flex items-center justify-between"
      aria-expanded={isExpanded}
    >
      <span className="font-medium text-text-primary">{title}</span>
      <span className="material-symbols-outlined transition-transform duration-200 text-text-secondary"
            style={{ transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)' }}>
        chevron_right
      </span>
    </button>
    {isExpanded && (
      <div className="px-6 py-4 bg-surface-elevated border-t border-border-subtle">
        {children}
      </div>
    )}
  </div>
);

export default AccordionItem;
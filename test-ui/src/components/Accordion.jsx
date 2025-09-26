/**
 * Accordion Component - Container for multiple accordion items
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - AccordionItem children
 * @param {string} props.className - Additional CSS classes
 * @returns {JSX.Element} Accordion container
 */
export const Accordion = ({ children, className = '' }) => (
  <div className={`space-y-3 ${className}`}>
    {children}
  </div>
);

export default Accordion;
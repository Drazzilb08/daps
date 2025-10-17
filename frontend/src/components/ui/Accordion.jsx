/**
 * Accordion - Container for multiple AccordionItem components
 *
 * Provides consistent spacing and layout for accordion items.
 * Use with the new compound AccordionItem components:
 *
 * @example
 * <Accordion className="space-y-3">
 *   <AccordionItem>
 *     <AccordionItem.Header>Title</AccordionItem.Header>
 *     <AccordionItem.Body>Content</AccordionItem.Body>
 *   </AccordionItem>
 * </Accordion>
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - AccordionItem components
 * @param {string} [props.className] - Additional CSS classes for spacing/layout
 * @returns {JSX.Element} Accordion container
 */
export const Accordion = ({ children, className = '' }) => (
    <div className={`space-y-3 ${className}`}>{children}</div>
);

Accordion.displayName = 'Accordion';

export default Accordion;

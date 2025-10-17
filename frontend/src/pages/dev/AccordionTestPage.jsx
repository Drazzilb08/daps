import { useState } from 'react';
import AccordionItem from '../../components/ui/AccordionItem';
import { Accordion } from '../../components/ui/Accordion';
import { Modal } from '../../components/ui';

/**
 * AccordionTestPage - Comprehensive testing page for AccordionItem compound component
 * Tests all validation scenarios from Phase 1 specification
 * @returns {JSX.Element} AccordionTestPage component
 */
const AccordionTestPage = () => {
    // State for controlled accordion test
    const [controlledExpanded, setControlledExpanded] = useState(false);

    // State for modal tests
    const [modalOpen, setModalOpen] = useState(false);
    const [controlledModalOpen, setControlledModalOpen] = useState(false);

    return (
        <div className="p-6 max-w-4xl mx-auto">
            <h1 className="text-2xl font-bold mb-6 text-primary">
                AccordionItem Component Testing
            </h1>

            <div className="space-y-8">
                {/* Test 1: Uncontrolled Mode */}
                <section>
                    <h2 className="text-xl font-semibold mb-4 text-primary">
                        Test 1: Uncontrolled Mode
                    </h2>
                    <p className="mb-4 text-secondary">
                        Component starts expanded, clicking toggles state internally.
                    </p>

                    <AccordionItem
                        defaultExpanded={true}
                        className="border border-border-subtle rounded-lg overflow-hidden"
                    >
                        <AccordionItem.Header className="list-none">
                            <div className="w-full px-4 py-4 md:px-6 bg-surface hover:bg-surface-hover flex items-center justify-between min-h-11 touch-manipulation">
                                <span className="font-medium text-sm md:text-base text-primary pr-2">
                                    Test Header (Uncontrolled)
                                </span>
                                <span className="material-symbols-outlined transition-transform duration-200 text-xl text-secondary flex-shrink-0">
                                    expand_more
                                </span>
                            </div>
                        </AccordionItem.Header>
                        <AccordionItem.Body>
                            <div className="bg-surface-elevated border-t border-border-subtle">
                                <div className="px-4 py-4 md:px-6">
                                    <div className="text-primary">
                                        Test Body Content - This accordion starts expanded and
                                        manages its own state.
                                    </div>
                                </div>
                            </div>
                        </AccordionItem.Body>
                    </AccordionItem>
                </section>

                {/* Test 2: Controlled Mode */}
                <section>
                    <h2 className="text-xl font-semibold mb-4 text-primary">
                        Test 2: Controlled Mode
                    </h2>
                    <p className="mb-4 text-secondary">
                        Parent controls state, onToggle callback fires on click.
                    </p>

                    <div className="mb-4">
                        <button
                            onClick={() => setControlledExpanded(!controlledExpanded)}
                            className="bg-primary text-white px-4 py-2 rounded hover:bg-primary-hover"
                        >
                            External Toggle (Currently:{' '}
                            {controlledExpanded ? 'Expanded' : 'Collapsed'})
                        </button>
                    </div>

                    <AccordionItem
                        isExpanded={controlledExpanded}
                        onToggle={newExpanded => {
                            console.log('onToggle callback:', newExpanded);
                            setControlledExpanded(newExpanded);
                        }}
                        className="border border-border-subtle rounded-lg overflow-hidden"
                    >
                        <AccordionItem.Header className="list-none">
                            <div className="w-full px-4 py-4 md:px-6 bg-surface hover:bg-surface-hover flex items-center justify-between min-h-11 touch-manipulation">
                                <span className="font-medium text-sm md:text-base text-primary pr-2">
                                    Controlled Header
                                </span>
                                <span className="material-symbols-outlined transition-transform duration-200 text-xl text-secondary flex-shrink-0">
                                    expand_more
                                </span>
                            </div>
                        </AccordionItem.Header>
                        <AccordionItem.Body>
                            <div className="bg-surface-elevated border-t border-border-subtle">
                                <div className="px-4 py-4 md:px-6">
                                    <div className="text-primary">
                                        Controlled Body - State managed by parent component.
                                    </div>
                                </div>
                            </div>
                        </AccordionItem.Body>
                    </AccordionItem>
                </section>

                {/* Test 3: Render Prop Pattern */}
                <section>
                    <h2 className="text-xl font-semibold mb-4 text-primary">
                        Test 3: Render Prop Pattern
                    </h2>
                    <p className="mb-4 text-secondary">
                        Render function receives isExpanded prop, icon rotates based on state.
                    </p>

                    <AccordionItem>
                        <AccordionItem.Header className="list-none">
                            {({ isExpanded }) => (
                                <div className="w-full px-4 py-4 md:px-6 bg-surface hover:bg-surface-hover flex items-center justify-between min-h-11 touch-manipulation">
                                    <span className="font-medium text-sm md:text-base text-primary pr-2">
                                        Dynamic Header (Render Prop)
                                    </span>
                                    <span
                                        className="material-symbols-outlined transition-transform duration-200 text-xl text-secondary flex-shrink-0"
                                        style={{
                                            transform: isExpanded
                                                ? 'rotate(90deg)'
                                                : 'rotate(0deg)',
                                        }}
                                    >
                                        chevron_right
                                    </span>
                                </div>
                            )}
                        </AccordionItem.Header>
                        <AccordionItem.Body>
                            <div className="bg-surface-elevated border-t border-border-subtle">
                                <div className="px-4 py-4 md:px-6">
                                    <div className="text-primary">
                                        Dynamic content with rotating chevron icon.
                                    </div>
                                </div>
                            </div>
                        </AccordionItem.Body>
                    </AccordionItem>
                </section>

                {/* Test 4: Keyboard Navigation */}
                <section>
                    <h2 className="text-xl font-semibold mb-4 text-primary">
                        Test 4: Keyboard Navigation
                    </h2>
                    <p className="mb-4 text-secondary">
                        Tab to focus header, then use Enter or Space to toggle.
                    </p>

                    <AccordionItem>
                        <AccordionItem.Header className="list-none focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2">
                            <div className="w-full px-4 py-4 md:px-6 bg-surface hover:bg-surface-hover flex items-center justify-between min-h-11 touch-manipulation">
                                <span className="font-medium text-sm md:text-base text-primary pr-2">
                                    Keyboard Test Header
                                </span>
                                <span className="material-symbols-outlined transition-transform duration-200 text-xl text-secondary flex-shrink-0">
                                    expand_more
                                </span>
                            </div>
                        </AccordionItem.Header>
                        <AccordionItem.Body>
                            <div className="bg-surface-elevated border-t border-border-subtle">
                                <div className="px-4 py-4 md:px-6">
                                    <div className="text-primary">
                                        Content accessible via keyboard navigation.
                                    </div>
                                </div>
                            </div>
                        </AccordionItem.Body>
                    </AccordionItem>
                </section>

                {/* Test 5: Multiple Accordions */}
                <section>
                    <h2 className="text-xl font-semibold mb-4 text-primary">
                        Test 5: Multiple Accordions
                    </h2>
                    <p className="mb-4 text-secondary">
                        Each accordion is independent, state isolated per component.
                    </p>

                    <div className="space-y-4">
                        <AccordionItem
                            defaultExpanded={true}
                            className="border border-border-subtle rounded-lg overflow-hidden"
                        >
                            <AccordionItem.Header className="list-none">
                                <div className="w-full px-4 py-4 md:px-6 bg-surface hover:bg-surface-hover flex items-center justify-between min-h-11 touch-manipulation">
                                    <span className="font-medium text-sm md:text-base text-primary pr-2">
                                        First Accordion (Default Expanded)
                                    </span>
                                    <span className="material-symbols-outlined transition-transform duration-200 text-xl text-secondary flex-shrink-0">
                                        expand_more
                                    </span>
                                </div>
                            </AccordionItem.Header>
                            <AccordionItem.Body>
                                <div className="bg-surface-elevated border-t border-border-subtle">
                                    <div className="px-4 py-4 md:px-6">
                                        <div className="text-primary">
                                            First content - starts expanded.
                                        </div>
                                    </div>
                                </div>
                            </AccordionItem.Body>
                        </AccordionItem>

                        <AccordionItem
                            defaultExpanded={false}
                            className="border border-border-subtle rounded-lg overflow-hidden"
                        >
                            <AccordionItem.Header className="list-none">
                                <div className="w-full px-4 py-4 md:px-6 bg-surface hover:bg-surface-hover flex items-center justify-between min-h-11 touch-manipulation">
                                    <span className="font-medium text-sm md:text-base text-primary pr-2">
                                        Second Accordion (Default Collapsed)
                                    </span>
                                    <span className="material-symbols-outlined transition-transform duration-200 text-xl text-secondary flex-shrink-0">
                                        expand_more
                                    </span>
                                </div>
                            </AccordionItem.Header>
                            <AccordionItem.Body>
                                <div className="bg-surface-elevated border-t border-border-subtle">
                                    <div className="px-4 py-4 md:px-6">
                                        <div className="text-primary">
                                            Second content - starts collapsed.
                                        </div>
                                    </div>
                                </div>
                            </AccordionItem.Body>
                        </AccordionItem>

                        <AccordionItem
                            defaultExpanded={false}
                            className="border border-border-subtle rounded-lg overflow-hidden"
                        >
                            <AccordionItem.Header className="list-none">
                                <div className="w-full px-4 py-4 md:px-6 bg-surface hover:bg-surface-hover flex items-center justify-between min-h-11 touch-manipulation">
                                    <span className="font-medium text-sm md:text-base text-primary pr-2">
                                        Third Accordion (Default Collapsed)
                                    </span>
                                    <span className="material-symbols-outlined transition-transform duration-200 text-xl text-secondary flex-shrink-0">
                                        expand_more
                                    </span>
                                </div>
                            </AccordionItem.Header>
                            <AccordionItem.Body>
                                <div className="bg-surface-elevated border-t border-border-subtle">
                                    <div className="px-4 py-4 md:px-6">
                                        <div className="text-primary">
                                            Third content - starts collapsed.
                                        </div>
                                    </div>
                                </div>
                            </AccordionItem.Body>
                        </AccordionItem>
                    </div>
                </section>

                {/* Test 6: Configurable Cursor */}
                <section>
                    <h2 className="text-xl font-semibold mb-4 text-primary">
                        Test 6: Configurable Cursor
                    </h2>
                    <p className="mb-4 text-secondary">
                        Testing cursor behavior - default pointer cursor vs overridden default
                        cursor.
                    </p>

                    <div className="space-y-4">
                        {/* Default pointer cursor */}
                        <AccordionItem>
                            <AccordionItem.Header className="list-none">
                                <div className="w-full px-4 py-4 md:px-6 bg-surface hover:bg-surface-hover flex items-center justify-between min-h-11 touch-manipulation">
                                    <span className="font-medium text-sm md:text-base text-primary pr-2">
                                        Default Cursor Test - Should show pointer cursor on hover
                                    </span>
                                    <span className="material-symbols-outlined transition-transform duration-200 text-xl text-secondary flex-shrink-0">
                                        expand_more
                                    </span>
                                </div>
                            </AccordionItem.Header>
                            <AccordionItem.Body>
                                <div className="bg-surface-elevated border-t border-border-subtle">
                                    <div className="px-4 py-4 md:px-6">
                                        <div className="text-primary">
                                            This accordion header shows the default pointer cursor
                                            on hover.
                                        </div>
                                    </div>
                                </div>
                            </AccordionItem.Body>
                        </AccordionItem>

                        {/* Override with default cursor */}
                        <AccordionItem>
                            <AccordionItem.Header className="list-none cursor-default">
                                <div className="w-full px-4 py-4 md:px-6 bg-surface hover:bg-surface-hover flex items-center justify-between min-h-11 touch-manipulation">
                                    <span className="font-medium text-sm md:text-base text-primary pr-2">
                                        Default Cursor Override Test - Should show default cursor on
                                        hover
                                    </span>
                                    <span className="material-symbols-outlined transition-transform duration-200 text-xl text-secondary flex-shrink-0">
                                        expand_more
                                    </span>
                                </div>
                            </AccordionItem.Header>
                            <AccordionItem.Body>
                                <div className="bg-surface-elevated border-t border-border-subtle">
                                    <div className="px-4 py-4 md:px-6">
                                        <div className="text-primary">
                                            This accordion header uses the
                                            &apos;cursor-default&apos; utility class to override the
                                            pointer cursor.
                                        </div>
                                    </div>
                                </div>
                            </AccordionItem.Body>
                        </AccordionItem>
                    </div>
                </section>

                {/* Error Handling Test */}
                <section>
                    <h2 className="text-xl font-semibold mb-4 text-primary">
                        Test 7: Error Handling
                    </h2>
                    <p className="mb-4 text-secondary">
                        Using subcomponents outside AccordionItem should throw errors (check
                        console).
                    </p>

                    <div className="bg-error-bg border border-error rounded-lg p-4">
                        <p className="text-error text-sm">
                            The following components are commented out as they would throw errors.
                            Uncomment in dev tools to test error handling:
                        </p>
                        <pre className="text-xs mt-2 text-error">
                            {`// This would throw: "AccordionItem.Header must be used within AccordionItem"
// <AccordionItem.Header>Invalid Usage</AccordionItem.Header>

// This would throw: "AccordionItem.Body must be used within AccordionItem"
// <AccordionItem.Body>Invalid Usage</AccordionItem.Body>`}
                        </pre>
                    </div>
                </section>

                {/* Phase 2: Accordion Container Tests */}
                <section>
                    <h2 className="text-xl font-semibold mb-4 text-primary">
                        Phase 2: Accordion Container Integration Tests
                    </h2>
                    <p className="mb-4 text-secondary">
                        Testing Accordion container component with AccordionItem compound
                        components.
                    </p>

                    <div className="space-y-6">
                        {/* Test: Basic Integration */}
                        <div>
                            <h3 className="text-lg font-medium mb-2 text-primary">
                                Basic Integration
                            </h3>
                            <p className="mb-3 text-sm text-secondary">
                                Multiple AccordionItems in Accordion container with default spacing
                            </p>
                            <Accordion>
                                <AccordionItem>
                                    <AccordionItem.Header className="list-none">
                                        <div className="w-full px-4 py-4 md:px-6 bg-surface hover:bg-surface-hover flex items-center justify-between min-h-11 touch-manipulation">
                                            <span className="font-medium text-sm md:text-base text-primary pr-2">
                                                Container Item 1
                                            </span>
                                            <span className="material-symbols-outlined transition-transform duration-200 text-xl text-secondary flex-shrink-0">
                                                expand_more
                                            </span>
                                        </div>
                                    </AccordionItem.Header>
                                    <AccordionItem.Body>
                                        <div className="bg-surface-elevated border-t border-border-subtle">
                                            <div className="px-4 py-4 md:px-6">
                                                <div className="text-primary">
                                                    Content within Accordion container
                                                </div>
                                            </div>
                                        </div>
                                    </AccordionItem.Body>
                                </AccordionItem>
                                <AccordionItem>
                                    <AccordionItem.Header className="list-none">
                                        <div className="w-full px-4 py-4 md:px-6 bg-surface hover:bg-surface-hover flex items-center justify-between min-h-11 touch-manipulation">
                                            <span className="font-medium text-sm md:text-base text-primary pr-2">
                                                Container Item 2
                                            </span>
                                            <span className="material-symbols-outlined transition-transform duration-200 text-xl text-secondary flex-shrink-0">
                                                expand_more
                                            </span>
                                        </div>
                                    </AccordionItem.Header>
                                    <AccordionItem.Body>
                                        <div className="bg-surface-elevated border-t border-border-subtle">
                                            <div className="px-4 py-4 md:px-6">
                                                <div className="text-primary">
                                                    Second content with proper spacing
                                                </div>
                                            </div>
                                        </div>
                                    </AccordionItem.Body>
                                </AccordionItem>
                            </Accordion>
                        </div>

                        {/* Test: Custom Spacing */}
                        <div>
                            <h3 className="text-lg font-medium mb-2 text-primary">
                                Custom Spacing Test
                            </h3>
                            <p className="mb-3 text-sm text-secondary">
                                Accordion with space-y-4 custom spacing
                            </p>
                            <Accordion className="space-y-4">
                                <AccordionItem
                                    defaultExpanded={true}
                                    className="border border-border-subtle rounded-lg overflow-hidden"
                                >
                                    <AccordionItem.Header className="list-none">
                                        <div className="w-full px-4 py-4 md:px-6 bg-surface hover:bg-surface-hover flex items-center justify-between min-h-11 touch-manipulation">
                                            <span className="font-medium text-sm md:text-base text-primary pr-2">
                                                Spaced Item 1 (Expanded)
                                            </span>
                                            <span className="material-symbols-outlined transition-transform duration-200 text-xl text-secondary flex-shrink-0">
                                                expand_more
                                            </span>
                                        </div>
                                    </AccordionItem.Header>
                                    <AccordionItem.Body>
                                        <div className="bg-surface-elevated border-t border-border-subtle">
                                            <div className="px-4 py-4 md:px-6">
                                                <div className="text-primary">
                                                    First item with increased spacing below
                                                </div>
                                            </div>
                                        </div>
                                    </AccordionItem.Body>
                                </AccordionItem>
                                <AccordionItem>
                                    <AccordionItem.Header className="list-none">
                                        <div className="w-full px-4 py-4 md:px-6 bg-surface hover:bg-surface-hover flex items-center justify-between min-h-11 touch-manipulation">
                                            <span className="font-medium text-sm md:text-base text-primary pr-2">
                                                Spaced Item 2
                                            </span>
                                            <span className="material-symbols-outlined transition-transform duration-200 text-xl text-secondary flex-shrink-0">
                                                expand_more
                                            </span>
                                        </div>
                                    </AccordionItem.Header>
                                    <AccordionItem.Body>
                                        <div className="bg-surface-elevated border-t border-border-subtle">
                                            <div className="px-4 py-4 md:px-6">
                                                <div className="text-primary">
                                                    Spacing preserved during expansion/collapse
                                                </div>
                                            </div>
                                        </div>
                                    </AccordionItem.Body>
                                </AccordionItem>
                            </Accordion>
                        </div>

                        {/* Test: Single Item */}
                        <div>
                            <h3 className="text-lg font-medium mb-2 text-primary">
                                Single Item Test
                            </h3>
                            <p className="mb-3 text-sm text-secondary">
                                Single AccordionItem in Accordion container
                            </p>
                            <Accordion>
                                <AccordionItem
                                    defaultExpanded={true}
                                    className="border border-border-subtle rounded-lg overflow-hidden"
                                >
                                    <AccordionItem.Header className="list-none">
                                        <div className="w-full px-4 py-4 md:px-6 bg-surface hover:bg-surface-hover flex items-center justify-between min-h-11 touch-manipulation">
                                            <span className="font-medium text-sm md:text-base text-primary pr-2">
                                                Single Item (Expanded)
                                            </span>
                                            <span className="material-symbols-outlined transition-transform duration-200 text-xl text-secondary flex-shrink-0">
                                                expand_more
                                            </span>
                                        </div>
                                    </AccordionItem.Header>
                                    <AccordionItem.Body>
                                        <div className="bg-surface-elevated border-t border-border-subtle">
                                            <div className="px-4 py-4 md:px-6">
                                                <div className="text-primary">
                                                    Single item within container works perfectly
                                                </div>
                                            </div>
                                        </div>
                                    </AccordionItem.Body>
                                </AccordionItem>
                            </Accordion>
                        </div>
                    </div>
                </section>

                {/* Modal Tests - Phase 1 */}
                <section>
                    <h2 className="text-xl font-semibold mb-4 text-primary">
                        Modal Component Tests (Phase 1)
                    </h2>
                    <p className="mb-4 text-secondary">
                        Testing Modal compound component with controlled/uncontrolled modes
                    </p>

                    <div className="space-y-4">
                        {/* Controlled Mode Test */}
                        <div>
                            <h3 className="text-lg font-medium mb-2 text-primary">
                                Controlled Mode
                            </h3>
                            <button
                                onClick={() => setControlledModalOpen(true)}
                                className="bg-primary text-white px-4 py-2 rounded hover:bg-primary-hover min-h-11"
                            >
                                Open Controlled Modal
                            </button>
                            <Modal
                                isOpen={controlledModalOpen}
                                onClose={() => setControlledModalOpen(false)}
                                size="medium"
                            >
                                <Modal.Header>Controlled Modal</Modal.Header>
                                <Modal.Body>
                                    <p className="text-primary">
                                        This is a controlled modal. Parent manages the state.
                                    </p>
                                    <p className="text-secondary mt-2">
                                        Click backdrop, ESC key, or close button to close.
                                    </p>
                                </Modal.Body>
                                <Modal.Footer align="right">
                                    <button
                                        onClick={() => setControlledModalOpen(false)}
                                        className="bg-secondary text-white px-4 py-2 rounded hover:bg-secondary-hover min-h-11"
                                    >
                                        Close
                                    </button>
                                </Modal.Footer>
                            </Modal>
                        </div>

                        {/* Size Variants Test */}
                        <div>
                            <h3 className="text-lg font-medium mb-2 text-primary">Size Variants</h3>
                            <div className="flex gap-3 flex-wrap">
                                {['small', 'medium', 'large', 'full'].map(size => (
                                    <button
                                        key={size}
                                        onClick={() => {
                                            setModalOpen(size);
                                        }}
                                        className="bg-primary text-white px-4 py-2 rounded hover:bg-primary-hover min-h-11"
                                    >
                                        {size.charAt(0).toUpperCase() + size.slice(1)} Modal
                                    </button>
                                ))}
                            </div>
                            {modalOpen && (
                                <Modal
                                    isOpen={true}
                                    onClose={() => setModalOpen(false)}
                                    size={modalOpen}
                                >
                                    <Modal.Header>
                                        {modalOpen.charAt(0).toUpperCase() + modalOpen.slice(1)}{' '}
                                        Modal
                                    </Modal.Header>
                                    <Modal.Body>
                                        <p className="text-primary">
                                            This is a {modalOpen} modal demonstrating size variant.
                                        </p>
                                        <div className="mt-4 space-y-2">
                                            <p className="text-secondary">
                                                Sample content to show scrolling:
                                            </p>
                                            {Array.from({ length: 10 }, (_, i) => (
                                                <p key={i} className="text-secondary">
                                                    Line {i + 1}: Lorem ipsum dolor sit amet,
                                                    consectetur adipiscing elit.
                                                </p>
                                            ))}
                                        </div>
                                    </Modal.Body>
                                    <Modal.Footer align="space-between">
                                        <button
                                            onClick={() => setModalOpen(false)}
                                            className="bg-secondary text-white px-4 py-2 rounded hover:bg-secondary-hover min-h-11"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            onClick={() => setModalOpen(false)}
                                            className="bg-primary text-white px-4 py-2 rounded hover:bg-primary-hover min-h-11"
                                        >
                                            Confirm
                                        </button>
                                    </Modal.Footer>
                                </Modal>
                            )}
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default AccordionTestPage;

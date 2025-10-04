import { useState } from 'react';
import { Modal } from '../../components/ui';
import { Button } from '../../components/ui';
import FieldRegistry from '../../components/fields/FieldRegistry';
import AccordionItem from '../../components/ui/AccordionItem';

/**
 * ModalsTestPage - Comprehensive testing page for Modal compound component
 * Tests all features from Phase 1 & 2 specification with real-world examples
 * @returns {JSX.Element} ModalsTestPage component
 */
const ModalsTestPage = () => {
    // Section A: Size Variants
    const [sizeModalOpen, setSizeModalOpen] = useState(null);

    // Section B: Controlled vs Uncontrolled
    const [controlledOpen, setControlledOpen] = useState(false);

    // Section C: Close Behavior
    const [closableOpen, setClosableOpen] = useState(false);
    const [nonClosableOpen, setNonClosableOpen] = useState(false);

    // Section D: Content Examples
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [formOpen, setFormOpen] = useState(false);
    const [longContentOpen, setLongContentOpen] = useState(false);
    const [footerAlignOpen, setFooterAlignOpen] = useState(null);
    const [noFooterOpen, setNoFooterOpen] = useState(false);
    const [complexOpen, setComplexOpen] = useState(false);

    // Form modal state
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        role: '',
    });

    // Section F: Performance
    const [stressTestCount, setStressTestCount] = useState(0);
    const [stressTestRunning, setStressTestRunning] = useState(false);

    // Form fields definition
    const formFields = [
        { key: 'name', type: 'text', label: 'Name', required: true, description: 'Your full name' },
        {
            key: 'email',
            type: 'text',
            label: 'Email',
            required: true,
            description: 'Your email address',
        },
        {
            key: 'role',
            type: 'dropdown',
            label: 'Role',
            required: true,
            options: [
                { label: 'Administrator', value: 'admin' },
                { label: 'User', value: 'user' },
                { label: 'Guest', value: 'guest' },
            ],
            description: 'Select your role',
        },
    ];

    // Handlers
    const handleConfirm = () => {
        console.log('Confirmed!');
        setConfirmOpen(false);
    };

    const handleFormSubmit = () => {
        console.log('Form submitted:', formData);
        setFormOpen(false);
    };

    const handleStressTest = async () => {
        setStressTestRunning(true);
        setStressTestCount(0);

        for (let i = 0; i < 10; i++) {
            setStressTestCount(i + 1);
            setSizeModalOpen('small');
            await new Promise(resolve => setTimeout(resolve, 100));
            setSizeModalOpen(null);
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        setStressTestRunning(false);
    };

    return (
        <div className="p-6 max-w-6xl mx-auto">
            <h1 className="text-3xl font-bold mb-6 text-primary">Modal System Test Page</h1>
            <p className="text-secondary mb-8">
                Comprehensive testing interface for all Modal features with real-world examples
            </p>

            <div className="space-y-8">
                {/* Section A: Size Variants */}
                <section className="border border-border rounded-lg p-6 bg-surface">
                    <h2 className="text-2xl font-semibold mb-4 text-primary">
                        Section A: Size Variants Demo
                    </h2>
                    <p className="text-secondary mb-4">
                        Four size variants: small (448px), medium (672px), large (896px), full
                        (1280px). Automatically full-width on mobile.
                    </p>

                    <div className="flex gap-3 flex-wrap">
                        <Button onClick={() => setSizeModalOpen('small')}>Small Modal</Button>
                        <Button onClick={() => setSizeModalOpen('medium')}>Medium Modal</Button>
                        <Button onClick={() => setSizeModalOpen('large')}>Large Modal</Button>
                        <Button onClick={() => setSizeModalOpen('full')}>Full Modal</Button>
                    </div>

                    {sizeModalOpen && (
                        <Modal
                            isOpen={true}
                            onClose={() => setSizeModalOpen(null)}
                            size={sizeModalOpen}
                        >
                            <Modal.Header>
                                {sizeModalOpen.charAt(0).toUpperCase() + sizeModalOpen.slice(1)}{' '}
                                Modal
                            </Modal.Header>
                            <Modal.Body>
                                <p className="text-primary mb-4">
                                    This is a <strong>{sizeModalOpen}</strong> modal variant.
                                </p>
                                <div className="bg-surface-elevated p-4 rounded border border-border">
                                    <p className="text-sm text-secondary">
                                        <strong>Size Details:</strong>
                                    </p>
                                    <ul className="text-sm text-secondary mt-2 space-y-1">
                                        <li>
                                            • <strong>small</strong>: max-width 28rem (448px)
                                        </li>
                                        <li>
                                            • <strong>medium</strong>: max-width 42rem (672px)
                                        </li>
                                        <li>
                                            • <strong>large</strong>: max-width 56rem (896px)
                                        </li>
                                        <li>
                                            • <strong>full</strong>: max-width 80rem (1280px)
                                        </li>
                                    </ul>
                                </div>
                            </Modal.Body>
                            <Modal.Footer align="right">
                                <Button variant="secondary" onClick={() => setSizeModalOpen(null)}>
                                    Close
                                </Button>
                            </Modal.Footer>
                        </Modal>
                    )}
                </section>

                {/* Section B: Controlled vs Uncontrolled */}
                <section className="border border-border rounded-lg p-6 bg-surface">
                    <h2 className="text-2xl font-semibold mb-4 text-primary">
                        Section B: Controlled vs Uncontrolled Demo
                    </h2>
                    <p className="text-secondary mb-4">
                        Controlled mode uses <code>isOpen</code> and <code>onClose</code> props.
                        Uncontrolled mode uses <code>defaultOpen</code> prop with internal state.
                    </p>

                    <div className="grid md:grid-cols-2 gap-6">
                        {/* Controlled Example */}
                        <div className="border border-border-subtle rounded p-4">
                            <h3 className="text-lg font-medium mb-3 text-primary">
                                Controlled Mode
                            </h3>
                            <p className="text-sm text-secondary mb-3">
                                Parent component controls state. Modal opens/closes based on parent
                                state changes.
                            </p>
                            <Button onClick={() => setControlledOpen(true)}>
                                Open Controlled Modal
                            </Button>
                            <p className="text-xs text-tertiary mt-2">
                                Current state: <strong>{controlledOpen ? 'Open' : 'Closed'}</strong>
                            </p>

                            <Modal
                                isOpen={controlledOpen}
                                onClose={() => setControlledOpen(false)}
                                size="small"
                            >
                                <Modal.Header>Controlled Modal</Modal.Header>
                                <Modal.Body>
                                    <p className="text-primary">
                                        This modal&apos;s state is managed by the parent component.
                                    </p>
                                    <div className="mt-4 p-3 bg-surface-elevated rounded border border-border-subtle">
                                        <code className="text-xs text-secondary">
                                            {`const [open, setOpen] = useState(false);`}
                                            <br />
                                            {`<Modal isOpen={open} onClose={() => setOpen(false)}>`}
                                        </code>
                                    </div>
                                </Modal.Body>
                                <Modal.Footer align="right">
                                    <Button
                                        variant="secondary"
                                        onClick={() => setControlledOpen(false)}
                                    >
                                        Close
                                    </Button>
                                </Modal.Footer>
                            </Modal>
                        </div>

                        {/* Uncontrolled Example */}
                        <div className="border border-border-subtle rounded p-4">
                            <h3 className="text-lg font-medium mb-3 text-primary">
                                Uncontrolled Mode
                            </h3>
                            <p className="text-sm text-secondary mb-3">
                                Modal manages its own state internally. Use <code>defaultOpen</code>{' '}
                                to set initial state.
                            </p>
                            <p className="text-xs text-warning bg-warning/10 p-2 rounded border border-warning">
                                Note: Uncontrolled mode shown in controlled example for demo
                                purposes. In real usage, defaultOpen sets initial state only.
                            </p>
                        </div>
                    </div>
                </section>

                {/* Section C: Close Behavior */}
                <section className="border border-border rounded-lg p-6 bg-surface">
                    <h2 className="text-2xl font-semibold mb-4 text-primary">
                        Section C: Close Behavior Demo
                    </h2>
                    <p className="text-secondary mb-4">
                        Test different close behaviors: closable (all methods) vs non-closable
                        (backdrop and ESC disabled).
                    </p>

                    <div className="grid md:grid-cols-2 gap-4">
                        <div>
                            <Button onClick={() => setClosableOpen(true)}>
                                Closable Modal (Default)
                            </Button>
                            <ul className="text-sm text-secondary mt-2 space-y-1">
                                <li>✓ Click backdrop to close</li>
                                <li>✓ Press ESC key to close</li>
                                <li>✓ Click close button (X) to close</li>
                            </ul>
                        </div>

                        <div>
                            <Button variant="danger" onClick={() => setNonClosableOpen(true)}>
                                Non-Closable Modal
                            </Button>
                            <ul className="text-sm text-secondary mt-2 space-y-1">
                                <li>✗ Backdrop click disabled</li>
                                <li>✗ ESC key disabled</li>
                                <li>✗ No close button (X)</li>
                                <li>✓ Must use action buttons</li>
                            </ul>
                        </div>
                    </div>

                    {/* Closable Modal */}
                    <Modal isOpen={closableOpen} onClose={() => setClosableOpen(false)}>
                        <Modal.Header>Closable Modal</Modal.Header>
                        <Modal.Body>
                            <p className="text-primary mb-3">
                                This modal can be closed in three ways:
                            </p>
                            <ol className="list-decimal list-inside text-secondary space-y-2">
                                <li>Click the backdrop (dark area outside modal)</li>
                                <li>Press the ESC key on your keyboard</li>
                                <li>Click the close button (X) in the header</li>
                            </ol>
                        </Modal.Body>
                        <Modal.Footer align="right">
                            <Button variant="secondary" onClick={() => setClosableOpen(false)}>
                                Close via Footer Button
                            </Button>
                        </Modal.Footer>
                    </Modal>

                    {/* Non-Closable Modal */}
                    <Modal
                        isOpen={nonClosableOpen}
                        onClose={() => setNonClosableOpen(false)}
                        closable={false}
                    >
                        <Modal.Header>Non-Closable Modal</Modal.Header>
                        <Modal.Body>
                            <p className="text-primary mb-3">
                                This modal has <code>closable=false</code>:
                            </p>
                            <ul className="list-disc list-inside text-secondary space-y-2">
                                <li>No close button (X) in header</li>
                                <li>Backdrop click does nothing</li>
                                <li>ESC key does nothing</li>
                                <li>Must use action buttons to close</li>
                            </ul>
                            <div className="mt-4 p-3 bg-warning/10 border border-warning rounded">
                                <p className="text-sm text-warning">
                                    <strong>Warning:</strong> Use non-closable modals sparingly.
                                    They can trap users if action buttons fail or are unclear.
                                </p>
                            </div>
                        </Modal.Body>
                        <Modal.Footer align="right">
                            <Button variant="danger" onClick={() => setNonClosableOpen(false)}>
                                I Understand - Close Modal
                            </Button>
                        </Modal.Footer>
                    </Modal>
                </section>

                {/* Section D: Content Examples */}
                <section className="border border-border rounded-lg p-6 bg-surface">
                    <h2 className="text-2xl font-semibold mb-4 text-primary">
                        Section D: Content Examples
                    </h2>
                    <p className="text-secondary mb-6">
                        Real-world modal content patterns: confirmation, forms, long content, footer
                        alignments, and complex content.
                    </p>

                    <div className="space-y-6">
                        {/* D1: Simple Confirmation */}
                        <div className="border border-border-subtle rounded p-4">
                            <h3 className="text-lg font-medium mb-2 text-primary">
                                D1: Simple Confirmation
                            </h3>
                            <p className="text-sm text-secondary mb-3">
                                Small modal with confirm/cancel buttons for destructive actions.
                            </p>
                            <Button variant="danger" onClick={() => setConfirmOpen(true)}>
                                Delete Item
                            </Button>

                            <Modal
                                isOpen={confirmOpen}
                                onClose={() => setConfirmOpen(false)}
                                size="small"
                            >
                                <Modal.Header>Confirm Action</Modal.Header>
                                <Modal.Body>
                                    <p className="text-primary mb-3">
                                        Are you sure you want to delete this item?
                                    </p>
                                    <p className="text-sm text-secondary">
                                        This action cannot be undone.
                                    </p>
                                </Modal.Body>
                                <Modal.Footer align="right">
                                    <Button
                                        variant="secondary"
                                        onClick={() => setConfirmOpen(false)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button variant="danger" onClick={handleConfirm}>
                                        Delete
                                    </Button>
                                </Modal.Footer>
                            </Modal>
                        </div>

                        {/* D2: Form Modal */}
                        <div className="border border-border-subtle rounded p-4">
                            <h3 className="text-lg font-medium mb-2 text-primary">
                                D2: Form Modal with Field Registry
                            </h3>
                            <p className="text-sm text-secondary mb-3">
                                Medium modal with Field Registry integration (3 fields).
                            </p>
                            <Button onClick={() => setFormOpen(true)}>Edit User</Button>

                            <Modal
                                isOpen={formOpen}
                                onClose={() => setFormOpen(false)}
                                size="medium"
                            >
                                <Modal.Header>Edit User</Modal.Header>
                                <Modal.Body>
                                    <div className="space-y-4">
                                        {formFields.map(field => {
                                            const FieldComponent = FieldRegistry.getField(
                                                field.type
                                            );
                                            return (
                                                <FieldComponent
                                                    key={field.key}
                                                    field={field}
                                                    value={formData[field.key]}
                                                    onChange={value =>
                                                        setFormData({
                                                            ...formData,
                                                            [field.key]: value,
                                                        })
                                                    }
                                                />
                                            );
                                        })}
                                    </div>
                                </Modal.Body>
                                <Modal.Footer align="right">
                                    <Button variant="secondary" onClick={() => setFormOpen(false)}>
                                        Cancel
                                    </Button>
                                    <Button onClick={handleFormSubmit}>Save</Button>
                                </Modal.Footer>
                            </Modal>
                        </div>

                        {/* D3: Long Content Scrolling */}
                        <div className="border border-border-subtle rounded p-4">
                            <h3 className="text-lg font-medium mb-2 text-primary">
                                D3: Long Content Scrolling
                            </h3>
                            <p className="text-sm text-secondary mb-3">
                                Modal with 50+ paragraphs to test scrolling behavior and focus trap.
                            </p>
                            <Button onClick={() => setLongContentOpen(true)}>
                                Open Long Content
                            </Button>

                            <Modal
                                isOpen={longContentOpen}
                                onClose={() => setLongContentOpen(false)}
                                size="large"
                            >
                                <Modal.Header>Terms and Conditions</Modal.Header>
                                <Modal.Body>
                                    {Array.from({ length: 50 }, (_, i) => (
                                        <p key={i} className="text-secondary mb-3">
                                            <strong>Section {i + 1}:</strong> Lorem ipsum dolor sit
                                            amet, consectetur adipiscing elit. Sed do eiusmod tempor
                                            incididunt ut labore et dolore magna aliqua. Ut enim ad
                                            minim veniam, quis nostrud exercitation ullamco laboris
                                            nisi ut aliquip ex ea commodo consequat.
                                        </p>
                                    ))}
                                </Modal.Body>
                                <Modal.Footer align="right">
                                    <Button
                                        variant="secondary"
                                        onClick={() => setLongContentOpen(false)}
                                    >
                                        Decline
                                    </Button>
                                    <Button onClick={() => setLongContentOpen(false)}>
                                        Accept
                                    </Button>
                                </Modal.Footer>
                            </Modal>
                        </div>

                        {/* D4: Footer Alignment Variations */}
                        <div className="border border-border-subtle rounded p-4">
                            <h3 className="text-lg font-medium mb-2 text-primary">
                                D4: Footer Alignment Variations
                            </h3>
                            <p className="text-sm text-secondary mb-3">
                                Examples with align=&quot;left&quot;, &quot;center&quot;,
                                &quot;right&quot;, &quot;space-between&quot;.
                            </p>
                            <div className="flex gap-3 flex-wrap">
                                <Button onClick={() => setFooterAlignOpen('left')}>
                                    Left Align
                                </Button>
                                <Button onClick={() => setFooterAlignOpen('center')}>
                                    Center Align
                                </Button>
                                <Button onClick={() => setFooterAlignOpen('right')}>
                                    Right Align
                                </Button>
                                <Button onClick={() => setFooterAlignOpen('space-between')}>
                                    Space Between
                                </Button>
                            </div>

                            {footerAlignOpen && (
                                <Modal
                                    isOpen={true}
                                    onClose={() => setFooterAlignOpen(null)}
                                    size="medium"
                                >
                                    <Modal.Header>Footer Alignment: {footerAlignOpen}</Modal.Header>
                                    <Modal.Body>
                                        <p className="text-primary">
                                            This modal demonstrates{' '}
                                            <code>align=&quot;{footerAlignOpen}&quot;</code> footer
                                            alignment.
                                        </p>
                                    </Modal.Body>
                                    <Modal.Footer align={footerAlignOpen}>
                                        <Button
                                            variant="secondary"
                                            onClick={() => setFooterAlignOpen(null)}
                                        >
                                            Cancel
                                        </Button>
                                        <Button onClick={() => setFooterAlignOpen(null)}>
                                            Confirm
                                        </Button>
                                    </Modal.Footer>
                                </Modal>
                            )}
                        </div>

                        {/* D5: No Footer Modal */}
                        <div className="border border-border-subtle rounded p-4">
                            <h3 className="text-lg font-medium mb-2 text-primary">
                                D5: No Footer Modal
                            </h3>
                            <p className="text-sm text-secondary mb-3">
                                Modal without Modal.Footer - content only with close button.
                            </p>
                            <Button onClick={() => setNoFooterOpen(true)}>
                                Open Content-Only Modal
                            </Button>

                            <Modal
                                isOpen={noFooterOpen}
                                onClose={() => setNoFooterOpen(false)}
                                size="medium"
                            >
                                <Modal.Header>Information</Modal.Header>
                                <Modal.Body>
                                    <p className="text-primary mb-4">
                                        This modal has no footer section. It uses only the close
                                        button (X) in the header for dismissal.
                                    </p>
                                    <div className="bg-surface-elevated p-4 rounded border border-border">
                                        <p className="text-sm text-secondary">
                                            <strong>Use cases for no-footer modals:</strong>
                                        </p>
                                        <ul className="text-sm text-secondary mt-2 space-y-1 list-disc list-inside">
                                            <li>Information displays</li>
                                            <li>Image galleries</li>
                                            <li>Read-only content</li>
                                            <li>Quick previews</li>
                                        </ul>
                                    </div>
                                </Modal.Body>
                            </Modal>
                        </div>

                        {/* D6: Complex Content */}
                        <div className="border border-border-subtle rounded p-4">
                            <h3 className="text-lg font-medium mb-2 text-primary">
                                D6: Complex Content (Accordion Inside)
                            </h3>
                            <p className="text-sm text-secondary mb-3">
                                Modal with nested accordion components for complex content
                                organization.
                            </p>
                            <Button onClick={() => setComplexOpen(true)}>Open Complex Modal</Button>

                            <Modal
                                isOpen={complexOpen}
                                onClose={() => setComplexOpen(false)}
                                size="large"
                            >
                                <Modal.Header>Settings</Modal.Header>
                                <Modal.Body>
                                    <div className="space-y-3">
                                        <AccordionItem defaultExpanded={true}>
                                            <AccordionItem.Header className="list-none">
                                                <div className="w-full px-4 py-3 bg-surface hover:bg-surface-hover flex items-center justify-between min-h-11">
                                                    <span className="font-medium text-primary">
                                                        General Settings
                                                    </span>
                                                    <span className="material-symbols-outlined transition-transform duration-200">
                                                        expand_more
                                                    </span>
                                                </div>
                                            </AccordionItem.Header>
                                            <AccordionItem.Body>
                                                <div className="bg-surface-elevated border-t border-border-subtle p-4">
                                                    <p className="text-secondary">
                                                        General configuration options go here.
                                                    </p>
                                                </div>
                                            </AccordionItem.Body>
                                        </AccordionItem>

                                        <AccordionItem>
                                            <AccordionItem.Header className="list-none">
                                                <div className="w-full px-4 py-3 bg-surface hover:bg-surface-hover flex items-center justify-between min-h-11">
                                                    <span className="font-medium text-primary">
                                                        Advanced Settings
                                                    </span>
                                                    <span className="material-symbols-outlined transition-transform duration-200">
                                                        expand_more
                                                    </span>
                                                </div>
                                            </AccordionItem.Header>
                                            <AccordionItem.Body>
                                                <div className="bg-surface-elevated border-t border-border-subtle p-4">
                                                    <p className="text-secondary">
                                                        Advanced configuration options go here.
                                                    </p>
                                                </div>
                                            </AccordionItem.Body>
                                        </AccordionItem>

                                        <AccordionItem>
                                            <AccordionItem.Header className="list-none">
                                                <div className="w-full px-4 py-3 bg-surface hover:bg-surface-hover flex items-center justify-between min-h-11">
                                                    <span className="font-medium text-primary">
                                                        Notifications
                                                    </span>
                                                    <span className="material-symbols-outlined transition-transform duration-200">
                                                        expand_more
                                                    </span>
                                                </div>
                                            </AccordionItem.Header>
                                            <AccordionItem.Body>
                                                <div className="bg-surface-elevated border-t border-border-subtle p-4">
                                                    <p className="text-secondary">
                                                        Notification preferences go here.
                                                    </p>
                                                </div>
                                            </AccordionItem.Body>
                                        </AccordionItem>
                                    </div>
                                </Modal.Body>
                                <Modal.Footer align="right">
                                    <Button
                                        variant="secondary"
                                        onClick={() => setComplexOpen(false)}
                                    >
                                        Cancel
                                    </Button>
                                    <Button onClick={() => setComplexOpen(false)}>
                                        Save Settings
                                    </Button>
                                </Modal.Footer>
                            </Modal>
                        </div>
                    </div>
                </section>

                {/* Section E: Accessibility */}
                <section className="border border-border rounded-lg p-6 bg-surface">
                    <h2 className="text-2xl font-semibold mb-4 text-primary">
                        Section E: Accessibility Demonstration
                    </h2>

                    <div className="space-y-4">
                        <div className="bg-surface-elevated p-4 rounded border border-border">
                            <h3 className="text-lg font-medium mb-3 text-primary">
                                Keyboard Navigation
                            </h3>
                            <ul className="text-sm text-secondary space-y-2">
                                <li>
                                    <strong>Tab</strong>: Navigate through focusable elements
                                    (buttons, inputs)
                                </li>
                                <li>
                                    <strong>Shift + Tab</strong>: Navigate backwards
                                </li>
                                <li>
                                    <strong>ESC</strong>: Close modal (if closable=true)
                                </li>
                                <li>
                                    <strong>Enter</strong>: Activate focused button
                                </li>
                            </ul>
                        </div>

                        <div className="bg-surface-elevated p-4 rounded border border-border">
                            <h3 className="text-lg font-medium mb-3 text-primary">Focus Trap</h3>
                            <p className="text-sm text-secondary mb-2">
                                When a modal is open, keyboard focus is trapped inside the modal.
                                You cannot tab to elements outside the modal until it is closed.
                            </p>
                            <p className="text-sm text-secondary">
                                <strong>Test:</strong> Open any modal above and try tabbing through
                                elements. Focus should cycle within the modal only.
                            </p>
                        </div>

                        <div className="bg-surface-elevated p-4 rounded border border-border">
                            <h3 className="text-lg font-medium mb-3 text-primary">
                                Screen Reader Support
                            </h3>
                            <ul className="text-sm text-secondary space-y-2">
                                <li>
                                    <strong>role=&quot;dialog&quot;</strong>: Announces modal as
                                    dialog
                                </li>
                                <li>
                                    <strong>aria-modal=&quot;true&quot;</strong>: Indicates modal
                                    behavior
                                </li>
                                <li>
                                    <strong>aria-labelledby</strong>: Links to modal title
                                </li>
                                <li>
                                    <strong>aria-label</strong>: Close button labeled &quot;Close
                                    modal&quot;
                                </li>
                            </ul>
                        </div>

                        <div className="bg-surface-elevated p-4 rounded border border-border">
                            <h3 className="text-lg font-medium mb-3 text-primary">
                                ARIA Attributes
                            </h3>
                            <div className="text-xs font-mono bg-bg/50 p-3 rounded border border-border-subtle">
                                <code className="text-secondary">
                                    {`<div role="dialog" aria-modal="true" aria-labelledby="modal-title">`}
                                    <br />
                                    {`  <div id="modal-title">Modal Title</div>`}
                                    <br />
                                    {`  <button aria-label="Close modal">X</button>`}
                                    <br />
                                    {`</div>`}
                                </code>
                            </div>
                        </div>
                    </div>
                </section>

                {/* Section F: Performance */}
                <section className="border border-border rounded-lg p-6 bg-surface">
                    <h2 className="text-2xl font-semibold mb-4 text-primary">
                        Section F: Performance Notes
                    </h2>

                    <div className="space-y-4">
                        <div className="bg-surface-elevated p-4 rounded border border-border">
                            <h3 className="text-lg font-medium mb-3 text-primary">
                                Animation Smoothness
                            </h3>
                            <p className="text-sm text-secondary mb-2">
                                Modal uses CSS transitions for smooth open/close animations:
                            </p>
                            <ul className="text-sm text-secondary space-y-1 list-disc list-inside">
                                <li>200ms duration for modal container transform</li>
                                <li>200ms duration for backdrop opacity</li>
                                <li>Hardware-accelerated transforms for 60fps performance</li>
                            </ul>
                        </div>

                        <div className="bg-surface-elevated p-4 rounded border border-border">
                            <h3 className="text-lg font-medium mb-3 text-primary">Stress Test</h3>
                            <p className="text-sm text-secondary mb-3">
                                Open and close a modal 10 times rapidly to test animation
                                performance and memory handling.
                            </p>
                            <div className="flex items-center gap-3">
                                <Button
                                    onClick={handleStressTest}
                                    disabled={stressTestRunning}
                                    variant={stressTestRunning ? 'secondary' : 'primary'}
                                >
                                    {stressTestRunning ? 'Running...' : 'Run Stress Test'}
                                </Button>
                                {stressTestCount > 0 && (
                                    <span className="text-sm text-secondary">
                                        Completed: {stressTestCount}/10
                                    </span>
                                )}
                            </div>
                        </div>

                        <div className="bg-surface-elevated p-4 rounded border border-border">
                            <h3 className="text-lg font-medium mb-3 text-primary">
                                Performance Metrics
                            </h3>
                            <ul className="text-sm text-secondary space-y-2">
                                <li>
                                    <strong>Portal Rendering:</strong> Modal rendered via React
                                    Portal to #modal-root
                                </li>
                                <li>
                                    <strong>Body Scroll Lock:</strong> Prevents background scrolling
                                    when modal open
                                </li>
                                <li>
                                    <strong>Focus Management:</strong> useFocusTrap hook manages
                                    focus cycling
                                </li>
                                <li>
                                    <strong>ESC Key Handler:</strong> useEscapeKey hook with proper
                                    cleanup
                                </li>
                            </ul>
                        </div>
                    </div>
                </section>
            </div>
        </div>
    );
};

export default ModalsTestPage;

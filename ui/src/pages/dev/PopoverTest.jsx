import React, { useState } from 'react';
import PopoverFactory from '../../components/PopoverFactory';
import usePopover from '../../hooks/usePopover';

/**
 * PopoverTest - Development page for testing PopoverFactory with all variants
 *
 * Demonstrates the new factory pattern approach for popover creation.
 * Tests all popover variants, positioning, and content types using PopoverFactory.
 * Access via /dev/popover
 */
const PopoverTest = () => {
    // Popover instances using new usePopover hook
    const defaultPopover = usePopover();
    const helpPopover = usePopover();
    const selectorPopover = usePopover();
    const actionsPopover = usePopover();
    const positionPopover = usePopover();
    const focusTrapPopover = usePopover();
    const longContentPopover = usePopover();
    const formPopover = usePopover();

    // Test states
    const [currentPosition, setCurrentPosition] = useState('auto');
    const [selectedOption, setSelectedOption] = useState('option1');

    // Mock data for testing
    const selectorOptions = [
        { key: 'option1', label: 'First Option', icon: 'mi:star' },
        { key: 'option2', label: 'Second Option', icon: 'mi:favorite' },
        { key: 'option3', label: 'Third Option', icon: 'mi:bookmark' },
        { key: 'option4', label: 'Fourth Option (No Icon)' },
    ];

    const actionItems = [
        { key: 'edit', label: 'Edit', icon: 'mi:edit' },
        { key: 'duplicate', label: 'Duplicate', icon: 'mi:content_copy' },
        { key: 'delete', label: 'Delete', icon: 'mi:delete', danger: true },
    ];

    const positions = ['auto', 'top', 'bottom', 'left', 'right'];

    // Event handlers for PopoverFactory examples
    const handleOptionSelect = (optionKey, option) => {
        setSelectedOption(optionKey);
        console.log('Selected option:', option);
    };

    const handleActionSelect = (actionKey, action) => {
        console.log('Action selected:', action);
        if (actionKey === 'delete') {
            alert('Delete action clicked!');
        } else if (actionKey === 'edit') {
            alert('Edit action clicked!');
        } else if (actionKey === 'duplicate') {
            alert('Duplicate action clicked!');
        }
    };

    // Filter categories defined above in the initial variable declarations

    return (
        <div className="popover-test-page">
            <div className="page-header">
                <h1>Popover Component Test</h1>
                <p>Interactive testing page for all popover variants and features.</p>
                
                <div className="available-variants">
                    <h3>Available PopoverFactory Variants:</h3>
                    <ul className="variant-list">
                        <li><code>variant="default"</code> - Basic content popover with custom children</li>
                        <li><code>variant="help"</code> - Help text popover with title and content</li>
                        <li><code>variant="selector"</code> - Selection menu with list of options (used by search controls)</li>
                        <li><code>variant="actions"</code> - Action menu with buttons (edit, delete, etc.)</li>
                    </ul>
                </div>
            </div>

            <div className="test-sections">
                {/* Basic Variants Section */}
                <section className="test-section">
                    <h2>Basic Variants</h2>
                    <div className="test-grid">
                        {/* Default Variant */}
                        <div className="test-item">
                            <h3>Default Variant</h3>
                            <button
                                ref={defaultPopover.triggerRef}
                                className="btn btn-primary"
                                onClick={defaultPopover.toggle}
                            >
                                Default Popover
                            </button>
                            <PopoverFactory
                                variant="default"
                                show={defaultPopover.show}
                                onClose={defaultPopover.close}
                                triggerRef={defaultPopover.triggerRef}
                                position="bottom"
                                ariaLabel="Default popover example"
                                title="Default Popover"
                                content="This is a basic popover with default styling. It can contain any content including text, links, and other elements."
                            />
                        </div>

                        {/* Help Variant */}
                        <div className="test-item">
                            <h3>Help Variant</h3>
                            <button
                                ref={helpPopover.triggerRef}
                                className="btn btn-secondary"
                                onClick={helpPopover.toggle}
                            >
                                Help Popover
                            </button>
                            <PopoverFactory
                                variant="help"
                                show={helpPopover.show}
                                onClose={helpPopover.close}
                                triggerRef={helpPopover.triggerRef}
                                position="bottom"
                                ariaLabel="Help popover with instructions"
                                title="Search Help"
                            >
                                <div className="popover__content">
                                    <p>Use these search operators:</p>
                                    <ul style={{ margin: '0.5rem 0', paddingLeft: '1.5rem' }}>
                                        <li>
                                            <code>title:Avatar</code> - Search by title
                                        </li>
                                        <li>
                                            <code>year:2009</code> - Search by year
                                        </li>
                                        <li>
                                            <code>genre:Action</code> - Search by genre
                                        </li>
                                    </ul>
                                </div>
                            </PopoverFactory>
                        </div>

                        {/* Selector Variant */}
                        <div className="test-item">
                            <h3>Selector Variant</h3>
                            <button
                                ref={selectorPopover.triggerRef}
                                className="btn btn-secondary"
                                onClick={selectorPopover.toggle}
                            >
                                Source:{' '}
                                {selectorOptions.find(opt => opt.key === selectedOption)?.label}
                            </button>
                            <PopoverFactory
                                variant="selector"
                                show={selectorPopover.show}
                                onClose={selectorPopover.close}
                                triggerRef={selectorPopover.triggerRef}
                                position="bottom"
                                ariaLabel="Source selector"
                                title="Select Source"
                                options={selectorOptions}
                                selectedValue={selectedOption}
                                onSelect={handleOptionSelect}
                            />
                        </div>

                        {/* Actions Variant */}
                        <div className="test-item">
                            <h3>Actions Variant</h3>
                            <button
                                ref={actionsPopover.triggerRef}
                                className="btn btn-secondary"
                                onClick={actionsPopover.toggle}
                            >
                                Actions Menu
                            </button>
                            <PopoverFactory
                                variant="actions"
                                show={actionsPopover.show}
                                onClose={actionsPopover.close}
                                triggerRef={actionsPopover.triggerRef}
                                position="bottom"
                                ariaLabel="Available actions"
                                options={actionItems}
                                onSelect={handleActionSelect}
                            />
                        </div>
                    </div>
                </section>

                {/* Positioning Tests */}
                <section className="test-section">
                    <h2>Position Testing</h2>
                    <div className="position-controls" style={{ marginBottom: '2rem' }}>
                        <label>Position: </label>
                        <select
                            value={currentPosition}
                            onChange={e => setCurrentPosition(e.target.value)}
                            style={{ marginLeft: '0.5rem' }}
                        >
                            {positions.map(pos => (
                                <option key={pos} value={pos}>
                                    {pos}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div
                        className="position-test-area"
                        style={{
                            display: 'grid',
                            placeItems: 'center',
                            minHeight: '300px',
                            border: '2px dashed var(--divider)',
                            borderRadius: 'var(--radius-2)',
                            position: 'relative',
                        }}
                    >
                        <button
                            ref={positionPopover.triggerRef}
                            className="btn btn-primary"
                            onClick={positionPopover.toggle}
                        >
                            Test Position ({currentPosition})
                        </button>
                        <PopoverFactory
                            variant="default"
                            show={positionPopover.show}
                            onClose={positionPopover.close}
                            triggerRef={positionPopover.triggerRef}
                            position={currentPosition}
                            ariaLabel="Position test popover"
                            title={`Position: ${currentPosition}`}
                            content={`This popover is positioned using the "${currentPosition}" setting. Try different positions and see how the popover adapts!`}
                        />
                    </div>
                </section>

                {/* Advanced Features */}
                <section className="test-section">
                    <h2>Advanced Features</h2>
                    <div className="test-grid">
                        {/* Focus Trap Test */}
                        <div className="test-item">
                            <h3>Focus Trap</h3>
                            <button
                                ref={focusTrapPopover.triggerRef}
                                className="btn btn-primary"
                                onClick={focusTrapPopover.toggle}
                            >
                                Focus Trap Test
                            </button>
                            <PopoverFactory
                                variant="default"
                                show={focusTrapPopover.show}
                                onClose={focusTrapPopover.close}
                                triggerRef={focusTrapPopover.triggerRef}
                                position="bottom"
                                trapFocus={true}
                                ariaLabel="Focus trap test"
                                title="Focus Trap Enabled"
                            >
                                <div className="popover__content">
                                    <p>
                                        This popover traps focus. Try tabbing through these
                                        elements:
                                    </p>
                                    <button
                                        className="btn btn-sm btn-secondary"
                                        style={{ margin: '0.25rem' }}
                                    >
                                        Button 1
                                    </button>
                                    <button
                                        className="btn btn-sm btn-secondary"
                                        style={{ margin: '0.25rem' }}
                                    >
                                        Button 2
                                    </button>
                                    <input
                                        type="text"
                                        placeholder="Test input"
                                        style={{
                                            width: '100%',
                                            margin: '0.5rem 0',
                                            padding: '0.5rem',
                                            border: '1px solid var(--divider)',
                                            borderRadius: 'var(--radius-2)',
                                        }}
                                    />
                                    <button
                                        className="btn btn-sm btn-primary"
                                        onClick={focusTrapPopover.close}
                                        style={{ margin: '0.25rem' }}
                                    >
                                        Close
                                    </button>
                                </div>
                            </PopoverFactory>
                        </div>

                        {/* Long Content Test */}
                        <div className="test-item">
                            <h3>Long Content</h3>
                            <button
                                ref={longContentPopover.triggerRef}
                                className="btn btn-primary"
                                onClick={longContentPopover.toggle}
                            >
                                Long Content Test
                            </button>
                            <PopoverFactory
                                variant="default"
                                show={longContentPopover.show}
                                onClose={longContentPopover.close}
                                triggerRef={longContentPopover.triggerRef}
                                position="bottom"
                                className="popover--wide"
                                ariaLabel="Long content test"
                                title="Long Content Example"
                            >
                                <div className="popover__content">
                                    <p>
                                        This popover contains a lot of content to test scrolling and
                                        max-width constraints.
                                    </p>
                                    <p>
                                        Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed
                                        do eiusmod tempor incididunt ut labore et dolore magna
                                        aliqua. Ut enim ad minim veniam, quis nostrud exercitation
                                        ullamco laboris.
                                    </p>
                                    <p>
                                        Duis aute irure dolor in reprehenderit in voluptate velit
                                        esse cillum dolore eu fugiat nulla pariatur. Excepteur sint
                                        occaecat cupidatat non proident.
                                    </p>
                                    <ul style={{ margin: '1rem 0', paddingLeft: '1.5rem' }}>
                                        <li>First list item with some long text that might wrap</li>
                                        <li>Second list item</li>
                                        <li>Third list item</li>
                                    </ul>
                                    <p>
                                        The popover should handle this content gracefully with
                                        proper max-width and scrolling if needed.
                                    </p>
                                </div>
                            </PopoverFactory>
                        </div>

                        {/* Custom Form Content */}
                        <div className="test-item">
                            <h3>Custom Form Content</h3>
                            <button
                                ref={formPopover.triggerRef}
                                className="btn btn-primary"
                                onClick={formPopover.toggle}
                            >
                                Configuration Form
                            </button>
                            <PopoverFactory
                                variant="default"
                                show={formPopover.show}
                                onClose={formPopover.close}
                                triggerRef={formPopover.triggerRef}
                                position="bottom"
                                trapFocus={true}
                                ariaLabel="Configuration form"
                                title="Configuration"
                            >
                                <div className="popover__content">
                                    <form
                                        style={{
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '1rem',
                                        }}
                                    >
                                        <div>
                                            <label htmlFor="config-name">Name:</label>
                                            <input
                                                type="text"
                                                id="config-name"
                                                placeholder="Enter name..."
                                                style={{
                                                    width: '100%',
                                                    padding: '0.5rem',
                                                    border: '1px solid var(--divider)',
                                                    borderRadius: '4px',
                                                    marginTop: '0.25rem',
                                                }}
                                            />
                                        </div>
                                        <div>
                                            <label htmlFor="config-type">Type:</label>
                                            <select
                                                id="config-type"
                                                style={{
                                                    width: '100%',
                                                    padding: '0.5rem',
                                                    border: '1px solid var(--divider)',
                                                    borderRadius: '4px',
                                                    marginTop: '0.25rem',
                                                }}
                                            >
                                                <option>Production</option>
                                                <option>Development</option>
                                                <option>Testing</option>
                                            </select>
                                        </div>
                                        <div
                                            style={{
                                                display: 'flex',
                                                justifyContent: 'flex-end',
                                                gap: '0.5rem',
                                                marginTop: '1rem',
                                            }}
                                        >
                                            <button
                                                type="button"
                                                className="btn btn-secondary"
                                                onClick={formPopover.close}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                className="btn btn-primary"
                                                onClick={e => {
                                                    e.preventDefault();
                                                    alert('Configuration saved!');
                                                    formPopover.close();
                                                }}
                                            >
                                                Save
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </PopoverFactory>
                        </div>
                    </div>
                </section>

                {/* Documentation Section */}
                <section className="test-section">
                    <h2>PopoverFactory Documentation</h2>
                    <div className="test-notes">
                        <h3>Factory Pattern Approach</h3>
                        <p style={{ color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                            The new PopoverFactory provides a simple, props-based interface that
                            replaces the complex schema-driven approach. All examples above
                            demonstrate the factory pattern in action.
                        </p>

                        <h3>Key Benefits</h3>
                        <ul>
                            <li>
                                <strong>Simplicity:</strong> Direct props instead of complex schemas
                            </li>
                            <li>
                                <strong>Consistency:</strong> Follows established ModalFactory
                                patterns
                            </li>
                            <li>
                                <strong>Performance:</strong> No schema validation or processing
                                overhead
                            </li>
                            <li>
                                <strong>Developer Experience:</strong> IntelliSense support and
                                clear API
                            </li>
                            <li>
                                <strong>Maintainability:</strong> Less abstraction, easier to debug
                            </li>
                        </ul>

                        <h3>Usage Examples</h3>
                        <div
                            style={{
                                background: 'var(--surface)',
                                padding: '1rem',
                                borderRadius: 'var(--radius-2)',
                                marginTop: '1rem',
                            }}
                        >
                            <pre
                                style={{
                                    color: 'var(--text-primary)',
                                    fontSize: 'var(--font-size-1)',
                                    lineHeight: '1.4',
                                }}
                            >
                                {`// Simple help popover
<PopoverFactory
  variant="help"
  show={helpPopover.show}
  onClose={helpPopover.close}
  triggerRef={helpPopover.triggerRef}
  title="Help Information"
  content="This is help content"
/>

// Selector popover with options
<PopoverFactory
  variant="selector"
  show={selectorPopover.show}
  onClose={selectorPopover.close}
  triggerRef={selectorPopover.triggerRef}
  title="Select Option"
  options={[
    { key: 'opt1', label: 'Option 1', icon: 'star' },
    { key: 'opt2', label: 'Option 2' }
  ]}
  selectedValue={selectedValue}
  onSelect={handleSelect}
/>`}
                            </pre>
                        </div>

                        <h3>Test Instructions</h3>
                        <ul>
                            <li>
                                <strong>Click Outside:</strong> Click anywhere outside a popover to
                                close it
                            </li>
                            <li>
                                <strong>Escape Key:</strong> Press Escape to close any open popover
                            </li>
                            <li>
                                <strong>Positioning:</strong> Try opening popovers near viewport
                                edges
                            </li>
                            <li>
                                <strong>Focus Management:</strong> Test keyboard navigation and
                                focus trapping
                            </li>
                            <li>
                                <strong>Multiple Popovers:</strong> Only one popover should be open
                                at a time
                            </li>
                        </ul>

                        <h3>Accessibility Features</h3>
                        <ul>
                            <li>ARIA labels and descriptions</li>
                            <li>Keyboard navigation support</li>
                            <li>Focus management and optional focus trapping</li>
                            <li>Screen reader compatible markup</li>
                            <li>Reduced motion support</li>
                        </ul>

                        <h3>Migration from Schema Pattern</h3>
                        <p style={{ color: 'var(--text-secondary)', marginTop: '1rem' }}>
                            The old schema-driven approach has been completely replaced. Instead of
                            complex configuration objects, use direct props on PopoverFactory
                            components. This provides better type safety, performance, and developer
                            experience.
                        </p>
                    </div>
                </section>
            </div>

            <style>{`
                .popover-test-page {
                    max-width: 1200px;
                    margin: 0 auto;
                    padding: 2rem;
                }

                .page-header {
                    text-align: center;
                    margin-bottom: 3rem;
                }

                .page-header h1 {
                    color: var(--text-primary);
                    margin-bottom: 0.5rem;
                }

                .page-header p {
                    color: var(--text-secondary);
                    font-size: var(--font-size-3);
                }

                .test-section {
                    margin-bottom: 3rem;
                    padding: 2rem;
                    background: var(--surface);
                    border: 1px solid var(--divider);
                    border-radius: var(--radius-3);
                }

                .test-section h2 {
                    color: var(--text-primary);
                    margin-bottom: 1.5rem;
                    padding-bottom: 0.5rem;
                    border-bottom: 2px solid var(--divider);
                }

                .test-grid {
                    display: grid;
                    grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
                    gap: 2rem;
                }

                .test-item {
                    padding: 1.5rem;
                    background: var(--surface-alt);
                    border-radius: var(--radius-2);
                    border: 1px solid var(--divider);
                }

                .test-item h3 {
                    color: var(--text-primary);
                    margin-bottom: 1rem;
                    font-size: var(--font-size-2);
                }

                .test-notes {
                    background: var(--surface-alt);
                    padding: 1.5rem;
                    border-radius: var(--radius-2);
                    border: 1px solid var(--divider);
                }

                .test-notes h3 {
                    color: var(--text-primary);
                    margin: 0 0 1rem 0;
                }

                .test-notes ul {
                    color: var(--text-secondary);
                    line-height: 1.6;
                    margin-bottom: 1.5rem;
                }

                .test-notes li {
                    margin-bottom: 0.5rem;
                }

                /* Wide popover for filter builder */
                .popover--wide {
                    max-width: min(600px, calc(100vw - 24px));
                    min-width: min(500px, calc(100vw - 48px));
                }

                @media (max-width: 768px) {
                    .popover-test-page {
                        padding: 1rem;
                    }

                    .test-grid {
                        grid-template-columns: 1fr;
                    }

                    .test-section {
                        padding: 1rem;
                    }
                    
                    .popover--wide {
                        max-width: calc(100vw - 24px);
                        min-width: calc(100vw - 48px);
                    }
                }
            `}</style>
        </div>
    );
};

export default PopoverTest;

import React, { useState } from 'react';
import Popover from '../../components/Popover';
import usePopover from '../../hooks/usePopover';

/**
 * PopoverTest - Development page for testing all popover variants and features
 *
 * Tests all popover variants, positioning, content types, and edge cases
 * Access via /dev/popover
 */
const PopoverTest = () => {
    // Test various popover instances
    const helpPopover = usePopover(false);
    const selectorPopover = usePopover(false);
    const actionsPopover = usePopover(false);
    const defaultPopover = usePopover(false);
    const positionPopover = usePopover(false);
    const focusTrapPopover = usePopover(false);
    const longContentPopover = usePopover(false);
    const complexContentPopover = usePopover(false);

    // Test positioning states
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

    return (
        <div className="popover-test-page">
            <div className="page-header">
                <h1>Popover Component Test</h1>
                <p>Interactive testing page for all popover variants and features.</p>
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
                            <Popover
                                triggerRef={defaultPopover.triggerRef}
                                show={defaultPopover.show}
                                onClose={defaultPopover.close}
                                variant="default"
                                position="bottom"
                                ariaLabel="Default popover example"
                            >
                                <div className="popover__title">Default Popover</div>
                                <div className="popover__content">
                                    This is a basic popover with default styling. It can contain any
                                    content including text, links, and other elements.
                                </div>
                            </Popover>
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
                            <Popover
                                triggerRef={helpPopover.triggerRef}
                                show={helpPopover.show}
                                onClose={helpPopover.close}
                                variant="help"
                                position="bottom"
                                ariaLabel="Help information"
                            >
                                <div className="popover__title">Search Help</div>
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
                            </Popover>
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
                            <Popover
                                triggerRef={selectorPopover.triggerRef}
                                show={selectorPopover.show}
                                onClose={selectorPopover.close}
                                variant="selector"
                                position="bottom"
                                ariaLabel="Select source"
                            >
                                <div className="popover__title">Select Source</div>
                                <ul className="popover__list">
                                    {selectorOptions.map(option => (
                                        <li key={option.key}>
                                            <button
                                                className={`popover__list-item${selectedOption === option.key ? ' popover__list-item--selected' : ''}`}
                                                onClick={() => {
                                                    setSelectedOption(option.key);
                                                    selectorPopover.close();
                                                }}
                                            >
                                                {option.icon && (
                                                    <span style={{ marginRight: '0.5rem' }}>
                                                        {option.icon === 'mi:star' && '⭐'}
                                                        {option.icon === 'mi:favorite' && '❤️'}
                                                        {option.icon === 'mi:bookmark' && '🔖'}
                                                    </span>
                                                )}
                                                {option.label}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </Popover>
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
                            <Popover
                                triggerRef={actionsPopover.triggerRef}
                                show={actionsPopover.show}
                                onClose={actionsPopover.close}
                                variant="actions"
                                position="bottom"
                                ariaLabel="Available actions"
                            >
                                <ul className="popover__list">
                                    {actionItems.map(action => (
                                        <li key={action.key}>
                                            <button
                                                className={`popover__list-item${action.danger ? ' danger' : ''}`}
                                                onClick={() => {
                                                    alert(`${action.label} clicked!`);
                                                    actionsPopover.close();
                                                }}
                                                style={
                                                    action.danger ? { color: 'var(--error)' } : {}
                                                }
                                            >
                                                {action.icon && (
                                                    <span style={{ marginRight: '0.5rem' }}>
                                                        {action.icon === 'mi:edit' && '✏️'}
                                                        {action.icon === 'mi:content_copy' && '📋'}
                                                        {action.icon === 'mi:delete' && '🗑️'}
                                                    </span>
                                                )}
                                                {action.label}
                                            </button>
                                        </li>
                                    ))}
                                </ul>
                            </Popover>
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
                        <Popover
                            triggerRef={positionPopover.triggerRef}
                            show={positionPopover.show}
                            onClose={positionPopover.close}
                            variant="default"
                            position={currentPosition}
                            ariaLabel="Position test popover"
                        >
                            <div className="popover__title">Position: {currentPosition}</div>
                            <div className="popover__content">
                                This popover is positioned using the &ldquo;{currentPosition}&rdquo;
                                setting. Try different positions and see how the popover adapts!
                            </div>
                        </Popover>
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
                            <Popover
                                triggerRef={focusTrapPopover.triggerRef}
                                show={focusTrapPopover.show}
                                onClose={focusTrapPopover.close}
                                variant="default"
                                position="bottom"
                                trapFocus={true}
                                ariaLabel="Focus trap test"
                            >
                                <div className="popover__title">Focus Trap Enabled</div>
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
                            </Popover>
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
                            <Popover
                                triggerRef={longContentPopover.triggerRef}
                                show={longContentPopover.show}
                                onClose={longContentPopover.close}
                                variant="default"
                                position="bottom"
                                ariaLabel="Long content test"
                            >
                                <div className="popover__title">Long Content Example</div>
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
                            </Popover>
                        </div>
                    </div>
                </section>

                {/* Edge Cases */}
                <section className="test-section">
                    <h2>Edge Cases & Notes</h2>
                    <div className="test-notes">
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
                    </div>
                </section>

                {/* Additional Examples */}
                <section className="test-section">
                    <h2>Additional Examples</h2>
                    <div className="test-grid">
                        {/* Form Content */}
                        <div className="test-item">
                            <h3>Form Content</h3>
                            <p>Test popover with interactive form elements:</p>
                            <button
                                ref={complexContentPopover.triggerRef}
                                className="btn btn-primary"
                                onClick={complexContentPopover.toggle}
                            >
                                Configuration Form
                            </button>
                            <Popover
                                triggerRef={complexContentPopover.triggerRef}
                                show={complexContentPopover.show}
                                onClose={complexContentPopover.close}
                                variant="default"
                                position="bottom"
                                ariaLabel="Configuration form"
                            >
                                <div className="popover__title">Configuration</div>
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
                                                onClick={complexContentPopover.close}
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                type="submit"
                                                className="btn btn-primary"
                                                onClick={e => {
                                                    e.preventDefault();
                                                    alert('Configuration saved!');
                                                    complexContentPopover.close();
                                                }}
                                            >
                                                Save
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </Popover>
                        </div>
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
                }
            `}</style>
        </div>
    );
};

export default PopoverTest;

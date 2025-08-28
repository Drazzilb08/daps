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
    const filterPopover = usePopover(false);
    const multiFilterPopover = usePopover(false);
    const filterBuilderPopover = usePopover(false);

    // Test positioning states
    const [currentPosition, setCurrentPosition] = useState('auto');
    const [selectedOption, setSelectedOption] = useState('option1');

    // Filter states for demos
    const [selectedGenre, setSelectedGenre] = useState([]);
    const [selectedStatus, setSelectedStatus] = useState('all');
    const [selectedRating, setSelectedRating] = useState({ min: 0, max: 10 });
    const [selectedYear, setSelectedYear] = useState({ min: 1900, max: 2024 });
    const [searchQuery, setSearchQuery] = useState('');

    // Filter builder states
    const [filterConditions, setFilterConditions] = useState([]);
    const [newFilterField, setNewFilterField] = useState('genre');
    const [newFilterOperator, setNewFilterOperator] = useState('equals');
    const [newFilterValue, setNewFilterValue] = useState('');
    // Filter presets - kept for future database integration
    // const [filterPresets] = useState([
    //     { id: 1, name: 'High-Rated Recent Movies', conditions: [] },
    //     { id: 2, name: 'Action & Sci-Fi', conditions: [] },
    //     { id: 3, name: 'Unwatched Classics', conditions: [] },
    // ]);

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

    // Mock filter data for media search
    const genreOptions = [
        'Action',
        'Adventure',
        'Comedy',
        'Drama',
        'Horror',
        'Sci-Fi',
        'Thriller',
        'Romance',
        'Documentary',
        'Animation',
    ];

    const statusOptions = [
        { key: 'all', label: 'All Status' },
        { key: 'wanted', label: 'Wanted' },
        { key: 'downloaded', label: 'Downloaded' },
        { key: 'monitored', label: 'Monitored' },
        { key: 'unmonitored', label: 'Unmonitored' },
        { key: 'missing', label: 'Missing' },
    ];

    const studioOptions = [
        'Marvel Studios',
        'Warner Bros',
        'Universal',
        'Disney',
        'Sony Pictures',
        'Paramount',
        'Netflix',
        'HBO',
        'Amazon Studios',
        'Apple TV+',
    ];

    const languageOptions = [
        'English',
        'Spanish',
        'French',
        'German',
        'Italian',
        'Japanese',
        'Korean',
        'Chinese',
        'Portuguese',
        'Russian',
    ];

    const filterCategories = [
        { key: 'genre', label: 'Genre', count: selectedGenre.length },
        { key: 'status', label: 'Status', count: selectedStatus !== 'all' ? 1 : 0 },
        {
            key: 'rating',
            label: 'Rating',
            count: selectedRating.min > 0 || selectedRating.max < 10 ? 1 : 0,
        },
        {
            key: 'year',
            label: 'Year',
            count: selectedYear.min > 1900 || selectedYear.max < 2024 ? 1 : 0,
        },
        { key: 'studio', label: 'Studio', count: 0 },
        { key: 'language', label: 'Language', count: 0 },
    ];

    // Filter builder field definitions
    const filterFields = [
        { key: 'genre', label: 'Genre', type: 'multiselect', options: genreOptions },
        { key: 'year', label: 'Year', type: 'range', min: 1900, max: 2024 },
        { key: 'rating', label: 'Rating', type: 'range', min: 0, max: 10, step: 0.1 },
        { key: 'status', label: 'Status', type: 'select', options: statusOptions },
        { key: 'studio', label: 'Studio', type: 'multiselect', options: studioOptions },
        { key: 'language', label: 'Language', type: 'select', options: languageOptions },
        { key: 'title', label: 'Title', type: 'text' },
        { key: 'cast', label: 'Cast', type: 'text' },
        { key: 'runtime', label: 'Runtime (mins)', type: 'range', min: 0, max: 300 },
        { key: 'monitored', label: 'Monitored', type: 'boolean' },
        { key: 'imdb_id', label: 'IMDB ID', type: 'text' },
        { key: 'tmdb_id', label: 'TMDB ID', type: 'text' },
        { key: 'tvdb_id', label: 'TVDB ID', type: 'text' },
    ];

    // Get operators based on field type
    const getOperatorsForField = fieldType => {
        switch (fieldType) {
            case 'text':
                return [
                    { key: 'contains', label: 'Contains' },
                    { key: 'equals', label: 'Equals' },
                    { key: 'starts_with', label: 'Starts with' },
                    { key: 'not_contains', label: 'Does not contain' },
                ];
            case 'range':
                return [
                    { key: 'equals', label: 'Equals' },
                    { key: 'greater_than', label: 'Greater than' },
                    { key: 'less_than', label: 'Less than' },
                    { key: 'between', label: 'Between' },
                ];
            case 'select':
            case 'multiselect':
                return [
                    { key: 'equals', label: 'Is' },
                    { key: 'not_equals', label: 'Is not' },
                    { key: 'in', label: 'Is one of' },
                ];
            case 'boolean':
                return [{ key: 'equals', label: 'Is' }];
            default:
                return [{ key: 'equals', label: 'Equals' }];
        }
    };

    const addFilterCondition = () => {
        if (!newFilterValue) return;

        const field = filterFields.find(f => f.key === newFilterField);
        const operator = getOperatorsForField(field.type).find(o => o.key === newFilterOperator);

        const newCondition = {
            id: Date.now(),
            field: newFilterField,
            fieldLabel: field.label,
            operator: newFilterOperator,
            operatorLabel: operator.label,
            value: newFilterValue,
            logic: filterConditions.length > 0 ? 'AND' : null,
        };

        setFilterConditions([...filterConditions, newCondition]);
        setNewFilterValue('');
    };

    const removeFilterCondition = conditionId => {
        setFilterConditions(filterConditions.filter(c => c.id !== conditionId));
    };

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

                {/* Media Search Filter Demos */}
                <section className="test-section">
                    <h2>Media Search Filters</h2>
                    <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
                        Demonstration of different filtering approaches for media search
                        functionality.
                    </p>

                    <div className="test-grid">
                        {/* Single Filter Popover */}
                        <div className="test-item">
                            <h3>Genre Filter (Multi-Select)</h3>
                            <p
                                style={{
                                    color: 'var(--text-secondary)',
                                    fontSize: 'var(--font-size-1)',
                                    marginBottom: '1rem',
                                }}
                            >
                                Single filter with multi-select capability
                            </p>
                            <button
                                ref={filterPopover.triggerRef}
                                className="btn btn-secondary"
                                onClick={filterPopover.toggle}
                            >
                                Genre {selectedGenre.length > 0 && `(${selectedGenre.length})`}
                            </button>
                            <Popover
                                triggerRef={filterPopover.triggerRef}
                                show={filterPopover.show}
                                onClose={filterPopover.close}
                                variant="selector"
                                position="bottom"
                                trapFocus={true}
                                ariaLabel="Select genres"
                            >
                                <div className="popover__title">Filter by Genre</div>
                                <div className="popover__content">
                                    <div style={{ marginBottom: '1rem' }}>
                                        <input
                                            type="text"
                                            placeholder="Search genres..."
                                            style={{
                                                width: '100%',
                                                padding: '0.5rem',
                                                border: '1px solid var(--divider)',
                                                borderRadius: 'var(--radius-2)',
                                                fontSize: 'var(--font-size-1)',
                                            }}
                                        />
                                    </div>
                                    <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                                        {genreOptions.map(genre => (
                                            <label
                                                key={genre}
                                                style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    padding: '0.5rem',
                                                    cursor: 'pointer',
                                                    borderRadius: 'var(--radius-1)',
                                                    transition: 'background-color 0.2s',
                                                }}
                                                onMouseEnter={e =>
                                                    (e.target.style.backgroundColor =
                                                        'var(--surface-alt)')
                                                }
                                                onMouseLeave={e =>
                                                    (e.target.style.backgroundColor = 'transparent')
                                                }
                                            >
                                                <input
                                                    type="checkbox"
                                                    checked={selectedGenre.includes(genre)}
                                                    onChange={e => {
                                                        if (e.target.checked) {
                                                            setSelectedGenre([
                                                                ...selectedGenre,
                                                                genre,
                                                            ]);
                                                        } else {
                                                            setSelectedGenre(
                                                                selectedGenre.filter(
                                                                    g => g !== genre
                                                                )
                                                            );
                                                        }
                                                    }}
                                                    style={{ marginRight: '0.5rem' }}
                                                />
                                                {genre}
                                            </label>
                                        ))}
                                    </div>
                                    <div
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            marginTop: '1rem',
                                            paddingTop: '1rem',
                                            borderTop: '1px solid var(--divider)',
                                        }}
                                    >
                                        <button
                                            className="btn btn-sm btn-secondary"
                                            onClick={() => setSelectedGenre([])}
                                        >
                                            Clear All
                                        </button>
                                        <button
                                            className="btn btn-sm btn-primary"
                                            onClick={filterPopover.close}
                                        >
                                            Apply ({selectedGenre.length})
                                        </button>
                                    </div>
                                </div>
                            </Popover>
                        </div>

                        {/* Multi-Filter Hub */}
                        <div className="test-item">
                            <h3>Multi-Filter Hub</h3>
                            <p
                                style={{
                                    color: 'var(--text-secondary)',
                                    fontSize: 'var(--font-size-1)',
                                    marginBottom: '1rem',
                                }}
                            >
                                Central hub for managing multiple filter types
                            </p>
                            <button
                                ref={multiFilterPopover.triggerRef}
                                className="btn btn-secondary"
                                onClick={multiFilterPopover.toggle}
                            >
                                Filters{' '}
                                {filterCategories.reduce((sum, cat) => sum + cat.count, 0) > 0 &&
                                    `(${filterCategories.reduce((sum, cat) => sum + cat.count, 0)})`}
                            </button>
                            <Popover
                                triggerRef={multiFilterPopover.triggerRef}
                                show={multiFilterPopover.show}
                                onClose={multiFilterPopover.close}
                                variant="default"
                                position="bottom"
                                trapFocus={true}
                                ariaLabel="Media filters"
                            >
                                <div className="popover__title">Filter Media</div>
                                <div className="popover__content">
                                    <div style={{ marginBottom: '1rem' }}>
                                        <input
                                            type="text"
                                            placeholder="Quick search..."
                                            value={searchQuery}
                                            onChange={e => setSearchQuery(e.target.value)}
                                            style={{
                                                width: '100%',
                                                padding: '0.5rem',
                                                border: '1px solid var(--divider)',
                                                borderRadius: 'var(--radius-2)',
                                                fontSize: 'var(--font-size-1)',
                                            }}
                                        />
                                    </div>

                                    <div style={{ marginBottom: '1rem' }}>
                                        <h4
                                            style={{
                                                fontSize: 'var(--font-size-1)',
                                                fontWeight: '600',
                                                marginBottom: '0.5rem',
                                                color: 'var(--text-primary)',
                                            }}
                                        >
                                            Filter Categories
                                        </h4>
                                        <div style={{ display: 'grid', gap: '0.5rem' }}>
                                            {filterCategories.map(category => (
                                                <button
                                                    key={category.key}
                                                    className="popover__list-item"
                                                    style={{
                                                        display: 'flex',
                                                        justifyContent: 'space-between',
                                                        alignItems: 'center',
                                                        width: '100%',
                                                        textAlign: 'left',
                                                    }}
                                                >
                                                    <span>{category.label}</span>
                                                    {category.count > 0 && (
                                                        <span
                                                            style={{
                                                                background: 'var(--primary)',
                                                                color: 'white',
                                                                padding: '0.125rem 0.5rem',
                                                                borderRadius: '999px',
                                                                fontSize: 'var(--font-size-0)',
                                                                fontWeight: '500',
                                                            }}
                                                        >
                                                            {category.count}
                                                        </span>
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            paddingTop: '1rem',
                                            borderTop: '1px solid var(--divider)',
                                        }}
                                    >
                                        <button
                                            className="btn btn-sm btn-secondary"
                                            onClick={() => {
                                                setSelectedGenre([]);
                                                setSelectedStatus('all');
                                                setSelectedRating({ min: 0, max: 10 });
                                                setSelectedYear({ min: 1900, max: 2024 });
                                            }}
                                        >
                                            Reset All
                                        </button>
                                        <button
                                            className="btn btn-sm btn-primary"
                                            onClick={multiFilterPopover.close}
                                        >
                                            Apply Filters
                                        </button>
                                    </div>
                                </div>
                            </Popover>
                        </div>

                        {/* Filter Builder */}
                        <div className="test-item">
                            <h3>Filter Builder</h3>
                            <p
                                style={{
                                    color: 'var(--text-secondary)',
                                    fontSize: 'var(--font-size-1)',
                                    marginBottom: '1rem',
                                }}
                            >
                                Comprehensive filter builder with all media fields
                            </p>

                            {/* Active Filters Display */}
                            {filterConditions.length > 0 && (
                                <div
                                    style={{
                                        marginBottom: '1rem',
                                        padding: '0.75rem',
                                        background: 'var(--surface-alt)',
                                        borderRadius: 'var(--radius-2)',
                                        border: '1px solid var(--divider)',
                                    }}
                                >
                                    <h4
                                        style={{
                                            fontSize: 'var(--font-size-1)',
                                            fontWeight: '600',
                                            marginBottom: '0.5rem',
                                            color: 'var(--text-primary)',
                                        }}
                                    >
                                        Active Filters ({filterConditions.length})
                                    </h4>
                                    <div
                                        style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}
                                    >
                                        {filterConditions.map((condition, index) => (
                                            <div
                                                key={condition.id}
                                                style={{ display: 'flex', alignItems: 'center' }}
                                            >
                                                {condition.logic && index > 0 && (
                                                    <span
                                                        style={{
                                                            margin: '0 0.5rem',
                                                            fontSize: 'var(--font-size-0)',
                                                            fontWeight: '600',
                                                            color: 'var(--text-secondary)',
                                                        }}
                                                    >
                                                        {condition.logic}
                                                    </span>
                                                )}
                                                <div
                                                    style={{
                                                        display: 'inline-flex',
                                                        alignItems: 'center',
                                                        background: 'var(--primary)',
                                                        color: 'white',
                                                        padding: '0.25rem 0.5rem',
                                                        borderRadius: 'var(--radius-1)',
                                                        fontSize: 'var(--font-size-0)',
                                                        gap: '0.25rem',
                                                    }}
                                                >
                                                    <span>
                                                        {condition.fieldLabel}{' '}
                                                        {condition.operatorLabel.toLowerCase()}{' '}
                                                        &quot;
                                                        {condition.value}&quot;
                                                    </span>
                                                    <button
                                                        onClick={() =>
                                                            removeFilterCondition(condition.id)
                                                        }
                                                        style={{
                                                            background: 'none',
                                                            border: 'none',
                                                            color: 'white',
                                                            cursor: 'pointer',
                                                            padding: '0',
                                                            marginLeft: '0.25rem',
                                                            fontSize: 'var(--font-size-0)',
                                                            opacity: '0.8',
                                                        }}
                                                        onMouseEnter={e =>
                                                            (e.target.style.opacity = '1')
                                                        }
                                                        onMouseLeave={e =>
                                                            (e.target.style.opacity = '0.8')
                                                        }
                                                    >
                                                        ✕
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            <button
                                ref={filterBuilderPopover.triggerRef}
                                className="btn btn-secondary"
                                onClick={filterBuilderPopover.toggle}
                            >
                                {filterConditions.length > 0
                                    ? `Edit Filters (${filterConditions.length})`
                                    : 'Build Filters'}
                            </button>
                            <Popover
                                triggerRef={filterBuilderPopover.triggerRef}
                                show={filterBuilderPopover.show}
                                onClose={filterBuilderPopover.close}
                                variant="default"
                                position="bottom"
                                trapFocus={true}
                                ariaLabel="Filter builder"
                                className="popover--wide"
                            >
                                <div className="popover__title">Filter Builder</div>
                                <div className="popover__content">
                                    {/* Quick Presets - Hidden for now, keep for future database integration 
                                    <div style={{ marginBottom: '1.5rem' }}>
                                        <label
                                            style={{
                                                display: 'block',
                                                fontSize: 'var(--font-size-1)',
                                                fontWeight: '500',
                                                marginBottom: '0.5rem',
                                                color: 'var(--text-primary)',
                                            }}
                                        >
                                            Quick Presets
                                        </label>
                                        <div
                                            style={{
                                                display: 'flex',
                                                gap: '0.5rem',
                                                flexWrap: 'wrap',
                                            }}
                                        >
                                            {[].map(preset => (
                                                <button
                                                    key={preset.id}
                                                    className="btn btn-sm btn-secondary"
                                                    onClick={() => {
                                                        // In real implementation, load preset conditions
                                                        console.log(
                                                            'Load preset:',
                                                            preset.name
                                                        );
                                                    }}
                                                >
                                                    {preset.name}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                    */}

                                    {/* Add New Filter */}
                                    <div
                                        style={{
                                            marginBottom: '1.5rem',
                                            padding: '1.25rem',
                                            background: 'var(--surface)',
                                            borderRadius: 'var(--radius-3)',
                                            border: '1px solid var(--divider)',
                                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                                        }}
                                    >
                                        <h4
                                            style={{
                                                fontSize: 'var(--font-size-2)',
                                                fontWeight: '600',
                                                marginBottom: '1.25rem',
                                                color: 'var(--text-primary)',
                                                borderBottom: '2px solid var(--primary)',
                                                paddingBottom: '0.5rem',
                                                display: 'inline-block',
                                            }}
                                        >
                                            Add Filter Condition
                                        </h4>

                                        <div
                                            style={{
                                                display: 'grid',
                                                gridTemplateColumns: '1fr 1fr 1.2fr auto',
                                                gap: '0.75rem',
                                                alignItems: 'end',
                                            }}
                                        >
                                            {/* Field Selection */}
                                            <div>
                                                <label
                                                    style={{
                                                        fontSize: 'var(--font-size-1)',
                                                        fontWeight: '500',
                                                        color: 'var(--text-primary)',
                                                        marginBottom: '0.5rem',
                                                        display: 'block',
                                                    }}
                                                >
                                                    Field
                                                </label>
                                                <select
                                                    value={newFilterField}
                                                    onChange={e => {
                                                        setNewFilterField(e.target.value);
                                                        const field = filterFields.find(
                                                            f => f.key === e.target.value
                                                        );
                                                        const operators = getOperatorsForField(
                                                            field.type
                                                        );
                                                        setNewFilterOperator(operators[0].key);
                                                        setNewFilterValue('');
                                                    }}
                                                    style={{
                                                        width: '100%',
                                                        padding: '0.5rem',
                                                        border: '1px solid var(--divider)',
                                                        borderRadius: 'var(--radius-1)',
                                                        fontSize: 'var(--font-size-1)',
                                                        backgroundColor: 'var(--surface)',
                                                    }}
                                                >
                                                    {filterFields.map(field => (
                                                        <option key={field.key} value={field.key}>
                                                            {field.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* Operator Selection */}
                                            <div>
                                                <label
                                                    style={{
                                                        fontSize: 'var(--font-size-1)',
                                                        fontWeight: '500',
                                                        color: 'var(--text-primary)',
                                                        marginBottom: '0.5rem',
                                                        display: 'block',
                                                    }}
                                                >
                                                    Operator
                                                </label>
                                                <select
                                                    value={newFilterOperator}
                                                    onChange={e =>
                                                        setNewFilterOperator(e.target.value)
                                                    }
                                                    style={{
                                                        width: '100%',
                                                        padding: '0.5rem',
                                                        border: '1px solid var(--divider)',
                                                        borderRadius: 'var(--radius-1)',
                                                        fontSize: 'var(--font-size-1)',
                                                        backgroundColor: 'var(--surface)',
                                                    }}
                                                >
                                                    {getOperatorsForField(
                                                        filterFields.find(
                                                            f => f.key === newFilterField
                                                        )?.type
                                                    ).map(operator => (
                                                        <option
                                                            key={operator.key}
                                                            value={operator.key}
                                                        >
                                                            {operator.label}
                                                        </option>
                                                    ))}
                                                </select>
                                            </div>

                                            {/* Value Input */}
                                            <div>
                                                <label
                                                    style={{
                                                        fontSize: 'var(--font-size-1)',
                                                        fontWeight: '500',
                                                        color: 'var(--text-primary)',
                                                        marginBottom: '0.5rem',
                                                        display: 'block',
                                                    }}
                                                >
                                                    Value
                                                </label>
                                                {(() => {
                                                    const field = filterFields.find(
                                                        f => f.key === newFilterField
                                                    );
                                                    if (
                                                        field.type === 'range' &&
                                                        field.key === 'year'
                                                    ) {
                                                        return (
                                                            <div
                                                                style={{
                                                                    display: 'flex',
                                                                    flexDirection: 'column',
                                                                    gap: '0.5rem',
                                                                    padding: '0.75rem',
                                                                    background:
                                                                        'var(--surface-alt)',
                                                                    borderRadius: 'var(--radius-2)',
                                                                    border: '1px solid var(--divider)',
                                                                }}
                                                            >
                                                                <div
                                                                    style={{
                                                                        display: 'flex',
                                                                        alignItems: 'center',
                                                                        gap: '0.75rem',
                                                                    }}
                                                                >
                                                                    <input
                                                                        type="range"
                                                                        min={field.min}
                                                                        max={field.max}
                                                                        value={
                                                                            newFilterValue ||
                                                                            field.min
                                                                        }
                                                                        onChange={e =>
                                                                            setNewFilterValue(
                                                                                e.target.value
                                                                            )
                                                                        }
                                                                        style={{
                                                                            flex: '1',
                                                                            height: '6px',
                                                                            borderRadius: '3px',
                                                                            background:
                                                                                'var(--divider)',
                                                                            outline: 'none',
                                                                            accentColor:
                                                                                'var(--primary)',
                                                                        }}
                                                                    />
                                                                    <span
                                                                        style={{
                                                                            fontSize:
                                                                                'var(--font-size-1)',
                                                                            fontWeight: '600',
                                                                            color: 'var(--primary)',
                                                                            minWidth: '50px',
                                                                            textAlign: 'center',
                                                                            padding:
                                                                                '0.25rem 0.5rem',
                                                                            background:
                                                                                'var(--surface)',
                                                                            borderRadius:
                                                                                'var(--radius-1)',
                                                                            border: '1px solid var(--primary)',
                                                                        }}
                                                                    >
                                                                        {newFilterValue ||
                                                                            field.min}
                                                                    </span>
                                                                </div>
                                                                <div
                                                                    style={{
                                                                        display: 'flex',
                                                                        justifyContent:
                                                                            'space-between',
                                                                        fontSize:
                                                                            'var(--font-size-0)',
                                                                        color: 'var(--text-secondary)',
                                                                    }}
                                                                >
                                                                    <span>{field.min}</span>
                                                                    <span>{field.max}</span>
                                                                </div>
                                                            </div>
                                                        );
                                                    } else if (field.type === 'select') {
                                                        return (
                                                            <select
                                                                value={newFilterValue}
                                                                onChange={e =>
                                                                    setNewFilterValue(
                                                                        e.target.value
                                                                    )
                                                                }
                                                                style={{
                                                                    width: '100%',
                                                                    padding: '0.5rem',
                                                                    border: '1px solid var(--divider)',
                                                                    borderRadius: 'var(--radius-1)',
                                                                    fontSize: 'var(--font-size-1)',
                                                                    backgroundColor:
                                                                        'var(--surface)',
                                                                }}
                                                            >
                                                                <option value="">Select...</option>
                                                                {field.options.map(option => (
                                                                    <option
                                                                        key={
                                                                            typeof option ===
                                                                            'string'
                                                                                ? option
                                                                                : option.key
                                                                        }
                                                                        value={
                                                                            typeof option ===
                                                                            'string'
                                                                                ? option
                                                                                : option.key
                                                                        }
                                                                    >
                                                                        {typeof option === 'string'
                                                                            ? option
                                                                            : option.label}
                                                                    </option>
                                                                ))}
                                                            </select>
                                                        );
                                                    } else if (field.type === 'boolean') {
                                                        return (
                                                            <select
                                                                value={newFilterValue}
                                                                onChange={e =>
                                                                    setNewFilterValue(
                                                                        e.target.value
                                                                    )
                                                                }
                                                                style={{
                                                                    width: '100%',
                                                                    padding: '0.5rem',
                                                                    border: '1px solid var(--divider)',
                                                                    borderRadius: 'var(--radius-1)',
                                                                    fontSize: 'var(--font-size-1)',
                                                                    backgroundColor:
                                                                        'var(--surface)',
                                                                }}
                                                            >
                                                                <option value="">Select...</option>
                                                                <option value="true">Yes</option>
                                                                <option value="false">No</option>
                                                            </select>
                                                        );
                                                    } else {
                                                        return (
                                                            <input
                                                                type="text"
                                                                placeholder="Enter value..."
                                                                value={newFilterValue}
                                                                onChange={e =>
                                                                    setNewFilterValue(
                                                                        e.target.value
                                                                    )
                                                                }
                                                                style={{
                                                                    width: '100%',
                                                                    padding: '0.5rem',
                                                                    border: '1px solid var(--divider)',
                                                                    borderRadius: 'var(--radius-1)',
                                                                    fontSize: 'var(--font-size-1)',
                                                                }}
                                                            />
                                                        );
                                                    }
                                                })()}
                                            </div>

                                            {/* Add Button */}
                                            <button
                                                onClick={addFilterCondition}
                                                disabled={!newFilterValue}
                                                className="btn btn-primary"
                                                style={{
                                                    opacity: !newFilterValue ? '0.5' : '1',
                                                    cursor: !newFilterValue
                                                        ? 'not-allowed'
                                                        : 'pointer',
                                                    padding: '0.75rem 1.5rem',
                                                    fontSize: 'var(--font-size-1)',
                                                    fontWeight: '600',
                                                    borderRadius: 'var(--radius-2)',
                                                    minHeight: '44px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    justifyContent: 'center',
                                                    gap: '0.5rem',
                                                    boxShadow: !newFilterValue
                                                        ? 'none'
                                                        : '0 2px 4px rgba(var(--primary-rgb), 0.3)',
                                                    transform: 'translateY(0)',
                                                    transition: 'all 0.2s ease',
                                                }}
                                                onMouseEnter={e => {
                                                    if (!e.target.disabled) {
                                                        e.target.style.transform =
                                                            'translateY(-1px)';
                                                        e.target.style.boxShadow =
                                                            '0 4px 8px rgba(var(--primary-rgb), 0.4)';
                                                    }
                                                }}
                                                onMouseLeave={e => {
                                                    e.target.style.transform = 'translateY(0)';
                                                    e.target.style.boxShadow = !e.target.disabled
                                                        ? '0 2px 4px rgba(var(--primary-rgb), 0.3)'
                                                        : 'none';
                                                }}
                                            >
                                                ➕ Add
                                            </button>
                                        </div>
                                    </div>

                                    {/* Active Conditions */}
                                    {filterConditions.length > 0 && (
                                        <div style={{ marginBottom: '1.5rem' }}>
                                            <h4
                                                style={{
                                                    fontSize: 'var(--font-size-2)',
                                                    fontWeight: '600',
                                                    marginBottom: '0.75rem',
                                                    color: 'var(--text-primary)',
                                                    borderBottom: '2px solid var(--success)',
                                                    paddingBottom: '0.5rem',
                                                    display: 'inline-block',
                                                }}
                                            >
                                                📋 Active Filters ({filterConditions.length})
                                            </h4>
                                            <div
                                                style={{
                                                    maxHeight: '200px',
                                                    overflowY: 'auto',
                                                    padding: '1rem',
                                                    background: 'var(--surface)',
                                                    borderRadius: 'var(--radius-3)',
                                                    border: '1px solid var(--divider)',
                                                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                                                }}
                                            >
                                                {filterConditions.map((condition, index) => (
                                                    <div
                                                        key={condition.id}
                                                        style={{
                                                            display: 'flex',
                                                            alignItems: 'center',
                                                            justifyContent: 'space-between',
                                                            padding: '0.75rem 1rem',
                                                            marginBottom:
                                                                index < filterConditions.length - 1
                                                                    ? '0.75rem'
                                                                    : '0',
                                                            background: 'var(--surface-alt)',
                                                            borderRadius: 'var(--radius-2)',
                                                            border: '1px solid var(--divider)',
                                                            boxShadow:
                                                                '0 1px 2px rgba(0, 0, 0, 0.05)',
                                                        }}
                                                    >
                                                        <span
                                                            style={{
                                                                fontSize: 'var(--font-size-1)',
                                                                lineHeight: '1.4',
                                                            }}
                                                        >
                                                            {condition.logic && (
                                                                <span
                                                                    style={{
                                                                        background:
                                                                            'var(--warning)',
                                                                        color: 'white',
                                                                        padding: '0.125rem 0.5rem',
                                                                        borderRadius:
                                                                            'var(--radius-1)',
                                                                        fontSize:
                                                                            'var(--font-size-0)',
                                                                        fontWeight: '600',
                                                                        marginRight: '0.5rem',
                                                                    }}
                                                                >
                                                                    {condition.logic}
                                                                </span>
                                                            )}
                                                            <strong
                                                                style={{ color: 'var(--primary)' }}
                                                            >
                                                                {condition.fieldLabel}
                                                            </strong>{' '}
                                                            <span
                                                                style={{
                                                                    color: 'var(--text-secondary)',
                                                                }}
                                                            >
                                                                {condition.operatorLabel.toLowerCase()}
                                                            </span>{' '}
                                                            <em
                                                                style={{
                                                                    color: 'var(--success)',
                                                                    fontWeight: '500',
                                                                    background: 'var(--surface)',
                                                                    padding: '0.125rem 0.375rem',
                                                                    borderRadius: 'var(--radius-1)',
                                                                    fontStyle: 'normal',
                                                                }}
                                                            >
                                                                &quot;{condition.value}&quot;
                                                            </em>
                                                        </span>
                                                        <button
                                                            onClick={() =>
                                                                removeFilterCondition(condition.id)
                                                            }
                                                            className="btn btn-sm"
                                                            style={{
                                                                padding: '0.375rem 0.75rem',
                                                                background: 'var(--error)',
                                                                color: 'white',
                                                                border: 'none',
                                                                borderRadius: 'var(--radius-2)',
                                                                fontSize: 'var(--font-size-0)',
                                                                fontWeight: '500',
                                                                transition: 'all 0.2s ease',
                                                            }}
                                                            onMouseEnter={e => {
                                                                e.target.style.transform =
                                                                    'scale(1.05)';
                                                                e.target.style.boxShadow =
                                                                    '0 2px 4px rgba(0, 0, 0, 0.2)';
                                                            }}
                                                            onMouseLeave={e => {
                                                                e.target.style.transform =
                                                                    'scale(1)';
                                                                e.target.style.boxShadow = 'none';
                                                            }}
                                                        >
                                                            🗑️ Remove
                                                        </button>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            paddingTop: '1rem',
                                            borderTop: '1px solid var(--divider)',
                                        }}
                                    >
                                        <button
                                            className="btn btn-sm btn-secondary"
                                            onClick={() => setFilterConditions([])}
                                        >
                                            Clear All
                                        </button>
                                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                                            <button
                                                className="btn btn-sm btn-secondary"
                                                onClick={() => {
                                                    // In real implementation, save current conditions as preset
                                                    console.log('Save preset');
                                                }}
                                            >
                                                Save Preset
                                            </button>
                                            <button
                                                className="btn btn-sm btn-primary"
                                                onClick={filterBuilderPopover.close}
                                            >
                                                Apply Filters
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </Popover>
                        </div>
                    </div>

                    {/* Filter Examples Documentation */}
                    <div className="test-notes" style={{ marginTop: '2rem' }}>
                        <h3>Filter Implementation Approaches</h3>
                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                                gap: '1.5rem',
                            }}
                        >
                            <div>
                                <h4
                                    style={{
                                        fontSize: 'var(--font-size-1)',
                                        fontWeight: '600',
                                        marginBottom: '0.5rem',
                                    }}
                                >
                                    Single Filter Approach
                                </h4>
                                <ul
                                    style={{
                                        fontSize: 'var(--font-size-1)',
                                        color: 'var(--text-secondary)',
                                    }}
                                >
                                    <li>One popover per filter type</li>
                                    <li>Multi-select with checkboxes</li>
                                    <li>Search within filter options</li>
                                    <li>Clear all and apply actions</li>
                                    <li>Good for focused filtering</li>
                                </ul>
                            </div>
                            <div>
                                <h4
                                    style={{
                                        fontSize: 'var(--font-size-1)',
                                        fontWeight: '600',
                                        marginBottom: '0.5rem',
                                    }}
                                >
                                    Multi-Filter Hub
                                </h4>
                                <ul
                                    style={{
                                        fontSize: 'var(--font-size-1)',
                                        color: 'var(--text-secondary)',
                                    }}
                                >
                                    <li>Central filter management</li>
                                    <li>Quick search integration</li>
                                    <li>Filter category overview</li>
                                    <li>Badge counts for active filters</li>
                                    <li>Unified apply/reset actions</li>
                                </ul>
                            </div>
                            <div>
                                <h4
                                    style={{
                                        fontSize: 'var(--font-size-1)',
                                        fontWeight: '600',
                                        marginBottom: '0.5rem',
                                    }}
                                >
                                    Advanced Builder
                                </h4>
                                <ul
                                    style={{
                                        fontSize: 'var(--font-size-1)',
                                        color: 'var(--text-secondary)',
                                    }}
                                >
                                    <li>Range inputs for numeric values</li>
                                    <li>Dropdown selections</li>
                                    <li>Complex filter combinations</li>
                                    <li>Operator support (&gt;, &lt;, =)</li>
                                    <li>Power user oriented</li>
                                </ul>
                            </div>
                        </div>

                        <div
                            style={{
                                marginTop: '1.5rem',
                                padding: '1rem',
                                background: 'var(--surface-alt)',
                                borderRadius: 'var(--radius-2)',
                            }}
                        >
                            <h4
                                style={{
                                    fontSize: 'var(--font-size-1)',
                                    fontWeight: '600',
                                    marginBottom: '0.5rem',
                                }}
                            >
                                Testing Focus Trap
                            </h4>
                            <ul
                                style={{
                                    fontSize: 'var(--font-size-1)',
                                    color: 'var(--text-secondary)',
                                    marginBottom: '1rem',
                                }}
                            >
                                <li>
                                    <strong>Open filter popover:</strong> Click on any filter button
                                    above
                                </li>
                                <li>
                                    <strong>Tab navigation:</strong> Press Tab to cycle through
                                    focusable elements
                                </li>
                                <li>
                                    <strong>Reverse tab:</strong> Press Shift+Tab to cycle backwards
                                </li>
                                <li>
                                    <strong>Focus wrapping:</strong> Focus should wrap from last to
                                    first element
                                </li>
                                <li>
                                    <strong>Close and reset:</strong> Press Escape to close, or
                                    click outside
                                </li>
                            </ul>

                            <h4
                                style={{
                                    fontSize: 'var(--font-size-1)',
                                    fontWeight: '600',
                                    marginBottom: '0.5rem',
                                }}
                            >
                                Implementation Considerations
                            </h4>
                            <ul
                                style={{
                                    fontSize: 'var(--font-size-1)',
                                    color: 'var(--text-secondary)',
                                    margin: 0,
                                }}
                            >
                                <li>
                                    <strong>Performance:</strong> Consider virtualization for large
                                    option lists
                                </li>
                                <li>
                                    <strong>Persistence:</strong> Save filter states in URL params
                                    or localStorage
                                </li>
                                <li>
                                    <strong>Accessibility:</strong> Proper ARIA labels and keyboard
                                    navigation
                                </li>
                                <li>
                                    <strong>Mobile:</strong> Consider drawer/sheet approach on
                                    mobile devices
                                </li>
                                <li>
                                    <strong>Integration:</strong> Connect with search API and result
                                    updates
                                </li>
                            </ul>
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

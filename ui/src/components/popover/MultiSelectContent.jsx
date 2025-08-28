import React, { useState, useMemo, useCallback } from 'react';
import PropTypes from 'prop-types';

/**
 * MultiSelectContent - Multi-select interface with search functionality
 *
 * Supports the multi-select pattern from PopoverTest.jsx including:
 * - Searchable option list with checkboxes
 * - Select/deselect individual items
 * - Clear all functionality
 * - Apply with count display
 * - Keyboard navigation support
 * - Touch-friendly 44px minimum targets
 *
 * @param {Object} props - Component props
 * @param {string} [props.title] - Popover title
 * @param {Array} props.options - Available options (strings or objects with key/label)
 * @param {Object} [props.selected] - State binding for selected items array
 * @param {boolean} [props.searchable] - Whether to show search input
 * @param {string} [props.searchPlaceholder] - Search input placeholder
 * @param {Array} [props.actions] - Actions to show (clear, apply)
 * @param {Function} props.onClose - Callback to close popover
 */
const MultiSelectContent = React.memo(
    ({
        title = 'Select Options',
        options = [],
        selected,
        searchable = true,
        searchPlaceholder = 'Search options...',
        actions = ['clear', 'apply'],
        onClose,
    }) => {
        // Local search state
        const [searchQuery, setSearchQuery] = useState('');

        // Normalize options to consistent format
        const normalizedOptions = useMemo(() => {
            return options.map(option => {
                if (typeof option === 'string') {
                    return { key: option, label: option };
                }
                return {
                    key: option.key || option.value || option.label,
                    label: option.label || option.value || option.key,
                    icon: option.icon,
                };
            });
        }, [options]);

        // Filter options based on search query
        const filteredOptions = useMemo(() => {
            if (!searchQuery.trim()) {
                return normalizedOptions;
            }

            const query = searchQuery.toLowerCase();
            return normalizedOptions.filter(
                option =>
                    option.label.toLowerCase().includes(query) ||
                    option.key.toLowerCase().includes(query)
            );
        }, [normalizedOptions, searchQuery]);

        // Get selected values array (fallback to empty array)
        const selectedValues = selected?.value || [];

        // Toggle selection for an option
        const handleToggleOption = useCallback(
            optionKey => {
                if (!selected?.setValue) return;

                const isSelected = selectedValues.includes(optionKey);
                if (isSelected) {
                    selected.setValue(prev => (prev || []).filter(item => item !== optionKey));
                } else {
                    selected.setValue(prev => [...(prev || []), optionKey]);
                }
            },
            [selected, selectedValues]
        );

        // Clear all selections
        const handleClearAll = useCallback(() => {
            if (!selected?.setValue) return;
            selected.setValue([]);
        }, [selected]);

        // Handle apply action
        const handleApply = useCallback(() => {
            onClose();
        }, [onClose]);

        return (
            <>
                <div className="popover__title">{title}</div>
                <div className="popover__content">
                    {/* Search Input */}
                    {searchable && (
                        <div style={{ marginBottom: 'var(--space-4)' }}>
                            <input
                                type="text"
                                placeholder={searchPlaceholder}
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                style={{
                                    width: '100%',
                                    padding: 'var(--space-2)',
                                    border: '1px solid var(--divider)',
                                    borderRadius: 'var(--radius-2)',
                                    fontSize: 'var(--font-size-1)',
                                    backgroundColor: 'var(--surface)',
                                }}
                            />
                        </div>
                    )}

                    {/* Options List */}
                    <div
                        style={{
                            maxHeight: '200px',
                            overflowY: 'auto',
                            marginBottom: 'var(--space-4)',
                        }}
                    >
                        {filteredOptions.length === 0 ? (
                            <div
                                style={{
                                    padding: 'var(--space-4)',
                                    textAlign: 'center',
                                    color: 'var(--text-secondary)',
                                    fontSize: 'var(--font-size-1)',
                                }}
                            >
                                {searchQuery.trim()
                                    ? 'No options match your search'
                                    : 'No options available'}
                            </div>
                        ) : (
                            filteredOptions.map(option => {
                                const isSelected = selectedValues.includes(option.key);

                                return (
                                    <label
                                        key={option.key}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            padding: 'var(--space-2)',
                                            cursor: 'pointer',
                                            borderRadius: 'var(--radius-1)',
                                            transition: 'background-color 0.2s',
                                            minHeight: '44px', // Touch target compliance
                                            backgroundColor: isSelected
                                                ? 'var(--primary-20)'
                                                : 'transparent',
                                        }}
                                        onMouseEnter={e => {
                                            if (!isSelected) {
                                                e.target.style.backgroundColor =
                                                    'var(--surface-alt)';
                                            }
                                        }}
                                        onMouseLeave={e => {
                                            if (!isSelected) {
                                                e.target.style.backgroundColor = 'transparent';
                                            }
                                        }}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={isSelected}
                                            onChange={() => handleToggleOption(option.key)}
                                            style={{
                                                marginRight: 'var(--space-2)',
                                                minWidth: '16px',
                                                minHeight: '16px',
                                            }}
                                        />

                                        {/* Option icon if provided */}
                                        {option.icon && (
                                            <span
                                                style={{
                                                    marginRight: 'var(--space-2)',
                                                    fontSize: 'var(--font-size-2)',
                                                }}
                                            >
                                                {/* Simple icon mapping - in real app would use proper icon component */}
                                                {option.icon === 'mi:star' && '⭐'}
                                                {option.icon === 'mi:favorite' && '❤️'}
                                                {option.icon === 'mi:bookmark' && '🔖'}
                                            </span>
                                        )}

                                        <span
                                            style={{
                                                fontSize: 'var(--font-size-1)',
                                                color: isSelected
                                                    ? 'var(--primary)'
                                                    : 'var(--text-primary)',
                                                fontWeight: isSelected ? '500' : '400',
                                            }}
                                        >
                                            {option.label}
                                        </span>
                                    </label>
                                );
                            })
                        )}
                    </div>

                    {/* Actions */}
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            paddingTop: 'var(--space-4)',
                            borderTop: '1px solid var(--divider)',
                            alignItems: 'center',
                        }}
                    >
                        {/* Clear action */}
                        {actions.includes('clear') && (
                            <button
                                className="btn btn-sm btn-secondary"
                                onClick={handleClearAll}
                                disabled={selectedValues.length === 0}
                                style={{
                                    opacity: selectedValues.length === 0 ? '0.5' : '1',
                                    cursor: selectedValues.length === 0 ? 'not-allowed' : 'pointer',
                                    minHeight: '44px',
                                }}
                            >
                                Clear All
                            </button>
                        )}

                        {/* Spacer if no clear action */}
                        {!actions.includes('clear') && <div />}

                        {/* Apply action */}
                        {actions.includes('apply') && (
                            <button
                                className="btn btn-sm btn-primary"
                                onClick={handleApply}
                                style={{
                                    minHeight: '44px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 'var(--space-2)',
                                }}
                            >
                                Apply
                                {selectedValues.length > 0 && (
                                    <span
                                        style={{
                                            background: 'rgba(255, 255, 255, 0.2)',
                                            padding: 'var(--space-1) var(--space-2)',
                                            borderRadius: 'var(--radius-full)',
                                            fontSize: 'var(--font-size-0)',
                                            fontWeight: '600',
                                        }}
                                    >
                                        {selectedValues.length}
                                    </span>
                                )}
                            </button>
                        )}
                    </div>

                    {/* Selection summary */}
                    {selectedValues.length > 0 && (
                        <div
                            style={{
                                marginTop: 'var(--space-3)',
                                padding: 'var(--space-2)',
                                background: 'var(--surface-alt)',
                                borderRadius: 'var(--radius-1)',
                                fontSize: 'var(--font-size-0)',
                                color: 'var(--text-secondary)',
                            }}
                        >
                            {selectedValues.length === 1
                                ? '1 option selected'
                                : `${selectedValues.length} options selected`}
                            {selectedValues.length <= 3 && (
                                <span style={{ marginLeft: 'var(--space-2)' }}>
                                    (
                                    {selectedValues
                                        .map(key => {
                                            const option = normalizedOptions.find(
                                                opt => opt.key === key
                                            );
                                            return option?.label || key;
                                        })
                                        .join(', ')}
                                    )
                                </span>
                            )}
                        </div>
                    )}
                </div>
            </>
        );
    }
);

MultiSelectContent.propTypes = {
    title: PropTypes.string,
    options: PropTypes.arrayOf(
        PropTypes.oneOfType([
            PropTypes.string,
            PropTypes.shape({
                key: PropTypes.string,
                label: PropTypes.string,
                value: PropTypes.string,
                icon: PropTypes.string,
            }),
        ])
    ).isRequired,
    selected: PropTypes.shape({
        value: PropTypes.array,
        setValue: PropTypes.func,
    }),
    searchable: PropTypes.bool,
    searchPlaceholder: PropTypes.string,
    actions: PropTypes.arrayOf(PropTypes.oneOf(['clear', 'apply'])),
    onClose: PropTypes.func.isRequired,
};

MultiSelectContent.displayName = 'MultiSelectContent';

export default MultiSelectContent;

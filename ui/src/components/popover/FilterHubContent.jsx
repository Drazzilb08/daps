import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';

/**
 * FilterHubContent - Central filter management interface
 *
 * Supports the multi-filter hub pattern from PopoverTest.jsx including:
 * - Quick search input
 * - Filter category list with badges for active filters
 * - Category interaction handling
 * - Reset all and apply actions
 * - Touch-friendly interface
 *
 * @param {Object} props - Component props
 * @param {string} [props.title] - Popover title
 * @param {Array} props.categories - Filter categories with count badges
 * @param {Object} [props.quickSearch] - State binding for quick search
 * @param {string} [props.searchPlaceholder] - Search input placeholder
 * @param {Array} [props.actions] - Actions to show (resetAll, apply)
 * @param {Function} [props.onCategoryClick] - Handler for category selection
 * @param {Function} props.onClose - Callback to close popover
 */
const FilterHubContent = React.memo(
    ({
        title = 'Filter Media',
        categories = [],
        quickSearch,
        searchPlaceholder = 'Quick search...',
        actions = ['resetAll', 'apply'],
        onCategoryClick,
        onClose,
    }) => {
        // Local search state if not provided by schema
        const [localSearchQuery, setLocalSearchQuery] = useState('');

        // Use provided search state binding or fall back to local state
        const searchQuery = quickSearch?.value ?? localSearchQuery;
        const setSearchQuery = quickSearch?.setValue ?? setLocalSearchQuery;

        // Calculate total active filters
        const totalActiveFilters = categories.reduce(
            (sum, category) => sum + (category.count || 0),
            0
        );

        // Handle category click
        const handleCategoryClick = useCallback(
            category => {
                if (onCategoryClick) {
                    onCategoryClick(category);
                }
            },
            [onCategoryClick]
        );

        // Handle reset all
        const handleResetAll = useCallback(() => {
            // In real implementation, would reset all filter states
            // For now, just a placeholder action
            console.log('Reset all filters');
        }, []);

        // Handle apply
        const handleApply = useCallback(() => {
            onClose();
        }, [onClose]);

        return (
            <>
                <div className="popover__title">{title}</div>
                <div className="popover__content">
                    {/* Quick Search */}
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
                                minHeight: '44px', // Touch target compliance
                            }}
                        />
                    </div>

                    {/* Filter Categories */}
                    <div style={{ marginBottom: 'var(--space-4)' }}>
                        <h4
                            style={{
                                fontSize: 'var(--font-size-1)',
                                fontWeight: '600',
                                marginBottom: 'var(--space-2)',
                                color: 'var(--text-primary)',
                            }}
                        >
                            Filter Categories
                        </h4>

                        <div style={{ display: 'grid', gap: 'var(--space-2)' }}>
                            {categories.length === 0 ? (
                                <div
                                    style={{
                                        padding: 'var(--space-4)',
                                        textAlign: 'center',
                                        color: 'var(--text-secondary)',
                                        fontSize: 'var(--font-size-1)',
                                    }}
                                >
                                    No filter categories available
                                </div>
                            ) : (
                                categories.map(category => (
                                    <button
                                        key={category.key}
                                        className="popover__list-item"
                                        onClick={() => handleCategoryClick(category)}
                                        style={{
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center',
                                            width: '100%',
                                            textAlign: 'left',
                                            padding: 'var(--space-3)',
                                            border: '1px solid var(--divider)',
                                            borderRadius: 'var(--radius-1)',
                                            backgroundColor:
                                                category.count > 0
                                                    ? 'var(--primary-10)'
                                                    : 'var(--surface)',
                                            cursor: 'pointer',
                                            transition: 'all 0.2s ease',
                                            minHeight: '44px', // Touch target compliance
                                            borderLeftWidth: category.count > 0 ? '3px' : '1px',
                                            borderLeftColor:
                                                category.count > 0
                                                    ? 'var(--primary)'
                                                    : 'var(--divider)',
                                        }}
                                        onMouseEnter={e => {
                                            e.target.style.backgroundColor =
                                                category.count > 0
                                                    ? 'var(--primary-20)'
                                                    : 'var(--surface-alt)';
                                        }}
                                        onMouseLeave={e => {
                                            e.target.style.backgroundColor =
                                                category.count > 0
                                                    ? 'var(--primary-10)'
                                                    : 'var(--surface)';
                                        }}
                                    >
                                        <span
                                            style={{
                                                fontSize: 'var(--font-size-1)',
                                                fontWeight: category.count > 0 ? '500' : '400',
                                                color:
                                                    category.count > 0
                                                        ? 'var(--primary)'
                                                        : 'var(--text-primary)',
                                            }}
                                        >
                                            {category.label}
                                        </span>

                                        {category.count > 0 && (
                                            <span
                                                style={{
                                                    background: 'var(--primary)',
                                                    color: 'white',
                                                    padding: 'var(--space-1) var(--space-2)',
                                                    borderRadius: 'var(--radius-full)',
                                                    fontSize: 'var(--font-size-0)',
                                                    fontWeight: '500',
                                                    minWidth: '20px',
                                                    textAlign: 'center',
                                                }}
                                            >
                                                {category.count}
                                            </span>
                                        )}
                                    </button>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Filter Summary */}
                    {totalActiveFilters > 0 && (
                        <div
                            style={{
                                padding: 'var(--space-3)',
                                background: 'var(--surface-alt)',
                                borderRadius: 'var(--radius-2)',
                                marginBottom: 'var(--space-4)',
                                border: '1px solid var(--divider)',
                            }}
                        >
                            <div
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                }}
                            >
                                <span
                                    style={{
                                        fontSize: 'var(--font-size-1)',
                                        color: 'var(--text-primary)',
                                        fontWeight: '500',
                                    }}
                                >
                                    Active Filters
                                </span>
                                <span
                                    style={{
                                        background: 'var(--primary)',
                                        color: 'white',
                                        padding: 'var(--space-1) var(--space-3)',
                                        borderRadius: 'var(--radius-full)',
                                        fontSize: 'var(--font-size-1)',
                                        fontWeight: '600',
                                    }}
                                >
                                    {totalActiveFilters}
                                </span>
                            </div>

                            {/* Individual category counts */}
                            <div
                                style={{
                                    marginTop: 'var(--space-2)',
                                    display: 'flex',
                                    flexWrap: 'wrap',
                                    gap: 'var(--space-2)',
                                }}
                            >
                                {categories
                                    .filter(cat => cat.count > 0)
                                    .map(cat => (
                                        <span
                                            key={cat.key}
                                            style={{
                                                fontSize: 'var(--font-size-0)',
                                                color: 'var(--text-secondary)',
                                                background: 'var(--surface)',
                                                padding: 'var(--space-1) var(--space-2)',
                                                borderRadius: 'var(--radius-1)',
                                                border: '1px solid var(--divider)',
                                            }}
                                        >
                                            {cat.label}: {cat.count}
                                        </span>
                                    ))}
                            </div>
                        </div>
                    )}

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
                        {/* Reset All action */}
                        {actions.includes('resetAll') && (
                            <button
                                className="btn btn-sm btn-secondary"
                                onClick={handleResetAll}
                                disabled={totalActiveFilters === 0}
                                style={{
                                    opacity: totalActiveFilters === 0 ? '0.5' : '1',
                                    cursor: totalActiveFilters === 0 ? 'not-allowed' : 'pointer',
                                    minHeight: '44px',
                                }}
                            >
                                Reset All
                            </button>
                        )}

                        {/* Spacer if no reset action */}
                        {!actions.includes('resetAll') && <div />}

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
                                Apply Filters
                                {totalActiveFilters > 0 && (
                                    <span
                                        style={{
                                            background: 'rgba(255, 255, 255, 0.2)',
                                            padding: 'var(--space-1) var(--space-2)',
                                            borderRadius: 'var(--radius-full)',
                                            fontSize: 'var(--font-size-0)',
                                            fontWeight: '600',
                                        }}
                                    >
                                        {totalActiveFilters}
                                    </span>
                                )}
                            </button>
                        )}
                    </div>

                    {/* Help text */}
                    {categories.length > 0 && totalActiveFilters === 0 && (
                        <div
                            style={{
                                marginTop: 'var(--space-3)',
                                padding: 'var(--space-2)',
                                color: 'var(--text-secondary)',
                                fontSize: 'var(--font-size-0)',
                                textAlign: 'center',
                                fontStyle: 'italic',
                            }}
                        >
                            Click on a category to configure filters
                        </div>
                    )}
                </div>
            </>
        );
    }
);

FilterHubContent.propTypes = {
    title: PropTypes.string,
    categories: PropTypes.arrayOf(
        PropTypes.shape({
            key: PropTypes.string.isRequired,
            label: PropTypes.string.isRequired,
            count: PropTypes.number,
        })
    ).isRequired,
    quickSearch: PropTypes.shape({
        value: PropTypes.string,
        setValue: PropTypes.func,
    }),
    searchPlaceholder: PropTypes.string,
    actions: PropTypes.arrayOf(PropTypes.oneOf(['resetAll', 'apply'])),
    onCategoryClick: PropTypes.func,
    onClose: PropTypes.func.isRequired,
};

FilterHubContent.displayName = 'FilterHubContent';

export default FilterHubContent;

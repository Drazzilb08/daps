import React, { useCallback } from 'react';
import PropTypes from 'prop-types';

/**
 * ListContent - Generic list renderer for popover content
 *
 * Supports the list patterns from PopoverTest.jsx including:
 * - Selector lists with selection state
 * - Action lists with danger states
 * - Icons and visual indicators
 * - Touch-friendly interactions
 *
 * @param {Object} props - Component props
 * @param {string} [props.title] - List title
 * @param {Array} props.items - List items
 * @param {string} [props.type] - List type ('selector' | 'actions')
 * @param {string} [props.selected] - Currently selected item key (for selector type)
 * @param {Function} [props.onItemClick] - Item click handler
 * @param {Function} props.onClose - Callback to close popover
 */
const ListContent = React.memo(
    ({
        title,
        items = [],
        type = 'selector', // deprecated, use listType
        listType, // preferred prop name
        selected,
        onItemClick,
        onClose,
    }) => {
        // Support both type and listType props for backward compatibility
        const currentType = listType || type;
        // Handle item click
        const handleItemClick = useCallback(
            (item, index) => {
                if (onItemClick) {
                    const result = onItemClick(item, index);

                    // For selector type, close after selection unless explicitly prevented
                    if (currentType === 'selector' && result !== false) {
                        onClose();
                    }

                    // For actions type, close after action unless explicitly prevented
                    if (currentType === 'actions' && result !== false) {
                        onClose();
                    }
                }
            },
            [onItemClick, onClose, currentType]
        );

        // Render item icon
        const renderIcon = iconName => {
            if (!iconName) return null;

            // Simple icon mapping - in real app would use proper icon component
            const iconMap = {
                'mi:star': '⭐',
                'mi:favorite': '❤️',
                'mi:bookmark': '🔖',
                'mi:edit': '✏️',
                'mi:content_copy': '📋',
                'mi:delete': '🗑️',
            };

            return (
                <span style={{ marginRight: 'var(--space-2)', fontSize: 'var(--font-size-2)' }}>
                    {iconMap[iconName] || iconName}
                </span>
            );
        };

        return (
            <>
                {title && <div className="popover__title">{title}</div>}

                {items.length === 0 ? (
                    <div className="popover__content">
                        <div
                            style={{
                                padding: 'var(--space-4)',
                                textAlign: 'center',
                                color: 'var(--text-secondary)',
                                fontSize: 'var(--font-size-1)',
                            }}
                        >
                            No items available
                        </div>
                    </div>
                ) : (
                    <ul className="popover__list">
                        {items.map((item, index) => {
                            const isSelected = currentType === 'selector' && selected === item.key;
                            const isDanger = currentType === 'actions' && item.danger;

                            return (
                                <li key={item.key || index}>
                                    <button
                                        className={`popover__list-item${
                                            isSelected ? ' popover__list-item--selected' : ''
                                        }${isDanger ? ' danger' : ''}`}
                                        onClick={() => handleItemClick(item, index)}
                                        disabled={item.disabled}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            width: '100%',
                                            padding: 'var(--space-3)',
                                            border: 'none',
                                            background: isSelected
                                                ? 'var(--primary-10)'
                                                : 'transparent',
                                            color: isDanger
                                                ? 'var(--error)'
                                                : isSelected
                                                  ? 'var(--primary)'
                                                  : 'var(--text-primary)',
                                            textAlign: 'left',
                                            borderRadius: 'var(--radius-1)',
                                            cursor: item.disabled ? 'not-allowed' : 'pointer',
                                            fontSize: 'var(--font-size-1)',
                                            fontWeight: isSelected ? '500' : '400',
                                            minHeight: '44px', // Touch target compliance
                                            transition: 'all 0.2s ease',
                                            opacity: item.disabled ? '0.5' : '1',
                                        }}
                                        onMouseEnter={e => {
                                            if (!item.disabled) {
                                                e.target.style.backgroundColor = isSelected
                                                    ? 'var(--primary-20)'
                                                    : isDanger
                                                      ? 'var(--error-10)'
                                                      : 'var(--surface-alt)';
                                            }
                                        }}
                                        onMouseLeave={e => {
                                            if (!item.disabled) {
                                                e.target.style.backgroundColor = isSelected
                                                    ? 'var(--primary-10)'
                                                    : 'transparent';
                                            }
                                        }}
                                    >
                                        {/* Item icon */}
                                        {renderIcon(item.icon)}

                                        {/* Item label */}
                                        <span style={{ flex: 1 }}>{item.label}</span>

                                        {/* Item badge/count */}
                                        {item.badge && (
                                            <span
                                                style={{
                                                    background: item.badgeColor || 'var(--primary)',
                                                    color: 'white',
                                                    padding: 'var(--space-1) var(--space-2)',
                                                    borderRadius: 'var(--radius-full)',
                                                    fontSize: 'var(--font-size-0)',
                                                    fontWeight: '500',
                                                    marginLeft: 'var(--space-2)',
                                                }}
                                            >
                                                {item.badge}
                                            </span>
                                        )}

                                        {/* Selection indicator */}
                                        {currentType === 'selector' && isSelected && (
                                            <span
                                                style={{
                                                    marginLeft: 'var(--space-2)',
                                                    color: 'var(--primary)',
                                                    fontWeight: '600',
                                                }}
                                            >
                                                ✓
                                            </span>
                                        )}
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </>
        );
    }
);

ListContent.propTypes = {
    title: PropTypes.string,
    items: PropTypes.arrayOf(
        PropTypes.shape({
            key: PropTypes.string,
            label: PropTypes.string.isRequired,
            icon: PropTypes.string,
            badge: PropTypes.oneOfType([PropTypes.string, PropTypes.number]),
            badgeColor: PropTypes.string,
            danger: PropTypes.bool,
            disabled: PropTypes.bool,
        })
    ).isRequired,
    type: PropTypes.oneOf(['selector', 'actions']),
    selected: PropTypes.string,
    onItemClick: PropTypes.func,
    onClose: PropTypes.func.isRequired,
};

ListContent.displayName = 'ListContent';

export default ListContent;

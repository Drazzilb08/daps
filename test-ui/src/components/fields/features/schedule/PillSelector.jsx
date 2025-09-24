import React from 'react';

/**
 * Generic pill selection component for schedule types and other options
 * @param {Array} options - Array of {type, label} objects
 * @param {string} selectedType - Currently selected option type
 * @param {Function} onTypeChange - Callback when selection changes
 * @param {boolean} disabled - Whether the selector is disabled
 * @param {string} className - Additional CSS classes
 */
export const PillSelector = React.memo(({
    options = [],
    selectedType,
    onTypeChange,
    disabled = false,
    className = ''
}) => {
    return (
        <div className={`flex flex-wrap gap-2 mb-4 ${className}`}>
            {options.map(option => (
                <button
                    key={option.type}
                    type="button"
                    onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        if (!disabled) {
                            onTypeChange(option.type);
                        }
                    }}
                    disabled={disabled}
                    className={`
                        px-3 py-1 text-sm font-medium rounded transition-colors min-h-8
                        ${disabled
                            ? 'opacity-50 cursor-not-allowed'
                            : 'cursor-pointer'
                        }
                        ${selectedType === option.type
                            ? 'bg-primary text-primary-text border border-primary shadow-sm'
                            : 'bg-surface text-text-primary border border-border hover:bg-primary hover:border-border-light'
                        }
                    `}
                >
                    {option.label}
                </button>
            ))}
        </div>
    );
});

PillSelector.displayName = 'PillSelector';

export default PillSelector;
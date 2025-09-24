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
                    onClick={() => !disabled && onTypeChange(option.type)}
                    disabled={disabled}
                    className={`
                        px-4 py-2 text-sm font-medium rounded-full transition-colors min-h-11
                        ${disabled
                            ? 'opacity-50 cursor-not-allowed'
                            : 'cursor-pointer'
                        }
                        ${selectedType === option.type
                            ? 'bg-blue-600 text-white'
                            : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
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
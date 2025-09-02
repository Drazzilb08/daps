import React from 'react';

export const TagMultiSelectField = React.memo(function TagMultiSelectField({
    field,
    value = [],
    onChange,
    highlightInvalid = false,
    errorMessage = null,
    // Additional props for multiselect
    availableOptions = [], // Array of available tags/labels to select from
    selectAllText = 'Select All',
    selectNoneText = 'Select None',
}) {
    // Ensure value is always an array
    const selectedItems = Array.isArray(value) ? value : [];

    const handleItemToggle = item => {
        const isSelected = selectedItems.includes(item);

        if (isSelected) {
            // Remove item
            const newSelection = selectedItems.filter(selected => selected !== item);
            onChange(newSelection);
        } else {
            // Add item
            const newSelection = [...selectedItems, item];
            onChange(newSelection);
        }
    };

    const handleSelectAll = () => {
        onChange([...availableOptions]);
    };

    const handleSelectNone = () => {
        onChange([]);
    };

    const isAllSelected =
        availableOptions.length > 0 && selectedItems.length === availableOptions.length;
    const isSomeSelected = selectedItems.length > 0;

    return (
        <div className={`settings-field-row${highlightInvalid ? ' field-error' : ''}`}>
            <div className="settings-field-labelcol">
                <label>{field.label}</label>
            </div>
            <div className="settings-field-inputwrap">
                <div className="tag-multiselect-container">
                    {/* Select All/None Controls */}
                    {availableOptions.length > 1 && (
                        <div className="tag-multiselect-controls">
                            <button
                                type="button"
                                className="btn btn-sm btn-secondary"
                                onClick={handleSelectAll}
                                disabled={isAllSelected}
                            >
                                {selectAllText}
                            </button>
                            <button
                                type="button"
                                className="btn btn-sm btn-secondary"
                                onClick={handleSelectNone}
                                disabled={!isSomeSelected}
                            >
                                {selectNoneText}
                            </button>
                        </div>
                    )}

                    {/* Checkbox List */}
                    <div className="tag-multiselect-list">
                        {availableOptions.length > 0 ? (
                            availableOptions.map((option, index) => (
                                <label key={index} className="checkbox-row tag-multiselect-item">
                                    <input
                                        type="checkbox"
                                        id={`${field.key}-${index}`}
                                        checked={selectedItems.includes(option)}
                                        onChange={() => handleItemToggle(option)}
                                    />
                                    <span className="checkbox-label">
                                        {option}
                                    </span>
                                </label>
                            ))
                        ) : (
                            <div className="tag-multiselect-empty">
                                {field.emptyText || 'No options available'}
                            </div>
                        )}
                    </div>

                    {/* Selection Summary */}
                    {availableOptions.length > 0 && (
                        <div className="tag-multiselect-summary">
                            {selectedItems.length} of {availableOptions.length} selected
                        </div>
                    )}
                </div>

                {field.description && <div className="field-help-text">{field.description}</div>}
                {errorMessage && <div className="field-error-text">{errorMessage}</div>}
            </div>
        </div>
    );
});

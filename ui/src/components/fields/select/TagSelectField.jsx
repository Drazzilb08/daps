import React, { useState, useEffect, useRef, useMemo } from 'react';

export const TagSelectField = React.memo(function TagSelectField({
    field,
    value = [],
    onChange,
    highlightInvalid = false,
    errorMessage = null,
    // Additional props for tag field
    availableTags = [], // Pre-defined available tags
}) {
    const [currentInput, setCurrentInput] = useState('');
    const [showSuggestions, setShowSuggestions] = useState(false);
    // Remove filteredTags state - we'll compute this with useMemo instead
    const inputRef = useRef();
    const suggestionsRef = useRef();

    // Ensure value is always an array
    const selectedTags = useMemo(() => (Array.isArray(value) ? value : []), [value]);

    // Extract properties from field object
    const allowCustom = field.allowAdd !== false; // Default to true unless explicitly false
    const allowRemove = field.allowRemove !== false; // Default to true unless explicitly false
    const placeholder = field.placeholder || 'Add tags...';

    // Debug logging
    console.log('TagSelectField render:', {
        fieldKey: field.key,
        value,
        selectedTags,
    });

    // Convert availableTags to consistent format if they're simple strings
    const normalizedAvailableTags = useMemo(() => {
        return availableTags.map(tag => (typeof tag === 'string' ? { id: tag, label: tag } : tag));
    }, [availableTags]);

    // Filter available tags based on current input (using useMemo to prevent infinite loops)
    const filteredTags = useMemo(() => {
        if (!currentInput.trim()) {
            return [];
        }

        const query = currentInput.toLowerCase();
        return normalizedAvailableTags
            .filter(tag => {
                const matchesQuery = tag.label.toLowerCase().includes(query);
                const notSelected = !selectedTags.includes(tag.label);
                return matchesQuery && notSelected;
            })
            .slice(0, 10); // Limit to 10 suggestions
    }, [currentInput, normalizedAvailableTags, selectedTags]);

    // Handle clicking outside to close suggestions
    useEffect(() => {
        const handleClickOutside = event => {
            if (
                suggestionsRef.current &&
                !suggestionsRef.current.contains(event.target) &&
                inputRef.current &&
                !inputRef.current.contains(event.target)
            ) {
                setShowSuggestions(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const addTag = tagLabel => {
        if (!tagLabel || selectedTags.includes(tagLabel)) return;

        const newTags = [...selectedTags, tagLabel];
        onChange(newTags);
        setCurrentInput('');
        setShowSuggestions(false);

        // Focus back to input for continued typing
        setTimeout(() => inputRef.current?.focus(), 0);
    };

    const removeTag = tagToRemove => {
        const newTags = selectedTags.filter(tag => tag !== tagToRemove);
        onChange(newTags);
    };

    const handleInputChange = e => {
        const value = e.target.value;
        setCurrentInput(value);
        setShowSuggestions(value.trim().length > 0);
    };

    const handleInputKeyDown = e => {
        if (e.key === 'Enter') {
            e.preventDefault();

            if (filteredTags.length > 0) {
                // Add first suggestion
                addTag(filteredTags[0].label);
            } else if (allowCustom && currentInput.trim()) {
                // Add custom tag
                addTag(currentInput.trim());
            }
        } else if (e.key === 'Escape') {
            setShowSuggestions(false);
            setCurrentInput('');
        } else if (e.key === 'Backspace' && !currentInput && selectedTags.length > 0) {
            // Remove last tag if backspace on empty input
            removeTag(selectedTags[selectedTags.length - 1]);
        }
    };

    const handleSuggestionClick = tag => {
        addTag(tag.label);
    };

    return (
        <div className={`settings-field-row${highlightInvalid ? ' field-error' : ''}`}>
            <div className="settings-field-labelcol">
                <label htmlFor={field.key}>{field.label}</label>
            </div>
            <div className="settings-field-inputwrap">
                <div className="tag-select-container">
                    {/* Selected Tags Display */}
                    <div className="tag-select-tags">
                        {selectedTags.map((tag, index) => (
                            <span key={index} className="tag-select-tag">
                                {tag}
                                {allowRemove && (
                                    <button
                                        type="button"
                                        className="tag-select-remove"
                                        onClick={e => {
                                            e.preventDefault();
                                            e.stopPropagation();
                                            removeTag(tag);
                                        }}
                                        aria-label={`Remove ${tag} tag`}
                                        style={{ pointerEvents: 'auto', zIndex: 1000 }}
                                    >
                                        ×
                                    </button>
                                )}
                            </span>
                        ))}

                        {/* Input for adding new tags */}
                        {allowCustom && (
                            <input
                                ref={inputRef}
                                type="text"
                                className={`tag-select-input${highlightInvalid ? ' input-error' : ''}`}
                                placeholder={selectedTags.length === 0 ? placeholder : ''}
                                value={currentInput}
                                onChange={handleInputChange}
                                onKeyDown={handleInputKeyDown}
                                onFocus={() => currentInput.trim() && setShowSuggestions(true)}
                            />
                        )}
                    </div>

                    {/* Suggestions dropdown */}
                    {allowCustom && showSuggestions && filteredTags.length > 0 && (
                        <div ref={suggestionsRef} className="tag-select-suggestions">
                            {filteredTags.map(tag => (
                                <div
                                    key={tag.id}
                                    className="tag-select-suggestion"
                                    onClick={() => handleSuggestionClick(tag)}
                                >
                                    {tag.label}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* No suggestions available but allow custom */}
                    {allowCustom &&
                        showSuggestions &&
                        filteredTags.length === 0 &&
                        currentInput.trim().length >= 2 && (
                            <div className="tag-select-suggestions">
                                <div
                                    className="tag-select-suggestion tag-select-custom"
                                    onClick={() => addTag(currentInput.trim())}
                                >
                                    Add &quot;{currentInput.trim()}&quot; as new tag
                                </div>
                            </div>
                        )}
                </div>

                {field.description && <div className="field-help-text">{field.description}</div>}
                {errorMessage && <div className="field-error-text">{errorMessage}</div>}
            </div>
        </div>
    );
});

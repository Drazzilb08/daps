import React from 'react';

export const TagDisplayField = React.memo(function TagDisplayField({
    field,
    value = [],
    // No onChange needed - this is read-only
}) {
    // Ensure value is always an array
    const tags = Array.isArray(value) ? value : [];

    return (
        <div className="settings-field-row">
            <div className="settings-field-labelcol">
                <label>{field.label}</label>
            </div>
            <div className="settings-field-inputwrap">
                <div className="tag-display-container">
                    {tags.length > 0 ? (
                        <div className="tag-display-tags">
                            {tags.map((tag, index) => (
                                <span key={index} className="tag-display-badge">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    ) : (
                        <div className="tag-display-empty">{field.emptyText || 'No tags'}</div>
                    )}
                </div>
                {field.description && <div className="field-help-text">{field.description}</div>}
            </div>
        </div>
    );
});

import React from 'react';

/**
 * MediaInfoField - Display media information in a structured format
 * for the tag management modal
 */
export const MediaInfoField = React.memo(function MediaInfoField({
    field,
    value = {},
    // rootConfig, // Available for future configuration enhancements
}) {
    // For display fields, the data might be in field.value instead of the value prop
    const mediaData = field.value || value;

    // Define configurable media info fields with fallbacks
    const defaultFields = [
        { key: 'title', label: 'Title', required: true },
        { key: 'year', label: 'Year', required: true },
        { key: 'type', label: 'Type', required: true },
        { key: 'status', label: 'Status', required: false },
    ];

    // Use field configuration if provided, otherwise use defaults
    const configuredFields = field.fields || defaultFields;

    const mediaInfo = configuredFields
        .map(fieldConfig => ({
            label: fieldConfig.label,
            value: mediaData[fieldConfig.key] || (fieldConfig.required ? 'Unknown' : ''),
            show: fieldConfig.required || mediaData[fieldConfig.key], // Only show optional fields if they have a value
        }))
        .filter(item => item.show && item.value); // Filter out empty optional fields

    // Only show instances if there are multiple
    if (mediaData.instances && mediaData.instances.length > 1) {
        mediaInfo.push({
            label: 'Instances',
            value: mediaData.instances.join(', '),
        });
    }

    return (
        <div className="media-info-container">
            {field.label && <div className="field-group-title">{field.label}</div>}
            <div className="media-info-content">
                {mediaInfo.map((item, index) => (
                    <div key={index} className="media-info-item">
                        <span className="media-info-label">{item.label}:</span>
                        <span className="media-info-value">{item.value}</span>
                    </div>
                ))}
            </div>
            {field.description && <div className="field-help-text">{field.description}</div>}
        </div>
    );
});

export default MediaInfoField;

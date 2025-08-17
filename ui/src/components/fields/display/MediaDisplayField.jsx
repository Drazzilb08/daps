import React from 'react';

/**
 * MediaDisplayField - Comprehensive media information display with poster
 * Standard component for MediaSearch modals - left column layout
 */
export const MediaDisplayField = React.memo(function MediaDisplayField({
    field,
    value = {},
    // rootConfig, // Available for future configuration enhancements
}) {
    // For display fields, the data might be in field.value instead of the value prop
    const mediaData = field.value || value;

    // Get poster URL with fallback
    const posterUrl = mediaData.posterUrl || mediaData.imageUrl || null;

    // Media Information Section
    const mediaInfo = [
        { label: 'Title', value: mediaData.title, required: true },
        { label: 'Year', value: mediaData.year, required: true },
        { label: 'Type', value: mediaData.type, required: true },
    ];

    // File Information Section (with placeholders for future data)
    const fileInfo = [
        { label: 'Quality', value: mediaData.quality || 'Unknown', required: false },
        { label: 'Size', value: mediaData.size || 'Unknown', required: false },
        { label: 'Path', value: mediaData.path || 'Unknown', required: false },
        { label: 'Added', value: mediaData.added || 'Unknown', required: false },
        { label: 'Status', value: mediaData.status || 'Downloaded', required: false },
    ];

    // ARR Instance Info
    const arrInfo = [
        {
            label: 'Instances',
            value: mediaData.instances?.join(', ') || 'Unknown',
            required: false,
        },
    ];

    const renderInfoSection = (title, items) => (
        <div className="media-display-section">
            <div className="media-display-section-title">{title}</div>
            <div className="media-display-section-content">
                {items.map((item, index) =>
                    item.value && item.value !== 'Unknown' ? (
                        <div key={index} className="media-display-item">
                            <span className="media-display-label">{item.label}:</span>
                            <span className="media-display-value">{item.value}</span>
                        </div>
                    ) : item.required ? (
                        <div key={index} className="media-display-item">
                            <span className="media-display-label">{item.label}:</span>
                            <span className="media-display-value media-display-unknown">
                                Unknown
                            </span>
                        </div>
                    ) : null
                )}
            </div>
        </div>
    );

    return (
        <div className="media-display-container">
            {/* Poster Section */}
            <div className="media-display-poster-section">
                <div className="media-display-poster">
                    {posterUrl ? (
                        <img
                            src={posterUrl}
                            alt={`${mediaData.title || 'Media'} poster`}
                            className="media-display-poster-image"
                            onError={e => {
                                e.target.style.display = 'none';
                                e.target.nextSibling.style.display = 'flex';
                            }}
                        />
                    ) : null}
                    <div
                        className="media-display-poster-placeholder"
                        style={{ display: posterUrl ? 'none' : 'flex' }}
                    >
                        <div className="media-display-poster-icon">📽️</div>
                        <div className="media-display-poster-text">No Poster</div>
                    </div>
                </div>
            </div>

            {/* Information Sections */}
            <div className="media-display-info">
                {renderInfoSection('Media Information', mediaInfo)}
                {renderInfoSection('File Information', fileInfo)}
                {renderInfoSection('ARR Information', arrInfo)}
            </div>

            {field.description && <div className="field-help-text">{field.description}</div>}
        </div>
    );
});

export default MediaDisplayField;

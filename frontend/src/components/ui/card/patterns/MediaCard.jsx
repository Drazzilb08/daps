import React from 'react';
import PropTypes from 'prop-types';
import { Card } from '../Card';
import { IconButton } from '../../button/IconButton';

/**
 * MediaCard - Preset card pattern for media items
 *
 * Common pattern: Image + Title + Metadata + Actions
 *
 * @param {Object} props - Component props
 * @param {string} props.image - Image source URL
 * @param {string} props.title - Card title
 * @param {string} props.subtitle - Optional subtitle
 * @param {string} props.metadata - Metadata text (year, rating, etc.)
 * @param {Function} props.onClick - Card click handler
 * @param {Function} props.onMoreClick - More options click handler
 * @param {boolean} props.selected - Selected state
 * @returns {JSX.Element}
 */
export const MediaCard = React.memo(
    ({
        image,
        title,
        subtitle = null,
        metadata = null,
        onClick,
        onMoreClick,
        selected = false,
    }) => {
        return (
            <Card clickable hoverable onClick={onClick} selected={selected} aria-label={title}>
                <Card.Image src={image} alt={title} aspectRatio="3/2" />
                <Card.Header
                    title={title}
                    subtitle={subtitle}
                    action={
                        onMoreClick && (
                            <IconButton
                                icon="more_vert"
                                variant="ghost"
                                size="small"
                                aria-label="More options"
                                onClick={e => {
                                    e.stopPropagation();
                                    onMoreClick();
                                }}
                            />
                        )
                    }
                />
                {metadata && (
                    <Card.Body>
                        <p className="text-secondary text-sm">{metadata}</p>
                    </Card.Body>
                )}
            </Card>
        );
    }
);

MediaCard.displayName = 'MediaCard';

MediaCard.propTypes = {
    image: PropTypes.string.isRequired,
    title: PropTypes.string.isRequired,
    subtitle: PropTypes.string,
    metadata: PropTypes.string,
    onClick: PropTypes.func,
    onMoreClick: PropTypes.func,
    selected: PropTypes.bool,
};

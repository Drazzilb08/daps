import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';

/**
 * CardImage - Card image primitive
 *
 * Responsibilities:
 * - Card image display
 * - Aspect ratio control
 * - Loading state
 * - Error state
 * - Alt text for accessibility
 * - Object-fit control
 *
 * @param {Object} props - Component props
 * @param {string} props.src - Image source URL
 * @param {string} props.alt - Alt text for accessibility
 * @param {string} props.aspectRatio - Aspect ratio (16/9, 4/3, 1/1, 3/2)
 * @param {string} props.objectFit - CSS object-fit value
 * @param {string} props.className - Additional CSS classes
 * @returns {JSX.Element}
 */
export const CardImage = React.memo(
    ({ src, alt, aspectRatio = '16/9', objectFit = 'cover', className = '' }) => {
        const [isLoading, setIsLoading] = useState(true);
        const [hasError, setHasError] = useState(false);

        const handleLoad = useCallback(() => {
            setIsLoading(false);
        }, []);

        const handleError = useCallback(() => {
            setIsLoading(false);
            setHasError(true);
        }, []);

        // Map aspect ratio to utility class (sizing.css)
        const aspectRatioMap = {
            '16/9': 'aspect-video', // Built-in CSS aspect-ratio
            '4/3': 'aspect-4/3',
            '1/1': 'aspect-square',
            '3/2': 'aspect-3/2',
        };

        // Map object-fit to utility class (images.css)
        const objectFitMap = {
            cover: 'object-cover',
            contain: 'object-contain',
            fill: 'object-fill',
            none: 'object-none',
        };

        const containerClasses = [
            'relative w-full overflow-hidden bg-surface-alt',
            aspectRatioMap[aspectRatio],
            isLoading && 'img-loading',
            className,
        ]
            .filter(Boolean)
            .join(' ');

        const imgClasses = ['w-full h-full block', objectFitMap[objectFit]].join(' ');

        return (
            <div className={containerClasses}>
                {!hasError ? (
                    <img
                        src={src}
                        alt={alt}
                        onLoad={handleLoad}
                        onError={handleError}
                        className={imgClasses}
                    />
                ) : (
                    <div className="flex flex-col items-center justify-center h-full gap-2 text-secondary text-sm">
                        <span className="material-symbols-outlined text-2xl">broken_image</span>
                        <span>Failed to load image</span>
                    </div>
                )}
            </div>
        );
    }
);

CardImage.displayName = 'CardImage';

CardImage.propTypes = {
    src: PropTypes.string.isRequired,
    alt: PropTypes.string.isRequired,
    aspectRatio: PropTypes.oneOf(['16/9', '4/3', '1/1', '3/2']),
    objectFit: PropTypes.oneOf(['cover', 'contain', 'fill', 'none']),
    className: PropTypes.string,
};

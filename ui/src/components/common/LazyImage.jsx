// src/components/common/LazyImage.jsx

import React, { useState, useRef, useEffect } from 'react';

/**
 * Optimized lazy loading image component with intersection observer
 * and placeholder states for DAPS poster previews
 */
export default function LazyImage({
    src,
    alt = '',
    className = '',
    placeholder = null,
    onLoad = null,
    onError = null,
    threshold = 0.1,
    rootMargin = '50px',
    fallbackSrc, // Extract to prevent DOM attribute warning
    ...props
}) {
    const [isLoaded, setIsLoaded] = useState(false);
    const [isInView, setIsInView] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [currentSrc, setCurrentSrc] = useState(src);
    const [triedFallback, setTriedFallback] = useState(false);
    const imgRef = useRef(null);
    const observerRef = useRef(null);

    // Reset state when src changes
    useEffect(() => {
        setCurrentSrc(src);
        setTriedFallback(false);
        setHasError(false);
        setIsLoaded(false);
    }, [src]);

    useEffect(() => {
        const img = imgRef.current;
        if (!img || !currentSrc) return;

        // Create intersection observer for lazy loading
        observerRef.current = new IntersectionObserver(
            entries => {
                const [entry] = entries;
                if (entry.isIntersecting) {
                    setIsInView(true);
                    observerRef.current?.unobserve(img);
                }
            },
            { threshold, rootMargin }
        );

        observerRef.current.observe(img);

        return () => {
            observerRef.current?.disconnect();
        };
    }, [currentSrc, threshold, rootMargin]);

    const handleLoad = e => {
        setIsLoaded(true);
        setHasError(false);
        onLoad?.(e);
    };

    const handleError = e => {
        // Try fallback if available and not already tried
        if (fallbackSrc && !triedFallback) {
            setTriedFallback(true);
            setCurrentSrc(fallbackSrc);
            setIsLoaded(false);
            return;
        }

        // Show error if no fallback or fallback also failed
        setHasError(true);
        setIsLoaded(false);
        onError?.(e);
    };

    // For modal poster images, apply container styles properly
    const isModalPoster = className.includes('modal-poster-img');

    if (isModalPoster) {
        return (
            <div ref={imgRef} className={`${className} lazy-image-container`}>
                {/* Placeholder while not in view or loading */}
                {(!isInView || (!isLoaded && !hasError)) && (
                    <div className="lazy-image-placeholder">
                        {placeholder || (
                            <div className="lazy-image-skeleton">
                                <div className="lazy-image-skeleton-shimmer" />
                            </div>
                        )}
                    </div>
                )}

                {/* Error state */}
                {hasError && (
                    <div className="lazy-image-error">
                        <span className="lazy-image-error-icon">🖼️</span>
                        <span className="lazy-image-error-text">Failed to load</span>
                    </div>
                )}

                {/* Actual image */}
                {isInView && currentSrc && !hasError && (
                    <img
                        src={currentSrc}
                        alt={alt}
                        className={`lazy-image ${isLoaded ? 'lazy-image--loaded' : 'lazy-image--loading'}`}
                        onLoad={handleLoad}
                        onError={handleError}
                        loading="lazy"
                        {...props}
                    />
                )}
            </div>
        );
    }

    // Standard implementation for grid items
    return (
        <div ref={imgRef} className={`lazy-image-container ${className}`} {...props}>
            {/* Placeholder while not in view or loading */}
            {(!isInView || (!isLoaded && !hasError)) && (
                <div className="lazy-image-placeholder">
                    {placeholder || (
                        <div className="lazy-image-skeleton">
                            <div className="lazy-image-skeleton-shimmer" />
                        </div>
                    )}
                </div>
            )}

            {/* Error state */}
            {hasError && (
                <div className="lazy-image-error">
                    <span className="lazy-image-error-icon">🖼️</span>
                    <span className="lazy-image-error-text">Failed to load</span>
                </div>
            )}

            {/* Actual image - only load when in view */}
            {isInView && currentSrc && !hasError && (
                <img
                    src={currentSrc}
                    alt={alt}
                    className={`lazy-image ${isLoaded ? 'lazy-image--loaded' : 'lazy-image--loading'}`}
                    onLoad={handleLoad}
                    onError={handleError}
                    loading="lazy"
                />
            )}
        </div>
    );
}

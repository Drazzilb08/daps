/**
 * ColorListPosterField Component
 *
 * Integrated multiple color input field with poster preview functionality.
 * Features direct poster-color picker pairs for improved UX.
 *
 * Architecture:
 * - FieldWrapper provides consistent field structure
 * - Direct poster-color picker integration (no separate ColorArray)
 * - Canvas-based poster border manipulation with immediate visual feedback
 * - Fetches poster list from backend API and applies colors as borders
 * - Mobile-first responsive design with touch-optimized color pickers
 */

import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { FieldLabel, FieldError, FieldDescription } from '../primitives';
import { ColorPicker } from '../features/color/ColorPicker';
import { AddButton, RemoveButton } from '../features/shared';
import { postersAPI } from '../../../utils/api/posters';

// Constants
const BORDER_THICKNESS = 5;

/**
 * Convert hex color to RGB object
 * @param {string} hex - Hex color string
 * @returns {Object} RGB object with r, g, b properties
 */
function hexToRgb(hex) {
    hex = hex.replace(/^#/, '');
    if (hex.length === 3) {
        hex = hex
            .split('')
            .map(x => x + x)
            .join('');
    }
    const num = parseInt(hex, 16);
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

/**
 * Get poster by index with cycling
 * @param {Array} posterAssets - Array of poster file names
 * @param {number} idx - Index
 * @returns {string|null} Poster URL or null
 */
function getPosterByIndex(posterAssets, idx) {
    if (!posterAssets.length) return null;
    // Use the /posters/ URL path served by FastAPI static mount
    return `/posters/${posterAssets[idx % posterAssets.length]}`;
}

/**
 * Generate poster preview with color border using canvas
 * @param {string} imgUrl - Image URL
 * @param {string|null} borderColor - Hex color for border, null to remove border
 * @param {Object} options - Canvas options
 * @returns {Promise<string>} Data URL of processed image
 */
function getPosterPreviewUrl(imgUrl, borderColor, options = {}) {
    return new Promise((resolve, reject) => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d');
        const img = new Image();

        // Important: Set crossOrigin before setting src
        img.crossOrigin = 'anonymous';

        img.onload = function () {
            try {
                const width = options.width || img.width;
                const height = options.height || img.height;
                canvas.width = width;
                canvas.height = height;
                ctx.drawImage(img, 0, 0, width, height);

                // === REMOVE BORDER ===
                if (!borderColor) {
                    // Hardcrop BORDER_THICKNESS px from all sides
                    const cropW = width - BORDER_THICKNESS * 2;
                    const cropH = height - BORDER_THICKNESS * 2;
                    const cropCanvas = document.createElement('canvas');
                    cropCanvas.width = cropW;
                    cropCanvas.height = cropH;
                    const cropCtx = cropCanvas.getContext('2d');
                    cropCtx.drawImage(
                        canvas,
                        BORDER_THICKNESS,
                        BORDER_THICKNESS,
                        cropW,
                        cropH,
                        0,
                        0,
                        cropW,
                        cropH
                    );
                    resolve(cropCanvas.toDataURL());
                    return;
                }

                // === COLORIZE BORDER ===
                // Color the outer BORDER_THICKNESS px on each side
                const imgData = ctx.getImageData(0, 0, width, height);
                const data = imgData.data;
                const rgb = hexToRgb(borderColor);

                for (let y = 0; y < height; ++y) {
                    for (let x = 0; x < width; ++x) {
                        const isBorder =
                            x < BORDER_THICKNESS ||
                            x >= width - BORDER_THICKNESS ||
                            y < BORDER_THICKNESS ||
                            y >= height - BORDER_THICKNESS;
                        if (isBorder) {
                            const i = (y * width + x) * 4;
                            data[i] = rgb.r;
                            data[i + 1] = rgb.g;
                            data[i + 2] = rgb.b;
                        }
                    }
                }
                ctx.putImageData(imgData, 0, 0);
                resolve(canvas.toDataURL());
            } catch (error) {
                console.error('Error processing poster image:', error);
                reject(error);
            }
        };

        img.onerror = function () {
            console.error('Failed to load poster image:', imgUrl);
            reject(new Error(`Failed to load poster image: ${imgUrl}`));
        };

        img.src = imgUrl;
    });
}

/**
 * ColorListPosterField component with integrated poster-color picker pairs
 *
 * Each poster preview has its own color picker directly below/beside it for
 * immediate visual feedback and improved UX. No separate text inputs.
 *
 * @param {Object} props - Component props
 * @param {Object} props.field - Field configuration object
 * @param {string[]|string} props.value - Current field value (array of hex colors or comma-separated string)
 * @param {Function} props.onChange - Value change handler
 * @param {boolean} props.disabled - Field disabled state
 * @param {boolean} props.highlightInvalid - Show validation error state
 * @param {string} props.errorMessage - Error message to display
 */
export const ColorListPosterField = React.memo(
    ({
        field,
        value,
        onChange,
        disabled = false,
        highlightInvalid = false,
        errorMessage = null,
    }) => {
        // Convert value to array format (handle both array and string inputs)
        const colorsArray = useMemo(() => {
            if (!value) return [];
            if (Array.isArray(value)) return value;
            if (typeof value === 'string') {
                return value
                    .split(',')
                    .map(color => color.trim())
                    .filter(Boolean);
            }
            return [];
        }, [value]);

        // State for poster assets and previews
        const [posterAssets, setPosterAssets] = useState([]);
        const [previews, setPreviews] = useState([]);
        const [loadingPreviews, setLoadingPreviews] = useState(false);

        // Handle color list changes with proper output format
        const handleChange = useCallback(
            newColors => {
                // Field configuration determines output format
                const outputFormat = field.output_format || 'array';

                if (outputFormat === 'string' || outputFormat === 'comma_separated') {
                    // Output as comma-separated string
                    onChange(newColors.join(', '));
                } else {
                    // Output as array (default)
                    onChange(newColors);
                }
            },
            [onChange, field.output_format]
        );

        // Handle adding a new color
        const handleAddColor = useCallback(() => {
            const maxColors = field.max_colors || field.maxColors || 10;
            if (colorsArray.length >= maxColors || disabled) return;

            const newColors = [...colorsArray, '#000000'];
            handleChange(newColors);
        }, [colorsArray, field.max_colors, field.maxColors, disabled, handleChange]);

        // Handle removing a color at specific index
        const handleRemoveColor = useCallback(
            index => {
                const minColors = field.min_colors || field.minColors || 0;
                if (colorsArray.length <= minColors || disabled) return;

                const newColors = colorsArray.filter((_, i) => i !== index);
                handleChange(newColors);
            },
            [colorsArray, field.min_colors, field.minColors, disabled, handleChange]
        );

        // Handle changing a color at specific index
        const handleColorChange = useCallback(
            (index, newColor) => {
                const newColors = [...colorsArray];
                newColors[index] = newColor;
                handleChange(newColors);
            },
            [colorsArray, handleChange]
        );

        // Fetch poster file list dynamically
        useEffect(() => {
            let isMounted = true;

            postersAPI
                .fetchPosterFileList()
                .then(files => {
                    if (isMounted) {
                        setPosterAssets(Array.isArray(files) ? files : []);
                    }
                })
                .catch(error => {
                    console.error('Failed to fetch poster files:', error);
                    if (isMounted) {
                        setPosterAssets([]);
                    }
                });

            return () => {
                isMounted = false;
            };
        }, []);

        // Generate previews when colors or posters change
        useEffect(() => {
            let cancelled = false;

            if (!posterAssets.length) {
                return;
            }

            const generatePreviews = async () => {
                setLoadingPreviews(true);
                let newPreviews = [];

                try {
                    if (colorsArray.length && posterAssets.length) {
                        // Generate preview for each color
                        for (let i = 0; i < colorsArray.length; i++) {
                            try {
                                const poster = getPosterByIndex(posterAssets, i);
                                if (!poster) continue;

                                const previewUrl = await getPosterPreviewUrl(
                                    poster,
                                    colorsArray[i] || '#000000',
                                    {
                                        width: 156,
                                        height: 234,
                                    }
                                );

                                if (!cancelled) {
                                    newPreviews[i] = previewUrl;
                                }
                            } catch (error) {
                                console.error(`Failed to create preview for color ${i}:`, error);
                                if (!cancelled) {
                                    newPreviews[i] = null; // Keep slot but mark as failed
                                }
                            }
                        }
                    } else if (posterAssets.length) {
                        // No colors: show preview with no border
                        try {
                            const poster = getPosterByIndex(posterAssets, 0);
                            if (poster) {
                                const previewUrl = await getPosterPreviewUrl(poster, null, {
                                    width: 156,
                                    height: 234,
                                });

                                if (!cancelled) {
                                    newPreviews[0] = previewUrl;
                                }
                            }
                        } catch (error) {
                            console.error('Failed to create no-border preview:', error);
                            if (!cancelled) {
                                newPreviews[0] = null;
                            }
                        }
                    }

                    if (!cancelled) {
                        setPreviews(newPreviews);
                        setLoadingPreviews(false);
                    }
                } catch (error) {
                    console.error('Error generating previews:', error);
                    if (!cancelled) {
                        setPreviews([]);
                        setLoadingPreviews(false);
                    }
                }
            };

            generatePreviews();

            return () => {
                cancelled = true;
            };
        }, [colorsArray, posterAssets]);

        const inputId = `field-${field.key}`;

        // Extract field configuration options
        const maxColors = field.max_colors || field.maxColors || 10;
        const minColors = field.min_colors || field.minColors || 0;
        const label = field.label || 'Poster Colors';

        // Check constraints
        const canAddColor = colorsArray.length < maxColors && !disabled;
        const canRemoveColor = () => colorsArray.length > minColors && !disabled;

        return (
            <div className="flex flex-col gap-4">
                <FieldLabel
                    id={`${inputId}-label`}
                    htmlFor={inputId}
                    label={label}
                    required={field.required}
                />

                {colorsArray.length === 0 ? (
                    // Empty state with add button
                    <div className="flex flex-col items-center gap-4 p-6 bg-surface border border-dashed rounded text-center">
                        <div className="flex flex-col gap-2">
                            <p className="text-base font-medium text-primary m-0">
                                {field.empty_message || 'No poster colors added yet.'}
                            </p>
                            <p className="text-sm text-secondary m-0">
                                {field.empty_secondary_message ||
                                    'Add colors to see poster previews with custom borders.'}
                            </p>
                        </div>
                        <AddButton
                            onClick={handleAddColor}
                            disabled={!canAddColor}
                            text={field.add_button_text || 'Add Color'}
                            itemType="color"
                            disabledReason={`Maximum ${maxColors} colors allowed`}
                            className="min-h-12"
                        />
                    </div>
                ) : (
                    // Compact Grid Layout
                    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-3">
                        {colorsArray.map((color, index) => {
                            const previewUrl = previews[index];

                            return (
                                <div key={index} className="flex flex-col gap-2">
                                    {/* Poster Preview */}
                                    <div className="flex justify-center items-center flex-shrink-0">
                                        {previewUrl ? (
                                            <img
                                                className="w-40 h-60 object-cover rounded border shadow-sm"
                                                src={previewUrl}
                                                width={156}
                                                height={234}
                                                alt={`Poster preview ${index + 1} with ${color} border`}
                                                loading="lazy"
                                            />
                                        ) : (
                                            <div className="w-40 h-60 bg-surface border-2 border-dashed rounded flex items-center justify-center flex-col gap-2">
                                                <span className="text-sm text-secondary text-center font-medium">
                                                    {loadingPreviews
                                                        ? 'Loading...'
                                                        : 'Preview Error'}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    {/* Color Picker + Remove Button Row */}
                                    <div className="flex items-center gap-2 justify-center">
                                        <ColorPicker
                                            id={`${inputId}-color-${index}`}
                                            value={color}
                                            onChange={newColor =>
                                                handleColorChange(index, newColor)
                                            }
                                            disabled={disabled}
                                            ariaLabel={`Color picker for poster ${index + 1}`}
                                            title={`Select border color for poster ${index + 1}: ${color}`}
                                            className={`w-12 h-12 border-2 rounded cursor-pointer focus:border-primary ${highlightInvalid ? 'border-error' : ''}`}
                                        />
                                        <RemoveButton
                                            onClick={() => handleRemoveColor(index)}
                                            disabled={!canRemoveColor(index)}
                                            itemName={`poster color ${index + 1}`}
                                            itemType="color"
                                            text="Remove"
                                            variant="default"
                                            size="medium"
                                            className="min-w-12 min-h-12 flex-shrink-0"
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}

                {/* Add Button and Controls */}
                {colorsArray.length > 0 && (
                    <div className="flex items-center justify-between gap-3 mt-3">
                        <AddButton
                            onClick={handleAddColor}
                            disabled={!canAddColor}
                            text={field.add_button_text || 'Add Color'}
                            itemType="color"
                            disabledReason={`Maximum ${maxColors} colors allowed`}
                            className="min-h-12"
                        />

                        {maxColors > 1 && (
                            <div className="flex flex-col items-end gap-1">
                                <span className="text-sm text-secondary font-medium">
                                    {colorsArray.length} of {maxColors} colors
                                </span>
                                {colorsArray.length >= maxColors * 0.8 && (
                                    <span className="text-xs text-warning italic">
                                        (approaching limit)
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {/* Status messages - only show critical errors */}
                {posterAssets.length === 0 && (
                    <div className="p-2 px-3 bg-warning rounded border border-warning">
                        <span className="text-sm text-bg italic">
                            No poster files found in /posters/ directory.
                        </span>
                    </div>
                )}

                <FieldDescription id={`${inputId}-desc`} description={field.description} />
                <FieldError id={`${inputId}-error`} message={errorMessage} />
            </div>
        );
    }
);

ColorListPosterField.displayName = 'ColorListPosterField';

export default ColorListPosterField;

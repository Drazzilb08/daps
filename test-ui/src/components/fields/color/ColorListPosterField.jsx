/**
 * ColorListPosterField Component
 *
 * Multiple color input field with poster preview.
 * Shows poster previews with color borders applied via canvas.
 */

import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { FieldWrapper, FieldLabel, FieldError, FieldDescription } from '../primitives';
import { ColorPicker } from '../features/color/ColorPicker';
import { AddButton, RemoveButton, ItemCounter } from '../features/shared';
import { postersAPI } from '../../../utils/api/posters';
import { getPosterPreviewUrl, hexToRgb, getPosterByIndex, getPosterDimensions } from '../../../utils/posterCanvas';
import { useArrayField } from '../../../hooks/useArrayField';

// CSS variable resolution utilities
const DEFAULT_COLOR = '#FFFFFF';

/**
 * Convert RGB color to hex format
 * @param {string} rgb - RGB color string like "rgb(255, 115, 0)"
 * @returns {string} Hex color like "#ff7300"
 */
function rgbToHex(rgb) {
    const result = rgb.match(/\d+/g);
    if (!result || result.length < 3) return DEFAULT_COLOR;

    const [r, g, b] = result.map(x => parseInt(x, 10));
    return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

/**
 * Resolve CSS variable to actual hex value
 * @param {string} cssValue - CSS value that might be a variable
 * @returns {string} Resolved hex color
 */
function resolveCSSVariable(cssValue) {
    // If already hex, return as-is
    if (cssValue && cssValue.startsWith('#')) {
        return cssValue;
    }

    // Resolve CSS variables
    if (cssValue && cssValue.startsWith('var(')) {
        const tempEl = document.createElement('div');
        tempEl.style.color = cssValue;
        document.body.appendChild(tempEl);

        const computedColor = getComputedStyle(tempEl).color;
        document.body.removeChild(tempEl);

        if (computedColor && computedColor.startsWith('rgb')) {
            return rgbToHex(computedColor);
        }
    }

    // Fallback for any other cases
    return DEFAULT_COLOR;
}

/**
 * Color field with poster previews showing border colors
 *
 * @param {Object} props - Component props
 * @param {Object} props.field - Field configuration
 * @param {string[]|string} props.value - Array of hex colors or comma-separated string
 * @param {Function} props.onChange - Change handler
 * @param {boolean} props.disabled - Disabled state
 * @param {boolean} props.highlightInvalid - Show validation errors
 * @param {string} props.errorMessage - Error message
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

        // Handle output format transformation for parent onChange
        const handleArrayChange = useCallback((newColors) => {
            // Field configuration determines output format
            const outputFormat = field.output_format || 'array';

            if (outputFormat === 'string' || outputFormat === 'comma_separated') {
                // Output as comma-separated string
                onChange(newColors.join(', '));
            } else {
                // Output as array (default)
                onChange(newColors);
            }
        }, [onChange, field.output_format]);

        // Array field management hook
        const arrayField = useArrayField(colorsArray, handleArrayChange, {
            minItems: field.min_items || field.minColors || 0,
            maxItems: field.max_items || field.maxColors || 10,
            defaultItem: DEFAULT_COLOR,
            validateItem: (color) => /^#[0-9A-Fa-f]{6}$/.test(color)
        });

        // State for poster assets and previews
        const [posterAssets, setPosterAssets] = useState([]);
        const [previews, setPreviews] = useState([]);
        const [loadingPreviews, setLoadingPreviews] = useState(false);

        // Simplified handlers using array field
        const handleAddColor = useCallback(() => {
            arrayField.addItem();
        }, [arrayField]);

        const handleRemoveColor = useCallback((index) => {
            arrayField.removeItem(index);
        }, [arrayField]);

        const handleColorChange = useCallback((index, newColor) => {
            arrayField.updateItem(index, newColor);
        }, [arrayField]);

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
                    if (arrayField.items.length && posterAssets.length) {
                        // Generate preview for each color
                        for (let i = 0; i < arrayField.items.length; i++) {
                            try {
                                const poster = getPosterByIndex(posterAssets, i);
                                if (!poster) continue;

                                const posterDimensions = getPosterDimensions();
                                const previewUrl = await getPosterPreviewUrl(
                                    poster,
                                    resolveCSSVariable(arrayField.items[i] || DEFAULT_COLOR),
                                    posterDimensions
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
                                const posterDimensions = getPosterDimensions();
                                const previewUrl = await getPosterPreviewUrl(
                                    poster,
                                    null,
                                    posterDimensions
                                );

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
        }, [arrayField.items, posterAssets]);

        const inputId = `field-${field.key}`;

        // Extract field configuration options
        const label = field.label || 'Poster Colors';

        // Update constraints
        const canAddColor = arrayField.canAdd && !disabled;
        const canRemoveColor = (index) => arrayField.canRemove && !disabled;

        return (
            <FieldWrapper
                variant="form-section"
                invalid={highlightInvalid}
                className="flex flex-col gap-3"
            >
                <FieldLabel
                    id={`${inputId}-label`}
                    htmlFor={inputId}
                    label={label}
                    required={field.required}
                />

                <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
                    {arrayField.items.length === 0
                        ? previews[0] && (
                            <div className="flex flex-col gap-2 p-3 border rounded-md bg-surface">
                                  <div className="flex justify-center items-center flex-shrink-0 aspect-square rounded-md overflow-hidden bg-surface-dim">
                                      <img
                                          className="max-w-full max-h-full object-contain"
                                          src={previews[0]}
                                          alt="Poster preview with border removed"
                                          loading="lazy"
                                      />
                                  </div>
                                  <div className="text-center mt-2">
                                      <span className="text-xs text-secondary">
                                          Border removed (no colors selected)
                                      </span>
                                  </div>
                              </div>
                          )
                        : arrayField.items.map((color, index) => {
                              const previewUrl = previews[index];
                              const poster = getPosterByIndex(posterAssets, index);

                              return (
                                  <div
                                      key={index}
                                      className="color-poster-item flex flex-col gap-2"
                                  >
                                      <div className="flex justify-center items-center flex-shrink-0 aspect-square rounded-md overflow-hidden bg-surface-dim">
                                          {previewUrl ? (
                                              <img
                                                  className="max-w-full max-h-full object-contain"
                                                  src={previewUrl}
                                                  alt={`Poster preview ${index + 1} with ${color} border`}
                                                  loading="lazy"
                                              />
                                          ) : (
                                              <div className="text-center p-4">
                                                  <span className="text-sm text-secondary">
                                                      {loadingPreviews
                                                          ? 'Loading...'
                                                          : 'Preview Error'}
                                                  </span>
                                              </div>
                                          )}
                                      </div>

                                      <div className="flex items-center gap-2 justify-center mt-2">
                                          <ColorPicker
                                              value={resolveCSSVariable(color || DEFAULT_COLOR)}
                                              onChange={newColor =>
                                                  handleColorChange(index, newColor)
                                              }
                                              disabled={disabled}
                                              invalid={highlightInvalid}
                                              id={`${inputId}-color-${index}`}
                                              aria-label={`Color ${index + 1} for ${poster ? `poster ${index + 1}` : 'poster'}`}
                                              className="border-none rounded cursor-pointer"
                                          />
                                          <RemoveButton
                                              onClick={() => handleRemoveColor(index)}
                                              disabled={!canRemoveColor(index)}
                                              itemType="color"
                                              disabledReason={`Minimum ${arrayField.minItems || 0} colors required`}
                                              className=""
                                              aria-label={`Remove color ${index + 1}`}
                                          />
                                      </div>
                                  </div>
                              );
                          })}
                </div>

                <div className="flex items-center justify-between gap-3 mt-3">
                    <AddButton
                        onClick={handleAddColor}
                        disabled={!canAddColor}
                        text={field.add_button_text || 'Add Color'}
                        itemType="color"
                        disabledReason={`Maximum ${arrayField.maxItems || 10} colors allowed`}
                        className=""
                    />

                    {(arrayField.maxItems || 10) > 1 && arrayField.count > 0 && (
                        <ItemCounter
                            current={arrayField.count}
                            total={arrayField.maxItems || 10}
                            itemType="color"
                            warningThreshold={0.8}
                            className=""
                        />
                    )}
                </div>

                {(posterAssets.length === 0 || loadingPreviews) && (
                    <div className="color-poster-status flex flex-col gap-2">
                        {posterAssets.length === 0 && (
                            <div className="p-2 bg-warning text-warning-text rounded">
                                <span className="text-sm">
                                    No poster files found in /posters/ directory.
                                </span>
                            </div>
                        )}
                        {loadingPreviews && (
                            <div className="rounded">
                                <span>
                                    Generating poster previews...
                                </span>
                            </div>
                        )}
                    </div>
                )}

                <FieldDescription id={`${inputId}-desc`} description={field.description} />
                <FieldError id={`${inputId}-error`} message={errorMessage} />
            </FieldWrapper>
        );
    }
);

ColorListPosterField.displayName = 'ColorListPosterField';

export default ColorListPosterField;

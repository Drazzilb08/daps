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
import { 
  FieldWrapper, 
  FieldLabel, 
  FieldError, 
  FieldDescription
} from '../primitives';
import { ColorPicker } from '../features/color/ColorPicker';
import { AddButton, RemoveButton } from '../features/shared';
import { postersAPI } from '../../../utils/api/posters';

/**
 * Get border thickness from CSS custom property
 * Converts rem value to pixels for canvas operations
 */
const getBorderThickness = () => {
  const remValue = parseFloat(getComputedStyle(document.documentElement)
    .getPropertyValue('--poster-border-thickness'));
  return remValue * 16; // Convert rem to pixels (assuming 16px = 1rem)
};

/**
 * Get poster dimensions from CSS custom properties
 * @returns {Object} Object with width and height properties
 */
const getPosterDimensions = () => {
  const styles = getComputedStyle(document.documentElement);
  return {
    width: parseInt(styles.getPropertyValue('--poster-width-standard'), 10),
    height: parseInt(styles.getPropertyValue('--poster-height-standard'), 10)
  };
};

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

        if (!borderColor) {
          const borderThickness = getBorderThickness();
          const cropW = width - borderThickness * 2;
          const cropH = height - borderThickness * 2;
          const cropCanvas = document.createElement('canvas');
          cropCanvas.width = cropW;
          cropCanvas.height = cropH;
          const cropCtx = cropCanvas.getContext('2d');
          cropCtx.drawImage(
            canvas,
            borderThickness,
            borderThickness,
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

        const borderThickness = getBorderThickness();
        const imgData = ctx.getImageData(0, 0, width, height);
        const data = imgData.data;
        const rgb = hexToRgb(borderColor);

        for (let y = 0; y < height; ++y) {
          for (let x = 0; x < width; ++x) {
            const isBorder =
              x < borderThickness ||
              x >= width - borderThickness ||
              y < borderThickness ||
              y >= height - borderThickness;
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
export const ColorListPosterField = React.memo(({
  field,
  value,
  onChange,
  disabled = false,
  highlightInvalid = false,
  errorMessage = null
}) => {
  // Convert value to array format (handle both array and string inputs)
  const colorsArray = useMemo(() => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      return value.split(',').map(color => color.trim()).filter(Boolean);
    }
    return [];
  }, [value]);

  // State for poster assets and previews
  const [posterAssets, setPosterAssets] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [loadingPreviews, setLoadingPreviews] = useState(false);

  // Handle color list changes with proper output format
  const handleChange = useCallback((newColors) => {
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

  // Handle adding a new color
  const handleAddColor = useCallback(() => {
    const maxColors = field.max_colors || field.maxColors || 10;
    if (colorsArray.length >= maxColors || disabled) return;
    
    const newColors = [...colorsArray, '#000000'];
    handleChange(newColors);
  }, [colorsArray, field.max_colors, field.maxColors, disabled, handleChange]);

  // Handle removing a color at specific index
  const handleRemoveColor = useCallback((index) => {
    const minColors = field.min_colors || field.minColors || 0;
    if (colorsArray.length <= minColors || disabled) return;
    
    const newColors = colorsArray.filter((_, i) => i !== index);
    handleChange(newColors);
  }, [colorsArray, field.min_colors, field.minColors, disabled, handleChange]);

  // Handle changing a color at specific index
  const handleColorChange = useCallback((index, newColor) => {
    const newColors = [...colorsArray];
    newColors[index] = newColor;
    handleChange(newColors);
  }, [colorsArray, handleChange]);

  // Fetch poster file list dynamically
  useEffect(() => {
    let isMounted = true;
    
    postersAPI.fetchPosterFileList()
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
              
              const posterDimensions = getPosterDimensions();
              const previewUrl = await getPosterPreviewUrl(
                poster,
                colorsArray[i] || '#000000',
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
              const previewUrl = await getPosterPreviewUrl(poster, null, posterDimensions);
              
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
  const canRemoveColor = (index) => colorsArray.length > minColors && !disabled;
  
  return (
    <div className="color-list-poster-field">
      <FieldLabel 
        id={`${inputId}-label`}
        htmlFor={inputId} 
        label={label} 
        required={field.required} 
      />
      
      <div className="color-poster-grid">
        {colorsArray.length === 0 ? (
          previews[0] && (
            <div className="color-poster-item">
              <div className="color-poster-preview">
                <img
                  className="color-poster-image"
                  src={previews[0]}
                  alt="Poster preview with border removed"
                  loading="lazy"
                />
              </div>
              <div className="color-poster-status">
                <span className="color-poster-status-text">
                  Border removed (no colors selected)
                </span>
              </div>
            </div>
          )
        ) : (
          colorsArray.map((color, index) => {
            const previewUrl = previews[index];
            const poster = getPosterByIndex(posterAssets, index);
            
            return (
              <div key={index} className="color-poster-item">
                <div className="color-poster-preview">
                  {previewUrl ? (
                    <img
                      className="color-poster-image"
                      src={previewUrl}
                      alt={`Poster preview ${index + 1} with ${color} border`}
                      loading="lazy"
                    />
                  ) : (
                    <div className="color-poster-placeholder">
                      <span className="color-poster-placeholder-text">
                        {loadingPreviews ? 'Loading...' : 'Preview Error'}
                      </span>
                    </div>
                  )}
                </div>

                <div className="color-poster-controls">
                  <ColorPicker
                    value={color}
                    onChange={(newColor) => handleColorChange(index, newColor)}
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
                    disabledReason={`Minimum ${minColors} colors required`}
                    className="color-poster-remove-button"
                    aria-label={`Remove color ${index + 1}`}
                  />
                </div>
              </div>
            );
          })
        )}
      </div>

      <div className="color-poster-bottom-controls">
        <AddButton
          onClick={handleAddColor}
          disabled={!canAddColor}
          text={field.add_button_text || 'Add Color'}
          itemType="color"
          disabledReason={`Maximum ${maxColors} colors allowed`}
          className="color-poster-add-button"
        />
        
        {maxColors > 1 && colorsArray.length > 0 && (
          <div className="color-poster-counter">
            <span className="color-poster-counter-text">
              {colorsArray.length} of {maxColors} colors
            </span>
            {colorsArray.length >= Math.ceil(maxColors * 0.8) && (
              <span className="color-poster-counter-warning">
                (approaching limit)
              </span>
            )}
          </div>
        )}
      </div>

      {(posterAssets.length === 0 || loadingPreviews) && (
        <div className="color-poster-status">
          {posterAssets.length === 0 && (
            <div className="color-poster-warning rounded">
              <span className="color-poster-warning-text">
                No poster files found in /posters/ directory.
              </span>
            </div>
          )}
          {loadingPreviews && (
            <div className="color-poster-loading rounded">
              <span className="color-poster-loading-text">
                Generating poster previews...
              </span>
            </div>
          )}
        </div>
      )}
      
      <FieldDescription 
        id={`${inputId}-desc`} 
        description={field.description} 
      />
      <FieldError 
        id={`${inputId}-error`} 
        message={errorMessage} 
      />
    </div>
  );
});

ColorListPosterField.displayName = 'ColorListPosterField';

export default ColorListPosterField;
/**
 * ColorListPosterField Component
 * 
 * Multiple color input field component WITH embedded poster preview functionality.
 * This is a bespoke field that combines color list management with poster preview.
 * 
 * Architecture:
 * - Uses ColorArray feature for consistent color management
 * - Embeds poster preview logic directly (not abstracted as it's only used here)
 * - Follows proper separation of concerns - bespoke functionality in bespoke field
 */

import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { 
  FieldWrapper, 
  FieldLabel, 
  FieldError, 
  FieldDescription
} from '../primitives';
import { ColorArray } from '../features/color/ColorArray';
import { fetchPosterFileList, getPosterByIndex, getPosterPreviewUrl } from '../../../utils/posterPreview';

/**
 * ColorListPosterField component for multiple color selection with poster preview
 * 
 * This bespoke field combines color list management with embedded poster preview.
 * The poster preview logic is embedded directly since it's only used by this field.
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
  // Poster preview state (embedded directly in this bespoke field)
  const [posterAssets, setPosterAssets] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Convert value to array format (handle both array and string inputs)
  const colorsArray = useMemo(() => {
    if (!value) return [];
    if (Array.isArray(value)) return value;
    if (typeof value === 'string') {
      return value.split(',').map(color => color.trim()).filter(Boolean);
    }
    return [];
  }, [value]);

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

  // Embedded poster preview logic (bespoke to this field only)
  const previewOptions = useMemo(() => ({ 
    width: field.preview_width || 156, 
    height: field.preview_height || 234 
  }), [field.preview_width, field.preview_height]);

  // Fetch poster file list on mount
  useEffect(() => {
    let isMounted = true;
    
    const loadPosters = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        const files = await fetchPosterFileList();
        
        if (isMounted) {
          setPosterAssets(Array.isArray(files) ? files : []);
          setIsLoading(false);
        }
      } catch (err) {
        console.error('Failed to fetch poster files:', err);
        
        if (isMounted) {
          setError(err.message || 'Failed to load posters');
          setPosterAssets([]);
          setIsLoading(false);
        }
      }
    };

    loadPosters();
    
    return () => {
      isMounted = false;
    };
  }, []);

  // Generate previews when colors or posters change
  useEffect(() => {
    let cancelled = false;
    
    if (!posterAssets.length || isLoading) return;

    const generatePreviews = async () => {
      const newPreviews = [];
      
      if (colorsArray.length && posterAssets.length) {
        // Generate preview for each color
        for (let i = 0; i < colorsArray.length; i++) {
          try {
            const poster = getPosterByIndex(posterAssets, i);
            if (!poster) continue;
            
            const url = await getPosterPreviewUrl(
              poster,
              colorsArray[i] || '#ffffff',
              previewOptions
            );
            
            if (!cancelled) {
              newPreviews[i] = url;
            }
          } catch (err) {
            console.error(`Failed to create preview for color ${i}:`, err);
            if (!cancelled) {
              newPreviews[i] = null; // Keep slot but mark as failed
            }
          }
        }
      } else if (posterAssets.length) {
        // No colors: show border removal preview
        try {
          const poster = getPosterByIndex(posterAssets, 0);
          if (poster) {
            const url = await getPosterPreviewUrl(poster, null, previewOptions);
            if (!cancelled) {
              newPreviews[0] = url;
            }
          }
        } catch (err) {
          console.error('Failed to create no-border preview:', err);
          if (!cancelled) {
            newPreviews[0] = null;
          }
        }
      }
      
      if (!cancelled) {
        setPreviews(newPreviews);
      }
    };

    generatePreviews();
    
    return () => {
      cancelled = true;
    };
  }, [colorsArray, posterAssets, isLoading, previewOptions]);

  const inputId = `field-${field.key}`;
  
  // Extract field configuration options
  const maxColors = field.max_colors || field.maxColors || 10;
  const minColors = field.min_colors || field.minColors || 0;
  const label = field.label || 'Colors';
  
  return (
    <FieldWrapper invalid={highlightInvalid}>
      <FieldLabel 
        id={`${inputId}-label`}
        htmlFor={inputId} 
        label={label} 
        required={field.required} 
      />
      
      <ColorArray
        colors={colorsArray}
        onChange={handleChange}
        disabled={disabled}
        invalid={highlightInvalid}
        baseId={inputId}
        label={label}
        maxColors={maxColors}
        minColors={minColors}
        addButtonText={field.add_button_text || 'Add Color'}
        removeButtonText={field.remove_button_text || 'Remove'}
        emptyMessage={field.empty_message || 'No colors added yet.'}
        emptySecondaryMessage={field.empty_secondary_message || 'Click "Add Color" to get started.'}
        aria-describedby={`${inputId}-desc ${inputId}-error`.trim()}
      />
      
      {/* Embedded Poster Preview (bespoke functionality) */}
      <div className="color-list-poster-preview">
        {isLoading && (
          <div className="poster-preview-status">
            <span className="poster-preview-loading">Loading previews...</span>
          </div>
        )}
        
        {error && (
          <div className="poster-preview-status">
            <span className="poster-preview-error">Error: {error}</span>
          </div>
        )}
        
        {!isLoading && !error && !posterAssets.length && (
          <div className="poster-preview-status">
            <span className="poster-preview-no-posters">No poster files found in /posters/ directory.</span>
          </div>
        )}
        
        {!isLoading && !error && posterAssets.length && previews.length > 0 && (
          <div className="poster-preview-container">
            {previews.map((url, index) => (
              <div className="poster-preview-item" key={index}>
                {url ? (
                  <img
                    src={url}
                    alt={`Preview ${index + 1}`}
                    width={previewOptions.width}
                    height={previewOptions.height}
                    className="poster-preview-image"
                  />
                ) : (
                  <div 
                    className="poster-preview-error-item"
                    style={{ width: previewOptions.width, height: previewOptions.height }}
                    role="img" 
                    aria-label={`Preview ${index + 1} failed to load`}
                  >
                    Preview Error
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        
        {!isLoading && !error && posterAssets.length && !colorsArray.length && (
          <div className="poster-preview-status">
            <span className="poster-preview-no-colors">No colors selected. The white border will be removed.</span>
          </div>
        )}
      </div>
      
      <FieldDescription 
        id={`${inputId}-desc`} 
        description={field.description} 
      />
      <FieldError 
        id={`${inputId}-error`} 
        message={errorMessage} 
      />
    </FieldWrapper>
  );
});

ColorListPosterField.displayName = 'ColorListPosterField';

export default ColorListPosterField;
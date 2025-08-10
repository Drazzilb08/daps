import React, { useEffect, useRef, useState } from 'react';
import { fetchPosterFileList } from '../../../utils/api';

const BORDER_THICKNESS = 5;

function hexToRgb(hex) {
    hex = hex.replace(/^#/, '');
    if (hex.length === 3)
        hex = hex
            .split('')
            .map(x => x + x)
            .join('');
    const num = parseInt(hex, 16);
    return { r: (num >> 16) & 255, g: (num >> 8) & 255, b: num & 255 };
}

function getPosterByIndex(posterAssets, idx) {
    if (!posterAssets.length) return null;
    // Use the /posters/ URL path served by FastAPI static mount
    return `/posters/${posterAssets[idx % posterAssets.length]}`;
}

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

export function ColorListField({
    field,
    value,
    onChange,
    highlightInvalid = false,
    errorMessage = null,
}) {
    const [colorArray, setColorArray] = useState(Array.isArray(value) ? value.slice() : []);
    const [posterAssets, setPosterAssets] = useState([]);
    const [previews, setPreviews] = useState([]);
    const [pendingUpdate, setPendingUpdate] = useState(null);
    const shouldPreview = String(field.preview) === 'true';
    const helpRef = useRef(null);

    useEffect(() => {
        if (
            Array.isArray(value) &&
            (value.length !== colorArray.length || value.some((val, i) => val !== colorArray[i]))
        ) {
            setColorArray(value.slice());
        }
        if (!Array.isArray(value) && colorArray.length !== 0) {
            setColorArray([]);
        }
    }, [value, colorArray]);

    // Fetch poster file list dynamically
    useEffect(() => {
        let isMounted = true;
        fetchPosterFileList()
            .then(files => {
                if (isMounted) setPosterAssets(Array.isArray(files) ? files : []);
            })
            .catch(error => {
                console.error('Failed to fetch poster files:', error);
                if (isMounted) setPosterAssets([]);
            });
        return () => {
            isMounted = false;
        };
    }, []);

    useEffect(() => {
        let cancelled = false;
        if (!shouldPreview || !posterAssets.length) return;

        const makePreviews = async () => {
            let out = [];
            if (colorArray.length && posterAssets.length) {
                for (let i = 0; i < colorArray.length; i++) {
                    try {
                        const poster = getPosterByIndex(posterAssets, i);
                        if (!poster) continue;
                        const url = await getPosterPreviewUrl(poster, colorArray[i] || '#ffffff', {
                            width: 156,
                            height: 234,
                        });
                        if (!cancelled) out[i] = url;
                    } catch (error) {
                        console.error(`Failed to create preview for color ${i}:`, error);
                        if (!cancelled) out[i] = null; // Keep slot but mark as failed
                    }
                }
            } else if (posterAssets.length) {
                // No colors: remove border by cropping hardcoded area
                try {
                    const poster = getPosterByIndex(posterAssets, 0);
                    if (poster) {
                        const url = await getPosterPreviewUrl(poster, null, {
                            width: 156,
                            height: 234,
                        });
                        if (!cancelled) out[0] = url;
                    }
                } catch (error) {
                    console.error('Failed to create no-border preview:', error);
                    if (!cancelled) out[0] = null;
                }
            }
            if (!cancelled) setPreviews(out);
        };
        
        makePreviews();
        return () => {
            cancelled = true;
        };
    }, [colorArray, posterAssets, shouldPreview]);

    function handleColorChange(idx, newColor) {
        setColorArray(arr => {
            const copy = arr.slice();
            copy[idx] = newColor;
            setPendingUpdate(copy);
            return copy;
        });
    }
    
    function handleAdd() {
        setColorArray(arr => {
            const updated = [...arr, '#ffffff'];
            setPendingUpdate(updated);
            return updated;
        });
    }
    
    function handleRemove(idx) {
        setColorArray(arr => {
            const updated = arr.filter((_, i) => i !== idx);
            setPendingUpdate(updated);
            return updated;
        });
    }

    useEffect(() => {
        if (pendingUpdate !== null && onChange) {
            onChange(pendingUpdate);
            setPendingUpdate(null);
        }
    }, [pendingUpdate, onChange, colorArray]);

    return (
        <div
            className={`settings-field-row field-dir-list field-color-list${
                highlightInvalid ? ' field-error' : ''
            }`}
        >
            <div className="settings-field-labelcol dirlist-label-col">
                <label>{field.label || 'Colors'}</label>
                <div style={{ flex: 1 }} />
                <button type="button" className="btn add-btn" onClick={handleAdd}>
                    Add Color
                </button>
            </div>
            <div className="settings-field-inputwrap dirlist-input-col">
                <div className="color-list-container">
                    {colorArray.map((color, idx) => (
                        <div key={idx} className="color-picker-swatch">
                            <input
                                type="color"
                                value={color || '#ffffff'}
                                className={highlightInvalid ? 'input-error' : ''}
                                onChange={e => handleColorChange(idx, e.target.value)}
                                onInput={e => handleColorChange(idx, e.target.value)}
                            />
                            <button
                                type="button"
                                className="remove-btn"
                                onClick={() => handleRemove(idx)}
                            >
                                −
                            </button>
                        </div>
                    ))}
                </div>
                {shouldPreview && posterAssets.length > 0 && (
                    <div className="poster-border-preview-wrap">
                        {previews.map((url, idx) => (
                            <div className="poster-preview-container" key={idx}>
                                {url ? (
                                    <img
                                        className="poster-preview-img"
                                        src={url}
                                        width={156}
                                        height={234}
                                        alt={`Preview ${idx + 1}`}
                                    />
                                ) : (
                                    <div
                                        className="poster-preview-error"
                                        style={{
                                            width: 156,
                                            height: 234,
                                            background: '#f0f0f0',
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'center',
                                            fontSize: '12px',
                                            color: '#666',
                                        }}
                                    >
                                        Preview Error
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>
                )}
                <div ref={helpRef} className="field-help-text">
                    {!colorArray.length && (
                        <div className="no-border-notification">
                            No colors selected. The white border will be removed.
                        </div>
                    )}
                    {posterAssets.length === 0 && (
                        <div className="no-posters-notification">
                            No poster files found in /posters/ directory.
                        </div>
                    )}
                    {field.description || ''}
                </div>
                {highlightInvalid && errorMessage && (
                    <div className="field-error-text">{errorMessage}</div>
                )}
            </div>
        </div>
    );
}

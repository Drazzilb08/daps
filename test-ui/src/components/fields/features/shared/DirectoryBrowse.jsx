/**
 * DirectoryBrowse Component
 *
 * Reusable directory browsing functionality for all directory field types.
 * Provides a browse button with hidden file input for directory selection.
 *
 * Write once, use everywhere pattern for directory selection across:
 * - DirField (single directory)
 * - DirListField (multiple directories)
 * - DirListDragDropField (drag/drop directories)
 * - DirListOptionsField (directories with options)
 */

import React, { useCallback, useRef } from 'react';
import { FieldButton } from './FieldButton';

/**
 * DirectoryBrowse component for directory selection
 *
 * @param {Object} props - Component props
 * @param {Function} props.onDirectorySelect - Callback when directory is selected
 * @param {boolean} props.disabled - Whether browse is disabled
 * @param {string} props.ariaLabel - ARIA label for accessibility
 * @param {string} props.buttonText - Text to display on button
 * @param {string} props.className - Additional CSS classes for button
 * @param {boolean} props.multiple - Whether to allow multiple directory selection
 */
export const DirectoryBrowse = React.memo(
    ({
        onDirectorySelect,
        disabled = false,
        ariaLabel = 'Browse for directory',
        buttonText = 'Browse...',
        className = 'btn btn--dir-field btn--small inline-flex-center-both py-2 px-3 rounded-md cursor-pointer transition-fast',
        multiple = false,
    }) => {
        const fileInputRef = useRef(null);

        const handleBrowseClick = useCallback(() => {
            if (fileInputRef.current) {
                fileInputRef.current.click();
            }
        }, []);

        const handleFileSelect = useCallback(
            e => {
                const files = e.target.files;
                if (!files || files.length === 0) {
                    return;
                }

                if (multiple) {
                    // For multiple directory selection, extract all unique directory paths
                    const directories = new Set();

                    for (let i = 0; i < files.length; i++) {
                        const file = files[i];
                        if (file.webkitRelativePath) {
                            // Extract directory path from webkitRelativePath
                            const pathParts = file.webkitRelativePath.split('/');
                            if (pathParts.length > 1) {
                                // Get the immediate parent directory
                                const dirPath = pathParts.slice(0, -1).join('/');
                                directories.add(dirPath);
                            }
                        }
                    }

                    // Convert Set to Array and call callback
                    onDirectorySelect(Array.from(directories));
                } else {
                    // Single directory selection
                    const file = files[0];
                    let dirPath = '';

                    if (file.webkitRelativePath) {
                        // Extract directory path from webkitRelativePath
                        const pathParts = file.webkitRelativePath.split('/');
                        dirPath = pathParts.slice(0, -1).join('/');
                    } else {
                        // Fallback to just the file name without extension
                        dirPath = file.name.replace(/\.[^/.]+$/, '');
                    }

                    onDirectorySelect(dirPath);
                }

                // Reset the file input for subsequent selections
                e.target.value = '';
            },
            [onDirectorySelect, multiple]
        );

        return (
            <>
                <FieldButton
                    onClick={handleBrowseClick}
                    disabled={disabled}
                    ariaLabel={ariaLabel}
                    className={className}
                >
                    {buttonText}
                </FieldButton>

                {/* Hidden file input for directory selection */}
                <input
                    ref={fileInputRef}
                    type="file"
                    style={{ display: 'none' }}
                    webkitdirectory=""
                    directory=""
                    multiple
                    onChange={handleFileSelect}
                    aria-hidden="true"
                    tabIndex="-1"
                />
            </>
        );
    }
);

DirectoryBrowse.displayName = 'DirectoryBrowse';

export default DirectoryBrowse;
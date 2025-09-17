/**
 * DirectoryBrowse Component
 *
 * Placeholder directory browsing functionality for all directory field types.
 * Shows a placeholder popup indicating that a modal directory browser will be implemented.
 *
 * Write once, use everywhere pattern for directory selection across:
 * - DirField (single directory)
 * - DirListField (multiple directories)
 * - DirListDragDropField (drag/drop directories)
 * - DirListOptionsField (directories with options)
 */

import React, { useCallback } from 'react';
import { FieldButton } from './FieldButton';

/**
 * DirectoryBrowse component with placeholder functionality
 *
 * @param {Object} props - Component props
 * @param {boolean} props.disabled - Whether browse is disabled
 * @param {string} props.ariaLabel - ARIA label for accessibility
 * @param {string} props.buttonText - Text to display on button
 * @param {string} props.className - Additional CSS classes for button
 * @param {boolean} props.multiple - Whether to allow multiple directory selection
 */
export const DirectoryBrowse = React.memo(
    ({
        disabled = false,
        ariaLabel = 'Browse for directory',
        buttonText = 'Browse...',
        className = 'btn btn--dir-field btn--small inline-flex-center-both py-2 px-3 rounded-md cursor-pointer transition-fast',
        multiple = false,
    }) => {
        const handleBrowseClick = useCallback(() => {
            // Placeholder functionality - show info about future modal implementation
            alert(
                multiple
                    ? '🚧 Directory Browser Modal\n\nThis will open a modal to browse and select multiple directories when the modal system is implemented.\n\nFor now, please manually enter directory paths in the text field.'
                    : '🚧 Directory Browser Modal\n\nThis will open a modal to browse and select a directory when the modal system is implemented.\n\nFor now, please manually enter the directory path in the text field.'
            );
        }, [multiple]);

        return (
            <FieldButton
                onClick={handleBrowseClick}
                disabled={disabled}
                ariaLabel={ariaLabel}
                className={className}
            >
                {buttonText}
            </FieldButton>
        );
    }
);

DirectoryBrowse.displayName = 'DirectoryBrowse';

export default DirectoryBrowse;
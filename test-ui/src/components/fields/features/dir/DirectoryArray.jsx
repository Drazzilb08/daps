/**
 * DirectoryArray Composed Component
 *
 * Composed component for managing multiple directory values using atomic primitives.
 * Follows the same pattern as ColorArray for consistency.
 *
 * Composition Architecture:
 * - AddButton: Generic add functionality
 * - RemoveButton: Generic remove functionality
 * - ItemCounter: Generic count display
 * - EmptyState: Generic empty collection display
 * - DirectoryBrowse: Directory-specific placeholder browsing functionality
 * - InputBase: Basic input primitive
 *
 * This demonstrates proper "write once, use everywhere" philosophy where:
 * - Atomic primitives handle single responsibilities
 * - Composed components orchestrate business logic
 * - Each primitive is reusable across different contexts
 */

import React, { useCallback } from 'react';
import { InputBase } from '../../primitives';
import { AddButton, RemoveButton, ItemCounter, EmptyState } from '../shared';
import { DirectoryBrowse } from '../shared/DirectoryBrowse';

/**
 * DirectoryArray component for managing multiple directories using atomic primitives
 *
 * @param {Object} props - Component props
 * @param {string[]} props.directories - Array of directory paths
 * @param {Function} props.onChange - Directories change handler: (directories: string[]) => void
 * @param {boolean} props.disabled - Disabled state for all controls
 * @param {boolean} props.invalid - Invalid/error state
 * @param {string} props.baseId - Base ID for generating input IDs
 * @param {string} props.label - Label text for ARIA descriptions
 * @param {number} props.maxDirectories - Maximum number of directories allowed
 * @param {number} props.minDirectories - Minimum number of directories required
 * @param {string} props.addButtonText - Text for add button
 * @param {string} props.removeButtonText - Text for remove button
 * @param {string} props.browseButtonText - Text for browse button
 * @param {string} props.emptyMessage - Message shown when no directories
 * @param {string} props.emptySecondaryMessage - Secondary empty state message
 * @param {string} props.placeholder - Placeholder text for directory inputs
 * @param {string} props.className - Additional CSS classes
 */
export const DirectoryArray = React.memo(
    ({
        directories = [],
        onChange,
        disabled = false,
        invalid = false,
        baseId,
        label = 'directories',
        maxDirectories = 20,
        minDirectories = 0,
        addButtonText = 'Add Directory',
        removeButtonText = 'Remove',
        browseButtonText = 'Browse...',
        emptyMessage = 'No directories added yet.',
        emptySecondaryMessage = 'Click "Add Directory" to get started.',
        placeholder = 'Enter directory path or click Browse...',
        className = '',
        ...props
    }) => {
        // Handle adding a new directory
        const handleAddDirectory = useCallback(() => {
            if (directories.length >= maxDirectories) return;

            const newDirectories = [...directories, ''];
            onChange?.(newDirectories);
        }, [directories, maxDirectories, onChange]);

        // Handle removing a directory at specific index
        const handleRemoveDirectory = useCallback(
            index => {
                if (directories.length <= minDirectories) return;

                const newDirectories = directories.filter((_, i) => i !== index);
                onChange?.(newDirectories);
            },
            [directories, minDirectories, onChange]
        );

        // Handle changing a directory at specific index
        const handleDirectoryChange = useCallback(
            (index, newPath) => {
                const newDirectories = [...directories];
                newDirectories[index] = newPath;
                onChange?.(newDirectories);
            },
            [directories, onChange]
        );


        const canAddDirectory = directories.length < maxDirectories && !disabled;
        const canRemoveDirectory = index => directories.length > minDirectories && !disabled;

        return (
            <div
                className={`flex flex-col gap-3 ${className}`.trim()}
                role="group"
                aria-label={`${label} list`}
                {...props}
            >
                {/* Directory Items */}
                <div className="flex flex-col gap-4">
                    {directories.length === 0 ? (
                        <EmptyState
                            message={emptyMessage}
                            secondaryMessage={emptySecondaryMessage}
                            variant="subtle"
                            size="small"
                        >
                            <AddButton
                                onClick={handleAddDirectory}
                                disabled={!canAddDirectory}
                                text={addButtonText}
                                itemType="directory"
                                disabledReason={`Maximum ${maxDirectories} directories allowed`}
                            />
                        </EmptyState>
                    ) : (
                        directories.map((directory, index) => {
                            const itemId = `${baseId}-dir-${index}`;
                            const isLastItem = directories.length === 1;

                            return (
                                <div key={index} className="flex gap-2 items-center">
                                    <div className="flex-1">
                                        <div className="input-group">
                                            <InputBase
                                                id={itemId}
                                                type="text"
                                                name={`${baseId}-${index}`}
                                                value={directory || ''}
                                                placeholder={placeholder}
                                                disabled={disabled}
                                                onChange={(e) => handleDirectoryChange(index, e.target.value)}
                                                invalid={invalid}
                                                aria-label={`${label} ${index + 1}`}
                                                className="input-group-child dir-field-display"
                                            />

                                            <DirectoryBrowse
                                                disabled={disabled}
                                                ariaLabel={`Browse for directory ${index + 1}`}
                                                buttonText={browseButtonText}
                                                className="btn btn--dir-field btn--small inline-flex-center-both py-2 px-3 rounded-md cursor-pointer transition-fast"
                                                multiple={true}
                                            />
                                        </div>
                                    </div>

                                    <RemoveButton
                                        onClick={() => handleRemoveDirectory(index)}
                                        disabled={!canRemoveDirectory(index)}
                                        itemName={`${label} ${index + 1}`}
                                        itemType="directory"
                                        text={removeButtonText}
                                        variant="default"
                                        size="medium"
                                        title={isLastItem ? 'Cannot remove the last directory entry' : `Remove directory ${index + 1}`}
                                    />
                                </div>
                            );
                        })
                    )}
                </div>

                {/* Add Button & Counter (only show if we have items or can add) */}
                {directories.length > 0 && (
                    <div className="flex items-center gap-3">
                        <AddButton
                            onClick={handleAddDirectory}
                            disabled={!canAddDirectory}
                            text={addButtonText}
                            itemType="directory"
                            disabledReason={`Maximum ${maxDirectories} directories allowed`}
                        />

                        {maxDirectories && (
                            <ItemCounter
                                current={directories.length}
                                total={maxDirectories}
                                itemType="directory"
                                itemTypePlural="directories"
                                format="fraction"
                                showWarning={true}
                                warningThreshold={0.8}
                            />
                        )}
                    </div>
                )}
            </div>
        );
    }
);

DirectoryArray.displayName = 'DirectoryArray';

export default DirectoryArray;
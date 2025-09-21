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
 * - InputBase: Basic input primitive (read-only, clickable for directory browsing)
 *
 * This demonstrates proper "write once, use everywhere" philosophy where:
 * - Atomic primitives handle single responsibilities
 * - Composed components orchestrate business logic
 * - Each primitive is reusable across different contexts
 */

import React, { useCallback } from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { InputBase, SelectBase } from '../../primitives';
import { AddButton, RemoveButton, ItemCounter, EmptyState, FieldButton } from '../shared';

/**
 * SortableDirectoryItem - Directory item with drag and drop support
 * Handles reordering controls when enabled
 */
const SortableDirectoryItem = React.memo(({
    id,
    index,
    directory,
    isLastItem,
    itemId,
    canMoveUp,
    canMoveDown,
    canRemoveDirectory,
    enableReordering,
    onMoveUp,
    onMoveDown,
    onRemove,
    onClick,
    disabled,
    invalid,
    placeholder,
    label,
    baseId,
    removeButtonText,
    // Mode selection props
    mode,
    modeOptions,
    onModeChange
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div className="flex gap-2 items-center" ref={setNodeRef} style={style}>
            {/* Desktop: Drag Handle (left side) */}
            {enableReordering && (
                <div
                    className="flex items-center justify-center w-8 h-8 text-gray-400 cursor-grab hover:text-gray-600 transition-colors"
                    {...attributes}
                    {...listeners}
                >
                    ≡
                </div>
            )}

            {/* Mobile: Up Button (left side) */}
            {enableReordering && (
                <FieldButton
                    onClick={() => onMoveUp && onMoveUp(index)}
                    disabled={!canMoveUp}
                    ariaLabel={`Move ${directory || 'directory'} up`}
                    className="flex items-center justify-center w-8 h-8 text-xs bg-surface border rounded hover:bg-surface-hover transition-colors md:hidden"
                >
                    ↑
                </FieldButton>
            )}

            <div className={`flex ${modeOptions ? 'flex-col md:flex-row md:gap-3' : ''} flex-1`}>
                <InputBase
                    id={itemId}
                    type="text"
                    name={`${baseId}-${index}`}
                    value={directory || ''}
                    placeholder={placeholder}
                    disabled={disabled}
                    readOnly={true}
                    onClick={() => onClick(index)}
                    invalid={invalid}
                    aria-label={`${label} ${index + 1}`}
                    className={modeOptions ? 'md:flex-[2_1_0%] md:min-w-[120px]' : ''}
                    style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
                />

                {/* Mode selection - only show if modeOptions provided */}
                {modeOptions && (
                    <SelectBase
                        id={`${itemId}-mode`}
                        name={`${baseId}-mode-${index}`}
                        value={mode || ''}
                        onChange={(e) => onModeChange?.(index, e.target.value)}
                        disabled={disabled}
                        invalid={invalid}
                        options={modeOptions}
                        placeholder="Select mode..."
                        className="mt-2 md:mt-0 md:flex-[1_1_0%] md:min-w-[100px] md:max-w-[150px]"
                        aria-label={`Mode for ${label} ${index + 1}`}
                    />
                )}
            </div>

            {/* Mobile: Down Button (right side) */}
            {enableReordering && (
                <FieldButton
                    onClick={() => onMoveDown && onMoveDown(index)}
                    disabled={!canMoveDown}
                    ariaLabel={`Move ${directory || 'directory'} down`}
                    className="flex items-center justify-center w-8 h-8 text-xs bg-surface border rounded hover:bg-surface-hover transition-colors md:hidden"
                >
                    ↓
                </FieldButton>
            )}

            <RemoveButton
                onClick={() => onRemove(index)}
                disabled={!canRemoveDirectory}
                itemName={`${label} ${index + 1}`}
                itemType="directory"
                text={removeButtonText}
                variant="default"
                size="medium"
                title={isLastItem ? 'Cannot remove the last directory entry' : `Remove directory ${index + 1}`}
            />
        </div>
    );
});

SortableDirectoryItem.displayName = 'SortableDirectoryItem';

/**
 * DirectoryItem - Regular directory item without drag and drop
 * For use in non-sortable directory lists
 */
const DirectoryItem = React.memo(({
    index,
    directory,
    isLastItem,
    itemId,
    canRemoveDirectory,
    onRemove,
    onClick,
    disabled,
    invalid,
    placeholder,
    label,
    baseId,
    removeButtonText,
    // Mode selection props
    mode,
    modeOptions,
    onModeChange
}) => {
    return (
        <div className="flex gap-2 items-center">
            <div className={`flex ${modeOptions ? 'flex-col md:flex-row md:gap-3' : ''} flex-1`}>
                <InputBase
                    id={itemId}
                    type="text"
                    name={`${baseId}-${index}`}
                    value={directory || ''}
                    placeholder={placeholder}
                    disabled={disabled}
                    readOnly={true}
                    onClick={() => onClick(index)}
                    invalid={invalid}
                    aria-label={`${label} ${index + 1}`}
                    className={modeOptions ? 'md:flex-[2_1_0%] md:min-w-[120px]' : ''}
                    style={{ cursor: disabled ? 'not-allowed' : 'pointer' }}
                />

                {/* Mode selection - only show if modeOptions provided */}
                {modeOptions && (
                    <SelectBase
                        id={`${itemId}-mode`}
                        name={`${baseId}-mode-${index}`}
                        value={mode || ''}
                        onChange={(e) => onModeChange?.(index, e.target.value)}
                        disabled={disabled}
                        invalid={invalid}
                        options={modeOptions}
                        placeholder="Select mode..."
                        className="mt-2 md:mt-0 md:flex-[1_1_0%] md:min-w-[100px] md:max-w-[150px]"
                        aria-label={`Mode for ${label} ${index + 1}`}
                    />
                )}
            </div>

            <RemoveButton
                onClick={() => onRemove(index)}
                disabled={!canRemoveDirectory}
                itemName={`${label} ${index + 1}`}
                itemType="directory"
                text={removeButtonText}
                variant="default"
                size="medium"
                title={isLastItem ? 'Cannot remove the last directory entry' : `Remove directory ${index + 1}`}
            />
        </div>
    );
});

DirectoryItem.displayName = 'DirectoryItem';

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
 * @param {string} props.emptyMessage - Message shown when no directories
 * @param {string} props.emptySecondaryMessage - Secondary empty state message
 * @param {string} props.placeholder - Placeholder text for directory inputs
 * @param {string} props.className - Additional CSS classes
 * @param {boolean} props.enableReordering - Enable drag-drop reordering (optional)
 * @param {Function} props.onMoveUp - Move item up handler: (index: number) => void
 * @param {Function} props.onMoveDown - Move item down handler: (index: number) => void
 * @param {Object} props.dragHandleProps - Drag handle props for dnd-kit (optional)
 * @param {Array} props.modeOptions - Array of mode options for mode selection: [{value, label}] (optional)
 * @param {Array} props.modes - Array of mode values corresponding to directories (optional)
 * @param {Function} props.onModeChange - Mode change handler: (index: number, mode: string) => void (optional)
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
        emptyMessage = 'No directories added yet.',
        emptySecondaryMessage = 'Click "Add Directory" to get started.',
        placeholder = 'Click to select directory...',
        className = '',
        enableReordering = false,
        onMoveUp = null,
        onMoveDown = null,
        dragHandleProps = null,
        // Mode selection props
        modeOptions = null,
        modes = [],
        onModeChange = null,
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

        // Handle clicking on directory input to open modal
        const handleDirectoryClick = useCallback(
            (index) => {
                // Placeholder functionality - show info about future modal implementation
                alert(
                    '🚧 Directory Browser Modal\n\nThis will open a modal to browse and select a directory when the modal system is implemented.'
                );
            },
            []
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

                            const canMoveUp = enableReordering && index > 0 && !disabled;
                            const canMoveDown = enableReordering && index < directories.length - 1 && !disabled;

                            // Get mode for this directory index
                            const itemMode = modes[index] || '';

                            // Use SortableDirectoryItem for drag and drop, regular DirectoryItem otherwise
                            if (enableReordering) {
                                return (
                                    <SortableDirectoryItem
                                        key={index}
                                        id={index.toString()}
                                        index={index}
                                        directory={directory}
                                        isLastItem={isLastItem}
                                        itemId={itemId}
                                        canMoveUp={canMoveUp}
                                        canMoveDown={canMoveDown}
                                        canRemoveDirectory={canRemoveDirectory(index)}
                                        enableReordering={enableReordering}
                                        onMoveUp={onMoveUp}
                                        onMoveDown={onMoveDown}
                                        onRemove={handleRemoveDirectory}
                                        onClick={handleDirectoryClick}
                                        disabled={disabled}
                                        invalid={invalid}
                                        placeholder={placeholder}
                                        label={label}
                                        baseId={baseId}
                                        removeButtonText={removeButtonText}
                                        // Mode selection props
                                        mode={itemMode}
                                        modeOptions={modeOptions}
                                        onModeChange={onModeChange}
                                    />
                                );
                            } else {
                                return (
                                    <DirectoryItem
                                        key={index}
                                        index={index}
                                        directory={directory}
                                        isLastItem={isLastItem}
                                        itemId={itemId}
                                        canRemoveDirectory={canRemoveDirectory(index)}
                                        onRemove={handleRemoveDirectory}
                                        onClick={handleDirectoryClick}
                                        disabled={disabled}
                                        invalid={invalid}
                                        placeholder={placeholder}
                                        label={label}
                                        baseId={baseId}
                                        removeButtonText={removeButtonText}
                                        // Mode selection props
                                        mode={itemMode}
                                        modeOptions={modeOptions}
                                        onModeChange={onModeChange}
                                    />
                                );
                            }
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
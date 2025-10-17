/**
 * DirListDragDropField Component
 *
 * Directory list input field with drag-drop reordering capabilities.
 * Identical to DirListField but adds reordering via DirectoryArray.
 *
 * - Desktop: dnd-kit drag and drop with subtle drag handles
 * - Mobile: Primary-colored up/down arrow buttons for reordering
 *
 * Uses DirectoryArray component for consistency with regular dirlist field.
 */

import React, { useMemo, useCallback } from 'react';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
} from '@dnd-kit/sortable';

import { FieldWrapper, FieldLabel, FieldError, FieldDescription } from '../primitives';
import { DirectoryArray } from '../features/dir';

/**
 * DirListDragDropField component for managing directories with drag-drop reordering
 *
 * @param {Object} props - Component props
 * @param {Object} props.field - Field configuration object
 * @param {Array|string} props.value - Current field value (array of directory paths or single path)
 * @param {Function} props.onChange - Value change handler
 * @param {boolean} props.disabled - Field disabled state
 * @param {boolean} props.highlightInvalid - Show validation error state
 * @param {string} props.errorMessage - Error message to display
 */
export const DirListDragDropField = React.memo(
    ({
        field,
        value,
        onChange,
        disabled = false,
        highlightInvalid = false,
        errorMessage = null,
    }) => {
        // Convert value to array format, ensuring at least one empty entry for initial state
        const directoriesArray = useMemo(() => {
            if (!value) return [''];
            if (Array.isArray(value)) {
                return value.length > 0 ? value : [''];
            }
            return [value];
        }, [value]);

        // Handle directory list changes with proper output format
        const handleChange = useCallback(
            newDirectories => {
                // Field configuration determines output format
                const outputFormat = field.output_format || 'array';

                if (outputFormat === 'string' || outputFormat === 'comma_separated') {
                    // Output as comma-separated string
                    onChange(newDirectories.join(', '));
                } else {
                    // Output as array (default)
                    onChange(newDirectories);
                }
            },
            [onChange, field.output_format]
        );

        // Move up handler
        const handleMoveUp = useCallback(
            index => {
                if (index <= 0) return;
                const newDirectories = arrayMove(directoriesArray, index, index - 1);
                handleChange(newDirectories);
            },
            [directoriesArray, handleChange]
        );

        // Move down handler
        const handleMoveDown = useCallback(
            index => {
                if (index >= directoriesArray.length - 1) return;
                const newDirectories = arrayMove(directoriesArray, index, index + 1);
                handleChange(newDirectories);
            },
            [directoriesArray, handleChange]
        );

        // Drag and drop sensors
        const sensors = useSensors(
            useSensor(PointerSensor, {
                activationConstraint: {
                    distance: 8, // Prevent accidental drags
                },
            }),
            useSensor(KeyboardSensor, {
                coordinateGetter: sortableKeyboardCoordinates,
            })
        );

        // Handle drag end event
        const handleDragEnd = useCallback(
            event => {
                const { active, over } = event;

                if (active.id !== over.id) {
                    const oldIndex = directoriesArray.findIndex(
                        (_, idx) => idx.toString() === active.id
                    );
                    const newIndex = directoriesArray.findIndex(
                        (_, idx) => idx.toString() === over.id
                    );

                    const newDirectories = arrayMove(directoriesArray, oldIndex, newIndex);
                    handleChange(newDirectories);
                }
            },
            [directoriesArray, handleChange]
        );

        const inputId = `field-${field.key}`;

        // Extract field configuration options
        const minDirectories = field.min_directories || field.minDirectories || 1;
        const label = field.label || 'Directories';
        const addButtonText = field.add_button_text || 'Add Directory';
        const removeButtonText = field.remove_button_text || 'Remove';
        const placeholder = field.placeholder || 'Click to select directory...';
        const emptyMessage = field.empty_message || 'No directories added yet.';
        const emptySecondaryMessage =
            field.empty_secondary_message || 'Click "Add Directory" to get started.';

        return (
            <FieldWrapper invalid={highlightInvalid}>
                <FieldLabel
                    id={`${inputId}-label`}
                    htmlFor={inputId}
                    label={label}
                    required={field.required}
                />

                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext
                        items={directoriesArray.map((_, i) => i.toString())}
                        strategy={verticalListSortingStrategy}
                    >
                        <DirectoryArray
                            directories={directoriesArray}
                            onChange={handleChange}
                            disabled={disabled}
                            invalid={highlightInvalid}
                            baseId={inputId}
                            label={label}
                            minDirectories={minDirectories}
                            addButtonText={addButtonText}
                            removeButtonText={removeButtonText}
                            emptyMessage={emptyMessage}
                            emptySecondaryMessage={emptySecondaryMessage}
                            placeholder={placeholder}
                            enableReordering={true}
                            onMoveUp={handleMoveUp}
                            onMoveDown={handleMoveDown}
                        />
                    </SortableContext>
                </DndContext>

                <FieldDescription id={`${inputId}-desc`} description={field.description} />
                <FieldError id={`${inputId}-error`} message={errorMessage} />
            </FieldWrapper>
        );
    }
);

DirListDragDropField.displayName = 'DirListDragDropField';

export default DirListDragDropField;

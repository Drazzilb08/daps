/**
 * ColorArray Composed Component
 *
 * Composed component for managing multiple color values using atomic primitives.
 * Properly located in /composed/ directory as it orchestrates multiple primitives.
 *
 * Composition Architecture:
 * - AddButton: Generic add functionality
 * - RemoveButton: Generic remove functionality
 * - ItemCounter: Generic count display
 * - EmptyState: Generic empty collection display
 * - ColorInputPair: Color-specific input handling
 *
 * This demonstrates proper "write once, use everywhere" philosophy where:
 * - Atomic primitives handle single responsibilities
 * - Composed components orchestrate business logic
 * - Each primitive is reusable across different contexts
 */

import React, { useCallback } from 'react';
import { ColorInputPair } from './ColorInputPair';
import { AddButton, RemoveButton, ItemCounter, EmptyState } from '../shared';

/**
 * ColorArray component for managing multiple colors using atomic primitives
 *
 * @param {Object} props - Component props
 * @param {string[]} props.colors - Array of color values (hex format)
 * @param {Function} props.onChange - Colors change handler: (colors: string[]) => void
 * @param {boolean} props.disabled - Disabled state for all controls
 * @param {boolean} props.invalid - Invalid/error state
 * @param {string} props.baseId - Base ID for generating input IDs
 * @param {string} props.label - Label text for ARIA descriptions
 * @param {number} props.maxColors - Maximum number of colors allowed
 * @param {number} props.minColors - Minimum number of colors required
 * @param {string} props.addButtonText - Text for add button
 * @param {string} props.removeButtonText - Text for remove button
 * @param {string} props.emptyMessage - Message shown when no colors
 * @param {string} props.emptySecondaryMessage - Secondary empty state message
 * @param {string} props.className - Additional CSS classes
 */
export const ColorArray = React.memo(
    ({
        colors = [],
        onChange,
        disabled = false,
        invalid = false,
        baseId,
        label = 'colors',
        maxColors = 10,
        minColors = 0,
        addButtonText = 'Add Color',
        removeButtonText = 'Remove',
        emptyMessage = 'No colors added yet.',
        emptySecondaryMessage = 'Click "Add Color" to get started.',
        className = '',
        ...props
    }) => {
        // Handle adding a new color
        const handleAddColor = useCallback(() => {
            if (colors.length >= maxColors) return;

            const newColors = [...colors, '#000000'];
            onChange?.(newColors);
        }, [colors, maxColors, onChange]);

        // Handle removing a color at specific index
        const handleRemoveColor = useCallback(
            index => {
                if (colors.length <= minColors) return;

                const newColors = colors.filter((_, i) => i !== index);
                onChange?.(newColors);
            },
            [colors, minColors, onChange]
        );

        // Handle changing a color at specific index
        const handleColorChange = useCallback(
            (index, newColor) => {
                const newColors = [...colors];
                newColors[index] = newColor;
                onChange?.(newColors);
            },
            [colors, onChange]
        );

        const canAddColor = colors.length < maxColors && !disabled;
        const canRemoveColor = () => colors.length > minColors && !disabled;

        return (
            <div
                className={`flex flex-col gap-3 ${className}`.trim()}
                role="group"
                aria-label={`${label} list`}
                {...props}
            >
                {/* Color Items */}
                <div className="flex flex-col gap-4">
                    {colors.length === 0 ? (
                        <EmptyState
                            message={emptyMessage}
                            secondaryMessage={emptySecondaryMessage}
                            variant="subtle"
                            size="small"
                        >
                            <AddButton
                                onClick={handleAddColor}
                                disabled={!canAddColor}
                                text={addButtonText}
                                itemType="color"
                                disabledReason={`Maximum ${maxColors} colors allowed`}
                            />
                        </EmptyState>
                    ) : (
                        colors.map((color, index) => (
                            <div key={index} className="flex gap-2 items-center">
                                <div className="flex-1">
                                    <ColorInputPair
                                        value={color}
                                        onChange={newColor => handleColorChange(index, newColor)}
                                        disabled={disabled}
                                        invalid={invalid}
                                        baseId={`${baseId}-color-${index}`}
                                        label={`${label} ${index + 1}`}
                                    />
                                </div>

                                <RemoveButton
                                    onClick={() => handleRemoveColor(index)}
                                    disabled={!canRemoveColor(index)}
                                    itemName={`${label} ${index + 1}`}
                                    itemType="color"
                                    text={removeButtonText}
                                    variant="default"
                                    size="medium"
                                />
                            </div>
                        ))
                    )}
                </div>

                {/* Add Button & Counter (only show if we have items or can add) */}
                {colors.length > 0 && (
                    <div className="flex items-center gap-3">
                        <AddButton
                            onClick={handleAddColor}
                            disabled={!canAddColor}
                            text={addButtonText}
                            itemType="color"
                            disabledReason={`Maximum ${maxColors} colors allowed`}
                        />

                        {maxColors && (
                            <ItemCounter
                                current={colors.length}
                                total={maxColors}
                                itemType="color"
                                itemTypePlural="colors"
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

ColorArray.displayName = 'ColorArray';

export default ColorArray;

/**
 * Array field management hook
 */

import { useState, useCallback, useEffect, useRef } from 'react';

/**
 * Array field management hook
 * @param {Array} initialValue - Initial array value
 * @param {Function} onChange - Change handler from parent component
 * @param {Object} options - Configuration options
 * @param {number} options.minItems - Minimum number of items (default: 0)
 * @param {number} options.maxItems - Maximum number of items (default: 10)
 * @param {*} options.defaultItem - Default item to add (default: '')
 * @param {Function} options.validateItem - Item validation function
 * @returns {Object} Array management interface
 */
export function useArrayField(initialValue = [], onChange, options = {}) {
    const { minItems = 0, maxItems = 10, defaultItem = '', validateItem = () => true } = options;

    // Use ref to track if we're in a controlled update to prevent circular loops
    const isControlledUpdate = useRef(false);

    // Initialize state from initialValue
    const [items, setItems] = useState(initialValue);

    // FIXED: Only sync external changes, avoid circular updates
    useEffect(() => {
        // Only update if the change came from external source (not our onChange)
        if (!isControlledUpdate.current && JSON.stringify(initialValue) !== JSON.stringify(items)) {
            setItems(initialValue);
        }
        isControlledUpdate.current = false;
    }, [initialValue, items]);

    // Internal change handler that prevents circular updates
    const handleChange = useCallback(
        newItems => {
            isControlledUpdate.current = true;
            setItems(newItems);
            onChange?.(newItems);
        },
        [onChange]
    );

    const addItem = useCallback(
        (item = defaultItem) => {
            if (items.length >= maxItems) return false;

            const newItem = typeof item === 'function' ? item() : item;
            const newItems = [...items, newItem];
            handleChange(newItems);
            return true;
        },
        [items, maxItems, defaultItem, handleChange]
    );

    const removeItem = useCallback(
        index => {
            if (items.length <= minItems || index < 0 || index >= items.length) {
                return false;
            }

            const newItems = items.filter((_, i) => i !== index);
            handleChange(newItems);
            return true;
        },
        [items, minItems, handleChange]
    );

    const updateItem = useCallback(
        (index, value) => {
            if (index < 0 || index >= items.length) return false;
            if (!validateItem(value)) return false;

            const newItems = [...items];
            newItems[index] = value;
            handleChange(newItems);
            return true;
        },
        [items, validateItem, handleChange]
    );

    const moveItem = useCallback(
        (fromIndex, toIndex) => {
            if (fromIndex < 0 || fromIndex >= items.length) return false;
            if (toIndex < 0 || toIndex >= items.length) return false;
            if (fromIndex === toIndex) return true;

            const newItems = [...items];
            const [item] = newItems.splice(fromIndex, 1);
            newItems.splice(toIndex, 0, item);
            handleChange(newItems);
            return true;
        },
        [items, handleChange]
    );

    return {
        items,
        addItem,
        removeItem,
        updateItem,
        moveItem,
        canAdd: items.length < maxItems,
        canRemove: items.length > minItems,
        count: items.length,
        isEmpty: items.length === 0,
        isFull: items.length >= maxItems,
        isAtMinimum: items.length <= minItems,
        minItems,
        maxItems,
    };
}

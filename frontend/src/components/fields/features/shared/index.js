/**
 * Shared Features Export Module
 *
 * Components used by multiple (but not all) field types.
 * These are NOT primitives - they serve specific use cases for certain field types.
 *
 * Usage:
 *   import { AddButton, RemoveButton } from '../features/shared';
 *
 * Design Philosophy:
 *   - Shared functionality for specific field patterns
 *   - Used by multiple field types but not universal
 *   - More complex than primitives - handle specific business logic
 *   - Primarily used by array-type fields and collection management
 *
 * ARRAY/COLLECTION FEATURES:
 *   - AddButton: Add items to collections (used by color_list, tag fields, etc.)
 *   - RemoveButton: Remove items from collections
 *   - ItemCounter: Display item counts with limits
 *   - EmptyState: Show empty collection states with actions
 *   - StatusMessage: Display status/feedback for field operations
 */

export { AddButton } from './AddButton';
export { RemoveButton } from './RemoveButton';
export { ItemCounter } from './ItemCounter';
export { EmptyState } from './EmptyState';
export { StatusMessage } from './StatusMessage';
export { FieldButton } from './FieldButton';
export { ColorSwatches } from './ColorSwatches';

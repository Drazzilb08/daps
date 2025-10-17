/**
 * Field Primitives Export Module
 *
 * Central export point for TRUE primitive field components ONLY.
 * These components are used by ALL field types - true universal building blocks.
 *
 * Usage:
 *   import { FieldLabel, InputBase } from '../primitives';
 *
 * Design Philosophy:
 *   - Write once, use everywhere (truly EVERYWHERE)
 *   - Each primitive does ONE thing well
 *   - Used by ALL field types, not just some
 *   - No duplicate logic across field types
 *
 * TRUE PRIMITIVES (used by ALL fields):
 *   - FieldWrapper: Common wrapper structure
 *   - FieldLabel: Label display and requirements
 *   - FieldError: Error message display
 *   - FieldDescription: Help text display
 *   - InputBase: Base input element styling
 *   - TextareaBase: Base textarea element styling
 *
 * NON-PRIMITIVES (moved to /features/shared/):
 *   - AddButton, RemoveButton, ItemCounter, EmptyState, StatusMessage
 *   These are used by SOME fields (array-type fields) but not ALL fields.
 */

export { FieldLabel } from './FieldLabel';
export { FieldError } from './FieldError';
export { FieldDescription } from './FieldDescription';
export { FieldWrapper } from './FieldWrapper';
export { InputBase } from './InputBase';
export { TextareaBase } from './TextareaBase';
export { SelectBase } from './SelectBase';
export { CheckboxBase } from './CheckboxBase';

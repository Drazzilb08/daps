/**
 * Field Primitives Export Module
 * 
 * Central export point for all primitive field components.
 * These components are the building blocks for all field types.
 * 
 * Usage:
 *   import { FieldLabel, InputBase } from '../primitives';
 *   
 * Design Philosophy:
 *   - Write once, use everywhere
 *   - Each primitive does ONE thing well
 *   - Compose primitives into field components
 *   - No duplicate logic across field types
 */

export { FieldLabel } from './FieldLabel';
export { FieldError } from './FieldError';
export { FieldDescription } from './FieldDescription';
export { FieldWrapper } from './FieldWrapper';
export { InputBase } from './InputBase';
export { TextareaBase } from './TextareaBase';
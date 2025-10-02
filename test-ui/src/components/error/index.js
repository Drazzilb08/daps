/**
 * Error System - Composition-first error handling architecture
 *
 * Primitives (4 components):
 * - ErrorContainer, ErrorIcon, ErrorMessage, ErrorActions
 *
 * Boundaries (2 specialized + 1 base):
 * - PageErrorBoundary (page-level errors)
 * - FeatureErrorBoundary (feature-level errors with critical/inline modes)
 * - ErrorBoundary (base class for extension)
 *
 * Context & Hooks:
 * - ErrorProvider (global error state)
 * - useErrorContext (error reporting)
 * - useErrorRecovery (recovery actions with retry limits)
 */

export * from './primitives';
export { ErrorBoundary } from './ErrorBoundary';
export { default as PageErrorBoundary } from './PageErrorBoundary';
export { default as FeatureErrorBoundary } from './FeatureErrorBoundary';
export { ErrorProvider, useErrorContext, useErrorRecovery } from './ErrorContext';

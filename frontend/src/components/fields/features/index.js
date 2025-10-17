/**
 * Features Export Module
 *
 * Centralized exports for feature components used by multiple field types.
 * Features are shared functionality used by 2+ fields but not universal.
 *
 * Architecture:
 *   - /shared/: Components used by multiple field types
 *   - /color/: Color-specific features
 *   - Other domain-specific directories as needed
 */

// Shared features - used by multiple field types
export * from './shared';

// Color features - shared between color field types
export * from './color';

// Tag features - agnostic string collection components
export * from './tag';

// Schedule features - time-based configuration components
export * from './schedule';

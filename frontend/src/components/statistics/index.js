/**
 * Statistics System - Primitive Composition Architecture
 *
 * Complete statistics display system built on primitive composition.
 *
 * Primitives (building blocks):
 * - StatIcon, StatLabel, StatValue, StatChange
 *
 * Composition:
 * - StatCard (composes Card primitive + statistics primitives)
 *
 * Layouts:
 * - StatGrid (responsive grid)
 * - StatList (vertical list)
 * - StatInline (horizontal inline)
 *
 * @example
 * import { StatCard } from './components/ui';
 * import { StatGrid } from './components/statistics';
 *
 * <StatGrid columns={3}>
 *   <StatCard label="Users" value={1234} icon="👥" />
 *   <StatCard label="Revenue" value={42000} icon="💰" />
 * </StatGrid>
 */

// Re-export primitives
export * from './primitives';

// Re-export layouts
export * from './layouts';

// Note: StatCard is exported from components/ui/StatCard.jsx
// Import it directly: import { StatCard } from './components/ui';

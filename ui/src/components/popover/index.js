/**
 * Popover Components - Generic, reusable popover building blocks
 *
 * These components provide truly generic patterns found across multiple
 * popovers in the DAPS application:
 *
 * - PopoverHeader: Title + action buttons pattern (used 4+ places)
 * - PopoverActions: Cancel + primary action footer pattern (used 10+ places)
 * - PopoverVariants: Content variants for PopoverFactory system
 *
 * Only created after confirming patterns exist in 3+ places to avoid
 * creating fake abstractions.
 */

export { default as PopoverHeader } from './PopoverHeader';
export { default as PopoverActions } from './PopoverActions';

// PopoverFactory variant components
export {
    PopoverHelp,
    PopoverSelector,
    PopoverActionsList,
    PopoverDefault,
} from './PopoverVariants';

/**
 * Positioning engine for dropdowns, tooltips, and popovers
 * Handles viewport boundary detection and collision avoidance
 */

/**
 * Calculate optimal position for floating element
 * @param {DOMRect} anchorRect - Anchor element's getBoundingClientRect()
 * @param {Object} contentDimensions - {width, height} of floating content
 * @param {string} placement - Preferred placement ('bottom-right', 'bottom-left', etc.)
 * @param {number} gap - Gap between anchor and content (default: 4)
 * @returns {Object} {top, left, finalPlacement}
 */
export function calculateOptimalPosition(
    anchorRect,
    contentDimensions,
    placement = 'bottom-right',
    gap = 4
) {
    const viewport = {
        width: window.innerWidth,
        height: window.innerHeight,
    };

    const { width: dropdownWidth, height: dropdownHeight } = contentDimensions;

    // Validate that anchor is still visible (not scrolled out of view)
    if (anchorRect.top < -anchorRect.height || anchorRect.top > viewport.height) {
        // Anchor scrolled out of view
        return null;
    }

    let top, left;
    let finalPlacement = placement;

    // Calculate initial position based on placement
    switch (placement) {
        case 'bottom-left':
            top = anchorRect.bottom + gap;
            left = anchorRect.left;
            break;
        case 'bottom-right':
            top = anchorRect.bottom + gap;
            left = anchorRect.right - dropdownWidth;
            break;
        case 'bottom-center':
            top = anchorRect.bottom + gap;
            left = anchorRect.left + (anchorRect.width - dropdownWidth) / 2;
            break;
        case 'top-left':
            top = anchorRect.top - dropdownHeight - gap;
            left = anchorRect.left;
            break;
        case 'top-right':
            top = anchorRect.top - dropdownHeight - gap;
            left = anchorRect.right - dropdownWidth;
            break;
        case 'top-center':
            top = anchorRect.top - dropdownHeight - gap;
            left = anchorRect.left + (anchorRect.width - dropdownWidth) / 2;
            break;
        case 'left':
            top = anchorRect.top + (anchorRect.height - dropdownHeight) / 2;
            left = anchorRect.left - dropdownWidth - gap;
            break;
        case 'right':
            top = anchorRect.top + (anchorRect.height - dropdownHeight) / 2;
            left = anchorRect.right + gap;
            break;
        default:
            // Default to bottom-right
            top = anchorRect.bottom + gap;
            left = anchorRect.right - dropdownWidth;
            finalPlacement = 'bottom-right';
    }

    // Viewport boundary detection and collision avoidance

    // Check horizontal bounds
    if (left < 0) {
        left = Math.max(8, anchorRect.left); // Minimum 8px from edge
    } else if (left + dropdownWidth > viewport.width) {
        left = Math.min(viewport.width - dropdownWidth - 8, anchorRect.right - dropdownWidth);
    }

    // Check vertical bounds and flip if needed
    if (top < 0) {
        // Not enough space above, try below
        if (finalPlacement.startsWith('top-')) {
            top = anchorRect.bottom + gap;
        } else {
            top = 8; // Minimum from top edge
        }
    } else if (top + dropdownHeight > viewport.height) {
        // Not enough space below, try above
        if (finalPlacement.startsWith('bottom-')) {
            const newTop = anchorRect.top - dropdownHeight - gap;
            if (newTop >= 0) {
                top = newTop;
            } else {
                top = Math.max(8, viewport.height - dropdownHeight - 8);
            }
        } else {
            top = Math.max(8, viewport.height - dropdownHeight - 8);
        }
    }

    // Ensure dropdown stays within reasonable bounds
    left = Math.max(8, Math.min(left, viewport.width - dropdownWidth - 8));
    top = Math.max(8, Math.min(top, viewport.height - dropdownHeight - 8));

    return {
        top,
        left,
        finalPlacement,
    };
}

/**
 * Check if element is visible in viewport with threshold
 * @param {HTMLElement} element - Element to check
 * @param {number} threshold - Visibility threshold (0-1)
 * @returns {boolean} Whether element meets visibility threshold
 */
export function isElementVisible(element, threshold = 0.5) {
    if (!element) return false;

    const rect = element.getBoundingClientRect();
    const viewport = {
        width: window.innerWidth,
        height: window.innerHeight,
    };

    const visibleWidth = Math.min(rect.right, viewport.width) - Math.max(rect.left, 0);
    const visibleHeight = Math.min(rect.bottom, viewport.height) - Math.max(rect.top, 0);

    const visibleArea = Math.max(0, visibleWidth) * Math.max(0, visibleHeight);
    const totalArea = rect.width * rect.height;

    return totalArea > 0 ? visibleArea / totalArea >= threshold : false;
}

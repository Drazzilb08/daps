import React, { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';
import { calculateOptimalPosition, isElementVisible } from '../../utils/positioning';

/**
 * Reusable dropdown container component
 *
 * Provides dropdown functionality that can be used anywhere in the app.
 * Handles click-outside, escape key, and focus management.
 *
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Whether dropdown is visible
 * @param {Function} props.onClose - Callback when dropdown should close
 * @param {React.ReactNode} props.children - Dropdown content
 * @param {React.RefObject} props.anchorRef - Reference to element that triggers dropdown
 * @param {string} [props.className] - Additional CSS classes
 * @param {string} [props.placement='bottom-right'] - Where to position dropdown relative to anchor
 */
const Dropdown = ({
    isOpen,
    onClose,
    children,
    anchorRef,
    className = '',
    placement = 'bottom-right',
}) => {
    const dropdownRef = useRef(null);
    const [position, setPosition] = useState({ top: 0, left: 0 });

    // Close dropdown when clicking outside or pressing escape
    useEffect(() => {
        if (!isOpen) return;

        const handleClickOutside = event => {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target) &&
                anchorRef.current &&
                !anchorRef.current.contains(event.target)
            ) {
                onClose();
            }
        };

        const handleEscape = event => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscape);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscape);
        };
    }, [isOpen, onClose, anchorRef]);

    // Calculate position based on anchor element with viewport boundary detection
    useEffect(() => {
        const calculatePosition = () => {
            if (isOpen && anchorRef.current && dropdownRef.current) {
                const anchorRect = anchorRef.current.getBoundingClientRect();
                const dropdownRect = dropdownRef.current.getBoundingClientRect();

                // Validate that anchor is still visible
                if (!isElementVisible(anchorRef.current, 0.1)) {
                    onClose();
                    return;
                }

                const optimalPosition = calculateOptimalPosition(
                    anchorRect,
                    { width: dropdownRect.width, height: dropdownRect.height },
                    placement,
                    4
                );

                if (optimalPosition) {
                    setPosition({
                        top: optimalPosition.top,
                        left: optimalPosition.left,
                    });
                }
            }
        };

        if (isOpen) {
            calculatePosition();
        }

        // Keep existing scroll handler logic
        if (isOpen) {
            const handleScroll = () => {
                calculatePosition();
            };

            // Add scroll listener to update position during scroll
            window.addEventListener('scroll', handleScroll, { passive: true, capture: true });
            window.addEventListener('resize', handleScroll);

            return () => {
                window.removeEventListener('scroll', handleScroll, { capture: true });
                window.removeEventListener('resize', handleScroll);
            };
        }
    }, [isOpen, placement, anchorRef, onClose]);

    // Focus management - focus first interactive element when opened
    useEffect(() => {
        if (isOpen && dropdownRef.current) {
            const firstFocusable = dropdownRef.current.querySelector(
                'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
            );
            if (firstFocusable) {
                firstFocusable.focus();
            }
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const dropdownClassName = [
        'dropdown',
        'bg-surface-elevated rounded-md shadow-lg p-1 min-w-dropdown max-w-dropdown w-max-content',
        className,
    ]
        .filter(Boolean)
        .join(' ');

    // Use portal to render outside of container constraints
    return createPortal(
        <div
            ref={dropdownRef}
            className={dropdownClassName}
            style={{
                position: 'fixed',
                top: position.top,
                left: position.left,
                zIndex: 1000,
            }}
        >
            {children}
        </div>,
        document.body
    );
};

Dropdown.propTypes = {
    isOpen: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
    children: PropTypes.node.isRequired,
    anchorRef: PropTypes.object.isRequired,
    className: PropTypes.string,
    placement: PropTypes.oneOf([
        'bottom-left',
        'bottom-right',
        'bottom-center',
        'top-left',
        'top-right',
        'top-center',
        'left',
        'right',
    ]),
};

export default Dropdown;

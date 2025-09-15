import React, { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';

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
  placement = 'bottom-right'
}) => {
  const dropdownRef = useRef(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  // Close dropdown when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target) &&
        anchorRef.current &&
        !anchorRef.current.contains(event.target)
      ) {
        onClose();
      }
    };

    const handleEscape = (event) => {
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
    if (isOpen && anchorRef.current && dropdownRef.current) {
      const anchorRect = anchorRef.current.getBoundingClientRect();
      const dropdownRect = dropdownRef.current.getBoundingClientRect();
      const viewport = {
        width: window.innerWidth,
        height: window.innerHeight
      };
      const scrollY = window.scrollY;
      const scrollX = window.scrollX;

      const gap = 4; // Space between anchor and dropdown

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
          left = anchorRect.right - dropdownRect.width;
          break;
        case 'bottom-center':
          top = anchorRect.bottom + gap;
          left = anchorRect.left + (anchorRect.width - dropdownRect.width) / 2;
          break;
        case 'top-left':
          top = anchorRect.top - dropdownRect.height - gap;
          left = anchorRect.left;
          break;
        case 'top-right':
          top = anchorRect.top - dropdownRect.height - gap;
          left = anchorRect.right - dropdownRect.width;
          break;
        case 'top-center':
          top = anchorRect.top - dropdownRect.height - gap;
          left = anchorRect.left + (anchorRect.width - dropdownRect.width) / 2;
          break;
        case 'left':
          top = anchorRect.top + (anchorRect.height - dropdownRect.height) / 2;
          left = anchorRect.left - dropdownRect.width - gap;
          break;
        case 'right':
          top = anchorRect.top + (anchorRect.height - dropdownRect.height) / 2;
          left = anchorRect.right + gap;
          break;
        default:
          // Default to bottom-right
          top = anchorRect.bottom + gap;
          left = anchorRect.right - dropdownRect.width;
          finalPlacement = 'bottom-right';
      }

      // Viewport boundary detection and collision avoidance

      // Check horizontal bounds
      if (left < 0) {
        left = Math.max(8, anchorRect.left); // Minimum 8px from edge
      } else if (left + dropdownRect.width > viewport.width) {
        left = Math.min(viewport.width - dropdownRect.width - 8, anchorRect.right - dropdownRect.width);
      }

      // Check vertical bounds and flip if needed
      if (top < 0) {
        // Not enough space above, try below
        if (finalPlacement.startsWith('top-')) {
          top = anchorRect.bottom + gap;
        } else {
          top = 8; // Minimum from top edge
        }
      } else if (top + dropdownRect.height > viewport.height) {
        // Not enough space below, try above
        if (finalPlacement.startsWith('bottom-')) {
          const newTop = anchorRect.top - dropdownRect.height - gap;
          if (newTop >= 0) {
            top = newTop;
          } else {
            top = Math.max(8, viewport.height - dropdownRect.height - 8);
          }
        } else {
          top = Math.max(8, viewport.height - dropdownRect.height - 8);
        }
      }

      // Ensure dropdown stays within reasonable bounds
      left = Math.max(8, Math.min(left, viewport.width - dropdownRect.width - 8));
      top = Math.max(8, Math.min(top, viewport.height - dropdownRect.height - 8));

      setPosition({
        top: top + scrollY,
        left: left + scrollX
      });
    }
  }, [isOpen, anchorRef, placement]);

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
    className
  ].filter(Boolean).join(' ');

  // Use portal to render outside of container constraints
  return createPortal(
    <div
      ref={dropdownRef}
      className={dropdownClassName}
      style={{
        position: 'fixed',
        top: position.top,
        left: position.left,
        zIndex: 1000
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
    'bottom-left', 'bottom-right', 'bottom-center',
    'top-left', 'top-right', 'top-center',
    'left', 'right'
  ])
};

export default Dropdown;
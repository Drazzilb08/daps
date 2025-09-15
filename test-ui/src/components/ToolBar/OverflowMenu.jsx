import React, { useRef, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import PropTypes from 'prop-types';

/**
 * Dropdown menu for toolbar overflow items
 * Positioned via CSS using design tokens
 *
 * @param {Object} props - Component props
 * @param {boolean} props.isOpen - Whether menu is visible
 * @param {Function} props.onClose - Callback when menu should close
 * @param {React.ReactNode} props.children - Menu items
 * @param {React.RefObject} props.anchorRef - Reference to button that opens menu
 */
const OverflowMenu = ({ isOpen, onClose, children, anchorRef }) => {
  const menuRef = useRef(null);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  // Close menu when clicking outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event) => {
      if (
        menuRef.current &&
        !menuRef.current.contains(event.target) &&
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

  // Calculate position based on anchor button
  useEffect(() => {
    if (isOpen && anchorRef.current) {
      const buttonRect = anchorRef.current.getBoundingClientRect();
      const scrollY = window.scrollY;
      const scrollX = window.scrollX;

      // Use 140px as menu width to match CSS
      const menuWidth = 140;

      setPosition({
        top: buttonRect.bottom + scrollY + 4, // 4px gap below button
        left: buttonRect.right + scrollX - menuWidth // Align right edge with button
      });
    }
  }, [isOpen, anchorRef]);

  // Focus management
  useEffect(() => {
    if (isOpen && menuRef.current) {
      const firstItem = menuRef.current.querySelector('[role="menuitem"]');
      if (firstItem) {
        firstItem.focus();
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Render menu using portal to break out of toolbar container
  return createPortal(
    <div
      ref={menuRef}
      className="toolbar-overflow-menu"
      role="menu"
      aria-label="More actions"
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

OverflowMenu.propTypes = {
  isOpen: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  children: PropTypes.node.isRequired,
  anchorRef: PropTypes.object.isRequired
};

export default OverflowMenu;
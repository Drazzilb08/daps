import React, { useRef } from 'react';
import ReactDOM from 'react-dom';
import { useFocusTrap, useModalCloseOnOutsideClick } from './helpers/useModalHelpers';

/**
 * Base modal container that handles portal rendering, focus management, and outside-click behavior
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Modal content to render
 * @param {Function} props.onClose - Close handler function
 * @param {string} [props.modalClass='modal-content'] - CSS class for modal container
 * @param {Object} [props.style] - Inline styles for modal container
 * @param {boolean} [props.isSmallModal=false] - Whether to render as compact modal
 * @param {number} [props.maxWidth] - Maximum modal width (for small modals)
 * @param {number} [props.minWidth] - Minimum modal width (for small modals)
 * @returns {JSX.Element} Portal-rendered modal container
 */
export const ModalContainer = ({
    children,
    onClose,
    modalClass = 'modal-content',
    style,
    isSmallModal = false,
    maxWidth,
    minWidth,
}) => {
    const modalRef = useRef();

    // Setup focus trap and outside click handling
    useFocusTrap(modalRef);
    useModalCloseOnOutsideClick(modalRef, onClose);

    // Small modal styling - specific dimensions for compact modals
    const smallModalStyle = isSmallModal
        ? {
              maxWidth,
              minWidth,
              borderRadius: 11,
              padding: 0,
              boxShadow: 'var(--shadow-3)',
              ...style,
          }
        : style;

    const modalContent = (
        <div className="modal show" tabIndex={-1}>
            <div className={modalClass} ref={modalRef} style={smallModalStyle}>
                {children}
            </div>
        </div>
    );

    // Render to modal-root portal
    return ReactDOM.createPortal(modalContent, document.getElementById('modal-root'));
};

export default ModalContainer;

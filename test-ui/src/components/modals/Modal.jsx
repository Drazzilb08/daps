import { useState, useContext, createContext, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useUIState } from '../../contexts/UIStateContext';
import { useFocusTrap } from '../../hooks/useFocusTrap';
import { useBodyScrollLock } from '../../hooks/useBodyScrollLock';
import { useEscapeKey } from '../../hooks/useEscapeKey';

/**
 * Context for sharing modal state between Modal and subcomponents
 * @typedef {Object} ModalContextValue
 * @property {boolean} isOpen - Current open state
 * @property {Function} handleClose - Close handler function
 * @property {boolean} closable - Whether modal can be closed
 */
const ModalContext = createContext(null);

/**
 * Modal - Portal-based modal component with backdrop and subcomponents
 *
 * Supports both controlled and uncontrolled modes:
 * - Uncontrolled: Use `defaultOpen` prop, component manages state internally
 * - Controlled: Use `isOpen` and `onClose` props, parent manages state
 *
 * @example
 * // Controlled mode
 * <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} size="medium">
 *   <Modal.Header>Confirmation</Modal.Header>
 *   <Modal.Body>Are you sure?</Modal.Body>
 *   <Modal.Footer align="right">
 *     <Button onClick={handleConfirm}>Confirm</Button>
 *   </Modal.Footer>
 * </Modal>
 *
 * @example
 * // Uncontrolled mode
 * <Modal defaultOpen={true} onClose={handleClose}>
 *   <Modal.Header>Alert</Modal.Header>
 *   <Modal.Body>Operation completed</Modal.Body>
 * </Modal>
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Modal.Header, Modal.Body, Modal.Footer
 * @param {boolean} [props.isOpen] - Controlled open state
 * @param {boolean} [props.defaultOpen=false] - Initial open state (uncontrolled mode)
 * @param {Function} [props.onClose] - Callback when modal closes: () => void
 * @param {'small'|'medium'|'large'|'full'} [props.size='medium'] - Modal size variant
 * @param {boolean} [props.closable=true] - Whether modal can be closed (backdrop click, ESC, close button)
 * @param {boolean} [props.backdrop=true] - Whether to render backdrop
 * @param {string} [props.className] - Additional CSS classes for modal container
 * @returns {JSX.Element|null} Modal component or null if not open
 */
export const Modal = ({
    children,
    isOpen: controlledOpen,
    defaultOpen = false,
    onClose,
    size = 'medium',
    closable = true,
    backdrop = true,
    className = '',
}) => {
    // State management: controlled vs uncontrolled
    const [internalOpen, setInternalOpen] = useState(defaultOpen);
    const isControlled = controlledOpen !== undefined;
    const isOpen = isControlled ? controlledOpen : internalOpen;

    const { isMobile } = useUIState();

    // Container ref for focus trap
    const containerRef = useRef(null);

    const handleClose = useCallback(() => {
        if (!closable) return;

        const newOpen = false;

        if (!isControlled) {
            setInternalOpen(newOpen);
        }

        onClose?.();
    }, [closable, isControlled, onClose]);

    // Accessibility hooks
    useFocusTrap(containerRef, isOpen && closable);
    useBodyScrollLock(isOpen);
    useEscapeKey(handleClose, isOpen && closable);

    // Don't render if not open
    if (!isOpen) return null;

    // Size variants via utility classes
    const sizeClasses = {
        small: 'max-w-md', // 28rem (448px)
        medium: 'max-w-2xl', // 42rem (672px)
        large: 'max-w-4xl', // 56rem (896px)
        full: 'max-w-7xl', // 80rem (1280px)
    };

    // All styling via utility classes
    const containerClasses = `
        relative flex flex-col w-full mx-4
        max-h-[90vh] rounded-lg shadow-lg overflow-hidden border
        bg-surface border-border
        transition-transform duration-200
        z-modal
        ${isMobile ? 'max-w-full' : sizeClasses[size]}
        ${className}
    `
        .trim()
        .replace(/\s+/g, ' ');

    // Backdrop styling
    const backdropClasses = `
        fixed inset-0 z-modal-backdrop
        flex items-center justify-center
        ${backdrop ? 'bg-overlay-strong' : ''}
        transition-opacity duration-200
    `
        .trim()
        .replace(/\s+/g, ' ');

    // Backdrop click handler
    const handleBackdropClick = event => {
        if (closable && event.target === event.currentTarget) {
            handleClose();
        }
    };

    // Get modal root
    const modalRoot = document.getElementById('modal-root');
    if (!modalRoot) {
        console.error('Modal: #modal-root element not found in document');
        return null;
    }

    // Portal content
    const modalContent = (
        <ModalContext.Provider value={{ isOpen, handleClose, closable }}>
            <div className={backdropClasses} onClick={handleBackdropClick}>
                <div
                    ref={containerRef}
                    className={containerClasses}
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="modal-title"
                >
                    {children}
                </div>
            </div>
        </ModalContext.Provider>
    );

    return createPortal(modalContent, modalRoot);
};

Modal.displayName = 'Modal';

/**
 * Modal.Header - Renders modal header with optional close button
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Header content (typically title)
 * @param {string} [props.className] - Additional CSS classes for header
 * @returns {JSX.Element} Header component
 */
const ModalHeader = ({ children, className = '' }) => {
    const context = useContext(ModalContext);

    if (!context) {
        throw new Error('Modal.Header must be used within Modal');
    }

    const { handleClose, closable } = context;

    const headerClasses =
        `flex items-center justify-between p-4 border-b border-border ${className}`
            .trim()
            .replace(/\s+/g, ' ');

    return (
        <div className={headerClasses}>
            <div className="flex-1" id="modal-title">
                {children}
            </div>
            {closable && (
                <button
                    onClick={handleClose}
                    className="flex items-center justify-center min-w-11 min-h-11 ml-3 rounded hover:bg-surface-hover text-secondary transition-colors"
                    aria-label="Close modal"
                    type="button"
                >
                    <span className="material-symbols-outlined text-2xl">close</span>
                </button>
            )}
        </div>
    );
};

ModalHeader.displayName = 'Modal.Header';
Modal.Header = ModalHeader;

/**
 * Modal.Body - Renders scrollable modal content area
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Body content
 * @param {string} [props.className] - Additional CSS classes for body
 * @returns {JSX.Element} Body component
 */
const ModalBody = ({ children, className = '' }) => {
    const context = useContext(ModalContext);

    if (!context) {
        throw new Error('Modal.Body must be used within Modal');
    }

    const bodyClasses = `p-6 overflow-y-auto max-h-modal-body ${className}`
        .trim()
        .replace(/\s+/g, ' ');

    return <div className={bodyClasses}>{children}</div>;
};

ModalBody.displayName = 'Modal.Body';
Modal.Body = ModalBody;

/**
 * Modal.Footer - Renders modal footer with action buttons
 *
 * @param {Object} props - Component props
 * @param {React.ReactNode} props.children - Footer content (typically buttons)
 * @param {string} [props.className] - Additional CSS classes for footer
 * @param {'left'|'center'|'right'|'space-between'} [props.align='right'] - Button alignment
 * @returns {JSX.Element} Footer component
 */
const ModalFooter = ({ children, className = '', align = 'right' }) => {
    const context = useContext(ModalContext);

    if (!context) {
        throw new Error('Modal.Footer must be used within Modal');
    }

    // Alignment mapping
    const alignmentClasses = {
        left: 'justify-start',
        center: 'justify-center',
        right: 'justify-end',
        'space-between': 'justify-between',
    };

    const footerClasses =
        `flex gap-3 p-4 border-t border-border ${alignmentClasses[align]} ${className}`
            .trim()
            .replace(/\s+/g, ' ');

    return <div className={footerClasses}>{children}</div>;
};

ModalFooter.displayName = 'Modal.Footer';
Modal.Footer = ModalFooter;

export default Modal;

import { useEffect } from 'react';

// Focus trap for modal
export function useFocusTrap(modalRef) {
    useEffect(() => {
        function trapFocus(e) {
            if (e.key !== 'Tab') return;
            const modalContent = modalRef.current;
            if (!modalContent) return;
            const focusable = Array.from(
                modalContent.querySelectorAll(
                    'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
                )
            ).filter(el => el.offsetParent !== null);
            if (!focusable.length) return;
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (e.shiftKey) {
                if (document.activeElement === first) {
                    e.preventDefault();
                    last.focus();
                }
            } else {
                if (document.activeElement === last) {
                    e.preventDefault();
                    first.focus();
                }
            }
        }
        document.addEventListener('keydown', trapFocus);
        return () => document.removeEventListener('keydown', trapFocus);
    }, [modalRef]);
}

// Outside click for modal
export function useModalCloseOnOutsideClick(modalRef, onClose) {
    useEffect(() => {
        function handler(e) {
            if (modalRef.current && e.target === modalRef.current.parentNode) {
                onClose();
            }
        }
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [modalRef, onClose]);
}

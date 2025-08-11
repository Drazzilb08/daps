import React, { useRef } from 'react';
import { ModalHeader } from './helpers/ModalHelpers';
import { useFocusTrap, useModalCloseOnOutsideClick } from './helpers/useModalHelpers';

export default function SmallModalFactory({
    title = '',
    message = '',
    onClose,
    actions = [],
    maxWidth = 370,
    minWidth = 0,
    children = null,
}) {
    const modalRef = useRef();
    useFocusTrap(modalRef);
    useModalCloseOnOutsideClick(modalRef, onClose);

    // NOTE: button classes, order, text, and handlers are controlled by props

    return (
        <div className="modal show" tabIndex={-1}>
            <div
                className="modal-content"
                ref={modalRef}
                style={{
                    maxWidth,
                    minWidth,
                    borderRadius: 11,
                    padding: 0,
                    boxShadow:
                        '0 6px 24px 0 rgba(30, 32, 44, 0.18), 0 1.2px 5px rgba(20, 20, 28, 0.12)',
                }}
            >
                <ModalHeader title={title} onClose={onClose} />
                <div
                    className="modal-body"
                    style={{ padding: '1.7em 1.65em 0.6em 1.65em', textAlign: 'center' }}
                >
                    {message && (
                        <div
                            style={{
                                fontSize: '1.08rem',
                                color: '#fff',
                                fontWeight: 500,
                                marginBottom: '1.25em',
                                letterSpacing: 0.03,
                            }}
                        >
                            {message}
                        </div>
                    )}
                    {children}

                    {/* Move buttons to body for small modals */}
                    <div
                        style={{
                            display: 'flex',
                            flexDirection: 'column',
                            gap: '0.7em',
                            marginTop: '1.5em',
                            width: '100%',
                        }}
                    >
                        {actions.map((btn, i) => (
                            <button
                                key={btn.id || i}
                                type={btn.type || 'button'}
                                className={btn.className || 'btn'}
                                style={{ minWidth: 0, width: '100%' }}
                                onClick={btn.onClick}
                                disabled={btn.disabled}
                                autoFocus={btn.autoFocus}
                            >
                                {btn.label}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="modal-footer" style={{ padding: '0.5rem', minHeight: '0.5rem' }}>
                    {/* Empty footer for consistent spacing */}
                </div>
            </div>
        </div>
    );
}

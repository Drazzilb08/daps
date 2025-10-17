import React from 'react';
import { ModalHeader } from './helpers/ModalHelpers';
import ModalContainer from './ModalContainer';

/**
 * Simple modal component for compact modal display with inline buttons
 * Renders buttons directly in modal body instead of footer
 *
 * @param {Object} props - Component props
 * @param {string} props.title - Modal title
 * @param {Array} [props.footerButtons=[]] - Footer button configurations
 * @param {Function} props.onClose - Close handler
 * @param {Object} [props.onButtonClick={}] - Button click handlers
 * @param {React.ReactNode} props.children - Modal content
 * @param {number} [props.maxWidth=370] - Maximum modal width
 * @param {number} [props.minWidth=0] - Minimum modal width
 * @returns {JSX.Element} Rendered simple modal component
 */
export const ModalSimple = ({
    title,
    footerButtons = [],
    onClose,
    onButtonClick = {},
    children,
    maxWidth = 370,
    minWidth = 0,
}) => {
    return (
        <ModalContainer
            onClose={onClose}
            modalClass="modal-content"
            isSmallModal={true}
            maxWidth={maxWidth}
            minWidth={minWidth}
        >
            <ModalHeader title={title} onClose={onClose} />
            <div
                className="modal-body"
                style={{ padding: '1.7em 1.65em 0.6em 1.65em', textAlign: 'center' }}
            >
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
                    {footerButtons.map((btn, i) => (
                        <button
                            key={btn.id || i}
                            type={btn.type || 'button'}
                            className={btn.className || 'btn'}
                            style={{ minWidth: 0, width: '100%' }}
                            onClick={() => onButtonClick[btn.id]?.({})}
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
        </ModalContainer>
    );
};

export default ModalSimple;

// ui/src/hooks/useModal.js
// Simplified modal management hook that replaces complex ModalFactory usage

import { useState, useCallback, useRef, useEffect } from 'react';
import React from 'react';
import ReactDOM from 'react-dom';
import ModalFactory from '../components/modals/ModalFactory';

/**
 * Enhanced modal management hook
 * Provides clean API for all modal types while maintaining ModalFactory features
 *
 * @returns {Object} Modal management interface
 */
export function useModal() {
    const [modals, setModals] = useState([]);
    const modalCounterRef = useRef(0);

    // Ensure modal root exists
    useEffect(() => {
        let modalRoot = document.getElementById('modal-root');
        if (!modalRoot) {
            modalRoot = document.createElement('div');
            modalRoot.id = 'modal-root';
            document.body.appendChild(modalRoot);
        }
    }, []);

    /**
     * Close a specific modal by ID
     * @param {number} modalId - Modal ID to close
     */
    const closeModal = useCallback(modalId => {
        setModals(prev => prev.filter(modal => modal.id !== modalId));
    }, []);

    /**
     * Update modal configuration
     * @param {number} modalId - Modal ID to update
     * @param {Object} newConfig - New configuration to merge
     */
    const updateModal = useCallback(
        (modalId, newConfig) => {
            setModals(prev =>
                prev.map(modal =>
                    modal.id === modalId
                        ? {
                              ...modal,
                              config: {
                                  ...modal.config,
                                  ...newConfig,
                                  onClose: () => closeModal(modalId), // Preserve close handler
                              },
                          }
                        : modal
                )
            );
        },
        [closeModal]
    );

    /**
     * Open a form modal with schema-based fields
     * @param {Object} config - Modal configuration
     * @param {string} config.title - Modal title
     * @param {Array} [config.schema=[]] - Field schema for form
     * @param {Object} [config.entry={}] - Initial form data
     * @param {Array} [config.footerButtons=[]] - Footer button configurations
     * @param {Object} [config.moduleConfig=null] - Module configuration
     * @param {Object} [config.rootConfig=null] - Root configuration
     * @param {string} [config.modalClass='modal-content'] - CSS class for modal
     * @param {Object} [config.layout=null] - Layout configuration (two-column, sections, etc.)
     * @param {Function} [config.onFieldChange=null] - Field change handler
     * @param {Object} [config.fieldRefs={}] - Field ref objects
     * @param {number} [config.maxWidth=1000] - Maximum modal width
     * @param {number} [config.minWidth=280] - Minimum modal width
     * @param {Object} [config.onButtonClick={}] - Button click handlers
     * @returns {Object} Modal control interface
     */
    const openFormModal = useCallback(
        config => {
            const modalId = ++modalCounterRef.current;

            // Wrap button handlers to ensure closeModal is available
            const wrappedButtonHandlers = {};
            if (config.onButtonClick) {
                Object.keys(config.onButtonClick).forEach(buttonId => {
                    const originalHandler = config.onButtonClick[buttonId];
                    wrappedButtonHandlers[buttonId] = args => {
                        // Provide closeModal function to the handler
                        originalHandler({
                            ...args,
                            closeModal: () => closeModal(modalId),
                        });
                    };
                });
            }

            const modalControl = {
                id: modalId,
                type: 'form',
                config: {
                    ...config,
                    onClose: () => closeModal(modalId),
                    onButtonClick: wrappedButtonHandlers,
                },
                close: () => closeModal(modalId),
                update: newConfig => updateModal(modalId, newConfig),
            };

            setModals(prev => [...prev, modalControl]);
            return modalControl;
        },
        [closeModal, updateModal]
    );

    /**
     * Open a simple modal with custom content and buttons
     * @param {Object} config - Modal configuration
     * @param {string} [config.title] - Modal title (null for no header)
     * @param {React.ReactNode} config.children - Modal content
     * @param {Array} [config.footerButtons=[]] - Footer button configurations
     * @param {Object} [config.onButtonClick={}] - Button click handlers
     * @param {number} [config.maxWidth=370] - Maximum modal width
     * @param {number} [config.minWidth=0] - Minimum modal width
     * @returns {Object} Modal control interface
     */
    const openSmallModal = useCallback(
        config => {
            const modalId = ++modalCounterRef.current;

            // Wrap button handlers to ensure closeModal is available
            const wrappedButtonHandlers = {};
            if (config.onButtonClick) {
                Object.keys(config.onButtonClick).forEach(buttonId => {
                    const originalHandler = config.onButtonClick[buttonId];
                    wrappedButtonHandlers[buttonId] = args => {
                        // Provide closeModal function to the handler
                        originalHandler({
                            ...args,
                            closeModal: () => closeModal(modalId),
                        });
                    };
                });
            }

            const modalControl = {
                id: modalId,
                type: 'small',
                config: {
                    ...config,
                    isSmallModal: true,
                    onClose: () => closeModal(modalId),
                    onButtonClick: wrappedButtonHandlers,
                },
                close: () => closeModal(modalId),
                update: newConfig => updateModal(modalId, newConfig),
            };

            setModals(prev => [...prev, modalControl]);
            return modalControl;
        },
        [closeModal, updateModal]
    );

    /**
     * Open a custom modal with full control over content
     * @param {Object} config - Modal configuration
     * @param {string} config.title - Modal title
     * @param {React.ReactNode} config.children - Modal content
     * @param {string} [config.modalClass='modal-content'] - CSS class for modal
     * @param {Array} [config.footerButtons=[]] - Footer button configurations
     * @param {Object} [config.onButtonClick={}] - Button click handlers
     * @param {number} [config.maxWidth=1000] - Maximum modal width
     * @param {number} [config.minWidth=280] - Minimum modal width
     * @returns {Object} Modal control interface
     */
    const openCustomModal = useCallback(
        config => {
            const modalId = ++modalCounterRef.current;

            // Wrap button handlers to ensure closeModal is available
            const wrappedButtonHandlers = {};
            if (config.onButtonClick) {
                Object.keys(config.onButtonClick).forEach(buttonId => {
                    const originalHandler = config.onButtonClick[buttonId];
                    wrappedButtonHandlers[buttonId] = args => {
                        // Provide closeModal function to the handler
                        originalHandler({
                            ...args,
                            closeModal: () => closeModal(modalId),
                        });
                    };
                });
            }

            const modalControl = {
                id: modalId,
                type: 'custom',
                config: {
                    ...config,
                    onClose: () => closeModal(modalId),
                    onButtonClick: wrappedButtonHandlers,
                },
                close: () => closeModal(modalId),
                update: newConfig => updateModal(modalId, newConfig),
            };

            setModals(prev => [...prev, modalControl]);
            return modalControl;
        },
        [closeModal, updateModal]
    );

    /**
     * Close all modals
     */
    const closeAllModals = useCallback(() => {
        setModals([]);
    }, []);

    /**
     * Check if any modal is currently open
     * @returns {boolean} True if any modal is open
     */
    const hasOpenModal = modals.length > 0;

    /**
     * Get the currently active (top) modal
     * @returns {Object|null} Active modal or null
     */
    const activeModal = modals.length > 0 ? modals[modals.length - 1] : null;

    // Modal rendering interface for components
    const ModalRenderer = useCallback(() => {
        if (modals.length === 0) return null;

        const modalRoot = document.getElementById('modal-root');
        if (!modalRoot) return null;

        return ReactDOM.createPortal(
            <>
                {modals.map(modal => (
                    <ModalFactory key={modal.id} {...modal.config} />
                ))}
            </>,
            modalRoot
        );
    }, [modals]);

    return {
        // Modal state
        hasOpenModal,
        activeModal,
        modalCount: modals.length,

        // Modal actions
        openFormModal,
        openSmallModal,
        openCustomModal,
        closeModal,
        closeAllModals,
        updateModal,

        // Modal renderer
        ModalRenderer,
    };
}

/**
 * Convenience hook for simple confirmation modals
 * @returns {Function} showConfirmation function
 */
export function useConfirmation() {
    const { openSmallModal } = useModal();

    const showConfirmation = useCallback(
        config => {
            return new Promise(resolve => {
                const {
                    title = 'Confirm Action',
                    message = 'Are you sure?',
                    confirmText = 'Confirm',
                    cancelText = 'Cancel',
                    confirmClassName = 'btn btn--success',
                    cancelClassName = 'btn btn--cancel',
                } = config;

                openSmallModal({
                    title: null,
                    children: (
                        <>
                            {title && (
                                <h3 style={{ marginBottom: '1rem', color: 'var(--text-color)' }}>
                                    {title}
                                </h3>
                            )}
                            {message}
                        </>
                    ),
                    footerButtons: [
                        {
                            id: 'confirm',
                            label: confirmText,
                            className: confirmClassName,
                            autoFocus: true,
                        },
                        {
                            id: 'cancel',
                            label: cancelText,
                            className: cancelClassName,
                        },
                    ],
                    onButtonClick: {
                        confirm: ({ closeModal }) => {
                            resolve(true);
                            closeModal();
                        },
                        cancel: ({ closeModal }) => {
                            resolve(false);
                            closeModal();
                        },
                    },
                });
            });
        },
        [openSmallModal]
    );

    return showConfirmation;
}

/**
 * Hook for managing modal stacks (multiple modals)
 * @returns {Object} Modal stack management interface
 */
export function useModalStack() {
    const modalApi = useModal();
    const [modalStack, setModalStack] = useState([]);

    const pushModal = useCallback(
        config => {
            const modal = modalApi.openFormModal(config);
            setModalStack(prev => [...prev, modal]);
            return modal;
        },
        [modalApi]
    );

    const popModal = useCallback(() => {
        if (modalStack.length > 0) {
            const topModal = modalStack[modalStack.length - 1];
            topModal.close();
            setModalStack(prev => prev.slice(0, -1));
        }
    }, [modalStack]);

    const clearModalStack = useCallback(() => {
        modalStack.forEach(modal => modal.close());
        setModalStack([]);
        modalApi.closeAllModals();
    }, [modalStack, modalApi]);

    return {
        ...modalApi,
        modalStack,
        stackDepth: modalStack.length,
        pushModal,
        popModal,
        clearModalStack,
    };
}

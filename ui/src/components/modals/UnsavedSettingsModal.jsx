import React, { useEffect } from 'react';
import { useModal } from '../../hooks/useModal.jsx';

/**
 * Unsaved Settings Modal using new useModal hook
 * Demonstrates simplified modal API compared to ModalFactory
 */
export default function UnsavedSettingsModal({ onSave, onDiscard, onCancel }) {
    const { openSmallModal, ModalRenderer } = useModal();

    useEffect(() => {
        // Open modal on component mount
        const modal = openSmallModal({
            title: null,
            children: (
                <>
                    You have unsaved changes.
                    <br />
                    What would you like to do?
                </>
            ),
            footerButtons: [
                {
                    id: 'save',
                    label: 'Save',
                    className: 'btn btn--success',
                    autoFocus: true,
                },
                {
                    id: 'cancel',
                    label: 'Cancel',
                    className: 'btn btn--cancel',
                },
                {
                    id: 'discard',
                    label: 'Discard',
                    className: 'btn btn--remove-item',
                },
            ],
            onButtonClick: {
                save: ({ closeModal }) => {
                    onSave && onSave();
                    closeModal();
                },
                cancel: ({ closeModal }) => {
                    onCancel && onCancel();
                    closeModal();
                },
                discard: ({ closeModal }) => {
                    onDiscard && onDiscard();
                    closeModal();
                },
            },
        });

        // Auto-close modal when component unmounts
        return () => modal.close();
    }, [openSmallModal, onSave, onDiscard, onCancel]);

    return <ModalRenderer />;
}

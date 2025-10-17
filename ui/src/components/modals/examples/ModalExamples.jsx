// ui/src/components/modals/examples/ModalExamples.jsx
// Example component demonstrating useModal hook usage

import React from 'react';
import { useModal, useConfirmation } from '../../../hooks/useModal.jsx';

/**
 * Example component showing different modal usage patterns
 * Replaces complex ModalFactory props with simple hook calls
 */
export default function ModalExamples() {
    const {
        openFormModal,
        openSmallModal,
        openCustomModal,
        closeAllModals,
        hasOpenModal,
        modalCount,
        ModalRenderer,
    } = useModal();

    const showConfirmation = useConfirmation();

    // Example: Form modal with schema (like current MediaModalComponent)
    const openMediaManagementModal = () => {
        const mediaItem = {
            title: 'Example Movie',
            year: 2023,
            tmdb_id: 123456,
        };

        openFormModal({
            title: `Media Management - ${mediaItem.title} (${mediaItem.year})`,
            schema: [
                {
                    key: 'selected_arr_instance',
                    label: 'Arr Instance',
                    type: 'dropdown',
                    value: '',
                    options: [
                        { value: 'radarr1', label: 'Radarr Main' },
                        { value: 'sonarr1', label: 'Sonarr Main' },
                    ],
                },
                {
                    key: 'search_query',
                    label: 'Search Query',
                    type: 'text',
                    value: mediaItem.title,
                    helpText: 'Custom search query for this media item',
                },
                {
                    key: 'auto_monitor',
                    label: 'Auto Monitor',
                    type: 'check_box',
                    value: true,
                    helpText: 'Automatically monitor this media item',
                },
            ],
            entry: mediaItem,
            footerButtons: [
                {
                    id: 'cancel',
                    label: 'Cancel',
                    className: 'btn btn--cancel',
                },
                {
                    id: 'save-modal-btn',
                    label: 'Add to Arr',
                    className: 'btn btn--success',
                },
            ],
            onButtonClick: {
                cancel: ({ closeModal }) => closeModal(),
                'save-modal-btn': ({ closeModal, formData }) => {
                    console.log('Adding to Arr with data:', formData);
                    closeModal();
                },
            },
            onFieldChange: (fieldKey, newValue) => {
                console.log(`Field ${fieldKey} changed to:`, newValue);
            },
            modalClass: 'modal-content media-management-modal',
        });
    };

    // Example: Small confirmation modal (like UnsavedSettingsModal)
    const openUnsavedSettingsModal = () => {
        openSmallModal({
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
                    console.log('Saving settings...');
                    closeModal();
                },
                cancel: ({ closeModal }) => closeModal(),
                discard: ({ closeModal }) => {
                    console.log('Discarding changes...');
                    closeModal();
                },
            },
        });
    };

    // Example: Custom modal with complex content
    const openDirectoryPickerModal = () => {
        openCustomModal({
            title: 'Select Directory',
            modalClass: 'modal-content-fit',
            children: (
                <div>
                    <p>Choose a directory from the list below:</p>
                    <ul className="dir-list">
                        <li className="dir-parent" onClick={() => console.log('Navigate up')}>
                            .. (Parent Directory)
                        </li>
                        <li onClick={() => console.log('Select: /movies')}>📁 movies</li>
                        <li onClick={() => console.log('Select: /tv-shows')}>📁 tv-shows</li>
                        <li onClick={() => console.log('Select: /downloads')}>📁 downloads</li>
                    </ul>
                </div>
            ),
            footerButtons: [
                {
                    id: 'cancel',
                    label: 'Cancel',
                    className: 'btn btn--cancel',
                },
                {
                    id: 'select',
                    label: 'Select Directory',
                    className: 'btn btn--success',
                },
            ],
            onButtonClick: {
                cancel: ({ closeModal }) => closeModal(),
                select: ({ closeModal }) => {
                    console.log('Directory selected');
                    closeModal();
                },
            },
        });
    };

    // Example: Using the confirmation hook
    const handleDeleteAction = async () => {
        const confirmed = await showConfirmation({
            title: 'Delete Item',
            message: 'Are you sure you want to delete this item? This action cannot be undone.',
            confirmText: 'Delete',
            cancelText: 'Cancel',
            confirmClassName: 'btn btn--remove-item',
        });

        if (confirmed) {
            console.log('Item deleted');
        } else {
            console.log('Delete cancelled');
        }
    };

    return (
        <div className="modal-examples" style={{ padding: '2rem' }}>
            <h2>Modal Examples</h2>
            <p>Demonstrating the new useModal hook API</p>

            <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
                <button className="btn btn--info" onClick={openMediaManagementModal}>
                    Media Management Modal
                </button>

                <button className="btn btn--info" onClick={openUnsavedSettingsModal}>
                    Unsaved Settings Modal
                </button>

                <button className="btn btn--info" onClick={openDirectoryPickerModal}>
                    Directory Picker Modal
                </button>

                <button className="btn btn--info" onClick={handleDeleteAction}>
                    Confirmation Dialog
                </button>

                <button
                    className="btn btn--cancel"
                    onClick={closeAllModals}
                    disabled={!hasOpenModal}
                >
                    Close All Modals
                </button>
            </div>

            <div style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>
                <p>Open modals: {modalCount}</p>
                <p>Has open modal: {hasOpenModal ? 'Yes' : 'No'}</p>
            </div>

            {/* Render all active modals */}
            <ModalRenderer />
        </div>
    );
}

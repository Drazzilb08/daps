import React from 'react';
import ModalFactory from './ModalFactory';

export default function UnsavedSettingsModal({ onSave, onDiscard, onCancel }) {
    return (
        <ModalFactory
            title={null}
            isSmallModal={true}
            onClose={onCancel}
            footerButtons={[
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
            ]}
            onButtonClick={{
                save: onSave,
                cancel: onCancel,
                discard: onDiscard,
            }}
        >
            <>
                You have unsaved changes.
                <br />
                What would you like to do?
            </>
        </ModalFactory>
    );
}

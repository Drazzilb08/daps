import React from 'react';
import SmallModalFactory from './SmallModalFactory';

export default function UnsavedSettingsModal({ onSave, onDiscard, onCancel }) {
    return (
        <SmallModalFactory
            title={null}
            message={
                <>
                    You have unsaved changes.
                    <br />
                    What would you like to do?
                </>
            }
            onClose={onCancel}
            actions={[
                {
                    id: 'save',
                    label: 'Save',
                    className: 'btn btn--success',
                    onClick: onSave,
                    autoFocus: true,
                },
                {
                    id: 'cancel',
                    label: 'Cancel',
                    className: 'btn btn--cancel',
                    onClick: onCancel,
                },
                {
                    id: 'discard',
                    label: 'Discard',
                    className: 'btn btn--remove-item',
                    onClick: onDiscard,
                },
            ]}
        />
    );
}

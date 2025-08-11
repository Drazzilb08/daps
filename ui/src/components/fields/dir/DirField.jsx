import React, { useRef, useState } from 'react';
import DirectoryPickerModal from '../../modals/DirectoryPickerModal';

export function DirField({
    field,
    value,
    onChange,
    highlightInvalid = false,
    errorMessage = null,
}) {
    const [showModal, setShowModal] = useState(false);
    const [pendingValue, setPendingValue] = useState(value || '');
    const inputRef = useRef();

    const openModal = e => {
        e && e.preventDefault();
        setPendingValue(value || '/');
        setShowModal(true);
    };

    const handleAccept = path => {
        setShowModal(false);
        if (path && path !== value) {
            onChange(path);
        }
    };

    const handleCancel = () => setShowModal(false);

    return (
        <div className={`settings-field-row field-dir${highlightInvalid ? ' field-error' : ''}`}>
            <div className="settings-field-labelcol">
                <label htmlFor={field.key}>{field.label}</label>
            </div>
            <div className="settings-field-inputwrap">
                <input
                    ref={inputRef}
                    type="text"
                    name={field.key}
                    className={`input field-input${highlightInvalid ? ' input-error' : ''}`}
                    value={value ?? ''}
                    readOnly
                    tabIndex={0}
                    placeholder={field.placeholder || 'Choose directory…'}
                    onClick={openModal}
                    onFocus={openModal}
                />
                {field.description && <div className="field-help-text">{field.description}</div>}
                {highlightInvalid && errorMessage && (
                    <div className="field-error-text">{errorMessage}</div>
                )}
            </div>
            {showModal && (
                <DirectoryPickerModal
                    initialPath={pendingValue || '/'}
                    nameValue={null}
                    onAccept={handleAccept}
                    onCancel={handleCancel}
                />
            )}
        </div>
    );
}

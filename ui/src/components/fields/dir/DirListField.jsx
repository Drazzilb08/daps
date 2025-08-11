import React, { useState } from 'react';
import DirectoryPickerModal from '../../modals/DirectoryPickerModal';

export function DirListField({
    field,
    value,
    onChange,
    highlightInvalid = false,
    errorMessage = null,
}) {
    const dirs = Array.isArray(value) ? [...value] : value ? [value] : [''];

    // Modal state
    const [modalIdx, setModalIdx] = useState(null);
    const [modalInitialValue, setModalInitialValue] = useState('/');

    const handleInputChange = (idx, val) => {
        const next = [...dirs];
        next[idx] = val;
        onChange(next);
    };

    const handlePick = (idx, curVal) => {
        setModalIdx(idx);
        setModalInitialValue(curVal || '/');
    };

    const handleModalAccept = path => {
        if (modalIdx !== null && path && path !== dirs[modalIdx]) {
            handleInputChange(modalIdx, path);
        }
        setModalIdx(null);
        setModalInitialValue('/');
    };

    const handleModalCancel = () => {
        setModalIdx(null);
        setModalInitialValue('/');
    };

    const handleRemove = idx => {
        if (dirs.length === 1) return;
        const next = dirs.slice();
        next.splice(idx, 1);
        onChange(next);
    };

    const handleAdd = () => {
        onChange([...dirs, '']);
    };

    return (
        <div
            className={`settings-field-row field-dir-list${highlightInvalid ? ' field-error' : ''}`}
        >
            <div className="settings-field-labelcol dirlist-label-col">
                <label htmlFor={field.key}>{field.label}</label>
                <div style={{ flex: 1 }} />
                <button type="button" className="btn add-btn" onClick={handleAdd}>
                    Add Directory
                </button>
            </div>
            <div className="settings-field-inputwrap dirlist-input-col">
                {dirs.map((dir, idx) => (
                    <div className="field-dragdrop-row" key={idx}>
                        <input
                            type="text"
                            className={`input field-input${highlightInvalid ? ' input-error' : ''}`}
                            name={field.key}
                            value={dir || ''}
                            onClick={() => handlePick(idx, dir)}
                            onChange={e => handleInputChange(idx, e.target.value)}
                            readOnly={true} // Prevent manual edit to force modal
                            tabIndex={0}
                            placeholder="Choose directory…"
                        />
                        <button
                            type="button"
                            className="btn btn--remove-item remove-btn"
                            onClick={() => handleRemove(idx)}
                            disabled={dirs.length === 1}
                        >
                            −
                        </button>
                    </div>
                ))}
                {field.description && <div className="field-help-text">{field.description}</div>}
                {highlightInvalid && errorMessage && (
                    <div className="field-error-text">{errorMessage}</div>
                )}
            </div>

            {/* DirectoryPickerModal */}
            {modalIdx !== null && (
                <DirectoryPickerModal
                    initialPath={modalInitialValue}
                    nameValue={null}
                    onAccept={handleModalAccept}
                    onCancel={handleModalCancel}
                />
            )}
        </div>
    );
}

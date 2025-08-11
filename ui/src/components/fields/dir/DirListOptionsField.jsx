import React, { useState } from 'react';
import DirectoryPickerModal from '../../modals/DirectoryPickerModal';
import { humanize } from '../../../utils/tools';

export function DirListOptionsField({ field, value, onChange }) {
    // 1. Always treat dirs as [{ path, mode }]
    let dirs =
        Array.isArray(value) && value.length
            ? value.map(d =>
                  typeof d === 'object'
                      ? { path: d.path ?? '', mode: d.mode ?? (field.options?.[0] || '') }
                      : { path: d || '', mode: field.options?.[0] || '' }
              )
            : [{ path: '', mode: field.options?.[0] || '' }];

    // 2. Track modal state
    const [modalIdx, setModalIdx] = useState(null);
    const [modalInitialValue, setModalInitialValue] = useState('/');

    // 3. Handlers
    const handleInputChange = (idx, val) => {
        dirs[idx].path = val;
        onChange([...dirs]);
    };

    const handleModeChange = (idx, mode) => {
        dirs[idx].mode = mode;
        onChange([...dirs]);
    };

    const handlePick = (idx, curVal) => {
        setModalIdx(idx);
        setModalInitialValue(curVal || '/');
    };

    const handleModalAccept = path => {
        if (modalIdx !== null && path && path !== dirs[modalIdx].path) {
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
        dirs.splice(idx, 1);
        onChange([...dirs]);
    };

    const handleAdd = () => {
        onChange([...dirs, { path: '', mode: field.options?.[0] || '' }]);
    };

    return (
        <div className="settings-field-row field-dir-list">
            <div className="settings-field-labelcol dirlist-label-col">
                <label htmlFor={field.key}>{field.label}</label>
                <div style={{ flex: 1 }} />
                <button type="button" className="btn add-btn" onClick={handleAdd}>
                    Add Directory
                </button>
            </div>
            <div className="settings-field-inputwrap dirlist-input-col">
                {dirs.map((dir, idx) => (
                    <div className="field-dragdrop-row dir-list-option-row" key={idx}>
                        <input
                            type="text"
                            className="input field-input"
                            name={field.key}
                            value={dir.path || ''}
                            onClick={() => handlePick(idx, dir.path)}
                            readOnly
                            tabIndex={0}
                            placeholder="Choose directory…"
                        />
                        <select
                            className="select dir-list-mode"
                            value={dir.mode}
                            onChange={e => handleModeChange(idx, e.target.value)}
                        >
                            {(field.options || []).map(opt => (
                                <option key={opt} value={opt}>
                                    {humanize(opt)}
                                </option>
                            ))}
                        </select>
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
            </div>

            {/* DirectoryPickerModal, one at a time, just like DirField */}
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

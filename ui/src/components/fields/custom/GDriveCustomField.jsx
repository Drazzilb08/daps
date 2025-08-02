import React, { useState } from 'react';
import ModalFactory from '../../modals/ModalFactory';

export function GDriveCustomField({ field, value = [], onChange, rootConfig, moduleConfig }) {
    const [modalIdx, setModalIdx] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [modalEntry, setModalEntry] = useState(null);

    const subfields = Array.isArray(field.fields) ? field.fields : [];
    const savedIds = React.useMemo(() => {
        if (Array.isArray(moduleConfig?.gdrive_list)) {
            return moduleConfig.gdrive_list.map(entry => entry.id).filter(Boolean);
        }
        return [];
    }, [moduleConfig]);

    const unsavedIds = React.useMemo(() => {
        return (value || []).map(entry => entry.id).filter(Boolean);
    }, [value]);

    const alreadyAddedIds = React.useMemo(() => {
        return Array.from(new Set([...savedIds, ...unsavedIds]));
    }, [savedIds, unsavedIds]);

    // Then create an enhanced copy of moduleConfig including alreadyAddedIds
    const enhancedModuleConfig = {
        ...moduleConfig,
        alreadyAddedIds,
    };

    // Modal Save/Del handlers (match vanilla logic, updating parent)
    function handleModalSave(formData) {
        let newArr = Array.isArray(value) ? [...value] : [];
        if (modalIdx !== null && modalIdx !== undefined) {
            newArr[modalIdx] = formData;
        } else {
            newArr.push(formData);
        }
        setShowModal(false);
        setModalIdx(null);
        setModalEntry(null);
        if (onChange) onChange(field.key, newArr);
    }

    function handleModalDelete() {
        if (modalIdx === null || modalIdx === undefined) return;
        let newArr = [...value];
        newArr.splice(modalIdx, 1);
        setShowModal(false);
        setModalIdx(null);
        setModalEntry(null);
        if (onChange) onChange(field.key, newArr);
    }

    function openEdit(idx) {
        setModalIdx(idx);
        setModalEntry(
            idx !== null && idx !== undefined
                ? { ...value[idx] }
                : { id: '', name: '', location: '' }
        );
        setShowModal(true);
    }

    function createAddCard() {
        return (
            <div
                className="settings-entry-card settings-add-card"
                tabIndex={0}
                role="button"
                aria-label={`Add ${field.label.replace(/s$/, '')}`}
                onClick={() => openEdit(null)}
                onKeyDown={e => {
                    if (e.key === 'Enter' || e.key === ' ') openEdit(null);
                }}
                key="add-card"
            >
                <span className="card-add-plus">+</span>
            </div>
        );
    }

    function renderList() {
        if (!Array.isArray(value) || value.length === 0) {
            return [createAddCard()];
        }
        return [
            ...value.map((item, idx) => (
                <div
                    className="settings-entry-card"
                    key={idx}
                    tabIndex={0}
                    role="button"
                    aria-label="Edit Google Drive Entry"
                    onClick={() => openEdit(idx)}
                    onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') openEdit(idx);
                    }}
                >
                    <div className="settings-entry-row">
                        <span className="settings-label">ID:</span>
                        <span className="settings-value">{item.id || ''}</span>
                    </div>
                    <div className="settings-entry-row">
                        <span className="settings-label">Name:</span>
                        <span className="settings-value">{item.name || ''}</span>
                    </div>
                    <div className="settings-entry-row">
                        <span className="settings-label">Location:</span>
                        <span className="settings-value">{item.location || ''}</span>
                    </div>
                </div>
            )),
            createAddCard(),
        ];
    }

    // Footer buttons for modal
    const footerButtons = isEdit => [
        ...(isEdit
            ? [
                  {
                      id: 'delete-modal-btn',
                      label: 'Delete',
                      className: 'btn--remove',
                      type: 'button',
                  },
              ]
            : []),
        {
            id: 'cancel-modal-btn',
            label: 'Cancel',
            className: 'btn--cancel',
            type: 'button',
        },
        {
            id: 'save-modal-btn',
            label: 'Save',
            className: 'btn--success',
            type: 'submit',
        },
    ];

    // Unified handler for all modal buttons
    function handleButtonClick({ btnId, formData }) {
        if (btnId === 'save-modal-btn') {
            handleModalSave(formData);
        } else if (btnId === 'delete-modal-btn') {
            handleModalDelete();
        } else if (btnId === 'cancel-modal-btn') {
            setShowModal(false);
            setModalIdx(null);
            setModalEntry(null);
        }
    }

    return (
        <div className="settings-field-row">
            <div className="settings-field-labelcol">
                <label htmlFor={field.key}>{field.label}</label>
            </div>
            <div className="settings-field-inputwrap">
                {field.description && <div className="field-help-text">{field.description}</div>}
                <div className="settings-card-list">{renderList()}</div>
            </div>

            {showModal && (
                <ModalFactory
                    title={
                        modalIdx !== null && modalIdx !== undefined
                            ? `Edit ${field.label.replace(/s$/, '')}`
                            : `Add ${field.label.replace(/s$/, '')}`
                    }
                    schema={subfields}
                    entry={modalEntry}
                    footerButtons={footerButtons(modalIdx !== null && modalIdx !== undefined)}
                    moduleConfig={enhancedModuleConfig}
                    rootConfig={rootConfig}
                    onClose={() => {
                        setShowModal(false);
                        setModalIdx(null);
                        setModalEntry(null);
                    }}
                    onButtonClick={{
                        'save-modal-btn': handleButtonClick,
                        'delete-modal-btn': handleButtonClick,
                        'cancel-modal-btn': handleButtonClick,
                    }}
                />
            )}
        </div>
    );
}

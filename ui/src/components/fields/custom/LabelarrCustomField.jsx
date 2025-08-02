import React, { useState } from 'react';
import ModalFactory from '../../modals/ModalFactory';

export function LabelarrCustomField({ field, value = [], onChange, rootConfig, moduleConfig }) {
    const [modalIdx, setModalIdx] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [modalEntry, setModalEntry] = useState(null);

    const subfields = Array.isArray(field.fields) ? field.fields : [];

    function openEdit(idx) {
        setModalIdx(idx);
        setModalEntry(
            idx !== null && idx !== undefined
                ? { ...value[idx] }
                : Object.fromEntries(
                      subfields.map(f => [f.key, Array.isArray(f.default) ? [] : (f.default ?? '')])
                  )
        );
        setShowModal(true);
    }

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

    function handleButtonClick({ btnId, formData, closeModal }) {
        if (btnId === 'save-modal-btn') {
            handleModalSave(formData);
        } else if (btnId === 'delete-modal-btn') {
            handleModalDelete();
        } else if (btnId === 'cancel-modal-btn') {
            setShowModal(false);
            setModalIdx(null);
            setModalEntry(null);
        }
        if (closeModal) closeModal();
    }

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

    function createAddCard() {
        return (
            <div
                className="settings-entry-card settings-add-card"
                tabIndex={0}
                role="button"
                aria-label="Add Mapping"
                onClick={() => openEdit(null)}
                onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && openEdit(null)}
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
                    aria-label="Edit Mapping"
                    onClick={() => openEdit(idx)}
                    onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && openEdit(idx)}
                >
                    <div className="settings-entry-row settings-entry-main">
                        <span className="settings-label">App Instance:</span>
                        <span className="settings-value">{item.app_instance || ''}</span>
                    </div>
                    <div className="settings-entry-row">
                        <span className="settings-label">Labels:</span>
                        <span className="settings-value">
                            {Array.isArray(item.labels)
                                ? item.labels.join(', ')
                                : item.labels || ''}
                        </span>
                    </div>
                    {Array.isArray(item.plex_instances) &&
                        item.plex_instances.length > 0 &&
                        item.plex_instances.map((plex, pidx) => (
                            <div className="settings-entry-row settings-plexmap-block" key={pidx}>
                                <span className="settings-label">Plex Libraries:</span>
                                <span className="settings-value">
                                    <span className="settings-plex-name plex-pill">
                                        {plex.instance ? plex.instance : `Plex ${pidx + 1}`}
                                    </span>
                                    <span className="settings-plex-libs">
                                        {Array.isArray(plex.library_names) &&
                                        plex.library_names.length
                                            ? ' ' + plex.library_names.join(', ')
                                            : ''}
                                    </span>
                                </span>
                            </div>
                        ))}
                </div>
            )),
            createAddCard(),
        ];
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
                    rootConfig={rootConfig}
                    moduleConfig={moduleConfig}
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

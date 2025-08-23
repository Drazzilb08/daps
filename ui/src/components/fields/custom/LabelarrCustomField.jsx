import React, { useState } from 'react';
import ModalFactory from '../../modals/ModalFactory';

export function LabelarrCustomField({ field, value = [], onChange, rootConfig, moduleConfig }) {
    const [editingMappingIndex, setEditingMappingIndex] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [modalEntry, setModalEntry] = useState(null);

    const subfields = Array.isArray(field.fields) ? field.fields : [];

    function openEdit(idx) {
        setEditingMappingIndex(idx);
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
        if (editingMappingIndex !== null && editingMappingIndex !== undefined) {
            newArr[editingMappingIndex] = formData;
        } else {
            newArr.push(formData);
        }
        setShowModal(false);
        setEditingMappingIndex(null);
        setModalEntry(null);
        if (onChange) onChange(newArr);
    }

    function handleModalDelete() {
        if (editingMappingIndex === null || editingMappingIndex === undefined) return;
        let newArr = [...value];
        newArr.splice(editingMappingIndex, 1);
        setShowModal(false);
        setEditingMappingIndex(null);
        setModalEntry(null);
        if (onChange) onChange(newArr);
    }

    function handleButtonClick({ btnId, formData, closeModal }) {
        if (btnId === 'save-modal-btn') {
            handleModalSave(formData);
        } else if (btnId === 'delete-modal-btn') {
            handleModalDelete();
        } else if (btnId === 'cancel-modal-btn') {
            setShowModal(false);
            setEditingMappingIndex(null);
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
            ...value.map((labelMapping, mappingIndex) => (
                <div
                    className="settings-entry-card"
                    key={mappingIndex}
                    tabIndex={0}
                    role="button"
                    aria-label="Edit Mapping"
                    onClick={() => openEdit(mappingIndex)}
                    onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && openEdit(mappingIndex)}
                >
                    <div className="settings-entry-row settings-entry-main">
                        <span className="settings-label">App Instance:</span>
                        <span className="settings-value">{labelMapping.app_instance || ''}</span>
                    </div>
                    <div className="settings-entry-row">
                        <span className="settings-label">Labels:</span>
                        <span className="settings-value">
                            {Array.isArray(labelMapping.labels)
                                ? labelMapping.labels.join(', ')
                                : labelMapping.labels || ''}
                        </span>
                    </div>
                    {Array.isArray(labelMapping.plex_instances) &&
                        labelMapping.plex_instances.length > 0 &&
                        labelMapping.plex_instances.map((plexInstance, instanceIndex) => (
                            <div
                                className="settings-entry-row settings-plexmap-block"
                                key={instanceIndex}
                            >
                                <span className="settings-label">Plex Libraries:</span>
                                <span className="settings-value">
                                    <span className="settings-plex-name plex-pill">
                                        {plexInstance.instance
                                            ? plexInstance.instance
                                            : `Plex ${instanceIndex + 1}`}
                                    </span>
                                    <span className="settings-plex-libs">
                                        {Array.isArray(plexInstance.library_names) &&
                                        plexInstance.library_names.length
                                            ? ' ' + plexInstance.library_names.join(', ')
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
                        editingMappingIndex !== null && editingMappingIndex !== undefined
                            ? `Edit ${field.label.replace(/s$/, '')}`
                            : `Add ${field.label.replace(/s$/, '')}`
                    }
                    schema={subfields}
                    entry={modalEntry}
                    footerButtons={footerButtons(
                        editingMappingIndex !== null && editingMappingIndex !== undefined
                    )}
                    rootConfig={rootConfig}
                    moduleConfig={moduleConfig}
                    onClose={() => {
                        setShowModal(false);
                        setEditingMappingIndex(null);
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

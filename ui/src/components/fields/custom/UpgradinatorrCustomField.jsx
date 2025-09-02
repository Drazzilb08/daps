import React, { useState } from 'react';
import ModalFactory from '../../modals/ModalFactory';

export function UpgradinatorrCustomField({
    field,
    value = [],
    onChange,
    rootConfig,
    moduleConfig,
}) {
    const [modalIdx, setModalIdx] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [modalEntry, setModalEntry] = useState(null);

    // Schema for a single entry, from the field itself
    const subfields = Array.isArray(field.fields) ? field.fields : [];

    function openEdit(idx) {
        setModalIdx(idx);
        setModalEntry(
            idx !== null && idx !== undefined
                ? { ...value[idx] }
                : Object.fromEntries(
                      subfields.map(f => [f.key, f.type === 'check_box' ? false : ''])
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
        if (onChange) onChange(newArr);
    }

    function handleModalDelete() {
        if (modalIdx === null || modalIdx === undefined) return;
        let newArr = [...value];
        newArr.splice(modalIdx, 1);
        setShowModal(false);
        setModalIdx(null);
        setModalEntry(null);
        if (onChange) onChange(newArr);
    }

    // Modal button handler (single for all)
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

    // Modal button configs
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
                className="card--add"
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
        if (!Array.isArray(value) || value.length === 0) return [createAddCard()];
        return [
            ...value.map((item, idx) => (
                <div
                    className="card--entry"
                    key={idx}
                    tabIndex={0}
                    role="button"
                    aria-label="Edit Instance"
                    onClick={() => openEdit(idx)}
                    onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') openEdit(idx);
                    }}
                >
                    <div className="card__entry-row card__entry-main">
                        <span className="card__entry-label">Instance:</span>
                        <span className="card__entry-value">{item.instance || ''}</span>
                    </div>
                    <div className="card__entry-row">
                        <span className="card__entry-label">Count:</span>
                        <span className="card__entry-value">{item.count ?? ''}</span>
                    </div>
                    <div className="card__entry-row">
                        <span className="card__entry-label">Tag Name:</span>
                        <span className="card__entry-value">{item.tag_name || ''}</span>
                    </div>
                    <div className="card__entry-row">
                        <span className="card__entry-label">Ignore Tag:</span>
                        <span className="card__entry-value">{item.ignore_tag || ''}</span>
                    </div>
                    <div className="card__entry-row">
                        <span className="card__entry-label">Unattended:</span>
                        <span className="card__entry-value">{item.unattended ? 'Yes' : 'No'}</span>
                    </div>
                    {showSeasonMonitored(item, rootConfig) && (
                        <div className="card__entry-row">
                            <span className="card__entry-label">Season Threshold:</span>
                            <span className="card__entry-value">
                                {item.season_monitored_threshold != null
                                    ? `${Math.round(item.season_monitored_threshold * 100)} %`
                                    : ''}
                            </span>
                        </div>
                    )}
                </div>
            )),
            createAddCard(),
        ];
    }

    function showSeasonMonitored(seriesItem, rootConfig) {
        return getInstanceType(seriesItem.instance, rootConfig) === 'sonarr';
    }

    function getInstanceType(instanceName, rootConfig) {
        if (!rootConfig || !rootConfig.instances) return '';
        for (const type of Object.keys(rootConfig.instances)) {
            if (instanceName in (rootConfig.instances[type] || {})) return type;
        }
        return '';
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

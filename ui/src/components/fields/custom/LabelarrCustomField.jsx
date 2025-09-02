import React, { useState } from 'react';
import ModalFactory from '../../modals/ModalFactory';

/**
 * LabelarrCustomField - Complex field for managing ARR to Plex label mappings
 *
 * Provides a sophisticated interface for configuring label synchronization between
 * ARR instances (Radarr/Sonarr) and Plex libraries. Handles nested configuration
 * with add/edit/delete operations through modal interfaces.
 *
 * Features:
 * - Card-based list interface for existing mappings
 * - Modal forms for add/edit operations with validation
 * - Dynamic subfield rendering based on field schema
 * - Support for complex nested data structures
 * - Keyboard accessibility and ARIA compliance
 *
 * Data structure:
 * Each mapping contains:
 * - app_instance: ARR instance name
 * - labels: Array of label names to sync
 * - plex_instances: Array of {instance, library_names} objects
 *
 * @param {Object} props - Component props
 * @param {Object} props.field - Field configuration from schema
 * @param {string} props.field.key - Field identifier
 * @param {string} props.field.label - Display label
 * @param {Array} props.field.fields - Subfield definitions for modal
 * @param {string} [props.field.description] - Help text
 * @param {Array} [props.value=[]] - Current mappings array
 * @param {Function} props.onChange - Value change handler
 * @param {Object} props.rootConfig - Full application configuration
 * @param {Object} props.moduleConfig - Module-specific configuration
 *
 * @example
 * // Field configuration in schema
 * {
 *   key: 'label_mappings',
 *   label: 'Label Mappings',
 *   type: 'labelarr_custom',
 *   description: 'Configure ARR to Plex label synchronization',
 *   fields: [
 *     { key: 'app_instance', label: 'ARR Instance', type: 'text' },
 *     { key: 'labels', label: 'Labels', type: 'tag_multi_select' },
 *     { key: 'plex_instances', label: 'Plex Libraries', type: 'plex_mapping' }
 *   ]
 * }
 *
 * @example
 * // Usage in settings form
 * <LabelarrCustomField
 *   field={fieldConfig}
 *   value={currentMappings}
 *   onChange={handleMappingChange}
 *   rootConfig={appConfig}
 *   moduleConfig={labelarrConfig}
 * />
 */
export function LabelarrCustomField({ field, value = [], onChange, rootConfig, moduleConfig }) {
    // Modal state management for add/edit operations
    const [editingMappingIndex, setEditingMappingIndex] = useState(null);
    const [showModal, setShowModal] = useState(false);
    const [modalEntry, setModalEntry] = useState(null);

    // Extract subfield definitions from field configuration
    const subfields = Array.isArray(field.fields) ? field.fields : [];

    /**
     * Open modal for editing existing mapping or creating new one
     *
     * Prepares modal state with either existing mapping data (edit mode)
     * or default values from subfield schema (add mode).
     *
     * @param {number|null} idx - Index of mapping to edit, null for new mapping
     */
    function openEdit(idx) {
        setEditingMappingIndex(idx);

        // Set modal entry data based on operation mode
        setModalEntry(
            idx !== null && idx !== undefined
                ? { ...value[idx] } // Edit mode: clone existing mapping
                : Object.fromEntries(
                      // Add mode: use field defaults
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
                className="card--add"
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
                    className="card--entry"
                    key={mappingIndex}
                    tabIndex={0}
                    role="button"
                    aria-label="Edit Mapping"
                    onClick={() => openEdit(mappingIndex)}
                    onKeyDown={e => (e.key === 'Enter' || e.key === ' ') && openEdit(mappingIndex)}
                >
                    <div className="card__entry-row card__entry-main">
                        <span className="card__entry-label">App Instance:</span>
                        <span className="card__entry-value">{labelMapping.app_instance || ''}</span>
                    </div>
                    <div className="card__entry-row">
                        <span className="card__entry-label">Labels:</span>
                        <span className="card__entry-value">
                            {Array.isArray(labelMapping.labels)
                                ? labelMapping.labels.join(', ')
                                : labelMapping.labels || ''}
                        </span>
                    </div>
                    {Array.isArray(labelMapping.plex_instances) &&
                        labelMapping.plex_instances.length > 0 &&
                        labelMapping.plex_instances.map((plexInstance, instanceIndex) => (
                            <div
                                className="card__entry-row settings-plexmap-block"
                                key={instanceIndex}
                            >
                                <span className="card__entry-label">Plex Libraries:</span>
                                <span className="card__entry-value">
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

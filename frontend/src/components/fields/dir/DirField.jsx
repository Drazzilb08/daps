/**
 * DirField Component
 *
 * Directory selection input field component using primitive composition.
 * Provides a clickable read-only text input for directory selection.
 * Supports placeholder text, validation states, and accessibility features.
 */

import React, { useCallback, useState } from 'react';
import { FieldWrapper, FieldLabel, FieldError, FieldDescription, InputBase } from '../primitives';
import { Modal } from '../../ui';
import { FieldRegistry } from '../FieldRegistry';

/**
 * DirField component for directory path input
 *
 * @param {Object} props - Component props
 * @param {Object} props.field - Field configuration object
 * @param {string} props.value - Current field value (directory path)
 * @param {Function} props.onChange - Value change handler
 * @param {boolean} props.disabled - Field disabled state
 * @param {boolean} props.highlightInvalid - Show validation error state
 * @param {string} props.errorMessage - Error message to display
 */
export const DirField = React.memo(
    ({ field, value, disabled = false, highlightInvalid = false, errorMessage = null }) => {
        const [modalOpen, setModalOpen] = useState(false);

        const handleInputClick = useCallback(() => {
            if (!disabled) {
                setModalOpen(true);
            }
        }, [disabled]);

        const inputId = `field-${field.key}`;

        // Get dir_picker placeholder field component
        const DirPickerField = FieldRegistry.getField('dir_picker');

        return (
            <>
                <FieldWrapper invalid={highlightInvalid}>
                    <FieldLabel htmlFor={inputId} label={field.label} required={field.required} />

                    <InputBase
                        id={inputId}
                        type="text"
                        name={field.key}
                        value={value || ''}
                        placeholder={field.placeholder || 'Click to select directory...'}
                        disabled={disabled}
                        required={field.required}
                        readOnly={true}
                        onClick={handleInputClick}
                        invalid={highlightInvalid}
                        aria-describedby={`${inputId}-desc ${inputId}-error`.trim()}
                        aria-invalid={highlightInvalid}
                        className={disabled ? 'cursor-not-allowed' : 'cursor-pointer'}
                    />

                    <FieldDescription id={`${inputId}-desc`} description={field.description} />
                    <FieldError id={`${inputId}-error`} message={errorMessage} />
                </FieldWrapper>

                {/* Directory Browser Modal */}
                <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} size="large">
                    <Modal.Header>Select Directory</Modal.Header>
                    <Modal.Body>
                        <div className="flex flex-col gap-4">
                            {DirPickerField && (
                                <DirPickerField
                                    field={{
                                        key: 'directory_browser',
                                        label: 'Directory Browser',
                                        type: 'dir_picker',
                                        description: 'Browse and select a directory',
                                    }}
                                    value={value}
                                    onChange={() => {}}
                                />
                            )}
                        </div>
                    </Modal.Body>
                    <Modal.Footer>
                        <button
                            onClick={() => setModalOpen(false)}
                            className="px-4 py-2 bg-surface-alt text-primary rounded-md hover:bg-surface-hover transition-colors min-h-11"
                        >
                            Close
                        </button>
                    </Modal.Footer>
                </Modal>
            </>
        );
    }
);

DirField.displayName = 'DirField';

export default DirField;

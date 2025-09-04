import React from 'react';
import { renderField } from '../fields/RenderFields';

/**
 * Modal layout renderer that handles different layout types (two-column, sections, custom)
 *
 * @param {Object} props - Component props
 * @param {Array} props.schema - Field schema configuration
 * @param {Object} props.layout - Layout configuration object
 * @param {Object} props.formData - Current form data
 * @param {Object} props.moduleConfig - Module configuration
 * @param {Object} props.rootConfig - Root configuration
 * @param {Object} props.invalidFields - Fields with validation errors
 * @param {Function} props.onFieldChange - Field change handler
 * @param {Object} props.fieldRefs - Field reference objects
 * @param {Function} props.getExtraPropsForField - Get additional props for field
 * @returns {JSX.Element|null} Rendered layout content
 */
export const ModalLayout = ({
    schema,
    layout,
    formData,
    moduleConfig,
    rootConfig,
    invalidFields,
    onFieldChange,
    fieldRefs,
    getExtraPropsForField,
}) => {
    /**
     * Render a single field with all necessary props
     * @param {Object} field - Field configuration
     * @param {number} index - Field index
     * @returns {JSX.Element} Rendered field
     */
    function renderSingleField(field, index) {
        return (
            <React.Fragment key={field.key || index}>
                {renderField(field, formData, moduleConfig, rootConfig, {
                    onChange: (key, val) => onFieldChange(key, val),
                    index,
                    ref: fieldRefs?.[field.key],
                    highlightInvalid: !!invalidFields[field.key],
                    errorMessage: invalidFields[field.key] || null,
                    ...getExtraPropsForField(field),
                })}
            </React.Fragment>
        );
    }

    /**
     * Render two-column layout with left and right columns
     * @param {Array} validFields - Valid field configurations
     * @returns {JSX.Element} Two-column layout
     */
    function renderTwoColumnLayout(validFields) {
        const fieldMap = validFields.reduce((acc, field) => {
            acc[field.key] = field;
            return acc;
        }, {});

        const leftFields = layout.leftColumn?.map(key => fieldMap[key]).filter(Boolean) || [];
        const rightFields = layout.rightColumn?.map(key => fieldMap[key]).filter(Boolean) || [];

        return (
            <div className="modal-two-column-layout">
                <div className="modal-column-left">
                    {leftFields.map((field, i) => (
                        <div key={field.key} className="modal-column-section">
                            {renderSingleField(field, i)}
                        </div>
                    ))}
                </div>
                <div className="modal-column-right">
                    {rightFields.map((field, i) => (
                        <div key={field.key} className="modal-column-section">
                            {renderSingleField(field, i)}
                        </div>
                    ))}
                </div>
            </div>
        );
    }

    /**
     * Render section-based layout with titled sections
     * @param {Array} validFields - Valid field configurations
     * @returns {JSX.Element} Section-based layout
     */
    function renderSectionLayout(validFields) {
        return (
            layout.sections?.map((section, sectionIndex) => {
                const sectionFields =
                    section.fields
                        ?.map(key => validFields.find(f => f.key === key))
                        .filter(Boolean) || [];

                return (
                    <div key={sectionIndex} className="modal-section">
                        {section.title && (
                            <div className="modal-section-title">{section.title}</div>
                        )}
                        <div className="modal-section-content">
                            {sectionFields.map((field, i) => renderSingleField(field, i))}
                        </div>
                    </div>
                );
            }) || null
        );
    }

    /**
     * Render custom layout (for future expansion)
     * @param {Array} validFields - Valid field configurations
     * @returns {JSX.Element} Custom layout (currently falls back to default)
     */
    function renderCustomLayout(validFields) {
        // For now, fall back to default
        return validFields.map((field, i) => renderSingleField(field, i));
    }

    // Filter valid fields
    const validFields = schema.filter(f => f && typeof f === 'object' && f.key);

    if (!validFields.length) {
        return null;
    }

    // If no layout specified, use default sequential rendering
    if (!layout) {
        return validFields.map((field, i) => renderSingleField(field, i));
    }

    // Handle different layout types
    switch (layout.type) {
        case 'two-column':
            return renderTwoColumnLayout(validFields);
        case 'sections':
            return renderSectionLayout(validFields);
        case 'custom':
            return renderCustomLayout(validFields);
        default:
            return validFields.map((field, i) => renderSingleField(field, i));
    }
};

export default ModalLayout;

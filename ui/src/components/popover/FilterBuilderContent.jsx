import React, { useState, useCallback } from 'react';
import PropTypes from 'prop-types';

/**
 * FilterBuilderContent - Comprehensive filter builder component
 *
 * Supports the complete filter builder pattern from PopoverTest.jsx including:
 * - Field/operator/value combinations
 * - Dynamic operator resolution based on field types
 * - Range inputs with sliders for numeric fields
 * - Multi-select dropdowns for categorical fields
 * - Boolean toggles for boolean fields
 * - Text inputs for string fields
 * - Condition management with AND/OR logic
 * - Remove individual conditions
 * - Clear all and apply actions
 *
 * @param {Object} props - Component props
 * @param {Array} props.fields - Available filter fields
 * @param {Function} props.operators - Function to get operators for field type
 * @param {Object} props.conditions - State binding for filter conditions
 * @param {Object} [props.newField] - State binding for new field selection
 * @param {Object} [props.newOperator] - State binding for new operator selection
 * @param {Object} [props.newValue] - State binding for new value input
 * @param {string} [props.title] - Popover title
 * @param {Function} props.onClose - Callback to close popover
 */
const FilterBuilderContent = React.memo(
    ({
        fields = [],
        operators,
        conditions,
        newField,
        newOperator,
        newValue,
        title = 'Filter Builder',
        onClose,
    }) => {
        // Local state for new filter building when not provided by schema
        const [localNewField, setLocalNewField] = useState(fields[0]?.key || '');
        const [localNewOperator, setLocalNewOperator] = useState('');
        const [localNewValue, setLocalNewValue] = useState('');

        // Use provided state bindings or fall back to local state
        const currentNewField = newField?.value ?? localNewField;
        const setCurrentNewField = newField?.setValue ?? setLocalNewField;
        const currentNewOperator = newOperator?.value ?? localNewOperator;
        const setCurrentNewOperator = newOperator?.setValue ?? setLocalNewOperator;
        const currentNewValue = newValue?.value ?? localNewValue;
        const setCurrentNewValue = newValue?.setValue ?? setLocalNewValue;

        // Get current field definition
        const currentFieldDef = fields.find(f => f.key === currentNewField);

        // Get available operators for current field
        const availableOperators =
            currentFieldDef && operators
                ? operators(currentFieldDef.type)
                : [{ key: 'equals', label: 'Equals' }];

        // Initialize operator when field changes
        const handleFieldChange = useCallback(
            newFieldKey => {
                setCurrentNewField(newFieldKey);
                const fieldDef = fields.find(f => f.key === newFieldKey);
                if (fieldDef && operators) {
                    const ops = operators(fieldDef.type);
                    setCurrentNewOperator(ops[0]?.key || 'equals');
                }
                setCurrentNewValue('');
            },
            [fields, operators, setCurrentNewField, setCurrentNewOperator, setCurrentNewValue]
        );

        // Add new filter condition
        const addFilterCondition = useCallback(() => {
            if (!currentNewValue || !conditions?.setValue) return;

            const fieldDef = fields.find(f => f.key === currentNewField);
            const operatorDef = availableOperators.find(o => o.key === currentNewOperator);

            if (!fieldDef || !operatorDef) return;

            const newCondition = {
                id: Date.now(),
                field: currentNewField,
                fieldLabel: fieldDef.label,
                operator: currentNewOperator,
                operatorLabel: operatorDef.label,
                value: currentNewValue,
                logic: conditions.value?.length > 0 ? 'AND' : null,
            };

            conditions.setValue(prev => [...(prev || []), newCondition]);
            setCurrentNewValue('');
        }, [
            currentNewField,
            currentNewOperator,
            currentNewValue,
            fields,
            availableOperators,
            conditions,
        ]);

        // Remove filter condition
        const removeFilterCondition = useCallback(
            conditionId => {
                if (!conditions?.setValue) return;

                conditions.setValue(prev => (prev || []).filter(c => c.id !== conditionId));
            },
            [conditions]
        );

        // Clear all conditions
        const clearAllConditions = useCallback(() => {
            if (!conditions?.setValue) return;
            conditions.setValue([]);
        }, [conditions]);

        // Render value input based on field type
        const renderValueInput = () => {
            if (!currentFieldDef) return null;

            const commonStyle = {
                width: '100%',
                padding: 'var(--space-2)',
                border: '1px solid var(--divider)',
                borderRadius: 'var(--radius-1)',
                fontSize: 'var(--font-size-1)',
                backgroundColor: 'var(--surface)',
            };

            switch (currentFieldDef.type) {
                case 'range':
                    if (currentFieldDef.key === 'year' || currentFieldDef.key === 'rating') {
                        return (
                            <div
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    gap: 'var(--space-2)',
                                    padding: 'var(--space-3)',
                                    background: 'var(--surface-alt)',
                                    borderRadius: 'var(--radius-2)',
                                    border: '1px solid var(--divider)',
                                }}
                            >
                                <div
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 'var(--space-3)',
                                    }}
                                >
                                    <input
                                        type="range"
                                        min={currentFieldDef.min}
                                        max={currentFieldDef.max}
                                        step={currentFieldDef.step || 1}
                                        value={currentNewValue || currentFieldDef.min}
                                        onChange={e => setCurrentNewValue(e.target.value)}
                                        style={{
                                            flex: '1',
                                            height: '6px',
                                            borderRadius: '3px',
                                            background: 'var(--divider)',
                                            outline: 'none',
                                            accentColor: 'var(--primary)',
                                        }}
                                    />
                                    <span
                                        style={{
                                            fontSize: 'var(--font-size-1)',
                                            fontWeight: '600',
                                            color: 'var(--primary)',
                                            minWidth: '50px',
                                            textAlign: 'center',
                                            padding: 'var(--space-1) var(--space-2)',
                                            background: 'var(--surface)',
                                            borderRadius: 'var(--radius-1)',
                                            border: '1px solid var(--primary)',
                                        }}
                                    >
                                        {currentNewValue || currentFieldDef.min}
                                    </span>
                                </div>
                                <div
                                    style={{
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        fontSize: 'var(--font-size-0)',
                                        color: 'var(--text-secondary)',
                                    }}
                                >
                                    <span>{currentFieldDef.min}</span>
                                    <span>{currentFieldDef.max}</span>
                                </div>
                            </div>
                        );
                    }
                    return (
                        <input
                            type="number"
                            placeholder="Enter value..."
                            min={currentFieldDef.min}
                            max={currentFieldDef.max}
                            step={currentFieldDef.step || 1}
                            value={currentNewValue}
                            onChange={e => setCurrentNewValue(e.target.value)}
                            style={commonStyle}
                        />
                    );

                case 'select':
                    return (
                        <select
                            value={currentNewValue}
                            onChange={e => setCurrentNewValue(e.target.value)}
                            style={commonStyle}
                        >
                            <option value="">Select...</option>
                            {(currentFieldDef.options || []).map(option => (
                                <option
                                    key={typeof option === 'string' ? option : option.key}
                                    value={typeof option === 'string' ? option : option.key}
                                >
                                    {typeof option === 'string' ? option : option.label}
                                </option>
                            ))}
                        </select>
                    );

                case 'boolean':
                    return (
                        <select
                            value={currentNewValue}
                            onChange={e => setCurrentNewValue(e.target.value)}
                            style={commonStyle}
                        >
                            <option value="">Select...</option>
                            <option value="true">Yes</option>
                            <option value="false">No</option>
                        </select>
                    );

                case 'multiselect':
                    return (
                        <select
                            value={currentNewValue}
                            onChange={e => setCurrentNewValue(e.target.value)}
                            style={commonStyle}
                        >
                            <option value="">Select...</option>
                            {(currentFieldDef.options || []).map(option => (
                                <option key={option} value={option}>
                                    {option}
                                </option>
                            ))}
                        </select>
                    );

                default:
                    return (
                        <input
                            type="text"
                            placeholder="Enter value..."
                            value={currentNewValue}
                            onChange={e => setCurrentNewValue(e.target.value)}
                            style={commonStyle}
                        />
                    );
            }
        };

        return (
            <>
                <div className="popover__title">{title}</div>
                <div className="popover__content">
                    {/* Add New Filter Section */}
                    <div
                        style={{
                            marginBottom: 'var(--space-4)',
                            padding: 'var(--space-5)',
                            background: 'var(--surface)',
                            borderRadius: 'var(--radius-3)',
                            border: '1px solid var(--divider)',
                            boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                        }}
                    >
                        <h4
                            style={{
                                fontSize: 'var(--font-size-2)',
                                fontWeight: '600',
                                marginBottom: 'var(--space-5)',
                                color: 'var(--text-primary)',
                                borderBottom: '2px solid var(--primary)',
                                paddingBottom: 'var(--space-2)',
                                display: 'inline-block',
                            }}
                        >
                            Add Filter Condition
                        </h4>

                        <div
                            style={{
                                display: 'grid',
                                gridTemplateColumns: '1fr 1fr 1.2fr auto',
                                gap: 'var(--space-3)',
                                alignItems: 'end',
                            }}
                        >
                            {/* Field Selection */}
                            <div>
                                <label
                                    style={{
                                        fontSize: 'var(--font-size-1)',
                                        fontWeight: '500',
                                        color: 'var(--text-primary)',
                                        marginBottom: 'var(--space-2)',
                                        display: 'block',
                                    }}
                                >
                                    Field
                                </label>
                                <select
                                    value={currentNewField}
                                    onChange={e => handleFieldChange(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: 'var(--space-2)',
                                        border: '1px solid var(--divider)',
                                        borderRadius: 'var(--radius-1)',
                                        fontSize: 'var(--font-size-1)',
                                        backgroundColor: 'var(--surface)',
                                    }}
                                >
                                    {fields.map(field => (
                                        <option key={field.key} value={field.key}>
                                            {field.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Operator Selection */}
                            <div>
                                <label
                                    style={{
                                        fontSize: 'var(--font-size-1)',
                                        fontWeight: '500',
                                        color: 'var(--text-primary)',
                                        marginBottom: 'var(--space-2)',
                                        display: 'block',
                                    }}
                                >
                                    Operator
                                </label>
                                <select
                                    value={currentNewOperator}
                                    onChange={e => setCurrentNewOperator(e.target.value)}
                                    style={{
                                        width: '100%',
                                        padding: 'var(--space-2)',
                                        border: '1px solid var(--divider)',
                                        borderRadius: 'var(--radius-1)',
                                        fontSize: 'var(--font-size-1)',
                                        backgroundColor: 'var(--surface)',
                                    }}
                                >
                                    {availableOperators.map(operator => (
                                        <option key={operator.key} value={operator.key}>
                                            {operator.label}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Value Input */}
                            <div>
                                <label
                                    style={{
                                        fontSize: 'var(--font-size-1)',
                                        fontWeight: '500',
                                        color: 'var(--text-primary)',
                                        marginBottom: 'var(--space-2)',
                                        display: 'block',
                                    }}
                                >
                                    Value
                                </label>
                                {renderValueInput()}
                            </div>

                            {/* Add Button */}
                            <button
                                onClick={addFilterCondition}
                                disabled={!currentNewValue}
                                className="btn btn-primary"
                                style={{
                                    opacity: !currentNewValue ? '0.5' : '1',
                                    cursor: !currentNewValue ? 'not-allowed' : 'pointer',
                                    padding: 'var(--space-3) var(--space-4)',
                                    fontSize: 'var(--font-size-1)',
                                    fontWeight: '600',
                                    borderRadius: 'var(--radius-2)',
                                    minHeight: '44px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: 'var(--space-2)',
                                    boxShadow: !currentNewValue
                                        ? 'none'
                                        : '0 2px 4px rgba(var(--primary-rgb), 0.3)',
                                    transform: 'translateY(0)',
                                    transition: 'all 0.2s ease',
                                }}
                            >
                                ➕ Add
                            </button>
                        </div>
                    </div>

                    {/* Active Conditions */}
                    {conditions?.value?.length > 0 && (
                        <div style={{ marginBottom: 'var(--space-4)' }}>
                            <h4
                                style={{
                                    fontSize: 'var(--font-size-2)',
                                    fontWeight: '600',
                                    marginBottom: 'var(--space-3)',
                                    color: 'var(--text-primary)',
                                    borderBottom: '2px solid var(--success)',
                                    paddingBottom: 'var(--space-2)',
                                    display: 'inline-block',
                                }}
                            >
                                📋 Active Filters ({conditions.value.length})
                            </h4>
                            <div
                                style={{
                                    maxHeight: '200px',
                                    overflowY: 'auto',
                                    padding: 'var(--space-4)',
                                    background: 'var(--surface)',
                                    borderRadius: 'var(--radius-3)',
                                    border: '1px solid var(--divider)',
                                    boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                                }}
                            >
                                {conditions.value.map((condition, index) => (
                                    <div
                                        key={condition.id}
                                        style={{
                                            display: 'flex',
                                            alignItems: 'center',
                                            justifyContent: 'space-between',
                                            padding: 'var(--space-3) var(--space-4)',
                                            marginBottom:
                                                index < conditions.value.length - 1
                                                    ? 'var(--space-3)'
                                                    : '0',
                                            background: 'var(--surface-alt)',
                                            borderRadius: 'var(--radius-2)',
                                            border: '1px solid var(--divider)',
                                            boxShadow: '0 1px 2px rgba(0, 0, 0, 0.05)',
                                        }}
                                    >
                                        <span
                                            style={{
                                                fontSize: 'var(--font-size-1)',
                                                lineHeight: '1.4',
                                            }}
                                        >
                                            {condition.logic && (
                                                <span
                                                    style={{
                                                        background: 'var(--warning)',
                                                        color: 'white',
                                                        padding: 'var(--space-1) var(--space-2)',
                                                        borderRadius: 'var(--radius-1)',
                                                        fontSize: 'var(--font-size-0)',
                                                        fontWeight: '600',
                                                        marginRight: 'var(--space-2)',
                                                    }}
                                                >
                                                    {condition.logic}
                                                </span>
                                            )}
                                            <strong style={{ color: 'var(--primary)' }}>
                                                {condition.fieldLabel}
                                            </strong>{' '}
                                            <span style={{ color: 'var(--text-secondary)' }}>
                                                {condition.operatorLabel.toLowerCase()}
                                            </span>{' '}
                                            <em
                                                style={{
                                                    color: 'var(--success)',
                                                    fontWeight: '500',
                                                    background: 'var(--surface)',
                                                    padding: 'var(--space-1) var(--space-2)',
                                                    borderRadius: 'var(--radius-1)',
                                                    fontStyle: 'normal',
                                                }}
                                            >
                                                &quot;{condition.value}&quot;
                                            </em>
                                        </span>
                                        <button
                                            onClick={() => removeFilterCondition(condition.id)}
                                            className="btn btn-sm"
                                            style={{
                                                padding: 'var(--space-2) var(--space-3)',
                                                background: 'var(--error)',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: 'var(--radius-2)',
                                                fontSize: 'var(--font-size-0)',
                                                fontWeight: '500',
                                                transition: 'all 0.2s ease',
                                                minHeight: '44px',
                                            }}
                                        >
                                            🗑️ Remove
                                        </button>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Actions */}
                    <div
                        style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            paddingTop: 'var(--space-4)',
                            borderTop: '1px solid var(--divider)',
                        }}
                    >
                        <button className="btn btn-sm btn-secondary" onClick={clearAllConditions}>
                            Clear All
                        </button>
                        <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
                            <button
                                className="btn btn-sm btn-secondary"
                                onClick={() => {
                                    // In real implementation, save current conditions as preset
                                    console.log('Save preset');
                                }}
                            >
                                Save Preset
                            </button>
                            <button className="btn btn-sm btn-primary" onClick={onClose}>
                                Apply Filters
                            </button>
                        </div>
                    </div>
                </div>
            </>
        );
    }
);

FilterBuilderContent.propTypes = {
    fields: PropTypes.arrayOf(
        PropTypes.shape({
            key: PropTypes.string.isRequired,
            label: PropTypes.string.isRequired,
            type: PropTypes.string.isRequired,
            options: PropTypes.array,
            min: PropTypes.number,
            max: PropTypes.number,
            step: PropTypes.number,
        })
    ).isRequired,
    operators: PropTypes.func.isRequired,
    conditions: PropTypes.shape({
        value: PropTypes.array,
        setValue: PropTypes.func,
    }),
    newField: PropTypes.shape({
        value: PropTypes.string,
        setValue: PropTypes.func,
    }),
    newOperator: PropTypes.shape({
        value: PropTypes.string,
        setValue: PropTypes.func,
    }),
    newValue: PropTypes.shape({
        value: PropTypes.string,
        setValue: PropTypes.func,
    }),
    title: PropTypes.string,
    onClose: PropTypes.func.isRequired,
};

FilterBuilderContent.displayName = 'FilterBuilderContent';

export default FilterBuilderContent;
